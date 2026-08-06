import { ShoppingCart } from 'lucide-react';
import type { Ingredient, RoughLevel } from '../types';
import { updateIngredient } from '../repositories/ingredientRepo';
import { notifyDataChanged } from '../utils/bus';
import { useToast } from './ToastProvider';
import { toUserMessage } from '../utils/errors';

const ROUGH_ORDER: RoughLevel[] = ['なし', '少ない', '半分', '多い'];
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

  async function persist(patch: Partial<Ingredient>) {
    try {
      await updateIngredient({ ...ingredient, ...patch });
      notifyDataChanged();
    } catch (e) {
      showToast(toUserMessage(e, '更新に失敗しました'));
    }
  }

  function stepCount(delta: number) {
    const next = Math.max(0, (ingredient.count ?? 0) + delta);
    persist({ count: next });
  }

  function stepRough(delta: number) {
    const idx = ROUGH_ORDER.indexOf(ingredient.roughLevel ?? '多い');
    const nextIdx = Math.min(ROUGH_ORDER.length - 1, Math.max(0, idx + delta));
    persist({ roughLevel: ROUGH_ORDER[nextIdx] });
  }

  return (
    <div className="list-row">
      <div className="row-emoji">{CATEGORY_EMOJI[ingredient.category] ?? '🍽️'}</div>
      <div className="row-main">
        <div className="row-title">{ingredient.name}</div>
        <div className="row-sub">{ingredient.category}</div>
      </div>
      {ingredient.trackType === 'count' ? (
        <div className="stepper">
          <button onClick={() => stepCount(-1)} aria-label="減らす">
            −
          </button>
          <span>
            {ingredient.count ?? 0}
            {ingredient.unit ?? ''}
          </span>
          <button onClick={() => stepCount(1)} aria-label="増やす">
            ＋
          </button>
        </div>
      ) : (
        <div className="stepper">
          <button onClick={() => stepRough(-1)} aria-label="減らす">
            −
          </button>
          <span style={{ minWidth: 40 }}>{ingredient.roughLevel ?? '多い'}</span>
          <button onClick={() => stepRough(1)} aria-label="増やす">
            ＋
          </button>
        </div>
      )}
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
