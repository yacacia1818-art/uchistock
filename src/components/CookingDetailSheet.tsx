import { Pencil } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { formatDateLabel } from '../utils/date';
import { formatQuantity } from '../utils/quantity';
import type { CookedDish } from '../types';

interface CookingDetailSheetProps {
  dish: CookedDish;
  onClose: () => void;
  onEdit: () => void;
}

export function CookingDetailSheet({ dish, onClose, onEdit }: CookingDetailSheetProps) {
  return (
    <BottomSheet title="調理記録の詳細" onClose={onClose}>
      <div className="field">
        <div style={{ fontSize: 18, fontWeight: 700 }}>{dish.name}</div>
        <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
          {formatDateLabel(dish.date)} {dish.time}
        </div>
      </div>

      {dish.ingredientUsages.length > 0 && (
        <div className="field">
          <label>使用食材</label>
          <div className="card" style={{ padding: '4px 12px' }}>
            {dish.ingredientUsages.map((u, idx) => (
              <div className="list-row" key={idx}>
                <div className="row-main">
                  <div className="row-title">{u.ingredientName}</div>
                </div>
                <span className="text-muted" style={{ fontSize: 13 }}>
                  {formatQuantity(u.usage.value, u.unit)}使用
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {dish.servings !== undefined && (
        <div className="field">
          <label>作った量・食数</label>
          <div>
            {dish.servings}食分
            {dish.servingsRemaining !== undefined && `（残り${dish.servingsRemaining}食）`}
          </div>
        </div>
      )}

      {dish.memo && (
        <div className="field">
          <label>メモ</label>
          <div style={{ whiteSpace: 'pre-wrap' }}>{dish.memo}</div>
        </div>
      )}

      <button className="btn btn-outline" onClick={onEdit}>
        <Pencil size={16} /> 編集
      </button>
    </BottomSheet>
  );
}
