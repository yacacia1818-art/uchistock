import { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { addShoppingMemoItem } from '../repositories/shoppingMemoRepo';
import { useToast } from './ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import { UNIT_OPTIONS } from '../types';
import type { ShoppingCategory } from '../types';

const CATEGORIES: ShoppingCategory[] = ['食品', '日用品'];

interface AddMemoSheetProps {
  onClose: () => void;
  initialName?: string;
}

export function AddMemoSheet({ onClose, initialName }: AddMemoSheetProps) {
  const { showToast } = useToast();
  const [name, setName] = useState(initialName ?? '');
  const [category, setCategory] = useState<ShoppingCategory>('食品');
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState<string>('個');
  const [customUnit, setCustomUnit] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  const resolvedUnit = unit === 'その他' ? customUnit.trim() || 'その他' : unit;

  async function handleSave() {
    if (!name.trim()) {
      showToast('商品名を入力してください');
      return;
    }
    setSaving(true);
    try {
      await addShoppingMemoItem({
        name: name.trim(),
        category,
        quantityValue: quantity > 0 ? quantity : undefined,
        unit: quantity > 0 ? resolvedUnit : undefined,
        memo: memo.trim() || undefined,
      });
      notifyDataChanged();
      showToast('買い物メモに追加しました');
      onClose();
    } catch (e) {
      showToast(toUserMessage(e, '保存に失敗しました'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet title="買い物メモに追加" onClose={onClose}>
      <div className="field">
        <label>商品名（必須）</label>
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
        <label>数量（任意）</label>
        <div className="stepper" style={{ justifyContent: 'space-between' }}>
          <button onClick={() => setQuantity((q) => Math.max(0, q - 1))}>−</button>
          <span>{quantity > 0 ? quantity : '未指定'}</span>
          <button onClick={() => setQuantity((q) => q + 1)}>＋</button>
        </div>
      </div>

      {quantity > 0 && (
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
      )}

      <div className="field">
        <label>メモ（任意）</label>
        <input className="input" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        追加する
      </button>
    </BottomSheet>
  );
}
