/** Epley estimated one-rep max. For a single rep the weight itself is the 1RM. */
export function e1rm(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function round(n: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** Weight exactly as entered (per hand for dumbbell exercises). See spec assumption A1. */
export function setVolume(s: { weightKg: number; reps: number }): number {
  return s.weightKg * s.reps;
}

export function totalVolume(sets: { weightKg: number; reps: number }[]): number {
  return sets.reduce((sum, s) => sum + setVolume(s), 0);
}

export function formatKg(n: number): string {
  return Number(n.toFixed(2)).toString();
}

/**
 * A new personal record: heavier than any previous weight, or a better estimated 1RM.
 * Never for the very first set of an exercise, and never for 0 kg sets.
 */
export function isNewRecord(
  previous: { weightKg: number; reps: number }[],
  current: { weightKg: number; reps: number },
): boolean {
  if (previous.length === 0 || current.weightKg <= 0) return false;
  const prevMaxWeight = Math.max(...previous.map((p) => p.weightKg));
  const prevBestE1rm = Math.max(...previous.map((p) => e1rm(p.weightKg, p.reps)));
  return (
    current.weightKg > prevMaxWeight ||
    e1rm(current.weightKg, current.reps) > prevBestE1rm + 1e-9
  );
}
