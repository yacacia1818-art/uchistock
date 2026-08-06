// メシログ ドメイン型定義

export type IngredientCategory = '野菜' | '肉・魚' | '卵・乳製品' | '主食' | 'その他';

export type TrackType = 'count' | 'rough';

export type RoughLevel = '多い' | '半分' | '少ない' | 'なし';

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  trackType: TrackType;
  count?: number;
  unit?: string; // 個・本・パック等
  roughLevel?: RoughLevel;
  createdAt: string;
  updatedAt: string;
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

export type MealType = '朝食' | '昼食' | '夕食' | '間食';
export type MealKind = 'home' | 'eatout';

export interface Meal {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  mealType: MealType;
  mealKind: MealKind;
  ingredientNames?: string[]; // 自炊: 選択した食材名のスナップショット
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
