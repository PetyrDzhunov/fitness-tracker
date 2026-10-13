export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toDateStr(parseDateStr(s)) === s;
}

const longFmt = new Intl.DateTimeFormat('bg-BG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const monthFmt = new Intl.DateTimeFormat('bg-BG', { month: 'long', year: 'numeric' });

export function formatLong(s: string): string {
  return longFmt.format(parseDateStr(s));
}

export function monthLabel(year: number, month: number): string {
  return monthFmt.format(new Date(year, month, 1));
}

/** Monday-first calendar cells for a month; null = empty leading cell. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${pad(month + 1)}-${pad(d)}`);
  return cells;
}

/** [start, end) range of date strings for a month. */
export function monthRange(year: number, month: number): { start: string; end: string } {
  return {
    start: `${year}-${pad(month + 1)}-01`,
    end: toDateStr(new Date(year, month + 1, 1)),
  };
}
