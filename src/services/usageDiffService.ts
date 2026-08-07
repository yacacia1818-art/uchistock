import { decrementIngredientQuantity, incrementIngredientQuantity } from '../repositories/ingredientRepo';
import type { Ingredient, IngredientUsage } from '../types';

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function usageMapOf(usages: IngredientUsage[]): Map<string, number> {
  return new Map(usages.map((u) => [u.ingredientId, u.usage.value]));
}

// 食材IDごとに編集前後の使用量を比較し、追加消費分が在庫を上回る食材名を返す（保存前チェック用。在庫は変更しない）
export function validateUsageDiff(
  oldUsages: IngredientUsage[],
  newUsages: IngredientUsage[],
  ingredientsById: Map<string, Ingredient>
): string[] {
  const oldByIng = usageMapOf(oldUsages);
  const newByIng = usageMapOf(newUsages);
  const nameById = new Map<string, string>();
  for (const u of [...oldUsages, ...newUsages]) nameById.set(u.ingredientId, u.ingredientName);

  const allIds = new Set([...oldByIng.keys(), ...newByIng.keys()]);
  const insufficient: string[] = [];
  for (const id of allIds) {
    const delta = round4((newByIng.get(id) ?? 0) - (oldByIng.get(id) ?? 0));
    if (delta > 1e-9) {
      const current = ingredientsById.get(id)?.quantity ?? 0;
      if (current < delta - 1e-9) insufficient.push(nameById.get(id) ?? '不明な食材');
    }
  }
  return insufficient;
}

// 食材IDごとの差分だけを在庫へ反映する（増加分は追加消費、減少分は在庫へ返却）。
// 参照先の食材が削除済み（在庫削除機能で消えた）の場合はrepository側で静かにスキップされる
export async function applyUsageDiff(oldUsages: IngredientUsage[], newUsages: IngredientUsage[]): Promise<void> {
  const oldByIng = usageMapOf(oldUsages);
  const newByIng = usageMapOf(newUsages);
  const allIds = new Set([...oldByIng.keys(), ...newByIng.keys()]);
  for (const id of allIds) {
    const delta = round4((newByIng.get(id) ?? 0) - (oldByIng.get(id) ?? 0));
    if (delta > 1e-9) {
      await decrementIngredientQuantity(id, delta);
    } else if (delta < -1e-9) {
      await incrementIngredientQuantity(id, Math.abs(delta));
    }
  }
}

// 編集フォームの選択肢に、この記録が既に確保している分（在庫削除済みの食材も含む）を反映した食材一覧を作る。
// 新規登録フォームでは使わない（既存の「在庫がある食材だけ選べる」挙動は維持する）
export function buildEditableIngredientPool(
  ingredients: Ingredient[],
  originalUsages: IngredientUsage[]
): Ingredient[] {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const pool = ingredients.map((ing) => {
    const reserved = originalUsages.find((u) => u.ingredientId === ing.id);
    if (!reserved) return ing;
    return { ...ing, quantity: round4(ing.quantity + reserved.usage.value) };
  });
  for (const usage of originalUsages) {
    if (!byId.has(usage.ingredientId)) {
      pool.push({
        id: usage.ingredientId,
        name: usage.ingredientName,
        category: 'その他',
        unit: usage.unit,
        quantity: usage.usage.value,
        createdAt: '',
        updatedAt: '',
      });
    }
  }
  return pool;
}
