import { GAUGE_MAX } from '../types';

interface GaugeControlProps {
  level: number; // 0〜GAUGE_MAX
  onChange: (level: number) => void;
}

// ゲージ管理の共通UI：トラック＋上下矢印ボタン（スワイプ・ドラッグは実装しない）
export function GaugeControl({ level, onChange }: GaugeControlProps) {
  return (
    <div className="gauge-control">
      <button
        className="gauge-arrow"
        onClick={() => onChange(Math.max(0, level - 1))}
        aria-label="減らす"
        disabled={level <= 0}
      >
        ▾
      </button>
      <div className="gauge-track">
        <div className="gauge-fill" style={{ width: `${level * 10}%` }} />
      </div>
      <button
        className="gauge-arrow"
        onClick={() => onChange(Math.min(GAUGE_MAX, level + 1))}
        aria-label="増やす"
        disabled={level >= GAUGE_MAX}
      >
        ▴
      </button>
      <span className="gauge-percent">{level * 10}%</span>
    </div>
  );
}
