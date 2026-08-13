import { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { addMemo, updateMemo } from '../repositories/memoRepo';
import { useToast } from './ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import type { Memo } from '../types';

interface MemoFormSheetProps {
  onClose: () => void;
  existing?: Memo;
}

export function MemoFormSheet({ onClose, existing }: MemoFormSheetProps) {
  const { showToast } = useToast();
  const [body, setBody] = useState(existing?.body ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!body.trim()) {
      showToast('メモを入力してください');
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        await updateMemo({ ...existing, body });
      } else {
        await addMemo(body);
      }
      notifyDataChanged();
      showToast('メモを保存しました');
      onClose();
    } catch (e) {
      showToast(toUserMessage(e, '保存に失敗しました'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet title={existing ? 'メモを編集' : 'メモを追加'} onClose={onClose}>
      <div className="field">
        <textarea
          className="textarea"
          style={{ minHeight: 160 }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="次に作りたい料理、気になったこと、買い忘れ防止メモなど自由に"
          autoFocus
        />
      </div>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        保存
      </button>
    </BottomSheet>
  );
}
