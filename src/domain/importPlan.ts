import type { Exercise } from '../types';
import type { ImportSetRow } from './csv';
import { newId } from '../lib/ids';

export interface WorkoutImportPlan {
  toAdd: { row: ImportSetRow; exerciseId: string }[];
  newExercises: Exercise[];
  duplicates: number;
}

/**
 * Pure planning step shared by the import preview and the real import.
 * Exercises are matched by id first, then by name (case-insensitive); otherwise a custom one is created.
 * Rows whose set id already exists are skipped, so importing the same file twice adds nothing.
 */
export function planWorkoutImport(
  rows: ImportSetRow[],
  exercises: Exercise[],
  existingSetIds: Set<string>,
): WorkoutImportPlan {
  const byId = new Map(exercises.map((e) => [e.id, e] as const));
  const byName = new Map(exercises.map((e) => [e.name.toLowerCase(), e] as const));
  const created = new Map<string, Exercise>();
  const seen = new Set<string>(existingSetIds);
  const toAdd: WorkoutImportPlan['toAdd'] = [];
  let duplicates = 0;

  for (const row of rows) {
    if (seen.has(row.setId)) {
      duplicates++;
      continue;
    }
    seen.add(row.setId);
    const nameKey = row.exerciseName.toLowerCase();
    let ex = byId.get(row.exerciseId) ?? byName.get(nameKey) ?? created.get(nameKey);
    if (!ex) {
      const id = row.exerciseId && !byId.has(row.exerciseId) ? row.exerciseId : newId();
      ex = {
        id,
        name: row.exerciseName,
        muscleGroup: row.muscleGroup,
        hands: row.hands,
        isCustom: true,
        archived: false,
        perHand: row.hands !== 'na',
      };
      created.set(nameKey, ex);
    }
    toAdd.push({ row, exerciseId: ex.id });
  }
  return { toAdd, newExercises: [...created.values()], duplicates };
}
