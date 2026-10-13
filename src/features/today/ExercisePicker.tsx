import { useMemo, useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { db } from '../../db/schema';
import { createExercise, recentExerciseIds } from '../../db/repo';
import { useLive } from '../../hooks/useLive';
import { bg, HANDS_LABEL, MUSCLE_LABEL } from '../../i18n/bg';
import { HANDS_VALUES, MUSCLE_GROUPS } from '../../types';
import type { Exercise, Hands, MuscleGroup } from '../../types';

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

interface Props {
  onPick: (e: Exercise) => void;
  onClose: () => void;
}

export function ExercisePicker({ onPick, onClose }: Props) {
  const exercises = useLive(() => db.exercises.toArray(), []);
  const recentIds = useLive(() => recentExerciseIds(8), []);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | 'all'>('all');
  const [creating, setCreating] = useState(false);

  const visible = useMemo(() => {
    const q = norm(query.trim());
    return (exercises ?? [])
      .filter((e) => !e.archived)
      .filter((e) => group === 'all' || e.muscleGroup === group)
      .filter((e) => q === '' || norm(e.name).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'bg'));
  }, [exercises, query, group]);

  const recent = useMemo(() => {
    if (query.trim() !== '' || group !== 'all') return [];
    const byId = new Map((exercises ?? []).map((e) => [e.id, e] as const));
    return (recentIds ?? [])
      .map((id) => byId.get(id))
      .filter((e): e is Exercise => !!e && !e.archived);
  }, [exercises, recentIds, query, group]);

  return (
    <Sheet title={bg.addExercise.replace('+ ', '')} onClose={onClose}>
      {creating ? (
        <NewExerciseForm
          onCancel={() => setCreating(false)}
          onCreated={(e) => {
            onPick(e);
          }}
        />
      ) : (
        <>
          <input
            className="search"
            type="search"
            placeholder={bg.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          <div className="chips">
            <button
              type="button"
              className={'chip' + (group === 'all' ? ' on' : '')}
              onClick={() => setGroup('all')}
            >
              {bg.all}
            </button>
            {MUSCLE_GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                className={'chip' + (group === g ? ' on' : '')}
                onClick={() => setGroup(g)}
              >
                {MUSCLE_LABEL[g]}
              </button>
            ))}
          </div>
          <button type="button" className="btn wide" onClick={() => setCreating(true)}>
            {bg.newExercise}
          </button>
          {recent.length > 0 && (
            <>
              <h3 className="list-title">{bg.recent}</h3>
              <ul className="list">
                {recent.map((e) => (
                  <li key={'r' + e.id}>
                    <button type="button" className="row-btn" onClick={() => onPick(e)}>
                      <span>{e.name}</span>
                      <small>{MUSCLE_LABEL[e.muscleGroup]}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h3 className="list-title">{bg.all}</h3>
          <ul className="list">
            {visible.map((e) => (
              <li key={e.id}>
                <button type="button" className="row-btn" onClick={() => onPick(e)}>
                  <span>{e.name}</span>
                  <small>{MUSCLE_LABEL[e.muscleGroup]}</small>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}

function NewExerciseForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (e: Exercise) => void;
}) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState<MuscleGroup>('chest');
  const [hands, setHands] = useState<Hands>('na');
  const [error, setError] = useState('');

  const submit = async () => {
    try {
      const ex = await createExercise({ name, muscleGroup: group, hands });
      onCreated(ex);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="form">
      <div className="field">
        <label className="field-label" htmlFor="ex-name">
          {bg.exerciseName}
        </label>
        <input id="ex-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="ex-group">
          {bg.muscleGroup}
        </label>
        <select id="ex-group" value={group} onChange={(e) => setGroup(e.target.value as MuscleGroup)}>
          {MUSCLE_GROUPS.map((g) => (
            <option key={g} value={g}>
              {MUSCLE_LABEL[g]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="ex-hands">
          {bg.handsLabel}
        </label>
        <select id="ex-hands" value={hands} onChange={(e) => setHands(e.target.value as Hands)}>
          {HANDS_VALUES.map((h) => (
            <option key={h} value={h}>
              {HANDS_LABEL[h]}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="btn-row">
        <button type="button" className="btn" onClick={onCancel}>
          {bg.cancel}
        </button>
        <button type="button" className="btn primary" onClick={submit}>
          {bg.create}
        </button>
      </div>
    </div>
  );
}
