import { db } from './schema';
import { newId, nowIso } from '../lib/ids';
import { isNewRecord } from '../domain/calc';
import { bodyweightToCsv, workoutsToCsv } from '../domain/csv';
import type { ImportSetRow } from '../domain/csv';
import { planWorkoutImport } from '../domain/importPlan';
import { ensureSeed } from './seed';
import type { Exercise, Hands, MuscleGroup, Session, WorkoutSet } from '../types';

/* ------------------------------ exercises ------------------------------ */

export async function createExercise(input: {
  name: string;
  muscleGroup: MuscleGroup;
  hands: Hands;
}): Promise<Exercise> {
  const name = input.name.trim();
  if (!name) throw new Error('Въведи име на упражнението.');
  const all = await db.exercises.toArray();
  if (all.some((e) => !e.archived && e.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('Упражнение с това име вече съществува.');
  }
  const ex: Exercise = {
    id: newId(),
    name,
    muscleGroup: input.muscleGroup,
    hands: input.hands,
    isCustom: true,
    archived: false,
    perHand: input.hands !== 'na',
  };
  await db.exercises.add(ex);
  return ex;
}

export async function renameExercise(id: string, name: string): Promise<void> {
  const n = name.trim();
  if (!n) return;
  await db.exercises.update(id, { name: n });
}

export async function setArchived(id: string, archived: boolean): Promise<void> {
  await db.exercises.update(id, { archived });
}

/** Returns false (and deletes nothing) when the exercise already has sets. */
export async function deleteExerciseIfUnused(id: string): Promise<boolean> {
  const used = await db.sets.where('exerciseId').equals(id).count();
  if (used > 0) return false;
  await db.exercises.delete(id);
  return true;
}

export async function recentExerciseIds(limit = 8): Promise<string[]> {
  const recent = await db.sets.orderBy('createdAt').reverse().limit(300).toArray();
  const ids: string[] = [];
  for (const s of recent) {
    if (!ids.includes(s.exerciseId)) ids.push(s.exerciseId);
    if (ids.length >= limit) break;
  }
  return ids;
}

/* -------------------------------- sets --------------------------------- */

export interface NewSetInput {
  date: string;
  exerciseId: string;
  reps: number;
  weightKg: number;
  rpe?: number;
  note?: string;
}

async function insertSet(input: NewSetInput): Promise<WorkoutSet> {
  let session = await db.sessions.where('date').equals(input.date).first();
  if (!session) {
    const created: Session = { id: newId(), date: input.date, createdAt: nowIso() };
    await db.sessions.add(created);
    session = created;
  }
  const count = await db.sets.where('sessionId').equals(session.id).count();
  const now = nowIso();
  const set: WorkoutSet = {
    id: newId(),
    sessionId: session.id,
    date: input.date,
    exerciseId: input.exerciseId,
    order: count + 1,
    reps: input.reps,
    weightKg: input.weightKg,
    rpe: input.rpe,
    note: input.note,
    createdAt: now,
    updatedAt: now,
  };
  await db.sets.add(set);
  return set;
}

export async function addSet(input: NewSetInput): Promise<{ set: WorkoutSet; isRecord: boolean }> {
  return db.transaction('rw', db.sessions, db.sets, async () => {
    const previous = await db.sets.where('exerciseId').equals(input.exerciseId).toArray();
    const isRecord = isNewRecord(previous, input);
    const set = await insertSet(input);
    return { set, isRecord };
  });
}

export async function updateSet(
  id: string,
  patch: { reps: number; weightKg: number; rpe?: number; note?: string },
): Promise<void> {
  await db.sets.update(id, {
    reps: patch.reps,
    weightKg: patch.weightKg,
    rpe: patch.rpe,
    note: patch.note,
    updatedAt: nowIso(),
  });
}

async function renumberDay(date: string): Promise<void> {
  const sets = await db.sets.where('date').equals(date).toArray();
  sets.sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  for (let i = 0; i < sets.length; i++) {
    if (sets[i].order !== i + 1) await db.sets.update(sets[i].id, { order: i + 1 });
  }
}

export async function deleteSet(id: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.sets, async () => {
    const set = await db.sets.get(id);
    if (!set) return;
    await db.sets.delete(id);
    const remaining = await db.sets.where('sessionId').equals(set.sessionId).count();
    if (remaining === 0) {
      await db.sessions.delete(set.sessionId);
    } else {
      await renumberDay(set.date);
    }
  });
}

export async function deleteDay(date: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.sets, async () => {
    await db.sets.where('date').equals(date).delete();
    await db.sessions.where('date').equals(date).delete();
  });
}

export function getDaySets(date: string): Promise<WorkoutSet[]> {
  return db.sets.where('date').equals(date).sortBy('order');
}

/** Sets of the most recent earlier day on which the exercise was done. */
export async function lastSessionBefore(
  exerciseId: string,
  date: string,
): Promise<{ date: string | null; sets: WorkoutSet[] }> {
  const all = await db.sets
    .where('exerciseId')
    .equals(exerciseId)
    .filter((s) => s.date < date)
    .toArray();
  if (all.length === 0) return { date: null, sets: [] };
  const latest = all.map((s) => s.date).sort().pop() as string;
  return {
    date: latest,
    sets: all.filter((s) => s.date === latest).sort((a, b) => a.order - b.order),
  };
}

