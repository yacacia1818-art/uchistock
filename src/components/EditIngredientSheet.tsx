import { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { updateIngredient } from '../repositories/ingredientRepo';
import { useToast } from './ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import { getEarliestExpiry } from '../utils/expiry';
import { STOCK_LEVELS, STOCK_LEVEL_QUANTITY, UNIT_OPTIONS } from '../types';
import type { HouseholdCategory, Ingredient, IngredientCategory, QuantityMode, ShoppingCategory, StockLevel } from '../types';

const FOOD_CATEGORIES: IngredientCategory[] = ['野菜', '肉・魚', '卵・乳製品', '主食', 'その他'];
const HOUSEHOLD_CATEGORIES: HouseholdCategory[] = ['洗剤・掃除用品', '衛生用品', '薬・医薬品', '文房具・雑貨', 'その他'];

interface EditIngredientSheetProps {
  ingredient: Ingredient;
  onClose: () => void;
}

export function EditIngredientSheet({ ingredient, onClose }: EditIngredientSheetProps) {
  const { showToast } = useToast();
  const initialExpiry = getEarliestExpiry(ingredient) ?? '';
  const isKnownUnit = (UNIT_OPTIONS as readonly string[]).includes(ingredient.unit);
  const [name, setName] = useState(ingredient.name);
  const [itemType, setItemType] = useState<ShoppingCategory>(ingredient.itemType ?? '食品');
  const [category, setCategory] = useState<IngredientCategory | HouseholdCategory>(ingredient.category);
  const [unit, setUnit] = useState<string>(isKnownUnit ? ingredient.unit : 'その他');
  const [customUnit, setCustomUnit] = useState(isKnownUnit ? '' : ingredient.unit);
  const [quantity, setQuantity] = useState(ingredient.quantity);
  const [quantityMode, setQuantityMode] = useState<QuantityMode>(ingredient.quantityMode ?? 'exact');
  const [stockLevel, setStockLevel] = useState<StockLevel>(ingredient.stockLevel ?? 'たっぷり');
  const [expiryDate, setExpiryDate] = useState(initialExpiry);
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
      const expiryChanged = expiryDate !== initialExpiry;
      await updateIngredient({
        ...ingredient,
        name: name.trim(),
        category,
        itemType,
        unit: resolvedUnit,
        quantity: quantityMode === 'rough' ? STOCK_LEVEL_QUANTITY[stockLevel] : Math.max(0, quantity),
        quantityMode,
        stockLevel: quantityMode === 'rough' ? stockLevel : undefined,
        // 日用品には期限概念がないため、区分を日用品に変えた場合は期限情報をクリアする
        ...(itemType === '日用品'
          ? { expiryDate: undefined, expiryBatches: undefined }
          : expiryChanged
            ? {
                expiryDate: expiryDate || undefined,
                expiryBatches: expiryDate ? [{ date: expiryDate, quantity: Math.max(0, quantity) }] : undefined,
              }
            : {}),
      });
      notifyDataChanged();
      showToast('在庫を更新しました');
      onClose();
    } catch (e) {
      showToast(toUserMessage(e, '更新に失敗しました'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet title="在庫を編集" onClose={onClose}>
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
        <label>管理方式</label>
        <div className="chip-row">
          {(['exact', 'rough'] as QuantityMode[]).map((m) => (
            <button
              key={m}
              className={`chip${quantityMode === m ? ' active' : ''}`}
              onClick={() => setQuantityMode(m)}
            >
              {m === 'exact' ? '個数で管理' : 'ざっくり4段階'}
            </button>
          ))}
        </div>
      </div>

      {quantityMode === 'exact' ? (
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
      ) : (
        <div className="field">
          <label>残量の目安</label>
          <div className="chip-row">
            {STOCK_LEVELS.map((level) => (
              <button
                key={level}
                className={`chip${stockLevel === level ? ' active' : ''}`}
                onClick={() => setStockLevel(level)}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}

      {itemType === '食品' && (
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
      )}

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        保存する
      </button>
    </BottomSheet>
  );
}
