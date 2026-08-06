import { useEffect, useState } from 'react';
import { getReceiptImage } from '../repositories/purchaseRepo';
import { useToast } from './ToastProvider';
import { toUserMessage } from '../utils/errors';

interface ReceiptViewerProps {
  receiptId: string;
  onClose: () => void;
}

export function ReceiptViewer({ receiptId, onClose }: ReceiptViewerProps) {
  const { showToast } = useToast();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    getReceiptImage(receiptId)
      .then((img) => {
        if (!img) return;
        objectUrl = URL.createObjectURL(img.blob);
        setUrl(objectUrl);
      })
      .catch((e) => showToast(toUserMessage(e, 'レシート画像の読み込みに失敗しました')));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [receiptId, showToast]);

  return (
    <div className="overlay center" onClick={onClose}>
      {url && (
        <img
          src={url}
          alt="レシート"
          style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12 }}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
