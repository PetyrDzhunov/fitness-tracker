import { db } from './schema';
import type { Exercise, MuscleGroup } from '../types';

/**
 * kind: 'both' creates a "- 1 ръка" and a "- 2 ръце" entry,
 *       'na'   creates one entry where the hand distinction does not apply,
 *       '1h'   creates one entry that is always one-handed.
 *
 * IMPORTANT: the list is append-only. Seed ids are built from the index, so never reorder or remove entries.
 */
type Kind = 'both' | 'na' | '1h';
type Def = [name: string, group: MuscleGroup, kind: Kind];

export const SEED_DEFS: Def[] = [
  // chest
  ['Лежанка с щанга', 'chest', 'na'],
  ['Лежанка с дъмбели', 'chest', 'both'],
  ['Наклонена лежанка с щанга', 'chest', 'na'],
  ['Наклонена лежанка с дъмбели', 'chest', 'both'],
  ['Разтваряне с дъмбели', 'chest', 'both'],
  ['Лост на машина', 'chest', 'na'],
  ['Кросоувър на скрипец', 'chest', 'both'],
  ['Лицеви опори', 'chest', 'na'],
  // back
  ['Мъртва тяга', 'back', 'na'],
  ['Гребане с щанга', 'back', 'na'],
  ['Гребане с дъмбел', 'back', 'both'],
  ['Горен скрипец', 'back', 'both'],
  ['Гребане на скрипец седнал', 'back', 'both'],
  ['Набирания', 'back', 'na'],
  ['Хиперекстензия', 'back', 'na'],
  // shoulders
  ['Раменна преса с щанга', 'shoulders', 'na'],
  ['Раменна преса с дъмбели', 'shoulders', 'both'],
  ['Странично повдигане', 'shoulders', 'both'],
  ['Предно повдигане', 'shoulders', 'both'],
  ['Задно рамо с дъмбели', 'shoulders', 'both'],
  ['Шраг с дъмбели', 'shoulders', 'both'],
  ['Шраг с щанга', 'shoulders', 'na'],
  // biceps
  ['Сгъване с щанга', 'biceps', 'na'],
  ['Сгъване с дъмбел', 'biceps', 'both'],
  ['Чукове', 'biceps', 'both'],
  ['Сгъване на скрипец', 'biceps', 'both'],
  ['Концентрирано сгъване', 'biceps', '1h'],
  // triceps
  ['Френска преса', 'triceps', 'both'],
  ['Разгъване на горен скрипец', 'triceps', 'both'],
  ['Дипове', 'triceps', 'na'],
  ['Разгъване зад глава с дъмбел', 'triceps', 'both'],
  ['Тясна лежанка', 'triceps', 'na'],
  // legs
  ['Клек с щанга', 'legs', 'na'],
  ['Предно клякане', 'legs', 'na'],
  ['Лег преса', 'legs', 'na'],
  ['Румънска мъртва тяга', 'legs', 'na'],
  ['Напади с дъмбели', 'legs', 'both'],
  ['Български клек', 'legs', 'both'],
  ['Разгъване на крака', 'legs', 'na'],
  ['Сгъване на крака', 'legs', 'na'],
  ['Повдигане на пръсти', 'legs', 'na'],
  // glutes
  ['Хип тръст', 'glutes', 'na'],
  ['Глутеус мост', 'glutes', 'na'],
  // core
  ['Коремни преси', 'core', 'na'],
  ['Планк', 'core', 'na'],
  ['Повдигане на крака виснал', 'core', 'na'],
  ['Руски завъртания', 'core', 'na'],
  // forearms
  ['Сгъване на китки', 'forearms', 'both'],
  // cardio
  ['Бягаща пътека', 'cardio', 'na'],
  ['Колело', 'cardio', 'na'],
  ['Гребна машина', 'cardio', 'na'],
];

export const SEED_VERSION = 1;

export function buildSeedExercises(): Exercise[] {
  const out: Exercise[] = [];
  SEED_DEFS.forEach(([name, group, kind], i) => {
    const baseKey = `seed-${i}`;
    if (kind === 'both') {
      out.push({
        id: `seed:${i}:1h`,
        name: `${name} - 1 ръка`,
        muscleGroup: group,
        hands: '1h',
        baseKey,
        isCustom: false,
        archived: false,
        perHand: true,
      });
      out.push({
        id: `seed:${i}:2h`,
        name: `${name} - 2 ръце`,
        muscleGroup: group,
        hands: '2h',
        baseKey,
        isCustom: false,
        archived: false,
        perHand: true,
      });
    } else if (kind === '1h') {
      out.push({
        id: `seed:${i}:1h`,
        name: `${name} - 1 ръка`,
        muscleGroup: group,
        hands: '1h',
        baseKey,
        isCustom: false,
        archived: false,
        perHand: true,
      });
    } else {
      out.push({
        id: `seed:${i}:na`,
        name,
        muscleGroup: group,
        hands: 'na',
        baseKey,
        isCustom: false,
        archived: false,
        perHand: false,
      });
    }
  });
  return out;
}

/** Inserts missing seed exercises. Existing rows (including archived ones) are never overwritten. */
export async function ensureSeed(): Promise<void> {
  const row = await db.settings.get('seedVersion');
  if (row && row.value === SEED_VERSION) return;
  const have = new Set((await db.exercises.toCollection().primaryKeys()) as string[]);
  const missing = buildSeedExercises().filter((e) => !have.has(e.id));
  await db.transaction('rw', db.exercises, db.settings, async () => {
    if (missing.length > 0) await db.exercises.bulkAdd(missing);
    await db.settings.put({ key: 'seedVersion', value: SEED_VERSION });
  });
}
