export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'glutes'
  | 'core'
  | 'forearms'
  | 'cardio'
  | 'other';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'legs',
  'glutes',
  'core',
  'forearms',
  'cardio',
  'other',
];

export type Hands = '1h' | '2h' | 'na';
export const HANDS_VALUES: Hands[] = ['1h', '2h', 'na'];

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  hands: Hands;
  baseKey?: string;
  isCustom: boolean;
  archived: boolean;
  /** Weight is entered per hand (dumbbell-style) when true. */
  perHand: boolean;
}

export interface Session {
  id: string;
  date: string; // YYYY-MM-DD (local)
  note?: string;
  createdAt: string;
}

export interface WorkoutSet {
  id: string;
  sessionId: string;
  date: string;
  exerciseId: string;
  order: number;
  reps: number;
  weightKg: number;
  rpe?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BodyweightEntry {
  id: string;
  date: string;
  kg: number;
}

/** Used from stage 2 (progress photos). The table is created now to avoid a later migration. */
export interface PhotoRecord {
  id: string;
  date: string;
  image: Blob;
  thumb: Blob;
  width: number;
  height: number;
  note?: string;
  createdAt: string;
}

export interface SettingRow {
  key: string;
  value: unknown;
}
