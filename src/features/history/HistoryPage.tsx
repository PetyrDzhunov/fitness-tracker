import { useMemo, useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { db } from '../../db/schema';
import { copyDay, deleteDay } from '../../db/repo';
import { useLive } from '../../hooks/useLive';
import { bg } from '../../i18n/bg';
import { formatLong, monthGrid, monthLabel, monthRange, todayStr } from '../../lib/dates';
import { DayLog } from '../today/DayLog';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

export function HistoryPage() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);
  const toast = useToast();

  const range = monthRange(ym.y, ym.m);
  const sets = useLive(
    () => db.sets.where('date').between(range.start, range.end, true, false).toArray(),
    [range.start, range.end],
  );

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sets ?? []) m.set(s.date, (m.get(s.date) ?? 0) + 1);
    return m;
  }, [sets]);

  const cells = monthGrid(ym.y, ym.m);
  const today = todayStr();

  const shift = (delta: number) => {
    const d = new Date(ym.y, ym.m + delta, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  };

  const copyToToday = async () => {
    if (!selected) return;
    await copyDay(selected, today);
    toast.show(bg.copiedToday);
  };

  const removeDay = async () => {
    if (!selected) return;
    if (window.confirm(bg.confirmDeleteDay)) {
      await deleteDay(selected);
      setSelected(null);
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Предишен месец">
          ‹
        </button>
        <div className="page-title">
          <h1 className="cap">{monthLabel(ym.y, ym.m)}</h1>
          <small>
            {bg.trainingDays}: {counts.size}
          </small>
        </div>
        <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Следващ месец">
          ›
        </button>
      </header>

      <div className="calendar">
        {WEEKDAYS.map((d) => (
          <div key={d} className="cal-head">
            {d}
          </div>
        ))}
        {cells.map((date, i) =>
          date === null ? (
            <div key={'e' + i} />
          ) : (
            <button
              key={date}
              type="button"
              className={'cal-day' + (counts.has(date) ? ' trained' : '') + (date === today ? ' today' : '')}
              onClick={() => setSelected(date)}
              aria-label={formatLong(date)}
            >
              <span>{Number(date.slice(8))}</span>
              {counts.has(date) && <i className="dot" />}
            </button>
          ),
        )}
      </div>

      {selected && (
        <Sheet title={formatLong(selected)} onClose={() => setSelected(null)}>
          <DayLog date={selected} emptyText={bg.emptyDay} />
          <div className="btn-row">
            {selected !== today && (
              <button type="button" className="btn" onClick={copyToToday}>
                {bg.copyDay}
              </button>
            )}
            <button type="button" className="btn danger" onClick={removeDay}>
              Изтрий деня
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
