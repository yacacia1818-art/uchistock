export function todayDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function nowTimeStr(d: Date = new Date()): string {
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

export function nowIsoStr(): string {
  return new Date().toISOString();
}

export function currentYearMonth(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function yearMonthOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${y}年${Number(m)}月`;
}

export function daysInMonth(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function formatDateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  const dateObj = new Date(dateStr + 'T00:00:00');
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
  return `${Number(m)}月${Number(d)}日（${weekday}）`;
}

export function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return currentYearMonth(d);
}

export function remainingDaysInMonth(d: Date = new Date()): number {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return last - d.getDate() + 1;
}

// 月間カレンダー描画用のセル一覧（先頭の空白セル＋各日付）。曜日の位置合わせに使う
export function cellsOfMonth(ym: string): { date: string | null }[] {
  const [y, m] = ym.split('-').map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const total = daysInMonth(ym);
  const result: { date: string | null }[] = [];
  for (let i = 0; i < firstDow; i++) result.push({ date: null });
  for (let d = 1; d <= total; d++) {
    result.push({ date: `${ym}-${String(d).padStart(2, '0')}` });
  }
  return result;
}
