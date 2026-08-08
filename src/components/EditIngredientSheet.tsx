import { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { updateIngredient } from '../repositories/ingredientRepo';
import { useToast } from './ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import { getEarliestExpiry } from '../utils/expiry';
import { UNIT_OPTIONS } from '../types';
import type { Ingredient, IngredientCategory } from '../types';

const CATEGORIES: IngredientCategory[] = ['野菜', '肉・魚', '卵・乳製品', '主食', 'その他'];

interface EditIngredientSheetProps {
  ingredient: Ingredient;
  onClose: () => void;
}

export function EditIngredientSheet({ ingredient, onClose }: EditIngredientSheetProps) {
  const { showToast } = useToast();
  const initialExpiry = getEarliestExpiry(ingredient) ?? '';
  const isKnownUnit = (UNIT_OPTIONS as readonly string[]).includes(ingredient.unit);
  const [name, setName] = useState(ingredient.name);
  const [category, setCategory] = useState<IngredientCategory>(ingredient.category);
  const [unit, setUnit] = useState<string>(isKnownUnit ? ingredient.unit : 'その他');
  const [customUnit, setCustomUnit] = useState(isKnownUnit ? '' : ingredient.unit);
  const [quantity, setQuantity] = useState(ingredient.quantity);
  const [expiryDate, setExpiryDate] = useState(initialExpiry);
  const [saving, setSaving] = useState(false);

  const resolvedUnit = unit === 'その他' ? customUnit.trim() || 'その他' : unit;

  async function handleSave() {
    if (!name.trim()) {
      showToast('食材名を入力してください');
      return;
    }
    setSaving(true);
    try {
      const expiryChanged = expiryDate !== initialExpiry;
      await updateIngredient({
        ...ingredient,
        name: name.trim(),
        category,
        unit: resolvedUnit,
        quantity: Math.max(0, quantity),
        // 期限を変更した場合のみバッチも入れ替える。未変更なら既存のexpiryBatches（複数購入分の履歴）はそのまま保持する
        ...(expiryChanged
          ? {
              expiryDate: expiryDate || undefined,
              expiryBatches: expiryDate ? [{ date: expiryDate, quantity: Math.max(0, quantity) }] : undefined,
            }
          : {}),
      });
      notifyDataChanged();
      showToast('食材を更新しました');
      onClose();
    } catch (e) {
      showToast(toUserMessage(e, '更新に失敗しました'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet title="食材を編集" onClose={onClose}>
      <div className="field">
        <label>食材名（必須）</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>

      <div className="field">
        <label>カテゴリ</label>
        <div className="chip-row">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`chip${category === c ? ' active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>単位</label>
        <div className="chip-row">
          {UNIT_OPTIONS.map((u) => (
            <button key={u} className={`chip${unit === u ? ' active' : ''}`} onClick={() => setUnit(u)}>
              {u}
            </button>
          ))}
        </div>
        {unit === 'その他' && (
          <input
            className="input mt-8"
            placeholder="単位を入力（例：束）"
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value)}
          />
        )}
      </div>

      <div className="field">
        <label>在庫量</label>
        <div className="stepper" style={{ justifyContent: 'space-between' }}>
          <button onClick={() => setQuantity((q) => Math.max(0, Math.round((q - 1) * 10) / 10))}>−</button>
          <span>
            {quantity}
            {resolvedUnit}
          </span>
          <button onClick={() => setQuantity((q) => Math.round((q + 1) * 10) / 10)}>＋</button>
        </div>
      </div>

      <div className="field">
        <label>期限（任意）</label>
        <input
          className="input"
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
        />
        <p className="text-muted mt-8" style={{ fontSize: 12 }}>
          ※ 期限を変更すると、購入ごとの期限履歴は今回入力した1件にまとめられます。変更しなければ既存の履歴はそのまま残ります。
        </p>
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        保存する
      </button>
    </BottomSheet>
  );
}
