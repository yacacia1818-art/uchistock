import { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { addIngredient } from '../repositories/ingredientRepo';
import { useToast } from './ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import { UNIT_OPTIONS } from '../types';
import type { HouseholdCategory, IngredientCategory, ShoppingCategory } from '../types';

const FOOD_CATEGORIES: IngredientCategory[] = ['野菜', '肉・魚', '卵・乳製品', '主食', 'その他'];
const HOUSEHOLD_CATEGORIES: HouseholdCategory[] = ['洗剤・掃除用品', '衛生用品', '薬・医薬品', '文房具・雑貨', 'その他'];

interface AddIngredientSheetProps {
  onClose: () => void;
}

export function AddIngredientSheet({ onClose }: AddIngredientSheetProps) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [itemType, setItemType] = useState<ShoppingCategory>('食品');
  const [category, setCategory] = useState<IngredientCategory | HouseholdCategory>('その他');
  const [unit, setUnit] = useState<string>('個');
  const [customUnit, setCustomUnit] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [saving, setSaving] = useState(false);

  const categories = itemType === '食品' ? FOOD_CATEGORIES : HOUSEHOLD_CATEGORIES;
  const resolvedUnit = unit === 'その他' ? customUnit.trim() || 'その他' : unit;

  function handleItemTypeChange(next: ShoppingCategory) {
    setItemType(next);
    setCategory('その他');
  }

  async function handleSave() {
    if (!name.trim()) {
      showToast('名前を入力してください');
      return;
    }
    setSaving(true);
    try {
      await addIngredient({
        name: name.trim(),
        category,
        itemType,
        unit: resolvedUnit,
        quantity,
        expiryDate: itemType === '食品' && expiryDate ? expiryDate : undefined,
        expiryBatches: itemType === '食品' && expiryDate ? [{ date: expiryDate, quantity }] : undefined,
      });
      notifyDataChanged();
      showToast('在庫に追加しました');
      onClose();
    } catch (e) {
      showToast(toUserMessage(e, '保存に失敗しました'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet title="在庫を追加" onClose={onClose}>
      <div className="field">
        <label>区分</label>
        <div className="chip-row">
          {(['食品', '日用品'] as ShoppingCategory[]).map((t) => (
            <button
              key={t}
              className={`chip${itemType === t ? ' active' : ''}`}
              onClick={() => handleItemTypeChange(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>名前（必須）</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>

      <div className="field">
        <label>カテゴリ</label>
        <div className="chip-row">
          {categories.map((c) => (
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
        <label>数量</label>
        <div className="stepper" style={{ justifyContent: 'space-between' }}>
          <button onClick={() => setQuantity((q) => Math.max(0, q - 1))}>−</button>
          <span>
            {quantity}
            {resolvedUnit}
          </span>
          <button onClick={() => setQuantity((q) => q + 1)}>＋</button>
        </div>
      </div>

      {itemType === '食品' && (
        <div className="field">
          <label>期限（任意）</label>
          <input
            className="input"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </div>
      )}

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        追加する
      </button>
    </BottomSheet>
  );
}
