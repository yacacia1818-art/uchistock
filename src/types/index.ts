// ウチストック ドメイン型定義

export type IngredientCategory = '野菜' | '肉・魚' | '卵・乳製品' | '主食' | 'その他';

export type HouseholdCategory = '洗剤・掃除用品' | '衛生用品' | '薬・医薬品' | '文房具・雑貨' | 'その他';

// v1.0レガシー（マイグレーションで新フィールドへ変換。後方互換のため残置）
export type TrackType = 'count' | 'rough';
export type RoughLevel = '多い' | '半分' | '少ない' | 'なし';

export const UNIT_OPTIONS = ['個', '本', 'パック', '袋', '箱', '玉', '枚', '食', 'その他'] as const;
export type UnitOption = (typeof UNIT_OPTIONS)[number];

// 期限バッチ：購入ごとの期限と数量を保持する（古い期限を失わないため）
export interface ExpiryBatch {
  date: string; // YYYY-MM-DD
  quantity: number;
}

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory | HouseholdCategory;
  unit: string; // 個・本・パック・袋・玉・枚・食・その他（自由入力可）
  quantity: number; // 個数・本数・パック数（パック等は小数を許容し、使用割合を反映）
  createdAt: string;
  updatedAt: string;
  // v1.0レガシーフィールド（既存データ保護のため保持。新ロジックでは未使用）
  trackType?: TrackType;
  count?: number;
  roughLevel?: RoughLevel;
  // v1.1: 期限（任意）。表示用の代表値（最新の購入で上書き）
  expiryDate?: string; // YYYY-MM-DD
  // 期限ごとの数量履歴（カレンダー等で古い期限も参照するため非破壊で保持）
  expiryBatches?: ExpiryBatch[];
  // v1.4: 食品/日用品の区分。未設定の既存データは食品として扱う
  itemType?: ShoppingCategory;
}

export type ShoppingCategory = '食品' | '日用品';

export interface ShoppingMemoItem {
  id: string;
  name: string;
  quantity?: string; // v1.0レガシー：自由入力の数量文字列（既存データ保護のため保持）
  memo?: string;
  checked: boolean;
  createdAt: string;
  // v1.1: 構造化された数量・単位・カテゴリ（任意）
  category?: ShoppingCategory; // 未設定は「食品」として扱う
  quantityValue?: number;
  unit?: string;
}

export interface PurchaseItem {
  id?: string; // v1.2.1: 編集時に商品を特定するための安定ID（未設定は旧データ）
  name: string;
  quantity?: number; // 購入時の数量（レシート上の数量、例：1パック）
  unit?: string;
  category?: ShoppingCategory;
  price?: number; // 個別価格（任意・合計金額と一致している必要はない）
  expiryDate?: string; // YYYY-MM-DD（食品のみ想定）
}

export interface InventoryAddition {
  itemId?: string; // 対応するPurchaseItem.id（編集時の差分計算に使用。未設定は旧データ）
  name: string;
  unit: string;
  quantity: number;
  expiryDate?: string; // YYYY-MM-DD
  // v1.3: 在庫作成時のカテゴリ（任意・新規作成時のみ使用。既存食材のカテゴリは上書きしない）
  category?: IngredientCategory | HouseholdCategory;
  // v1.4: 食品/日用品の区分（任意・新規作成時のみ使用。未設定は食品として扱う）
  itemType?: ShoppingCategory;
}

export interface Purchase {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  totalAmount: number;
  storeName?: string;
  items?: PurchaseItem[];
  receiptId?: string;
  // この購入で在庫へ反映した内容（二重反映防止の記録も兼ねる）
  inventoryAdditions?: InventoryAddition[];
  // v1.1: 食品・日用品を同時購入した場合の食費按分額（未設定なら合計金額全体を食費として扱う）
  foodAmount?: number;
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
  // v1.1: 食費の集計開始日（1〜28）。未設定は1日として扱う
  budgetStartDay?: number;
  // v1.3: 食事管理機能のON/OFF。未設定（既存ユーザー含む）は常にONとして扱う
  mealTrackingEnabled?: boolean;
}
