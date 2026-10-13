export function parseNum(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export interface ValidSet {
  reps: number;
  weightKg: number;
  rpe?: number;
}

export type SetValidation = { ok: true; value: ValidSet } | { ok: false; error: string };

export function validateSetFields(repsText: string, weightText: string, rpeText: string): SetValidation {
  const reps = parseNum(repsText);
  if (reps === null || !Number.isInteger(reps) || reps < 1 || reps > 200) {
    return { ok: false, error: 'Повторенията трябва да са цяло число от 1 до 200.' };
  }
  const weight = parseNum(weightText);
  if (weight === null || weight < 0 || weight > 1000) {
    return { ok: false, error: 'Килограмите трябва да са число от 0 до 1000.' };
  }
  let rpe: number | undefined;
  if (rpeText.trim() !== '') {
    const r = parseNum(rpeText);
    if (r === null || r < 1 || r > 10) {
      return { ok: false, error: 'RPE трябва да е число от 1 до 10.' };
    }
    rpe = r;
  }
  return { ok: true, value: { reps, weightKg: weight, rpe } };
}
