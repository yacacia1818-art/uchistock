import { Pencil, Trash2 } from 'lucide-react';
import { STOCK_LEVELS, STOCK_LEVEL_QUANTITY } from '../types';
import type { Ingredient } from '../types';
import { decrementIngredientQuantity, deleteIngredient, updateIngredient } from '../repositories/ingredientRepo';
import { notifyDataChanged } from '../utils/bus';
import { useToast } from './ToastProvider';
import { toUserMessage } from '../utils/errors';
import { formatStock } from '../utils/quantity';
import { formatExpiryRelative, daysUntil, getEarliestExpiry } from '../utils/expiry';
import { expiryUrgency, expiryUrgencyIcon, expiryUrgencyStyle } from '../utils/expiryUi';
import { categoryEmojiFor } from '../utils/categoryEmoji';
import { formatDateLabel } from '../utils/date';

interface IngredientRowProps {
  ingredient: Ingredient;
  onEdit: (ingredient: Ingredient) => void;
}

export function IngredientRow({ ingredient, onEdit }: IngredientRowProps) {
  const { showToast } = useToast();
  const earliestExpiry = getEarliestExpiry(ingredient);
  const days = earliestExpiry ? daysUntil(earliestExpiry) : undefined;
  const urgency = days !== undefined ? expiryUrgency(days) : undefined;

  async function stepQuantity(delta: number) {
    try {
      if (delta < 0) {
        // 期限バッチもFIFOで一緒に減らす（古い期限が消費済みなのに残り続けるのを防ぐため）
        await decrementIngredientQuantity(ingredient.id, Math.abs(delta));
      } else {
        const next = Math.round((ingredient.quantity + delta) * 10) / 10;
        await updateIngredient({ ...ingredient, quantity: next });
      }
      notifyDataChanged();
    } catch (e) {
      showToast(toUserMessage(e, '更新に失敗しました'));
    }
  }

  // 4段階管理：たっぷり→半分→少し→切れそうの順に1段階ずつ増減する
  async function stepStockLevel(delta: 1 | -1) {
    const currentIdx = STOCK_LEVELS.indexOf(ingredient.stockLevel ?? 'たっぷり');
    const nextIdx = Math.min(STOCK_LEVELS.length - 1, Math.max(0, currentIdx - delta));
    const nextLevel = STOCK_LEVELS[nextIdx];
    try {
      await updateIngredient({ ...ingredient, stockLevel: nextLevel, quantity: STOCK_LEVEL_QUANTITY[nextLevel] });
      notifyDataChanged();
    } catch (e) {
      showToast(toUserMessage(e, '更新に失敗しました'));
    }
  }

  async function handleDelete() {
    const confirmed = confirm(
      `${ingredient.name}を在庫から削除しますか？\n\nこの操作では現在の在庫のみ削除されます。過去の購入・食事・調理履歴は削除されません。`
    );
    if (!confirmed) return;
    try {
      await deleteIngredient(ingredient.id);
      notifyDataChanged();
      showToast('在庫から削除しました');
    } catch (e) {
      showToast(toUserMessage(e, '削除に失敗しました'));
    }
  }

  return (
    <div className="list-row" style={{ flexWrap: 'wrap', rowGap: 10 }}>
      <div className="row-emoji">{categoryEmojiFor(ingredient)}</div>
      <button
        className="row-main"
        onClick={() => onEdit(ingredient)}
        aria-label={`${ingredient.name}を編集`}
        style={{
          flex: '1 1 140px',
          background: 'none',
          border: 'none',
          padding: 0,
          textAlign: 'left',
          font: 'inherit',
          color: 'inherit',
        }}
      >
        <div className="row-title">{ingredient.name}</div>
        <div className="row-sub">
          {ingredient.category}
          {ingredient.itemType !== '日用品' &&
            (earliestExpiry && urgency ? (
              <span style={expiryUrgencyStyle(urgency)}>
                {' '}
                ・{expiryUrgencyIcon(urgency)}
                {formatDateLabel(earliestExpiry).replace(/（.*）/, '')}まで（{formatExpiryRelative(days!)}）
              </span>
            ) : (
              <span> ・期限未設定</span>
            ))}
        </div>
      </button>
      <button
        className="icon-btn"
        style={{ background: 'var(--color-primary)', color: '#fff', borderRadius: 10 }}
        onClick={() => onEdit(ingredient)}
        aria-label="食材を編集"
      >
        <Pencil size={16} />
      </button>
      <button
        className="icon-btn"
        style={{ color: 'var(--color-text-muted)' }}
        onClick={handleDelete}
        aria-label="在庫から削除"
      >
        <Trash2 size={16} />
      </button>
      <div className="stepper" style={{ flexBasis: '100%', justifyContent: 'flex-end' }}>
        {ingredient.quantityMode === 'rough' ? (
          <>
            <button onClick={() => stepStockLevel(-1)} aria-label="減らす">
              −
            </button>
            <span style={{ minWidth: 64, textAlign: 'center' }}>{formatStock(ingredient)}</span>
            <button onClick={() => stepStockLevel(1)} aria-label="増やす">
              ＋
            </button>
          </>
        ) : (
          <>
            <button onClick={() => stepQuantity(-1)} aria-label="減らす">
              −
            </button>
            <span style={{ minWidth: 48 }}>{formatStock(ingredient)}</span>
            <button onClick={() => stepQuantity(1)} aria-label="増やす">
              ＋
            </button>
          </>
        )}
      </div>
    </div>
  );
}
