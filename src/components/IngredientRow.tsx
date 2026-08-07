import { ShoppingCart, Trash2 } from 'lucide-react';
import type { Ingredient } from '../types';
import { decrementIngredientQuantity, deleteIngredient, updateIngredient } from '../repositories/ingredientRepo';
import { notifyDataChanged } from '../utils/bus';
import { useToast } from './ToastProvider';
import { toUserMessage } from '../utils/errors';
import { formatQuantity } from '../utils/quantity';
import { formatExpiryRelative, daysUntil, getEarliestExpiry } from '../utils/expiry';
import { INGREDIENT_CATEGORY_EMOJI } from '../utils/categoryEmoji';
import { formatDateLabel } from '../utils/date';

interface IngredientRowProps {
  ingredient: Ingredient;
  onAddToMemo: (name: string) => void;
}

export function IngredientRow({ ingredient, onAddToMemo }: IngredientRowProps) {
  const { showToast } = useToast();
  const earliestExpiry = getEarliestExpiry(ingredient);

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
    <div className="list-row">
      <div className="row-emoji">{INGREDIENT_CATEGORY_EMOJI[ingredient.category] ?? '🍽️'}</div>
      <div className="row-main">
        <div className="row-title">{ingredient.name}</div>
        <div className="row-sub">
          {ingredient.category}
          {earliestExpiry && (
            <span> ・期限 {formatDateLabel(earliestExpiry).replace(/（.*）/, '')}（{formatExpiryRelative(daysUntil(earliestExpiry))}）</span>
          )}
        </div>
      </div>
      <div className="stepper">
        <button onClick={() => stepQuantity(-1)} aria-label="減らす">
          −
        </button>
        <span style={{ minWidth: 48 }}>{formatQuantity(ingredient.quantity, ingredient.unit)}</span>
        <button onClick={() => stepQuantity(1)} aria-label="増やす">
          ＋
        </button>
      </div>
      <button
        className="icon-btn"
        style={{ background: 'var(--color-primary)', color: '#fff', borderRadius: 10 }}
        onClick={() => onAddToMemo(ingredient.name)}
        aria-label="買い物メモへ追加"
      >
        <ShoppingCart size={16} />
      </button>
      <button
        className="icon-btn"
        style={{ color: 'var(--color-text-muted)' }}
        onClick={handleDelete}
        aria-label="在庫から削除"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
