import { Pencil } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { formatDateLabel } from '../utils/date';
import { formatQuantity } from '../utils/quantity';
import { mealContentLabel } from '../utils/mealDisplay';
import type { Meal, MealHomeSource } from '../types';

interface MealDetailSheetProps {
  meal: Meal;
  onClose: () => void;
  onEdit: () => void;
}

const HOME_SOURCE_LABEL: Record<MealHomeSource, string> = {
  direct: '在庫から',
  cooked: '調理済み',
  freeText: '自由入力',
  cookNow: '今作って食べた',
};

export function MealDetailSheet({ meal, onClose, onEdit }: MealDetailSheetProps) {
  return (
    <BottomSheet title="食事記録の詳細" onClose={onClose}>
      <div className="field">
        <div style={{ fontSize: 18, fontWeight: 700 }}>{mealContentLabel(meal)}</div>
        <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
          {formatDateLabel(meal.date)} ・ {meal.mealType} ・ {meal.mealKind === 'eatout' ? '外食' : '自炊'}
          {meal.mealKind === 'home' && meal.homeSource && ` ・ ${HOME_SOURCE_LABEL[meal.homeSource]}`}
        </div>
      </div>

      {meal.ingredientUsages && meal.ingredientUsages.length > 0 && (
        <div className="field">
          <label>食べたもの</label>
          <div className="card" style={{ padding: '4px 12px' }}>
            {meal.ingredientUsages.map((u, idx) => (
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

      {meal.freeTextItems && meal.freeTextItems.length > 0 && (
        <div className="field">
          <label>食べたもの</label>
          <div className="card" style={{ padding: '10px 12px' }}>
            {meal.freeTextItems.join('・')}
          </div>
        </div>
      )}

      {meal.dishName && (
        <div className="field">
          <label>料理名</label>
          <div>{meal.dishName}</div>
        </div>
      )}

      {meal.mealKind === 'eatout' && meal.storeName && (
        <div className="field">
          <label>外食内容（店名）</label>
          <div>{meal.storeName}</div>
        </div>
      )}

      {meal.mealKind === 'eatout' && meal.amount !== undefined && (
        <div className="field">
          <label>外食金額</label>
          <div style={{ fontSize: 20, fontWeight: 800 }}>¥{meal.amount.toLocaleString()}</div>
        </div>
      )}

      {meal.memo && (
        <div className="field">
          <label>メモ</label>
          <div style={{ whiteSpace: 'pre-wrap' }}>{meal.memo}</div>
        </div>
      )}

      <button className="btn btn-outline" onClick={onEdit}>
        <Pencil size={16} /> 編集
      </button>
    </BottomSheet>
  );
}
