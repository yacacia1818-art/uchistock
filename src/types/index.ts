// メシログ ドメイン型定義

export type IngredientCategory = '野菜' | '肉・魚' | '卵・乳製品' | '主食' | 'その他';

// v1.0レガシー（マイグレーションで新フィールドへ変換。後方互換のため残置）
export type TrackType = 'count' | 'rough';
export type RoughLevel = '多い' | '半分' | '少ない' | 'なし';

export const UNIT_OPTIONS = ['個', '本', 'パック', '袋', '玉', '枚', '食', 'その他'] as const;
export type UnitOption = (typeof UNIT_OPTIONS)[number];

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  unit: string; // 個・本・パック・袋・玉・枚・食・その他（自由入力可）
  quantity: number; // 個数・本数・パック数（パック等は小数を許容し、使用割合を反映）
  createdAt: string;
  updatedAt: string;
  // v1.0レガシーフィールド（既存データ保護のため保持。新ロジックでは未使用）
  trackType?: TrackType;
  count?: number;
  roughLevel?: RoughLevel;
}

export interface ShoppingMemoItem {
  id: string;
  name: string;
  quantity?: string;
  memo?: string;
  checked: boolean;
  createdAt: string;
}

export interface PurchaseItem {
  name: string;
  price?: number;
}

export interface Purchase {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  totalAmount: number;
  storeName?: string;
  items?: PurchaseItem[];
  receiptId?: string;
  createdAt: string;
}

export interface ReceiptImage {
  id: string;
  blob: Blob;
  createdAt: string;
}

// 食材使用量：個数指定 or （パック等の）割合指定
export type UsageAmount =
  | { type: 'count'; value: number }
  | { type: 'fraction'; value: number };

export interface IngredientUsage {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  usage: UsageAmount;
}

// 調理済み料理
export interface CookedDish {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  ingredientUsages: IngredientUsage[];
  servings?: number; // 何食分できたか（任意）
  servingsRemaining?: number; // 残り食数（servings指定時のみ管理）
  memo?: string;
  createdAt: string;
}

export type MealType = '朝食' | '昼食' | '夕食' | '間食';
export type MealKind = 'home' | 'eatout';
export type MealHomeSource = 'direct' | 'cooked' | 'freeText' | 'cookNow';

export interface Meal {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  mealType: MealType;
  mealKind: MealKind;
  homeSource?: MealHomeSource; // 自炊時の食べ方（未設定＝旧データ）
  ingredientUsages?: IngredientUsage[]; // direct/cookNow: 直接消費した食材
  cookedDishId?: string; // cooked/cookNow: 参照する調理済み料理
  freeTextItems?: string[]; // freeText: 自由入力した食品名
  ingredientNames?: string[]; // 自炊: 選択した食材名のスナップショット（表示用・全ソース共通）
  dishName?: string;
  memo?: string;
  amount?: number; // 外食: 金額
  storeName?: string; // 外食: 店名
  createdAt: string;
}

export type RecipeCategory = '主食' | '主菜' | '副菜' | 'おやつ' | 'その他';

export interface Recipe {
  id: string;
  name: string;
  body: string;
  category?: RecipeCategory;
  ingredients?: string;
  memo?: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: 'settings';
  monthlyBudget: number;
}