export async function copyLastWorkout(exerciseId: string, date: string): Promise<number> {
  const last = await lastSessionBefore(exerciseId, date);
  if (last.sets.length === 0) return 0;
  await db.transaction('rw', db.sessions, db.sets, async () => {
    for (const s of last.sets) {
      await insertSet({ date, exerciseId, reps: s.reps, weightKg: s.weightKg, rpe: s.rpe });
    }
  });
  return last.sets.length;
}

export async function copyDay(fromDate: string, toDate: string): Promise<number> {
  const source = await getDaySets(fromDate);
  if (source.length === 0) return 0;
  await db.transaction('rw', db.sessions, db.sets, async () => {
    for (const s of source) {
      await insertSet({
        date: toDate,
        exerciseId: s.exerciseId,
        reps: s.reps,
        weightKg: s.weightKg,
        rpe: s.rpe,
        note: s.note,
      });
    }
  });
  return source.length;
}

/* ------------------------------- settings ------------------------------ */

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row ? (row.value as T) : fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

/* --------------------------- export and import -------------------------- */

export async function exportWorkoutsCsv(): Promise<string> {
  const [exercises, sets] = await Promise.all([db.exercises.toArray(), db.sets.toArray()]);
  return workoutsToCsv(exercises, sets);
}

export async function exportBodyweightCsv(): Promise<string | null> {
  const entries = await db.bodyweight.toArray();
  if (entries.length === 0) return null;
  return bodyweightToCsv(entries);
}

export interface ImportPreview {
  sets: number;
  duplicates: number;
  days: number;
  from?: string;
  to?: string;
  newExercises: number;
}

function summarize(plan: ReturnType<typeof planWorkoutImport>): ImportPreview {
  const dates = plan.toAdd.map((a) => a.row.date).sort();
  return {
    sets: plan.toAdd.length,
    duplicates: plan.duplicates,
    days: new Set(dates).size,
    from: dates[0],
    to: dates[dates.length - 1],
    newExercises: plan.newExercises.length,
  };
}

export async function previewWorkoutsImport(rows: ImportSetRow[]): Promise<ImportPreview> {
  const [exercises, ids] = await Promise.all([
    db.exercises.toArray(),
    db.sets.toCollection().primaryKeys(),
  ]);
  return summarize(planWorkoutImport(rows, exercises, new Set(ids as string[])));
}

export async function applyWorkoutsImport(rows: ImportSetRow[]): Promise<ImportPreview> {
  return db.transaction('rw', db.exercises, db.sessions, db.sets, async () => {
    const exercises = await db.exercises.toArray();
    const ids = new Set((await db.sets.toCollection().primaryKeys()) as string[]);
    const plan = planWorkoutImport(rows, exercises, ids);
    if (plan.newExercises.length > 0) await db.exercises.bulkAdd(plan.newExercises);

    const dates = [...new Set(plan.toAdd.map((a) => a.row.date))];
    const existing = await db.sessions.where('date').anyOf(dates).toArray();
    const sessionByDate = new Map(existing.map((s) => [s.date, s] as const));
    const newSessions: Session[] = [];
    for (const d of dates) {
      if (!sessionByDate.has(d)) {
        const s: Session = { id: newId(), date: d, createdAt: nowIso() };
        sessionByDate.set(d, s);
        newSessions.push(s);
      }
    }
    if (newSessions.length > 0) await db.sessions.bulkAdd(newSessions);

    const now = nowIso();
    const newSets: WorkoutSet[] = plan.toAdd.map(({ row, exerciseId }) => ({
      id: row.setId,
      sessionId: (sessionByDate.get(row.date) as Session).id,
      date: row.date,
      exerciseId,
      order: row.order,
      reps: row.reps,
      weightKg: row.weightKg,
      rpe: row.rpe,
      note: row.note,
      createdAt: now,
      updatedAt: now,
    }));
    if (newSets.length > 0) await db.sets.bulkAdd(newSets);
    for (const d of dates) await renumberDay(d);
    return summarize(plan);
  });
}

export async function applyBodyweightImport(
  rows: { date: string; kg: number }[],
  overwrite: boolean,
): Promise<{ added: number; updated: number; skipped: number }> {
  return db.transaction('rw', db.bodyweight, async () => {
    let added = 0;
    let updated = 0;
    let skipped = 0;
    for (const r of rows) {
      const existing = await db.bodyweight.where('date').equals(r.date).first();
      if (!existing) {
        await db.bodyweight.add({ id: newId(), date: r.date, kg: r.kg });
        added++;
      } else if (overwrite) {
        await db.bodyweight.update(existing.id, { kg: r.kg });
        updated++;
      } else {
        skipped++;
      }
    }
    return { added, updated, skipped };
  });
}

export async function clearAllData(): Promise<void> {
  await Promise.all(db.tables.map((t) => t.clear()));
  await ensureSeed();
}
