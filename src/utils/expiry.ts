import type { Ingredient } from '../types';
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

export function formatExpiryRelative(diffDays: number): string {
  if (diffDays < 0) return '期限切れ';
  if (diffDays === 0) return '今日まで';
  if (diffDays === 1) return '明日まで';
  return `あと${diffDays}日`;
}
