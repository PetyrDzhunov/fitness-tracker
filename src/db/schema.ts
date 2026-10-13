import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { BodyweightEntry, Exercise, PhotoRecord, Session, SettingRow, WorkoutSet } from '../types';

export class AppDB extends Dexie {
  exercises!: Table<Exercise, string>;
  sessions!: Table<Session, string>;
  sets!: Table<WorkoutSet, string>;
  bodyweight!: Table<BodyweightEntry, string>;
  photos!: Table<PhotoRecord, string>;
  settings!: Table<SettingRow, string>;

  constructor(name = 'fitness-tracker') {
    super(name);
    this.version(1).stores({
      exercises: 'id, name, muscleGroup, isCustom, archived',
      sessions: 'id, &date',
      sets: 'id, sessionId, exerciseId, [exerciseId+date], date, createdAt',
      bodyweight: 'id, &date',
      photos: 'id, date, createdAt',
      settings: 'key',
    });
  }
}

export const db = new AppDB();
