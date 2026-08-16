import { useEffect, useMemo, useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { GaugeControl } from './GaugeControl';
import { addIngredient, listIngredients } from '../repositories/ingredientRepo';
import { useToast } from './ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import { formatQuantity, gaugeLevelToQuantity, snapQuantity } from '../utils/quantity';
import { STORAGE_LOCATION_EMOJI } from '../utils/categoryEmoji';
import { STORAGE_LOCATIONS, UNIT_OPTIONS } from '../types';
import type { Ingredient, QuantityMode, StorageLocation } from '../types';

interface AddIngredientSheetProps {
  onClose: () => void;
}

export function AddIngredientSheet({ onClose }: AddIngredientSheetProps) {
  const { showToast } = useToast();
  const [known, setKnown] = useState<Ingredient[]>([]);
  const [name, setName] = useState('');
  const [matchedFrom, setMatchedFrom] = useState<Ingredient | null>(null);
  const [storageLocation, setStorageLocation] = useState<StorageLocation>('冷蔵');
  const [unit, setUnit] = useState<string>('個');
  const [customUnit, setCustomUnit] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [quantityMode, setQuantityMode] = useState<QuantityMode>('count');
  const [gaugeLevel, setGaugeLevel] = useState(10);
  const [expiryDate, setExpiryDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listIngredients()
      .then(setKnown)
      .catch(() => {
        // オートコンプリート用の候補取得。失敗しても新規入力は妨げない
      });
  }, []);

  const suggestions = useMemo(() => {
    const q = name.trim();
    if (!q || matchedFrom) return [];
    const seen = new Set<string>();
    return known
      .filter((i) => i.name.includes(q) && !seen.has(i.name) && seen.add(i.name))
      .slice(0, 5);
  }, [name, known, matchedFrom]);

  const resolvedUnit = unit === 'その他' ? customUnit.trim() || 'その他' : unit;

  function applySuggestion(ing: Ingredient) {
    setName(ing.name);
    setMatchedFrom(ing);
    setStorageLocation(ing.storageLocation ?? (ing.itemType === '日用品' ? '日用品' : '常温'));
    const isKnownUnit = (UNIT_OPTIONS as readonly string[]).includes(ing.unit);
    setUnit(isKnownUnit ? ing.unit : 'その他');
    setCustomUnit(isKnownUnit ? '' : ing.unit);
    setQuantityMode(ing.quantityMode === 'gauge' ? 'gauge' : 'count');
    if (ing.quantityMode === 'gauge') {
      setGaugeLevel(10);
    } else {
      setQuantity(1);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      showToast('名前を入力してください');
      return;
    }
    setSaving(true);
    try {
      const itemType = storageLocation === '日用品' ? '日用品' : '食品';
      await addIngredient({
        name: name.trim(),
        category: 'その他',
        itemType,
        storageLocation,
        unit: resolvedUnit,
        quantity: quantityMode === 'gauge' ? gaugeLevelToQuantity(gaugeLevel) : quantity,
        quantityMode,
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
    <BottomSheet title="追加する" onClose={onClose}>
      <p className="text-muted mb-16" style={{ fontSize: 12 }}>
        ※ 買った・貰った を区別する必要はありません。ここでは金額を記録せず在庫だけ増やします。
      </p>

      <div className="field">
        <label>名前（必須）</label>
        <input
          className="input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (matchedFrom && e.target.value !== matchedFrom.name) setMatchedFrom(null);
          }}
          autoFocus
        />
        {suggestions.length > 0 && (
          <div className="chip-row mt-8" style={{ marginBottom: 0 }}>
            {suggestions.map((s) => (
              <button key={s.id} className="chip" onClick={() => applySuggestion(s)}>
                {STORAGE_LOCATION_EMOJI[s.storageLocation ?? '常温']} {s.name}
              </button>
            ))}
          </div>
        )}
        {matchedFrom && (
          <p className="text-muted mt-8" style={{ fontSize: 12 }}>
            ✓ 前回の設定（保管場所・単位・管理方式）を使っています
          </p>
        )}
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
          <label>数量</label>
          <div className="stepper" style={{ justifyContent: 'space-between' }}>
            <button onClick={() => setQuantity((q) => snapQuantity(q - 1))}>−</button>
            <span>{formatQuantity(quantity, resolvedUnit)}</span>
            <button onClick={() => setQuantity((q) => snapQuantity(q + 1))}>＋</button>
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
        </div>
      )}

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        追加する
      </button>
    </BottomSheet>
  );
}
