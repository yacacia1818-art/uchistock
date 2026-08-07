import { useRef, useState } from 'react';
import { Camera, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { updatePurchaseWithInventory, type EditableItemRow } from '../services/purchaseEditService';
import { useToast } from './ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import { generateId } from '../utils/id';
import { UNIT_OPTIONS } from '../types';
import type { Purchase, ShoppingCategory } from '../types';

interface PurchaseEditSheetProps {
  purchase: Purchase;
  onClose: () => void;
  onSaved: (purchase: Purchase) => void;
}

function buildRowsFromPurchase(purchase: Purchase): EditableItemRow[] {
  const additions = purchase.inventoryAdditions ?? [];
  const priorByItemId = new Map(additions.filter((a) => a.itemId).map((a) => [a.itemId!, a]));
  // v1.2以前のitemId未付与データ向けフォールバック（商品名で対応付け）
  const priorByName = new Map(additions.map((a) => [a.name, a]));
  return (purchase.items ?? []).map((item) => {
    const id = item.id ?? generateId();
    const prior = (item.id && priorByItemId.get(item.id)) || priorByName.get(item.name);
    return {
      id,
      name: item.name,
      category: item.category ?? '食品',
      quantity: item.quantity !== undefined ? String(item.quantity) : '',
      unit: item.unit ?? '個',
      price: item.price !== undefined ? String(item.price) : '',
      expiryDate: item.expiryDate ?? '',
      addToInventory: !!prior,
      convertUnit: !!prior && prior.unit !== (item.unit ?? '個'),
      invQuantity: prior ? String(prior.quantity) : item.quantity !== undefined ? String(item.quantity) : '',
      invUnit: prior ? prior.unit : item.unit ?? '個',
    };
  });
}

function blankRow(): EditableItemRow {
  return {
    id: generateId(),
    name: '',
    category: '食品',
    quantity: '',
    unit: '個',
    price: '',
    expiryDate: '',
    addToInventory: true,
    convertUnit: false,
    invQuantity: '',
    invUnit: '個',
  };
}

export function PurchaseEditSheet({ purchase, onClose, onSaved }: PurchaseEditSheetProps) {
  const { showToast } = useToast();
  const [date, setDate] = useState(purchase.date);
  const [totalAmount, setTotalAmount] = useState(String(purchase.totalAmount));
  const [storeName, setStoreName] = useState(purchase.storeName ?? '');
  const [rows, setRows] = useState<EditableItemRow[]>(buildRowsFromPurchase(purchase));
  const [showAmountSplit, setShowAmountSplit] = useState(purchase.foodAmount !== undefined);
  const [foodAmount, setFoodAmount] = useState(purchase.foodAmount !== undefined ? String(purchase.foodAmount) : '');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateRow(id: string, patch: Partial<EditableItemRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    const amountNum = Number(totalAmount);
    if (totalAmount.trim() === '' || Number.isNaN(amountNum) || amountNum < 0) {
      showToast('正しい金額を入力してください');
      return;
    }
    let foodAmountNum: number | undefined;
    if (showAmountSplit && foodAmount.trim() !== '') {
      foodAmountNum = Number(foodAmount);
      if (Number.isNaN(foodAmountNum) || foodAmountNum < 0) {
        showToast('食品・食費分には0以上の数値を入力してください');
        return;
      }
    }
    setSaving(true);
    try {
      const { purchase: updated, skippedReductions, skippedExpiryUpdates } = await updatePurchaseWithInventory({
        purchase,
        date,
        storeName: storeName.trim() || undefined,
        totalAmount: amountNum,
        foodAmount: foodAmountNum,
        rows,
        receiptFile,
      });
      notifyDataChanged();
      const notes: string[] = [];
      if (skippedReductions.length > 0) notes.push(`在庫は自動変更しませんでした：${skippedReductions.join('・')}`);
      if (skippedExpiryUpdates.length > 0) notes.push(`在庫の期限は自動更新しませんでした：${skippedExpiryUpdates.join('・')}`);
      showToast(notes.length > 0 ? `保存しました（${notes.join('／')}）` : '購入記録を更新しました');
      onSaved(updated);
      onClose();
    } catch (e) {
      showToast(toUserMessage(e, '保存に失敗しました'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet title="購入記録を編集" onClose={onClose}>
      <div className="field">
        <label>購入日</label>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="field">
        <label>合計金額（必須）</label>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
        />
      </div>

      <button
        type="button"
        className="btn-ghost"
        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, marginBottom: 14, padding: 0 }}
        onClick={() => setShowAmountSplit((v) => !v)}
      >
        {showAmountSplit ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        食品・日用品の内訳を指定する（任意）
      </button>
      {showAmountSplit && (
        <div className="field">
          <label>食品・食費分（任意・空欄なら合計金額をすべて食費に含めます）</label>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            value={foodAmount}
            onChange={(e) => setFoodAmount(e.target.value)}
          />
        </div>
      )}

      <div className="field">
        <label>店名（任意）</label>
        <input className="input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
      </div>

      <div className="field">
        <label>購入したもの（任意）</label>
        {rows.length > 0 && (
          <div className="card mb-8" style={{ padding: '4px 12px' }}>
            {rows.map((row) => (
              <div key={row.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input
                    className="input"
                    style={{ flex: 1 }}
                    placeholder="商品名"
                    value={row.name}
                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                  />
                  <button className="icon-btn" onClick={() => removeRow(row.id)} aria-label="削除">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="chip-row" style={{ marginBottom: 8 }}>
                  {(['食品', '日用品'] as ShoppingCategory[]).map((c) => (
                    <button
                      key={c}
                      className={`chip${row.category === c ? ' active' : ''}`}
                      onClick={() => updateRow(row.id, { category: c })}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <input
                    className="input"
                    type="number"
                    inputMode="decimal"
                    placeholder="数量"
                    style={{ width: 72, padding: '8px 10px' }}
                    value={row.quantity}
                    onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
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
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    placeholder="価格（任意）"
                    style={{ flex: 1, minWidth: 100, padding: '8px 10px' }}
                    value={row.price}
                    onChange={(e) => updateRow(row.id, { price: e.target.value })}
                  />
                  <span className="text-muted" style={{ alignSelf: 'center', fontSize: 13 }}>
                    円
                  </span>
                </div>

                <label className="checkbox-row" style={{ padding: '4px 0', borderBottom: 'none' }}>
                  <input
                    type="checkbox"
                    checked={row.addToInventory}
                    onChange={(e) => updateRow(row.id, { addToInventory: e.target.checked })}
                  />
                  <span>在庫にも反映する</span>
                </label>

                {row.addToInventory && (
                  <div style={{ paddingLeft: 4 }}>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: 12, padding: 0, marginBottom: row.convertUnit ? 8 : 0 }}
                      onClick={() =>
                        updateRow(row.id, {
                          convertUnit: !row.convertUnit,
                          invQuantity: row.invQuantity || row.quantity,
                          invUnit: row.invUnit || row.unit,
                        })
                      }
                    >
                      {row.convertUnit ? '単位変換をやめる' : '在庫の単位を変更する（任意）'}
                    </button>
                    {row.convertUnit && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                        <span className="text-muted" style={{ fontSize: 12 }}>
                          在庫へ
                        </span>
                        <input
                          className="input"
                          type="number"
                          inputMode="decimal"
                          style={{ width: 72, padding: '8px 10px' }}
                          value={row.invQuantity}
                          onChange={(e) => updateRow(row.id, { invQuantity: e.target.value })}
                        />
                        <select
                          className="select"
                          style={{ width: 84, padding: '8px 6px' }}
                          value={row.invUnit}
                          onChange={(e) => updateRow(row.id, { invUnit: e.target.value })}
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {row.category === '食品' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="text-muted" style={{ fontSize: 12 }}>
                          期限
                        </span>
                        <input
                          className="input"
                          type="date"
                          style={{ flex: 1, padding: '8px 10px' }}
                          value={row.expiryDate}
                          onChange={(e) => updateRow(row.id, { expiryDate: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <button type="button" className="btn btn-outline" onClick={() => setRows((prev) => [...prev, blankRow()])}>
          <Plus size={16} /> 商品を追加
        </button>
        <p className="text-muted mt-8" style={{ fontSize: 12 }}>
          ※ 既に在庫へ反映済みの商品は、数量の増減分だけを在庫に反映します。減らす場合、現在の在庫が足りないときは在庫を変更しません。
        </p>
      </div>

      <div className="field">
        <label>レシート画像（任意）</label>
        {receiptPreview ? (
          <img
            src={receiptPreview}
            alt="レシートプレビュー"
            style={{ width: '100%', borderRadius: 12, maxHeight: 220, objectFit: 'contain', background: '#fff' }}
          />
        ) : (
          <button type="button" className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
            <Camera size={18} /> {purchase.receiptId ? 'レシートを差し替える' : '撮影・画像を選択'}
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
