import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface ToastCtx {
  show: (text: string) => void;
}

const Ctx = createContext<ToastCtx>({ show: () => undefined });

export function useToast(): ToastCtx {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((t: string) => {
    setText(t);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setText(null), 2600);
  }, []);
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {text && (
        <div className="toast" role="status">
          {text}
        </div>
      )}
    </Ctx.Provider>
  );
}
