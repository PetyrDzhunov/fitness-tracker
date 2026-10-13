import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/db/schema';
import { ensureSeed } from '../src/db/seed';
import {
  addSet,
  applyWorkoutsImport,
  clearAllData,
  deleteSet,
  exportWorkoutsCsv,
  lastSessionBefore,
} from '../src/db/repo';
import { parseWorkoutsCsv } from '../src/domain/csv';

beforeEach(async () => {
  await clearAllData();
});

describe('seed', () => {
  it('creates 1-hand and 2-hand variants and is idempotent', async () => {
    await ensureSeed();
    const count = await db.exercises.count();
    expect(count).toBeGreaterThan(50);
    expect(await db.exercises.get('seed:1:1h')).toBeTruthy();
    expect(await db.exercises.get('seed:1:2h')).toBeTruthy();
    expect(await db.exercises.get('seed:0:na')).toBeTruthy();
    await ensureSeed();
    expect(await db.exercises.count()).toBe(count);
  });
});

describe('sets', () => {
  it('numbers sets per day, flags records and cleans up empty days', async () => {
    const a = await addSet({ date: '2026-10-01', exerciseId: 'seed:0:na', reps: 8, weightKg: 60 });
    expect(a.isRecord).toBe(false); // first ever set
    const b = await addSet({ date: '2026-10-08', exerciseId: 'seed:0:na', reps: 8, weightKg: 62.5 });
    expect(b.isRecord).toBe(true);
    const c = await addSet({ date: '2026-10-08', exerciseId: 'seed:0:na', reps: 6, weightKg: 55 });
    expect(c.set.order).toBe(2);
    expect(c.isRecord).toBe(false);

    const last = await lastSessionBefore('seed:0:na', '2026-10-13');
    expect(last.date).toBe('2026-10-08');
    expect(last.sets).toHaveLength(2);

    await deleteSet(b.set.id);
    const remaining = await db.sets.where('date').equals('2026-10-08').toArray();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].order).toBe(1);

    await deleteSet(a.set.id);
    expect(await db.sessions.where('date').equals('2026-10-01').count()).toBe(0);
  });
});

describe('csv export and import', () => {
  it('restores the same sets and ignores duplicates on a second import', async () => {
    await addSet({ date: '2026-10-01', exerciseId: 'seed:0:na', reps: 8, weightKg: 60, rpe: 8, note: 'ok, "добре"' });
    await addSet({ date: '2026-10-01', exerciseId: 'seed:1:1h', reps: 12, weightKg: 20 });
    await addSet({ date: '2026-10-05', exerciseId: 'seed:1:2h', reps: 10, weightKg: 22.5 });

    const before = (await db.sets.toArray()).sort((x, y) => x.id.localeCompare(y.id));
    const csv = await exportWorkoutsCsv();

    await clearAllData();
    expect(await db.sets.count()).toBe(0);

    const parsed = parseWorkoutsCsv(csv);
    expect(parsed.errors).toHaveLength(0);
    const first = await applyWorkoutsImport(parsed.rows);
    expect(first.sets).toBe(3);

    const after = (await db.sets.toArray()).sort((x, y) => x.id.localeCompare(y.id));
    expect(after.map((s) => [s.id, s.date, s.order, s.exerciseId, s.reps, s.weightKg, s.rpe, s.note])).toEqual(
      before.map((s) => [s.id, s.date, s.order, s.exerciseId, s.reps, s.weightKg, s.rpe, s.note]),
    );

    const second = await applyWorkoutsImport(parsed.rows);
    expect(second.sets).toBe(0);
    expect(second.duplicates).toBe(3);
    expect(await db.sets.count()).toBe(3);
  });

  it('creates custom exercises that are missing on a fresh install', async () => {
    const csv =
      'set_id,date,order,exercise_id,exercise_name,muscle_group,hands,reps,weight_kg,rpe,note\r\n' +
      'abc,2026-10-02,1,custom-1,Моето упражнение,back,2h,10,30,,\r\n';
    const parsed = parseWorkoutsCsv(csv);
    const res = await applyWorkoutsImport(parsed.rows);
    expect(res.newExercises).toBe(1);
    const ex = await db.exercises.get('custom-1');
    expect(ex?.isCustom).toBe(true);
    expect(ex?.name).toBe('Моето упражнение');
  });
});
