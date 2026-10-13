import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { bg } from '../../i18n/bg';

interface TimerCtx {
  start: (seconds: number) => void;
  stop: () => void;
}

const Ctx = createContext<TimerCtx>({ start: () => undefined, stop: () => undefined });

export function useRestTimer(): TimerCtx {
  return useContext(Ctx);
}

function fmt(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (endsAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [endsAt]);

  useEffect(() => {
    if (endsAt !== null && now >= endsAt && !finished) {
      setFinished(true);
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        /* vibration is optional */
      }
    }
  }, [now, endsAt, finished]);

  const start = useCallback((seconds: number) => {
    const t = Date.now();
    setNow(t);
    setFinished(false);
    setEndsAt(t + seconds * 1000);
  }, []);

  const stop = useCallback(() => {
    setEndsAt(null);
    setFinished(false);
  }, []);

  const addTime = () => {
    setFinished(false);
    setNow(Date.now());
    setEndsAt((e) => (e === null ? e : Math.max(e, Date.now()) + 15000));
  };

  const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));

  return (
    <Ctx.Provider value={{ start, stop }}>
      {children}
      {endsAt !== null && (
        <div className={'rest-bar' + (finished ? ' done' : '')} role="timer">
          <div className="rest-text">
            <span>{bg.restTitle}</span>
            <strong>{finished ? bg.restDone : fmt(remaining)}</strong>
          </div>
          <button type="button" className="btn small" onClick={addTime}>
            +15 с
          </button>
          <button type="button" className="btn small" onClick={stop}>
            {bg.restStop}
          </button>
        </div>
      )}
    </Ctx.Provider>
  );
}
