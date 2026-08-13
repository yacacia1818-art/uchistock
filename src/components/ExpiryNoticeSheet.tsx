import { BottomSheet } from './BottomSheet';
import { formatDateLabel, localDateFromIso } from '../utils/date';
import type { AppNotification } from '../types';

interface ExpiryNoticeSheetProps {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}

// ベル通知＝過去に発生したイベントの履歴。既読にしても、実際の在庫状態（ホームの赤帯）には影響しない
export function ExpiryNoticeSheet({ notifications, onMarkRead, onMarkAllRead, onClose }: ExpiryNoticeSheetProps) {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <BottomSheet title="お知らせ" onClose={onClose}>
      {notifications.length === 0 ? (
        <div className="empty-state">通知はまだありません</div>
      ) : (
        <>
          {unreadCount > 0 && (
            <button className="btn btn-outline mb-16" onClick={onMarkAllRead}>
              すべて既読にする（{unreadCount}件）
            </button>
          )}
          <div className="card" style={{ padding: '4px 12px' }}>
            {notifications.map((n) => (
              <button
                key={n.id}
                className="list-row"
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', font: 'inherit' }}
                onClick={() => !n.isRead && onMarkRead(n.id)}
              >
                <div className="row-main">
                  <div className="row-title" style={{ fontWeight: n.isRead ? 400 : 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {!n.isRead && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: 'var(--color-danger)',
                          flexShrink: 0,
                          display: 'inline-block',
                        }}
                      />
                    )}
                    {n.message}
                  </div>
                  <div className="row-sub">{formatDateLabel(localDateFromIso(n.createdAt))}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </BottomSheet>
  );
}
