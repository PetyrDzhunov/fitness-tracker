import { useEffect, useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { NumberField } from '../../components/NumberField';
import { useToast } from '../../components/Toast';
import { db } from '../../db/schema';
import { addSet, copyLastWorkout, lastSessionBefore, updateSet } from '../../db/repo';
import { formatKg } from '../../domain/calc';
import { validateSetFields } from '../../domain/validation';
import { useLive, useSetting } from '../../hooks/useLive';
import { formatLong } from '../../lib/dates';
import { bg } from '../../i18n/bg';
import type { Exercise, WorkoutSet } from '../../types';
import { useRestTimer } from './RestTimer';

interface Props {
  exercise: Exercise;
  date: string;
  editing?: WorkoutSet;
  onClose: () => void;
}

export function SetEntrySheet({ exercise, date, editing, onClose }: Props) {
  const timer = useRestTimer();
  const toast = useToast();
  const [restSeconds] = useSetting<number>('restSeconds', 90);
  const [autoRest] = useSetting<boolean>('autoRest', true);

  const doneToday = useLive(
    () =>
      db.sets
        .where('exerciseId')
        .equals(exercise.id)
        .and((s) => s.date === date)
        .sortBy('order'),
    [exercise.id, date],
  );
  const last = useLive(() => lastSessionBefore(exercise.id, date), [exercise.id, date]);

  const [reps, setReps] = useState(editing ? String(editing.reps) : '');
  const [weight, setWeight] = useState(editing ? String(editing.weightKg) : '');
  const [rpe, setRpe] = useState(editing?.rpe !== undefined ? String(editing.rpe) : '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [error, setError] = useState('');
  const [prefilled, setPrefilled] = useState(!!editing);

  // Pre-fill once from the previous set today, otherwise from the last session.
  useEffect(() => {
    if (prefilled || doneToday === undefined || last === undefined) return;
    const ref = doneToday.length > 0 ? doneToday[doneToday.length - 1] : last.sets[last.sets.length - 1];
    if (ref) {
      setReps(String(ref.reps));
      setWeight(String(ref.weightKg));
    }
    setPrefilled(true);
  }, [prefilled, doneToday, last]);

  const save = async (keepOpen: boolean) => {
    const v = validateSetFields(reps, weight, rpe);
    if (!v.ok) {
      setError(v.error);
      return;
    }
    setError('');
    const cleanNote = note.trim() === '' ? undefined : note.trim();
    if (editing) {
      await updateSet(editing.id, { ...v.value, note: cleanNote });
      onClose();
      return;
    }
    const res = await addSet({ date, exerciseId: exercise.id, ...v.value, note: cleanNote });
    if (autoRest) timer.start(restSeconds);
    toast.show(res.isRecord ? bg.newRecord : bg.setSaved);
    if (keepOpen) {
      setNote('');
    } else {
      onClose();
    }
  };

  const copyLast = async () => {
    await copyLastWorkout(exercise.id, date);
    onClose();
  };

  const showCopy = !editing && last && last.sets.length > 0 && doneToday && doneToday.length === 0;

  return (
    <Sheet title={exercise.name} onClose={onClose}>
      {last && last.date && (
        <p className="hint">
          {bg.last} ({formatLong(last.date)}):{' '}
          {last.sets.map((s) => `${s.reps}×${formatKg(s.weightKg)}`).join(', ')}
        </p>
      )}
      {!editing && doneToday && doneToday.length > 0 && (
        <p className="hint">
          Днес: {doneToday.map((s) => `${s.reps}×${formatKg(s.weightKg)}`).join(', ')}
        </p>
      )}
      {showCopy && (
        <button type="button" className="btn wide" onClick={copyLast}>
          {bg.copyLast}
        </button>
      )}
      <div className="form">
        <NumberField
          label={bg.reps}
          value={reps}
          onChange={setReps}
          step={1}
          min={0}
          max={200}
          inputMode="numeric"
        />
        <NumberField
          label={bg.weight}
          value={weight}
          onChange={setWeight}
          step={2.5}
          inputMode="decimal"
          hint={exercise.perHand ? bg.perHand : undefined}
        />
        <div className="field">
          <label className="field-label" htmlFor="rpe">
            {bg.rpe}
          </label>
          <input
            id="rpe"
            value={rpe}
            onChange={(e) => setRpe(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="note">
            {bg.note}
          </label>
          <input
            id="note"
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
            autoComplete="off"
          />
        </div>
        {error && <p className="error">{error}</p>}
        {editing ? (
          <div className="btn-row">
            <button type="button" className="btn primary wide" onClick={() => save(false)}>
              {bg.saveChanges}
            </button>
          </div>
        ) : (
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => save(false)}>
              {bg.saveSet}
            </button>
            <button type="button" className="btn primary" onClick={() => save(true)}>
              {bg.saveAndNext}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
