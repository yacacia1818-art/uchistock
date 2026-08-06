import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  variant?: 'sheet' | 'dialog';
}

export function BottomSheet({ title, onClose, children, variant = 'sheet' }: BottomSheetProps) {
  return (
    <div className={`overlay ${variant === 'dialog' ? 'center' : ''}`} onClick={onClose}>
      <div
        className={`sheet ${variant === 'dialog' ? 'dialog' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {variant === 'sheet' && <div className="sheet-handle" />}
        <div className="sheet-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="閉じる">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
