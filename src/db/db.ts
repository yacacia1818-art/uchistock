import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type {
  Ingredient,
  ShoppingMemoItem,
  Purchase,
  ReceiptImage,
  Meal,
  Recipe,
  Memo,
  Settings,
  CookedDish,
  RoughLevel,
} from '../types';

interface MeshiLogDB extends DBSchema {
  settings: { key: string; value: Settings };
  ingredients: { key: string; value: Ingredient; indexes: { 'by-name': string } };
  shoppingMemo: { key: string; value: ShoppingMemoItem };
  purchases: { key: string; value: Purchase; indexes: { 'by-date': string } };
  receipts: { key: string; value: ReceiptImage };
  meals: { key: string; value: Meal; indexes: { 'by-date': string } };
  recipes: { key: string; value: Recipe };
  cookedDishes: { key: string; value: CookedDish; indexes: { 'by-date': string } };
  memos: { key: string; value: Memo };
}

const DB_NAME = 'meshi-log-db';
const DB_VERSION = 3;

// v1.0の「ざっくり残量」を新しい数量モデルへ変換する際の目安値（既存データの非破壊的マイグレーション用）
const ROUGH_LEVEL_QUANTITY: Record<RoughLevel, number> = {
  多い: 3,
  半分: 2,
  少ない: 1,
  なし: 0,
};

let dbPromise: Promise<IDBPDatabase<MeshiLogDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<MeshiLogDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MeshiLogDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('ingredients')) {
            const store = db.createObjectStore('ingredients', { keyPath: 'id' });
            store.createIndex('by-name', 'name');
          }
          if (!db.objectStoreNames.contains('shoppingMemo')) {
            db.createObjectStore('shoppingMemo', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('purchases')) {
            const store = db.createObjectStore('purchases', { keyPath: 'id' });
            store.createIndex('by-date', 'date');
          }
          if (!db.objectStoreNames.contains('receipts')) {
            db.createObjectStore('receipts', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('meals')) {
            const store = db.createObjectStore('meals', { keyPath: 'id' });
            store.createIndex('by-date', 'date');
          }
          if (!db.objectStoreNames.contains('recipes')) {
            db.createObjectStore('recipes', { keyPath: 'id' });
          }
        }

        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('cookedDishes')) {
            const store = db.createObjectStore('cookedDishes', { keyPath: 'id' });
            store.createIndex('by-date', 'date');
          }

          // 既存食材データを非破壊で新しい数量モデル(quantity/unit)へ拡張する。
          // 旧フィールド(trackType/count/roughLevel)はそのまま残し、削除・上書きしない。
          if (db.objectStoreNames.contains('ingredients')) {
            const store = transaction.objectStore('ingredients');
            const all = await store.getAll();
            for (const ing of all) {
              const legacy = ing as Ingredient;
              if (typeof legacy.quantity === 'number' && legacy.unit) continue;
              let quantity: number;
              let unit: string;
              if (legacy.trackType === 'count') {
                quantity = legacy.count ?? 0;
                unit = legacy.unit ?? '個';
              } else if (legacy.trackType === 'rough') {
                quantity = ROUGH_LEVEL_QUANTITY[legacy.roughLevel ?? '多い'];
                unit = legacy.unit ?? 'その他';
              } else {
                quantity = legacy.count ?? 0;
                unit = legacy.unit ?? '個';
              }
              await store.put({ ...legacy, quantity, unit });
            }
          }
        }

        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('memos')) {
            db.createObjectStore('memos', { keyPath: 'id' });
          }
        }
      },
    });
  }
  return dbPromise;
}

export type { MeshiLogDB };
