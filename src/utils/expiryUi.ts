import type { CSSProperties } from 'react';

// 期限の見た目（色・強調）のみを扱う表示専用ヘルパー。expiry.tsの期限判定・FIFOロジックは一切変更しない
export type ExpiryUrgency = 'expired' | 'today' | 'soon' | 'later';

export function expiryUrgency(days: number): ExpiryUrgency {
  if (days < 0) return 'expired';
  if (days === 0) return 'today';
  if (days <= 3) return 'soon';
  return 'later';
}

export function expiryUrgencyStyle(urgency: ExpiryUrgency): CSSProperties {
  switch (urgency) {
    case 'expired':
    case 'today':
      return { color: 'var(--color-danger)', fontWeight: 700 };
    case 'soon':
      return { color: 'var(--color-primary-dark)', fontWeight: 700 };
    default:
      return { color: 'var(--color-text-muted)' };
  }
}

export function expiryUrgencyIcon(urgency: ExpiryUrgency): string {
  return urgency === 'expired' || urgency === 'today' ? '⚠ ' : '';
}
