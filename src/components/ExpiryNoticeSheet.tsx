import { BottomSheet } from './BottomSheet';
import { formatStock } from '../utils/quantity';
import { formatExpiryRelative } from '../utils/expiry';
import type { ExpiringIngredient } from '../services/expirySummary';

interface ExpiryNoticeSheetProps {
  items: ExpiringIngredient[];
  onClose: () => void;
}

export function ExpiryNoticeSheet({ items, onClose }: ExpiryNoticeSheetProps) {
  const groups = new Map<string, ExpiringIngredient[]>();
  for (const item of items) {
    const label = formatExpiryRelative(item.days);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(item);
  }

  return (
    <BottomSheet title="お知らせ" onClose={onClose}>
      {items.length === 0 ? (
        <div className="empty-state">期限が近い食材はありません</div>
      ) : (
        [...groups.entries()].map(([label, group]) => (
          <div key={label} className="mb-16">
            <div
              className="text-muted"
              style={{
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 4,
                color: group[0].days <= 0 ? 'var(--color-danger)' : undefined,
              }}
            >
              【{label}】
            </div>
            <div className="card" style={{ padding: '4px 12px' }}>
              {group.map(({ ingredient }) => (
                <div className="list-row" key={ingredient.id}>
                  <div className="row-main">
                    <div className="row-title">{ingredient.name}</div>
                    <div className="row-sub">{formatStock(ingredient)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </BottomSheet>
  );
}
