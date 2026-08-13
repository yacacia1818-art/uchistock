import type { ExpiryBatch, Ingredient } from '../types';
import { todayDateStr } from './date';

// その食材が持つ期限日の一覧（重複除去・古い日付順）。カレンダー等の網羅表示に使う
export function getExpiryDates(ingredient: Ingredient): string[] {
  const dates = new Set<string>();
  if (ingredient.expiryBatches) {
    for (const batch of ingredient.expiryBatches) dates.add(batch.date);
  }
  if (ingredient.expiryDate) dates.add(ingredient.expiryDate);
  return [...dates].sort();
}

// ホーム/AI相談で使う「もっとも近い期限」1件（最も緊急なもの）
export function getEarliestExpiry(ingredient: Ingredient): string | undefined {
  const dates = getExpiryDates(ingredient);
  return dates.length > 0 ? dates[0] : undefined;
}

export function daysUntil(dateStr: string, now: Date = new Date()): number {
  const today = new Date(todayDateStr(now) + 'T00:00:00');
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// 使用量をFIFO（期限が近いものから）で各期限バッチへ按分し、消費し切ったバッチは取り除く。
// これをしないと、古い期限のバッチは実際には食べ終わっているのに数量だけが更新され続け、
// 「期限が近い食材」に古い期限がいつまでも居座ってしまう（食材取り違えのように見える不具合の原因）。
export function consumeExpiryBatches(
  ingredient: Ingredient,
  amount: number
): { expiryDate?: string; expiryBatches?: ExpiryBatch[] } {
  const batches: ExpiryBatch[] =
    ingredient.expiryBatches ??
    (ingredient.expiryDate ? [{ date: ingredient.expiryDate, quantity: ingredient.quantity }] : []);
  if (batches.length === 0 || amount <= 1e-9) {
    return { expiryDate: ingredient.expiryDate, expiryBatches: ingredient.expiryBatches };
  }
  const sorted = [...batches].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let remaining = amount;
  const next: ExpiryBatch[] = [];
  for (const batch of sorted) {
    if (remaining <= 1e-9) {
      next.push(batch);
      continue;
    }
    const consumed = Math.min(batch.quantity, remaining);
    remaining = Math.round((remaining - consumed) * 10000) / 10000;
    const left = Math.round((batch.quantity - consumed) * 10000) / 10000;
    if (left > 1e-9) next.push({ date: batch.date, quantity: left });
  }
  if (next.length === 0) return { expiryDate: undefined, expiryBatches: undefined };
  return { expiryDate: next[0].date, expiryBatches: next };
}

// 「あと◯日」は今日を含めて数える（例：今日8/14・期限8/17なら「あと4日」＝14,15,16,17日の4日間使える）。
// 期限切れ・当日・明日の判定自体（daysUntilの差分計算）は変更しない。表示文言のみ+1日する
export function formatExpiryRelative(diffDays: number): string {
  if (diffDays < 0) return '期限切れ';
  if (diffDays === 0) return '今日まで';
  if (diffDays === 1) return '明日まで';
  return `あと${diffDays + 1}日`;
}
