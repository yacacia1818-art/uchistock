import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Pencil, Star, Trash2, Utensils } from 'lucide-react';
import { Header } from '../components/Header';
import { RecipeFormSheet } from '../components/RecipeFormSheet';
import { MealFormSheet } from '../components/MealFormSheet';
import { getRecipe, deleteRecipe } from '../repositories/recipeRepo';
import { useToast } from '../components/ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import type { Recipe } from '../types';

export function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showMealForm, setShowMealForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    getRecipe(id)
      .then((r) => setRecipe(r ?? null))
      .catch((e) => showToast(toUserMessage(e, 'レシピの読み込みに失敗しました')));
  }, [id, showToast]);

  async function handleDelete() {
    if (!recipe) return;
    if (!confirm('このレシピを削除しますか？')) return;
    try {
      await deleteRecipe(recipe.id);
      notifyDataChanged();
      showToast('削除しました');
      navigate('/recipes');
    } catch (e) {
      showToast(toUserMessage(e, '削除に失敗しました'));
    }
  }

  if (!recipe) {
    return (
      <>
        <Header
          icon={
            <button className="icon-btn" onClick={() => navigate(-1)} style={{ padding: 0 }} aria-label="戻る">
              <ChevronLeft size={22} />
            </button>
          }
          title="レシピ"
        />
        <div className="page-content">
          <div className="empty-state">レシピが見つかりません</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        icon={
          <button className="icon-btn" onClick={() => navigate(-1)} style={{ padding: 0 }} aria-label="戻る">
            <ChevronLeft size={22} />
          </button>
        }
        title={recipe.name}
        actions={
          <>
            <button className="icon-btn" onClick={() => setShowEdit(true)} aria-label="編集">
              <Pencil size={18} />
            </button>
            <button className="icon-btn" onClick={handleDelete} aria-label="削除">
              <Trash2 size={18} />
            </button>
          </>
        }
      />
      <div className="page-content">
        <div className="card mb-16">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {recipe.category && <span className="chip active">{recipe.category}</span>}
            {recipe.favorite && <Star size={16} fill="var(--color-primary)" color="var(--color-primary)" />}
          </div>
          {recipe.ingredients && <div className="row-sub mb-8">使用食材：{recipe.ingredients}</div>}
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 14 }}>{recipe.body}</div>
          {recipe.memo && (
            <div className="text-muted mt-8" style={{ fontSize: 13 }}>
              メモ：{recipe.memo}
            </div>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => setShowMealForm(true)}>
          <Utensils size={16} /> 作った
        </button>
      </div>

      {showEdit && <RecipeFormSheet existing={recipe} onClose={() => setShowEdit(false)} onSaved={setRecipe} />}
      {showMealForm && (
        <MealFormSheet
          initialDishName={recipe.name}
          initialHomeSource="cookNow"
          onClose={() => setShowMealForm(false)}
        />
      )}
    </>
  );
}
