import { ShoppingCart } from 'lucide-react';
import type { Ingredient } from '../types';
import { updateIngredient } from '../repositories/ingredientRepo';
import { notifyDataChanged } from '../utils/bus';
import { useToast } from './ToastProvider';
import { toUserMessage } from '../utils/errors';
import { formatQuantity } from '../utils/quantity';

const CATEGORY_EMOJI: Record<string, string> = {
  野菜: '🥦',
  '肉・魚': '🍗',
  '卵・乳製品': '🥚',
  主食: '🍚',
  その他: '🍽️',
};

interface IngredientRowProps {
  ingredient: Ingredient;
  onAddToMemo: (name: string) => void;
}

export function IngredientRow({ ingredient, onAddToMemo }: IngredientRowProps) {
  const { showToast } = useToast();

  async function stepQuantity(delta: number) {
    const next = Math.max(0, Math.round((ingredient.quantity + delta) * 10) / 10);
    try {
      await updateIngredient({ ...ingredient, quantity: next });
      notifyDataChanged();
    } catch (e) {
      showToast(toUserMessage(e, '更新に失敗しました'));
    }
  }

  return (
    <div className="list-row">
      <div className="row-emoji">{CATEGORY_EMOJI[ingredient.category] ?? '🍽️'}</div>
      <div className="row-main">
        <div className="row-title">{ingredient.name}</div>
        <div className="row-sub">{ingredient.category}</div>
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
    </div>
  );
}
