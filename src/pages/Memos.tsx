import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { Header } from '../components/Header';
import { MemoFormSheet } from '../components/MemoFormSheet';
import { listMemos, deleteMemo } from '../repositories/memoRepo';
import { useDataVersion } from '../hooks/useDataVersion';
import { useToast } from '../components/ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import { formatDateLabel, localDateFromIso } from '../utils/date';
import type { Memo } from '../types';

export function Memos() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const version = useDataVersion();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Memo | null>(null);

  useEffect(() => {
    listMemos()
      .then(setMemos)
      .catch((e) => showToast(toUserMessage(e, 'メモの読み込みに失敗しました')));
  }, [version, showToast]);

  async function handleDelete(id: string) {
    const confirmed = confirm('このメモを削除しますか？');
    if (!confirmed) return;
    try {
      await deleteMemo(id);
      notifyDataChanged();
      showToast('削除しました');
    } catch (e) {
      showToast(toUserMessage(e, '削除に失敗しました'));
    }
  }

  return (
    <>
      <Header
        icon={
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label="戻る" style={{ padding: 0 }}>
            <ChevronLeft size={22} />
          </button>
        }
        title="メモ"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> 追加
          </button>
        }
      />
      <div className="page-content">
        <div className="card">
          {memos.length === 0 ? (
            <div className="empty-state">まだメモがありません</div>
          ) : (
            memos.map((m) => (
              <div key={m.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                <button
                  className="row-main"
                  onClick={() => setEditing(m)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    textAlign: 'left',
                    font: 'inherit',
                    color: 'inherit',
                  }}
                >
                  <div className="row-title" style={{ whiteSpace: 'pre-wrap' }}>
                    {m.body}
                  </div>
                  <div className="row-sub">{formatDateLabel(localDateFromIso(m.createdAt))}</div>
                </button>
                <button className="icon-btn" onClick={() => handleDelete(m.id)} aria-label="削除">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      {showAdd && <MemoFormSheet onClose={() => setShowAdd(false)} />}
      {editing && <MemoFormSheet existing={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
