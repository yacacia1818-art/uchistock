import { useEffect, useState } from 'react';
import { Sun, Moon, Cookie, Utensils, Home as HomeIcon, Store } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { listIngredients } from '../repositories/ingredientRepo';
import { addMeal } from '../repositories/mealRepo';
import { useToast } from './ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import type { Ingredient, MealType } from '../types';

const MEAL_TYPES: { type: MealType; icon: typeof Sun }[] = [
  { type: '朝食', icon: Sun },
  { type: '昼食', icon: Sun },
  { type: '夕食', icon: Moon },
  { type: '間食', icon: Cookie },
];

interface MealFormSheetProps {
  onClose: () => void;
  initialMealType?: MealType;
  initialDishName?: string;
}

export function MealFormSheet({ onClose, initialMealType, initialDishName }: MealFormSheetProps) {
  const { showToast } = useToast();
  const [mealType, setMealType] = useState<MealType>(initialMealType ?? '朝食');
  const [mealKind, setMealKind] = useState<'home' | 'eatout'>('home');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dishName, setDishName] = useState(initialDishName ?? '');
  const [memo, setMemo] = useState('');
  const [amount, setAmount] = useState('');
  const [storeName, setStoreName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listIngredients()
      .then((list) => setIngredients(list.filter((i) => i.roughLevel !== 'なし')))
      .catch((e) => showToast(toUserMessage(e, '食材の読み込みに失敗しました')));
  }, [showToast]);

  function toggleIngredient(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const ingredientNames = ingredients
        .filter((i) => selectedIds.has(i.id))
        .map((i) => i.name);
      await addMeal({
        mealType,
        mealKind,
        ingredientNames: mealKind === 'home' ? ingredientNames : undefined,
        dishName: dishName.trim() || undefined,
        memo: memo.trim() || undefined,
        amount: mealKind === 'eatout' ? Number(amount) : undefined,
        storeName: mealKind === 'eatout' ? storeName.trim() || undefined : undefined,
      });
      notifyDataChanged();
      showToast('記録しました');
      onClose();
    } catch (e) {
      showToast(toUserMessage(e, '保存に失敗しました'));
    } finally {
      setSaving(false);
    }
  }

  const canSave = mealKind === 'home' || (amount.trim() !== '' && !Number.isNaN(Number(amount)));

  return (
    <BottomSheet title="食事を記録" onClose={onClose}>
      <div className="meal-type-grid">
        {MEAL_TYPES.map(({ type, icon: Icon }) => (
          <button
            key={type}
            className={`meal-type-btn${mealType === type ? ' active' : ''}`}
            onClick={() => setMealType(type)}
          >
            <Icon size={18} />
            {type}
          </button>
        ))}
      </div>

      <div className="tabs">
        <button
          className={`tab${mealKind === 'home' ? ' active' : ''}`}
          onClick={() => setMealKind('home')}
        >
          <HomeIcon size={16} /> 自炊
        </button>
        <button
          className={`tab${mealKind === 'eatout' ? ' active' : ''}`}
          onClick={() => setMealKind('eatout')}
        >
          <Store size={16} /> 外食
        </button>
      </div>

      {mealKind === 'home' ? (
        <div className="field">
          <label>食べたものを選択（在庫から）</label>
          {ingredients.length === 0 ? (
            <p className="text-muted">在庫がまだ登録されていません</p>
          ) : (
            <div className="card" style={{ padding: '4px 12px' }}>
              {ingredients.map((i) => (
                <label className="checkbox-row" key={i.id}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(i.id)}
                    onChange={() => toggleIngredient(i.id)}
                  />
                  <span style={{ flex: 1 }}>{i.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="field">
          <label>金額（必須）</label>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            placeholder="例：850"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      )}

      <div className="field">
        <label>
          <Utensils size={12} style={{ verticalAlign: '-2px' }} /> 料理名（任意）
        </label>
        <input
          className="input"
          value={dishName}
          onChange={(e) => setDishName(e.target.value)}
          placeholder="例：鶏むね肉の照り焼き"
        />
      </div>

      {mealKind === 'eatout' && (
        <div className="field">
          <label>店名（任意）</label>
          <input
            className="input"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
        </div>
      )}

      <div className="field">
        <label>メモ（任意）</label>
        <textarea
          className="textarea"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="例：料理名や量など"
        />
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving || !canSave}>
        保存
      </button>
    </BottomSheet>
  );
}
