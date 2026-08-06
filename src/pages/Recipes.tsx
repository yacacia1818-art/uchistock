import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Star } from 'lucide-react';
import { Header } from '../components/Header';
import { RecipeFormSheet } from '../components/RecipeFormSheet';
import { listRecipes } from '../repositories/recipeRepo';
import { useDataVersion } from '../hooks/useDataVersion';
import { useToast } from '../components/ToastProvider';
import { toUserMessage } from '../utils/errors';
import type { Recipe } from '../types';

const CATEGORY_EMOJI: Record<string, string> = {
  主食: '🍚',
  主菜: '🍗',
  副菜: '🥗',
  おやつ: '🍰',
  その他: '🍽️',
};

export function Recipes() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const version = useDataVersion();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    listRecipes()
      .then(setRecipes)
      .catch((e) => showToast(toUserMessage(e, 'レシピの読み込みに失敗しました')));
  }, [version, showToast]);

  return (
    <>
      <Header
        icon={
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label="戻る" style={{ padding: 0 }}>
            <ChevronLeft size={22} />
          </button>
        }
        title="マイレシピ"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> 追加
          </button>
        }
      />
      <div className="page-content">
        <div className="card">
          {recipes.length === 0 ? (
            <div className="empty-state">まだレシピがありません</div>
          ) : (
            recipes.map((r) => (
              <button
                key={r.id}
                className="list-row"
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', font: 'inherit' }}
                onClick={() => navigate(`/recipes/${r.id}`)}
              >
                <div className="recipe-thumb">{CATEGORY_EMOJI[r.category ?? 'その他']}</div>
                <div className="row-main">
                  <div className="row-title" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {r.name}
                    {r.favorite && <Star size={13} fill="var(--color-primary)" color="var(--color-primary)" />}
                  </div>
                  <div className="row-sub">{r.ingredients ?? r.category ?? ''}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
      {showAdd && <RecipeFormSheet onClose={() => setShowAdd(false)} />}
    </>
  );
}
