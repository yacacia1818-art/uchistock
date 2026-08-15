import { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { GaugeControl } from './GaugeControl';
import { updateIngredient } from '../repositories/ingredientRepo';
import { useToast } from './ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import { getEarliestExpiry } from '../utils/expiry';
import { gaugeLevelOf, gaugeLevelToQuantity } from '../utils/quantity';
import { STORAGE_LOCATION_EMOJI } from '../utils/categoryEmoji';
import { STORAGE_LOCATIONS, UNIT_OPTIONS } from '../types';
import type { Ingredient, QuantityMode, StorageLocation } from '../types';

interface EditIngredientSheetProps {
  ingredient: Ingredient;
  onClose: () => void;
}

export function EditIngredientSheet({ ingredient, onClose }: EditIngredientSheetProps) {
  const { showToast } = useToast();
  const initialExpiry = getEarliestExpiry(ingredient) ?? '';
  const isKnownUnit = (UNIT_OPTIONS as readonly string[]).includes(ingredient.unit);
  const [name, setName] = useState(ingredient.name);
  const [storageLocation, setStorageLocation] = useState<StorageLocation>(
    ingredient.storageLocation ?? (ingredient.itemType === '日用品' ? '日用品' : '常温')
  );
  const [unit, setUnit] = useState<string>(isKnownUnit ? ingredient.unit : 'その他');
  const [customUnit, setCustomUnit] = useState(isKnownUnit ? '' : ingredient.unit);
  const [quantity, setQuantity] = useState(ingredient.quantity);
  const [quantityMode, setQuantityMode] = useState<QuantityMode>(
    ingredient.quantityMode === 'gauge' ? 'gauge' : 'count'
  );
  const [gaugeLevel, setGaugeLevel] = useState(() => gaugeLevelOf(ingredient));
  const [expiryDate, setExpiryDate] = useState(initialExpiry);
  const [saving, setSaving] = useState(false);

  const resolvedUnit = unit === 'その他' ? customUnit.trim() || 'その他' : unit;

  async function handleSave() {
    if (!name.trim()) {
      showToast('名前を入力してください');
      return;
    }
    setSaving(true);
    try {
      const expiryChanged = expiryDate !== initialExpiry;
      const nextQuantity = quantityMode === 'gauge' ? gaugeLevelToQuantity(gaugeLevel) : Math.max(0, quantity);
      const itemType = storageLocation === '日用品' ? '日用品' : '食品';
      await updateIngredient({
        ...ingredient,
        name: name.trim(),
        itemType,
        storageLocation,
        unit: resolvedUnit,
        quantity: nextQuantity,
        quantityMode,
        // 日用品には期限概念がないため、保管場所を日用品に変えた場合は期限情報をクリアする
        ...(itemType === '日用品'
          ? { expiryDate: undefined, expiryBatches: undefined }
          : expiryChanged
            ? {
                expiryDate: expiryDate || undefined,
                expiryBatches: expiryDate ? [{ date: expiryDate, quantity: nextQuantity }] : undefined,
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
        <label>名前（必須）</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>

      <div className="field">
        <label>保管場所</label>
        <div className="chip-row">
          {STORAGE_LOCATIONS.map((loc) => (
            <button
              key={loc}
              className={`chip${storageLocation === loc ? ' active' : ''}`}
              onClick={() => setStorageLocation(loc)}
            >
              {STORAGE_LOCATION_EMOJI[loc]} {loc}
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
          {(['count', 'gauge'] as QuantityMode[]).map((m) => (
            <button
              key={m}
              className={`chip${quantityMode === m ? ' active' : ''}`}
              onClick={() => setQuantityMode(m)}
            >
              {m === 'count' ? '個数' : 'ゲージ'}
            </button>
          ))}
        </div>
      </div>

      {quantityMode === 'count' ? (
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
          <label>残量</label>
          <GaugeControl level={gaugeLevel} onChange={setGaugeLevel} />
        </div>
      )}

      {storageLocation !== '日用品' && (
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
