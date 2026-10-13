import { useState } from 'react';
import { addDays, formatLong, todayStr } from '../../lib/dates';
import { bg } from '../../i18n/bg';
import { DayLog } from './DayLog';

export function TodayPage() {
  const [date, setDate] = useState(todayStr());
  const isToday = date === todayStr();

  return (
    <div className="page">
      <header className="page-head">
        <button type="button" className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Предишен ден">
          ‹
        </button>
        <div className="page-title">
          <h1>{isToday ? bg.today : formatLong(date)}</h1>
          {isToday && <small>{formatLong(date)}</small>}
          <input
            type="date"
            className="date-input"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Избери дата"
          />
        </div>
        <button type="button" className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Следващ ден">
          ›
        </button>
      </header>
      <DayLog date={date} emptyText={isToday ? bg.emptyToday : bg.emptyDay} />
    </div>
  );
}
