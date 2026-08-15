import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Package, Plus, Search } from 'lucide-react';
import { Header } from '../components/Header';
import { IngredientRow } from '../components/IngredientRow';
import { AddIngredientSheet } from '../components/AddIngredientSheet';
import { EditIngredientSheet } from '../components/EditIngredientSheet';
import { listIngredients } from '../repositories/ingredientRepo';
import { useDataVersion } from '../hooks/useDataVersion';
import { useToast } from '../components/ToastProvider';
import { toUserMessage } from '../utils/errors';
import { STORAGE_LOCATION_EMOJI } from '../utils/categoryEmoji';
import { STORAGE_LOCATIONS } from '../types';
import type { Ingredient, StorageLocation } from '../types';

const FILTERS: (StorageLocation | 'すべて')[] = ['すべて', ...STORAGE_LOCATIONS];

export function Ingredients() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const version = useDataVersion();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StorageLocation | 'すべて'>('すべて');
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);

  useEffect(() => {
    listIngredients()
      .then(setIngredients)
      .catch((e) => showToast(toUserMessage(e, 'データの読み込みに失敗しました')));
  }, [version, showToast]);

  const filteredIngredients = useMemo(() => {
    return ingredients.filter((i) => {
      const loc = i.storageLocation ?? '常温';
      if (filter !== 'すべて' && loc !== filter) return false;
      if (search.trim() && !i.name.includes(search.trim())) return false;
      return true;
    });
  }, [ingredients, filter, search]);

  const grouped = useMemo(() => {
    if (filter !== 'すべて') return null;
    const map = new Map<StorageLocation, Ingredient[]>();
    for (const loc of STORAGE_LOCATIONS) map.set(loc, []);
    for (const i of filteredIngredients) map.get(i.storageLocation ?? '常温')!.push(i);
    return map;
  }, [filteredIngredients, filter]);

  return (
    <>
      <Header
        icon={<Package size={20} />}
        title="在庫"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddIngredient(true)}>
            <Plus size={16} /> 追加する
          </button>
        }
      />
      <div className="page-content">
        <div className="search-input-wrap mb-16">
          <Search size={16} className="search-icon" />
          <input
            className="input"
            placeholder="在庫を検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="chip-row">
          {FILTERS.map((f) => (
            <button key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f !== 'すべて' && `${STORAGE_LOCATION_EMOJI[f]} `}
              {f}
            </button>
          ))}
        </div>

        {grouped ? (
          [...grouped.entries()].map(([loc, items]) =>
            items.length === 0 ? null : (
              <div key={loc} className="mb-16">
                <div className="section-title" style={{ marginBottom: 8 }}>
                  {STORAGE_LOCATION_EMOJI[loc]} {loc}
                </div>
                <div className="card">
                  {items.map((i) => (
                    <IngredientRow key={i.id} ingredient={i} onEdit={(ing) => setEditingIngredient(ing)} />
                  ))}
                </div>
              </div>
            )
          )
        ) : (
          <div className="card">
            {filteredIngredients.length === 0 ? (
              <div className="empty-state">まだ在庫が登録されていません</div>
            ) : (
              filteredIngredients.map((i) => (
                <IngredientRow key={i.id} ingredient={i} onEdit={(ing) => setEditingIngredient(ing)} />
              ))
            )}
          </div>
        )}

        {filteredIngredients.length === 0 && grouped && (
          <div className="card">
            <div className="empty-state">まだ在庫が登録されていません</div>
          </div>
        )}

        <button
          className="link-row"
          style={{ width: '100%', border: 'none', background: 'none', font: 'inherit' }}
          onClick={() => navigate('/records')}
        >
          <span className="text-muted" style={{ fontSize: 13 }}>
            📜 変化履歴を見る
          </span>
          <ChevronRight size={16} className="text-muted" />
        </button>
      </div>

      {showAddIngredient && <AddIngredientSheet onClose={() => setShowAddIngredient(false)} />}
      {editingIngredient && (
        <EditIngredientSheet ingredient={editingIngredient} onClose={() => setEditingIngredient(null)} />
      )}
    </>
  );
}
