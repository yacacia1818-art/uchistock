import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { recordPurchase } from '../services/purchaseService';
import { useToast } from './ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import { parseMemoQuantity } from '../utils/quantity';
import { UNIT_OPTIONS } from '../types';
import type { ShoppingMemoItem } from '../types';

interface PurchaseFormSheetProps {
  onClose: () => void;
  carriedItems?: ShoppingMemoItem[];
}

interface InventoryRow {
  id: string;
  name: string;
  checked: boolean;
  quantity: number;
  unit: string;
}

export function PurchaseFormSheet({ onClose, carriedItems }: PurchaseFormSheetProps) {
  const { showToast } = useToast();
  const [totalAmount, setTotalAmount] = useState('');
  const [storeName, setStoreName] = useState('');
  const [itemsText, setItemsText] = useState(
    carriedItems ? carriedItems.map((i) => i.name).join('\n') : ''
  );
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>(
    (carriedItems ?? []).map((item) => {
      const { quantity, unit } = parseMemoQuantity(item.quantity);
      return { id: item.id, name: item.name, checked: true, quantity, unit };
    })
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  function updateRow(id: string, patch: Partial<InventoryRow>) {
    setInventoryRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    const amountNum = Number(totalAmount);
    if (totalAmount.trim() === '' || Number.isNaN(amountNum) || amountNum < 0) {
      showToast('正しい金額を入力してください');
      return;
    }
    setSaving(true);
    try {
      const items = itemsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name }));

      const inventoryAdditions = inventoryRows
        .filter((r) => r.checked && r.quantity > 0)
        .map((r) => ({ name: r.name, unit: r.unit, quantity: r.quantity }));

      await recordPurchase({
        totalAmount: amountNum,
        storeName: storeName.trim() || undefined,
        items: items.length > 0 ? items : undefined,
        receiptFile,
        carriedMemoIds: carriedItems?.map((i) => i.id),
        inventoryAdditions,
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

  return (
    <BottomSheet title="買い物を記録" onClose={onClose}>
      <div className="field">
        <label>合計金額（必須）</label>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          placeholder="例：2860"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          autoFocus
        />
      </div>

      <div className="field">
        <label>店名（任意）</label>
        <input className="input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
      </div>

      <div className="field">
        <label>購入商品（任意・1行に1つ）</label>
        <textarea
          className="textarea"
          value={itemsText}
          onChange={(e) => setItemsText(e.target.value)}
          placeholder={'例：\n卵\n牛乳'}
        />
      </div>

      {inventoryRows.length > 0 && (
        <div className="field">
          <label>在庫に追加</label>
          <div className="card" style={{ padding: '4px 12px' }}>
            {inventoryRows.map((row) => (
              <div key={row.id} className="checkbox-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={row.checked}
                  onChange={(e) => updateRow(row.id, { checked: e.target.checked })}
                />
                <span style={{ flex: 1, minWidth: 80 }}>{row.name}</span>
                {row.checked && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      className="input"
                      type="number"
                      inputMode="decimal"
                      style={{ width: 64, padding: '8px 10px' }}
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, { quantity: Math.max(0, Number(e.target.value)) })}
                    />
                    <select
                      className="select"
                      style={{ width: 84, padding: '8px 6px' }}
                      value={row.unit}
                      onChange={(e) => updateRow(row.id, { unit: e.target.value })}
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-muted mt-8" style={{ fontSize: 12 }}>
            ※ チェックを外すと在庫には追加されません。同じ食材・単位がある場合は数量を加算します。
          </p>
        </div>
      )}

      <div className="field">
        <label>レシート画像（任意）</label>
        {receiptPreview ? (
          <img
            src={receiptPreview}
            alt="レシートプレビュー"
            style={{ width: '100%', borderRadius: 12, maxHeight: 220, objectFit: 'contain', background: '#fff' }}
          />
        ) : (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera size={18} /> 撮影・画像を選択
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        保存
      </button>
    </BottomSheet>
  );
}
