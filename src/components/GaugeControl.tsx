import { ChevronUp, ChevronDown } from 'lucide-react';
import { GAUGE_MAX } from '../types';

interface GaugeControlProps {
  level: number; // 0〜GAUGE_MAX
  onChange: (level: number) => void;
}

// ゲージ管理の共通UI：10段階インジケーター＋上下矢印ボタン（スワイプ・ドラッグは実装しない）
export function GaugeControl({ level, onChange }: GaugeControlProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        className="icon-btn"
        onClick={() => onChange(Math.max(0, level - 1))}
        aria-label="減らす"
        disabled={level <= 0}
      >
        <ChevronDown size={18} />
      </button>
      <div style={{ display: 'flex', gap: 3, flex: 1, minWidth: 0 }}>
        {Array.from({ length: GAUGE_MAX }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 18,
              borderRadius: 4,
              background: i < level ? 'var(--color-primary)' : 'var(--color-border)',
            }}
          />
        ))}
      </div>
      <button
        className="icon-btn"
        onClick={() => onChange(Math.min(GAUGE_MAX, level + 1))}
        aria-label="増やす"
        disabled={level >= GAUGE_MAX}
      >
        <ChevronUp size={18} />
      </button>
      <span style={{ minWidth: 40, textAlign: 'right', fontWeight: 700, fontSize: 13 }}>{level * 10}%</span>
    </div>
  );
}
