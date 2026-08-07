import { useEffect, useMemo, useState } from 'react';
import { Package, Plus, Search, ShoppingCart } from 'lucide-react';
import { Header } from '../components/Header';
import { IngredientRow } from '../components/IngredientRow';
import { AddIngredientSheet } from '../components/AddIngredientSheet';
import { AddMemoSheet } from '../components/AddMemoSheet';
import { PurchaseFormSheet } from '../components/PurchaseFormSheet';
import { listIngredients } from '../repositories/ingredientRepo';
import {
  listShoppingMemo,
  toggleShoppingMemoChecked,
  deleteShoppingMemoItem,
} from '../repositories/shoppingMemoRepo';
import { useDataVersion } from '../hooks/useDataVersion';
import { useToast } from '../components/ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import type { Ingredient, IngredientCategory, ShoppingMemoItem } from '../types';

const CATEGORIES: (IngredientCategory | 'すべて')[] = [
  'すべて',
  '野菜',
  '肉・魚',
  '卵・乳製品',
  '主食',
  'その他',
];

export function Ingredients() {
  const { showToast } = useToast();
  const version = useDataVersion();
  const [tab, setTab] = useState<'inventory' | 'memo'>('inventory');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [memo, setMemo] = useState<ShoppingMemoItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<IngredientCategory | 'すべて'>('すべて');
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [showAddMemo, setShowAddMemo] = useState<string | undefined>(undefined);
  const [showAddMemoOpen, setShowAddMemoOpen] = useState(false);
  const [showPurchaseCarry, setShowPurchaseCarry] = useState(false);

  useEffect(() => {
    Promise.all([listIngredients(), listShoppingMemo()])
      .then(([ing, m]) => {
        setIngredients(ing);
        setMemo(m);
      })
      .catch((e) => showToast(toUserMessage(e, 'データの読み込みに失敗しました')));
  }, [version, showToast]);

  const filteredIngredients = useMemo(() => {
    return ingredients.filter((i) => {
      if (category !== 'すべて' && i.category !== category) return false;
      if (search.trim() && !i.name.includes(search.trim())) return false;
      return true;
    });
  }, [ingredients, category, search]);

  const uncheckedMemo = memo.filter((m) => !m.checked);
  const checkedMemo = memo.filter((m) => m.checked);

  async function handleToggleMemo(item: ShoppingMemoItem) {
    try {
      await toggleShoppingMemoChecked(item.id, !item.checked);
      notifyDataChanged();
    } catch (e) {
      showToast(toUserMessage(e, '更新に失敗しました'));
    }
  }

  async function handleDeleteMemo(id: string) {
    try {
      await deleteShoppingMemoItem(id);
      notifyDataChanged();
      showToast('削除しました');
    } catch (e) {
      showToast(toUserMessage(e, '削除に失敗しました'));
    }
  }

  return (
    <>
      <Header
        icon={<Package size={20} />}
        title="食材"
        actions={
          tab === 'inventory' ? (
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddIngredient(true)}>
              <Plus size={16} /> 食材を追加
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddMemoOpen(true)}>
              <Plus size={16} /> 追加
            </button>
          )
        }
      />
      <div className="page-content">
        <div className="tabs">
          <button className={`tab${tab === 'inventory' ? ' active' : ''}`} onClick={() => setTab('inventory')}>
            在庫一覧
          </button>
          <button className={`tab${tab === 'memo' ? ' active' : ''}`} onClick={() => setTab('memo')}>
            買い物メモ
            {uncheckedMemo.length > 0 && <span className="badge">{uncheckedMemo.length}</span>}
          </button>
        </div>

        {tab === 'inventory' ? (
          <>
            <div className="search-input-wrap mb-16">
              <Search size={16} className="search-icon" />
              <input
                className="input"
                placeholder="食材を検索"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
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
            <div className="card">
              {filteredIngredients.length === 0 ? (
                <div className="empty-state">まだ食材が登録されていません</div>
              ) : (
                filteredIngredients.map((i) => (
                  <IngredientRow
                    key={i.id}
                    ingredient={i}
                    onAddToMemo={(name) => setShowAddMemo(name)}
                  />
                ))
              )}
            </div>
            <p className="text-muted mt-8" style={{ fontSize: 12 }}>
              ※ 数量は調理・食事の記録時に自動で減っていきます。＋/−でも調整できます。
            </p>
          </>
        ) : (
          <>
            <div className="card mb-16">
              {memo.length === 0 ? (
                <div className="empty-state">買い物メモはまだありません</div>
              ) : (
                <>
                  {uncheckedMemo.map((item) => (
                    <label className="checkbox-row" key={item.id}>
                      <input type="checkbox" checked={false} onChange={() => handleToggleMemo(item)} />
                      <span style={{ flex: 1 }}>
                        {item.name}
                        {item.quantity && <span className="text-muted"> ・{item.quantity}</span>}
                        {item.memo && <div className="row-sub">{item.memo}</div>}
                      </span>
                      <button
                        className="icon-btn"
                        onClick={() => handleDeleteMemo(item.id)}
                        aria-label="削除"
                        style={{ fontSize: 12, color: 'var(--color-text-muted)' }}
                      >
                        削除
                      </button>
                    </label>
                  ))}
                  {checkedMemo.length > 0 && (
                    <>
                      <div className="text-muted" style={{ fontSize: 12, margin: '10px 0 4px' }}>
                        購入済み
                      </div>
                      {checkedMemo.map((item) => (
                        <label className="checkbox-row" key={item.id}>
                          <input type="checkbox" checked={true} onChange={() => handleToggleMemo(item)} />
                          <span style={{ flex: 1, textDecoration: 'line-through', color: 'var(--color-text-muted)' }}>
                            {item.name}
                            {item.quantity && <span> ・{item.quantity}</span>}
                          </span>
                        </label>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
            {checkedMemo.length > 0 && (
              <button className="btn btn-secondary" onClick={() => setShowPurchaseCarry(true)}>
                <ShoppingCart size={16} /> 購入済み商品を買い物記録へ（{checkedMemo.length}件）
              </button>
            )}
          </>
        )}
      </div>

      {showAddIngredient && <AddIngredientSheet onClose={() => setShowAddIngredient(false)} />}
      {showAddMemo !== undefined && (
        <AddMemoSheet initialName={showAddMemo} onClose={() => setShowAddMemo(undefined)} />
      )}
      {showAddMemoOpen && <AddMemoSheet onClose={() => setShowAddMemoOpen(false)} />}
      {showPurchaseCarry && (
        <PurchaseFormSheet carriedItems={checkedMemo} onClose={() => setShowPurchaseCarry(false)} />
      )}
    </>
  );
}
