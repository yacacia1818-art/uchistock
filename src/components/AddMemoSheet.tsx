import { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { addShoppingMemoItem } from '../repositories/shoppingMemoRepo';
import { useToast } from './ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';

interface AddMemoSheetProps {
  onClose: () => void;
  initialName?: string;
}

export function AddMemoSheet({ onClose, initialName }: AddMemoSheetProps) {
  const { showToast } = useToast();
  const [name, setName] = useState(initialName ?? '');
  const [quantity, setQuantity] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      showToast('食材名を入力してください');
      return;
    }
    setSaving(true);
    try {
      await addShoppingMemoItem({
        name: name.trim(),
        quantity: quantity.trim() || undefined,
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
        <label>食材名（必須）</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label>数量（任意）</label>
        <input className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="例：2個" />
      </div>
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
