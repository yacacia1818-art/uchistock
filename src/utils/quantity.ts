import type { UsageAmount } from '../types';

// パック・袋・玉など「まとめ買いして少しずつ使う」単位（割合選択UIを使う）
const FRACTION_UNITS = new Set(['パック', '袋', '玉']);

export type UsageMode = 'count' | 'fraction';

export function getUsageMode(unit: string): UsageMode {
  return FRACTION_UNITS.has(unit) ? 'fraction' : 'count';
}

// 買い物メモの自由入力「10個」「2本」等から数量・単位を推測する（強制しない：解釈できなければ既定値）
export function parseMemoQuantity(raw: string | undefined): { quantity: number; unit: string } {
  const text = (raw ?? '').trim();
  const match = text.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (match) {
    const quantity = Number(match[1]);
    const unit = match[2].trim();
    return { quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1, unit: unit || '個' };
  }
  return { quantity: 1, unit: '個' };
}

export const FRACTION_CHOICES: { label: string; value: number | 'all' | 'custom' }[] = [
  { label: '1/4', value: 1 / 4 },
  { label: '1/3', value: 1 / 3 },
  { label: '1/2', value: 1 / 2 },
  { label: '全部', value: 'all' },
  { label: 'その他', value: 'custom' },
];

// quantityから残量表示用の文字列を作る（パック等は分数寄せ、個数系は整数表示）
const NEAR_FRACTIONS: { value: number; label: string }[] = [
  { value: 0, label: '0' },
  { value: 1 / 4, label: '1/4' },
  { value: 1 / 3, label: '1/3' },
  { value: 1 / 2, label: '1/2' },
  { value: 2 / 3, label: '2/3' },
  { value: 3 / 4, label: '3/4' },
  { value: 1, label: '1' },
];

function nearestFraction(remainder: number): { label: string; exact: boolean } {
  let best = NEAR_FRACTIONS[0];
  let bestDiff = Infinity;
  for (const f of NEAR_FRACTIONS) {
    const diff = Math.abs(f.value - remainder);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = f;
    }
  }
  return { label: best.label, exact: bestDiff < 0.02 };
}

export function formatQuantity(quantity: number, unit: string): string {
  const safe = Math.max(0, quantity);
  if (getUsageMode(unit) === 'count') {
    return `${Math.round(safe)}${unit}`;
  }
  const whole = Math.floor(safe + 1e-6);
  const remainder = safe - whole;
  const { label, exact } = nearestFraction(remainder);
  const approx = exact ? '' : '約';
  if (label === '0' || label === '') {
    return whole === 0 ? `${approx}0${unit}` : `${whole}${unit}`;
  }
  if (label === '1') {
    return `${whole + 1}${unit}`;
  }
  if (whole === 0) {
    return `${approx}${label}${unit}`;
  }
  return `${approx}${whole}と${label}${unit}`;
}

export function applyUsage(quantity: number, usage: UsageAmount): number {
  const next = quantity - usage.value;
  return Math.max(0, Math.round(next * 10000) / 10000);
}

export function formatUsage(usage: UsageAmount, unit: string): string {
  if (usage.type === 'count') {
    return `${usage.value}${unit}`;
  }
  const choice = FRACTION_CHOICES.find(
    (c) => typeof c.value === 'number' && Math.abs(c.value - usage.value) < 0.01
  );
  if (choice) return `${choice.label}${unit}`;
  return `${formatQuantity(usage.value, unit)}相当`;
}
