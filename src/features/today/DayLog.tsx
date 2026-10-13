import { useMemo, useState } from 'react';
import { db } from '../../db/schema';
import { deleteSet, getDaySets } from '../../db/repo';
import { formatKg, totalVolume } from '../../domain/calc';
import { useLive } from '../../hooks/useLive';
import { bg } from '../../i18n/bg';
import type { Exercise, WorkoutSet } from '../../types';
import { ExercisePicker } from './ExercisePicker';
import { SetEntrySheet } from './SetEntrySheet';

interface Entry {
  exercise: Exercise;
  editing?: WorkoutSet;
}

/** The list of exercises and sets for one day, with all add / edit / delete controls. */
export function DayLog({ date, emptyText }: { date: string; emptyText?: string }) {
  const sets = useLive(() => getDaySets(date), [date]);
  const exercises = useLive(() => db.exercises.toArray(), []);
  const [picker, setPicker] = useState(false);
  const [entry, setEntry] = useState<Entry | null>(null);

  const byId = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e] as const)), [exercises]);

  const groups = useMemo(() => {
    const m = new Map<string, WorkoutSet[]>();
    for (const s of sets ?? []) {
      const list = m.get(s.exerciseId) ?? [];
      list.push(s);
      m.set(s.exerciseId, list);
    }
    return [...m.entries()];
  }, [sets]);

  const remove = async (id: string) => {
    if (window.confirm(bg.confirmDeleteSet)) await deleteSet(id);
  };

  return (
    <div className="daylog">
      {sets && sets.length > 0 && (
        <p className="summary">
          {bg.totalVolume}: <strong>{formatKg(totalVolume(sets))} кг</strong>
        </p>
      )}
      {sets && sets.length === 0 && <p className="empty">{emptyText ?? bg.emptyToday}</p>}

      {groups.map(([exerciseId, list]) => {
        const ex = byId.get(exerciseId);
        return (
          <section key={exerciseId} className="card">
            <div className="card-head">
              <h3>{ex?.name ?? 'Непознато упражнение'}</h3>
              {ex && (
                <button type="button" className="btn small" onClick={() => setEntry({ exercise: ex })}>
                  {bg.addSet}
                </button>
              )}
            </div>
            <ol className="sets">
              {list.map((s, i) => (
                <li key={s.id}>
                  <span className="set-text">
                    <b>{i + 1}.</b> {s.reps} × {formatKg(s.weightKg)} кг
                    {ex?.perHand ? ' /ръка' : ''}
                    {s.rpe !== undefined ? ` · RPE ${s.rpe}` : ''}
                    {s.note ? <em> · {s.note}</em> : null}
                  </span>
                  <span className="set-actions">
                    {ex && (
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => setEntry({ exercise: ex, editing: s })}
                      >
                        {bg.edit}
                      </button>
                    )}
                    <button type="button" className="link-btn danger" onClick={() => remove(s.id)}>
                      {bg.delete}
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <button type="button" className="fab" onClick={() => setPicker(true)}>
        {bg.addExercise}
      </button>

      {picker && (
        <ExercisePicker
          onClose={() => setPicker(false)}
          onPick={(exercise) => {
            setPicker(false);
            setEntry({ exercise });
          }}
        />
      )}
      {entry && (
        <SetEntrySheet
          exercise={entry.exercise}
          editing={entry.editing}
          date={date}
          onClose={() => setEntry(null)}
        />
      )}
    </div>
  );
}
