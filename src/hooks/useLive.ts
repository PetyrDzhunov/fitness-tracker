import { useEffect, useState } from 'react';
import type { DependencyList } from 'react';
import { liveQuery } from 'dexie';
import { db } from '../db/schema';

/** Re-runs a Dexie query whenever the underlying data changes. Returns undefined until the first result. */
export function useLive<T>(query: () => T | Promise<T>, deps: DependencyList): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  useEffect(() => {
    const sub = liveQuery(query).subscribe({
      next: (v) => setValue(() => v),
      error: (e) => console.error(e),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

export function useSetting<T>(key: string, fallback: T): [T, (v: T) => Promise<void>] {
  const row = useLive(() => db.settings.get(key), [key]);
  const value = row ? (row.value as T) : fallback;
  const set = async (v: T) => {
    await db.settings.put({ key, value: v });
  };
  return [value, set];
}
