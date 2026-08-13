import { getDB } from '../db/db';
import type { AppNotification } from '../types';
import { nowIsoStr } from '../utils/date';
import { AppError } from '../utils/errors';

export async function listNotifications(): Promise<AppNotification[]> {
  try {
    const db = await getDB();
    const all = await db.getAll('notifications');
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    throw new AppError('通知の読み込みに失敗しました');
  }
}

// 同じidの通知が既にあれば何もしない（同一イベントの重複生成を防ぐ）
export async function addNotificationIfNotExists(
  notification: Omit<AppNotification, 'createdAt' | 'isRead'>
): Promise<void> {
  try {
    const db = await getDB();
    const existing = await db.get('notifications', notification.id);
    if (existing) return;
    const created: AppNotification = { ...notification, createdAt: nowIsoStr(), isRead: false };
    await db.put('notifications', created);
  } catch {
    throw new AppError('通知の保存に失敗しました');
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    const db = await getDB();
    const existing = await db.get('notifications', id);
    if (!existing || existing.isRead) return;
    await db.put('notifications', { ...existing, isRead: true });
  } catch {
    throw new AppError('通知の更新に失敗しました');
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    const db = await getDB();
    const all = await db.getAll('notifications');
    const unread = all.filter((n) => !n.isRead);
    for (const n of unread) {
      await db.put('notifications', { ...n, isRead: true });
    }
  } catch {
    throw new AppError('通知の更新に失敗しました');
  }
}
