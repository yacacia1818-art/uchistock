import type { Ingredient, ShoppingMemoItem, UsageAmount } from '../types';
import { formatFraction, snapToFraction, fractionToDecimal } from './fraction';

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
  { label: '1/2', value: 1 / 2 },
  { label: '1/3', value: 1 / 3 },
  { label: '1/4', value: 1 / 4 },
  { label: '1/5', value: 1 / 5 },
  { label: '1/6', value: 1 / 6 },
  { label: '全部', value: 'all' },
  { label: 'その他', value: 'custom' },
];

// quantityから残量表示用の文字列を作る。単位に関わらず、端数があれば自然な分数で表示する
export function formatQuantity(quantity: number, unit: string): string {
  const safe = Math.max(0, quantity);
  return formatFraction(safe, unit);
}

// 在庫の残量表示：4段階管理の食材はラベル（たっぷり等）、実数管理の食材は数量を表示する
export function formatStock(ingredient: Pick<Ingredient, 'quantity' | 'unit' | 'quantityMode' | 'stockLevel'>): string {
  if (ingredient.quantityMode === 'rough' && ingredient.stockLevel) {
    return ingredient.stockLevel;
  }
  return formatQuantity(ingredient.quantity, ingredient.unit);
}

// 浮動小数点誤差を防ぐため、分数として妥当な値へスナップしてから減算する
export function applyUsage(quantity: number, usage: UsageAmount): number {
  const next = quantity - usage.value;
  return snapQuantity(next);
}

// 演算結果を分母60までの自然な分数へスナップして保存する（誤差の蓄積防止）
export function snapQuantity(quantity: number): number {
  const safe = Math.max(0, quantity);
  const whole = Math.floor(safe + 1e-9);
  const remainder = safe - whole;
  if (remainder < 1e-9) return whole;
  const frac = snapToFraction(remainder, 60);
  return whole + fractionToDecimal(frac);
}

// 買い物メモの数量表示（新: 構造化フィールド優先、旧: 自由入力文字列にフォールバック）
export function formatMemoQuantity(item: ShoppingMemoItem): string | undefined {
  if (item.quantityValue && item.unit) return `${item.quantityValue}${item.unit}`;
  return item.quantity;
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
