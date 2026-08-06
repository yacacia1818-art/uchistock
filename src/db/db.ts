import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type {
  Ingredient,
  ShoppingMemoItem,
  Purchase,
  ReceiptImage,
  Meal,
  Recipe,
  Settings,
} from '../types';

interface MeshiLogDB extends DBSchema {
  settings: { key: string; value: Settings };
  ingredients: { key: string; value: Ingredient; indexes: { 'by-name': string } };
  shoppingMemo: { key: string; value: ShoppingMemoItem };
  purchases: { key: string; value: Purchase; indexes: { 'by-date': string } };
  receipts: { key: string; value: ReceiptImage };
  meals: { key: string; value: Meal; indexes: { 'by-date': string } };
  recipes: { key: string; value: Recipe };
}

const DB_NAME = 'meshi-log-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MeshiLogDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<MeshiLogDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MeshiLogDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
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
      },
    });
  }
  return dbPromise;
}

export type { MeshiLogDB };
