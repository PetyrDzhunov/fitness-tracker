import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useToast } from '../../components/Toast';
import { db } from '../../db/schema';
import {
  applyBodyweightImport,
  applyWorkoutsImport,
  clearAllData,
  deleteExerciseIfUnused,
  exportBodyweightCsv,
  exportWorkoutsCsv,
  previewWorkoutsImport,
  renameExercise,
  setArchived,
  setSetting,
} from '../../db/repo';
import type { ImportPreview } from '../../db/repo';
import { detectCsvKind, parseBodyweightCsv, parseWorkoutsCsv } from '../../domain/csv';
import type { CsvIssue, ImportSetRow } from '../../domain/csv';
import { useLive, useSetting } from '../../hooks/useLive';
import { bg, MUSCLE_LABEL } from '../../i18n/bg';
import { saveFiles } from '../../lib/files';
import type { OutFile } from '../../lib/files';
import { todayStr } from '../../lib/dates';
import { APP_VERSION } from '../../version';

interface PendingImport {
  name: string;
  kind: 'workouts' | 'bodyweight';
  workouts?: ImportSetRow[];
  body?: { date: string; kg: number }[];
  errors: CsvIssue[];
  preview?: ImportPreview;
}

export function SettingsPage() {
  const toast = useToast();
  const [theme, setTheme] = useSetting<string>('theme', 'system');
  const [restSeconds, setRestSeconds] = useSetting<number>('restSeconds', 90);
  const [autoRest, setAutoRest] = useSetting<boolean>('autoRest', true);
  const [lastExportAt] = useSetting<string | null>('lastExportAt', null);
  const exercises = useLive(() => db.exercises.toArray(), []);

  const [pending, setPending] = useState<PendingImport[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [overwrite, setOverwrite] = useState(false);

  const doExport = async () => {
    const files: OutFile[] = [];
    const d = todayStr();
    files.push({ name: `workouts-${d}.csv`, text: await exportWorkoutsCsv() });
    const body = await exportBodyweightCsv();
    if (body) files.push({ name: `bodyweight-${d}.csv`, text: body });
    await saveFiles(files);
    await setSetting('lastExportAt', new Date().toISOString());
  };

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    const next: PendingImport[] = [];
    const issues: string[] = [];
    for (const file of picked) {
      const text = await file.text();
      const kind = detectCsvKind(text);
      if (kind === 'workouts') {
        const res = parseWorkoutsCsv(text);
        if (res.headerError) {
          issues.push(`${file.name}: ${res.headerError}`);
          continue;
        }
        next.push({
          name: file.name,
          kind,
          workouts: res.rows,
          errors: res.errors,
          preview: await previewWorkoutsImport(res.rows),
        });
      } else if (kind === 'bodyweight') {
        const res = parseBodyweightCsv(text);
        if (res.headerError) {
          issues.push(`${file.name}: ${res.headerError}`);
          continue;
        }
        next.push({ name: file.name, kind, body: res.rows, errors: res.errors });
      } else {
        issues.push(`${file.name}: непознат формат на файла.`);
      }
    }
    setPending(next);
    setProblems(issues);
  };

  const applyImport = async () => {
    let sets = 0;
    let days = 0;
    let weights = 0;
    for (const p of pending) {
      if (p.kind === 'workouts' && p.workouts) {
        const r = await applyWorkoutsImport(p.workouts);
        sets += r.sets;
        days += r.days;
      } else if (p.kind === 'bodyweight' && p.body) {
        const r = await applyBodyweightImport(p.body, overwrite);
        weights += r.added + r.updated;
      }
    }
    setPending([]);
    toast.show(`Импортирани: ${sets} серии, ${days} дни, ${weights} записа за тегло`);
  };

  const wipe = async () => {
    const answer = window.prompt(bg.settings.deleteAllConfirm);
    if (answer === bg.settings.deleteAllWord) {
      await clearAllData();
      window.location.reload();
    }
  };

  const managed = (exercises ?? [])
    .filter((e) => e.isCustom || e.archived)
    .sort((a, b) => a.name.localeCompare(b.name, 'bg'));

  const rename = async (id: string, current: string) => {
    const name = window.prompt(bg.settings.rename, current);
    if (name) await renameExercise(id, name);
  };

  const remove = async (id: string) => {
    const ok = await deleteExerciseIfUnused(id);
    toast.show(ok ? 'Упражнението е изтрито' : 'Упражнението има серии и не може да се изтрие. Архивирай го.');
  };

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-title">
          <h1>{bg.tabs.settings}</h1>
        </div>
      </header>

      <section className="card">
        <div className="field">
          <label className="field-label" htmlFor="theme">
            {bg.settings.theme}
          </label>
          <select id="theme" value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="system">{bg.settings.themeSystem}</option>
            <option value="light">{bg.settings.themeLight}</option>
            <option value="dark">{bg.settings.themeDark}</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="rest">
            {bg.settings.rest}
          </label>
          <select id="rest" value={restSeconds} onChange={(e) => setRestSeconds(Number(e.target.value))}>
            {[60, 90, 120, 180].map((s) => (
              <option key={s} value={s}>
                {s} сек
              </option>
            ))}
          </select>
        </div>
        <label className="check">
          <input type="checkbox" checked={autoRest} onChange={(e) => setAutoRest(e.target.checked)} />
          <span>{bg.settings.autoRest}</span>
        </label>
      </section>

      <section className="card">
        <p className="summary">
          {bg.settings.lastExport}:{' '}
          <strong>{lastExportAt ? new Date(lastExportAt).toLocaleString('bg-BG') : bg.settings.never}</strong>
        </p>
        <div className="btn-row">
          <button type="button" className="btn primary" onClick={doExport}>
            {bg.settings.export}
          </button>
          <label className="btn file-btn">
            {bg.settings.import}
            <input type="file" accept=".csv,text/csv" multiple hidden onChange={onFiles} />
          </label>
        </div>

        {problems.map((p) => (
          <p key={p} className="error">
            {p}
          </p>
        ))}

        {pending.length > 0 && (
          <div className="import-box">
            <h3>{bg.settings.importPreview}</h3>
            {pending.map((p) => (
              <div key={p.name} className="import-item">
                <strong>{p.name}</strong>
                {p.kind === 'workouts' && p.preview && (
                  <p>
                    Нови серии: {p.preview.sets}, дни: {p.preview.days}
                    {p.preview.from ? ` (${p.preview.from} – ${p.preview.to})` : ''}, нови упражнения:{' '}
                    {p.preview.newExercises}, пропуснати дубликати: {p.preview.duplicates}
                  </p>
                )}
                {p.kind === 'bodyweight' && <p>Записи за тегло: {p.body?.length ?? 0}</p>}
                {p.errors.length > 0 && (
                  <details>
                    <summary className="error">Редове с грешки: {p.errors.length} (ще бъдат пропуснати)</summary>
                    <ul>
                      {p.errors.slice(0, 10).map((er) => (
                        <li key={er.line}>
                          ред {er.line}: {er.message}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ))}
            {pending.some((p) => p.kind === 'bodyweight') && (
              <label className="check">
                <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
                <span>{bg.settings.overwriteBody}</span>
              </label>
            )}
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setPending([])}>
                {bg.cancel}
              </button>
              <button type="button" className="btn primary" onClick={applyImport}>
                {bg.settings.importApply}
              </button>
            </div>
          </div>
        )}
      </section>

      {managed.length > 0 && (
        <section className="card">
          <h3>{bg.settings.exercises}</h3>
          <ul className="manage-list">
            {managed.map((e) => (
              <li key={e.id}>
                <div>
                  <span className={e.archived ? 'muted' : ''}>{e.name}</span>
                  <small> · {MUSCLE_LABEL[e.muscleGroup]}</small>
                </div>
                <div className="set-actions">
                  <button type="button" className="link-btn" onClick={() => rename(e.id, e.name)}>
                    {bg.settings.rename}
                  </button>
                  <button type="button" className="link-btn" onClick={() => setArchived(e.id, !e.archived)}>
                    {e.archived ? bg.settings.restore : bg.settings.archive}
                  </button>
                  {e.isCustom && (
                    <button type="button" className="link-btn danger" onClick={() => remove(e.id)}>
                      {bg.delete}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <button type="button" className="btn danger wide" onClick={wipe}>
          {bg.settings.deleteAll}
        </button>
        <p className="muted small-text">
          {bg.settings.version} {APP_VERSION}
        </p>
      </section>
    </div>
  );
}
