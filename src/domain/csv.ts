import { HANDS_VALUES, MUSCLE_GROUPS } from '../types';
import type { Exercise, Hands, MuscleGroup, WorkoutSet } from '../types';
import { isValidDateStr } from '../lib/dates';
import { newId } from '../lib/ids';

export type Cell = string | number | undefined | null;

export function escapeCell(v: Cell): string {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  return [header, ...rows].map((r) => r.map(escapeCell).join(',')).join('\r\n') + '\r\n';
}

/** RFC 4180 parser: quoted fields, escaped quotes, CRLF or LF, optional BOM. */
export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
    } else if (ch === ',') {
      row.push(field);
      field = '';
      i++;
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
    } else {
      field += ch;
      i++;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

export const WORKOUT_HEADER = [
  'set_id',
  'date',
  'order',
  'exercise_id',
  'exercise_name',
  'muscle_group',
  'hands',
  'reps',
  'weight_kg',
  'rpe',
  'note',
];
export const BODYWEIGHT_HEADER = ['date', 'weight_kg'];

export function workoutsToCsv(exercises: Exercise[], sets: WorkoutSet[]): string {
  const byId = new Map(exercises.map((e) => [e.id, e] as const));
  const sorted = [...sets].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : a.order - b.order,
  );
  const rows: Cell[][] = sorted.map((s) => {
    const e = byId.get(s.exerciseId);
    return [
      s.id,
      s.date,
      s.order,
      s.exerciseId,
      e?.name ?? '',
      e?.muscleGroup ?? 'other',
      e?.hands ?? 'na',
      s.reps,
      s.weightKg,
      s.rpe,
      s.note,
    ];
  });
  return toCsv(WORKOUT_HEADER, rows);
}

export function bodyweightToCsv(entries: { date: string; kg: number }[]): string {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return toCsv(
    BODYWEIGHT_HEADER,
    sorted.map((e) => [e.date, e.kg]),
  );
}

export interface ImportSetRow {
  setId: string;
  date: string;
  order: number;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  hands: Hands;
  reps: number;
  weightKg: number;
  rpe?: number;
  note?: string;
}

export interface CsvIssue {
  line: number;
  message: string;
}

export interface ParseResult<T> {
  rows: T[];
  errors: CsvIssue[];
  headerError?: string;
}

export function detectCsvKind(text: string): 'workouts' | 'bodyweight' | 'unknown' {
  const rows = parseCsv(text);
  if (rows.length === 0) return 'unknown';
  const header = rows[0].map((h) => h.trim().toLowerCase());
  if (header.includes('set_id') && header.includes('exercise_name')) return 'workouts';
  if (header.includes('date') && header.includes('weight_kg') && !header.includes('set_id')) {
    return 'bodyweight';
  }
  return 'unknown';
}

function indexOfColumns(header: string[], required: string[]): Record<string, number> | string {
  const idx: Record<string, number> = {};
  header.forEach((h, i) => {
    idx[h.trim().toLowerCase()] = i;
  });
  const missing = required.filter((c) => idx[c] === undefined);
  if (missing.length > 0) return 'Липсват колони: ' + missing.join(', ');
  return idx;
}

export function parseWorkoutsCsv(text: string): ParseResult<ImportSetRow> {
  const all = parseCsv(text);
  const result: ParseResult<ImportSetRow> = { rows: [], errors: [] };
  if (all.length === 0) {
    result.headerError = 'Файлът е празен.';
    return result;
  }
  const idx = indexOfColumns(all[0], ['date', 'exercise_name', 'reps', 'weight_kg']);
  if (typeof idx === 'string') {
    result.headerError = idx;
    return result;
  }
  const get = (r: string[], col: string): string => (idx[col] === undefined ? '' : (r[idx[col]] ?? '').trim());
  for (let i = 1; i < all.length; i++) {
    const r = all[i];
    const line = i + 1;
    const date = get(r, 'date');
    if (!isValidDateStr(date)) {
      result.errors.push({ line, message: 'Невалидна дата: ' + date });
      continue;
    }
    const name = get(r, 'exercise_name');
    if (name === '') {
      result.errors.push({ line, message: 'Липсва име на упражнение' });
      continue;
    }
    const reps = Number(get(r, 'reps'));
    if (!Number.isInteger(reps) || reps < 1 || reps > 200) {
      result.errors.push({ line, message: 'Невалидни повторения: ' + get(r, 'reps') });
      continue;
    }
    const weightText = get(r, 'weight_kg').replace(',', '.');
    const weight = weightText === '' ? NaN : Number(weightText);
    if (!Number.isFinite(weight) || weight < 0 || weight > 1000) {
      result.errors.push({ line, message: 'Невалидни килограми: ' + get(r, 'weight_kg') });
      continue;
    }
    let rpe: number | undefined;
    const rpeText = get(r, 'rpe').replace(',', '.');
    if (rpeText !== '') {
      const n = Number(rpeText);
      if (!Number.isFinite(n) || n < 1 || n > 10) {
        result.errors.push({ line, message: 'Невалиден RPE: ' + rpeText });
        continue;
      }
      rpe = n;
    }
    const orderNum = Number(get(r, 'order'));
    const mg = get(r, 'muscle_group') as MuscleGroup;
    const hands = get(r, 'hands') as Hands;
    const note = get(r, 'note');
    result.rows.push({
      setId: get(r, 'set_id') || newId(),
      date,
      order: Number.isFinite(orderNum) && orderNum > 0 ? orderNum : 9999,
      exerciseId: get(r, 'exercise_id'),
      exerciseName: name,
      muscleGroup: MUSCLE_GROUPS.includes(mg) ? mg : 'other',
      hands: HANDS_VALUES.includes(hands) ? hands : 'na',
      reps,
      weightKg: weight,
      rpe,
      note: note === '' ? undefined : note,
    });
  }
  return result;
}

export function parseBodyweightCsv(text: string): ParseResult<{ date: string; kg: number }> {
  const all = parseCsv(text);
  const result: ParseResult<{ date: string; kg: number }> = { rows: [], errors: [] };
  if (all.length === 0) {
    result.headerError = 'Файлът е празен.';
    return result;
  }
  const idx = indexOfColumns(all[0], ['date', 'weight_kg']);
  if (typeof idx === 'string') {
    result.headerError = idx;
    return result;
  }
  for (let i = 1; i < all.length; i++) {
    const r = all[i];
    const date = (r[idx['date']] ?? '').trim();
    const kg = Number((r[idx['weight_kg']] ?? '').trim().replace(',', '.'));
    if (!isValidDateStr(date)) {
      result.errors.push({ line: i + 1, message: 'Невалидна дата: ' + date });
      continue;
    }
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) {
      result.errors.push({ line: i + 1, message: 'Невалидно тегло: ' + (r[idx['weight_kg']] ?? '') });
      continue;
    }
    result.rows.push({ date, kg });
  }
  return result;
}
