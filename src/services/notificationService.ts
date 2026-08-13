import { listExpiringIngredients } from './expirySummary';
import { addNotificationIfNotExists } from '../repositories/notificationRepo';
import { getEarliestExpiry } from '../utils/expiry';

// 期限切れ・期限当日に達した食材について、まだ通知していないもの（同一食材・同一期限日の組み合わせ）だけ
// 1件ずつ履歴として生成する。赤帯（ホームのリアルタイム状態表示）とは独立しており、ここでは記録のみ行う
export async function syncExpiryNotifications(): Promise<void> {
  const expiring = await listExpiringIngredients();
  const urgent = expiring.filter((e) => e.days <= 0);
  for (const { ingredient, days } of urgent) {
    const expiryDate = getEarliestExpiry(ingredient);
    if (!expiryDate) continue;
    const id = `expiry-${ingredient.id}-${expiryDate}`;
    const message =
      days < 0 ? `${ingredient.name}の賞味期限が切れました` : `${ingredient.name}の賞味期限が今日までです`;
    await addNotificationIfNotExists({ id, type: 'expiry', message, relatedItemId: ingredient.id });
  }
}
