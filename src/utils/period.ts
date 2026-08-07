import { todayDateStr } from './date';

export interface Period {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

const DEFAULT_START_DAY = 1;

// 食費の集計期間を計算する（開始日1〜28、月末日数差も安全に処理）
export function getCurrentPeriod(startDay: number | undefined, now: Date = new Date()): Period {
  const day = startDay && startDay >= 1 && startDay <= 28 ? startDay : DEFAULT_START_DAY;
  const year = now.getFullYear();
  const month = now.getMonth();
  const currentDay = now.getDate();

  if (day === 1) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start: todayDateStr(start), end: todayDateStr(end) };
  }

  if (currentDay >= day) {
    const start = new Date(year, month, day);
    const end = new Date(year, month + 1, day - 1);
    return { start: todayDateStr(start), end: todayDateStr(end) };
  }
  const start = new Date(year, month - 1, day);
  const end = new Date(year, month, day - 1);
  return { start: todayDateStr(start), end: todayDateStr(end) };
}

function shortDateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}/${Number(d)}`;
}

export function formatPeriodRangeLabel(period: Period): string {
  return `${shortDateLabel(period.start)} ～ ${shortDateLabel(period.end)}`;
}

// 期間終了日までの残り日数（今日を含む）
export function remainingDaysInPeriod(period: Period, now: Date = new Date()): number {
  const today = new Date(todayDateStr(now) + 'T00:00:00');
  const end = new Date(period.end + 'T00:00:00');
  const diff = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}
