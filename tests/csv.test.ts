import { describe, expect, it } from 'vitest';
import {
  detectCsvKind,
  parseBodyweightCsv,
  parseCsv,
  parseWorkoutsCsv,
  toCsv,
  workoutsToCsv,
} from '../src/domain/csv';
import type { Exercise, WorkoutSet } from '../src/types';

describe('csv', () => {
  it('round-trips commas, quotes, newlines and Cyrillic', () => {
    const rows = [
      ['a,b', 'say "hi"', 'line1\nline2', 'Лежанка'],
      ['', '1', '2.5', 'x'],
    ];
    const text = toCsv(['c1', 'c2', 'c3', 'c4'], rows);
    expect(parseCsv(text)).toEqual([['c1', 'c2', 'c3', 'c4'], ...rows]);
  });

  it('handles BOM and LF line endings', () => {
    expect(parseCsv('﻿a,b\n1,2\n')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('parses workouts and reports row errors with line numbers', () => {
    const exercises: Exercise[] = [
      { id: 'e1', name: 'Клек с щанга', muscleGroup: 'legs', hands: 'na', isCustom: false, archived: false, perHand: false },
    ];
    const sets: WorkoutSet[] = [
      {
        id: 's1', sessionId: 'x', date: '2026-10-13', exerciseId: 'e1', order: 1,
        reps: 5, weightKg: 100, rpe: 8, note: 'добре, но "тежко"', createdAt: 't', updatedAt: 't',
      },
    ];
    const csv = workoutsToCsv(exercises, sets) + '1,2026-13-45,1,e1,Клек,legs,na,5,100,,\r\n';
    const res = parseWorkoutsCsv(csv);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]).toMatchObject({ setId: 's1', reps: 5, weightKg: 100, rpe: 8, note: 'добре, но "тежко"' });
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].line).toBe(3);
  });

  it('detects file kinds and parses bodyweight', () => {
    expect(detectCsvKind('date,weight_kg\n2026-10-13,82.5\n')).toBe('bodyweight');
    expect(detectCsvKind('set_id,date,exercise_name,reps,weight_kg\n')).toBe('workouts');
    expect(detectCsvKind('foo,bar\n')).toBe('unknown');
    const res = parseBodyweightCsv('date,weight_kg\n2026-10-13,82.5\n2026-10-14,5\n');
    expect(res.rows).toEqual([{ date: '2026-10-13', kg: 82.5 }]);
    expect(res.errors).toHaveLength(1);
  });
});
