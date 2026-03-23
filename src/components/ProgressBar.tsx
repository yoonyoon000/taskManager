interface ProgressBarProps {
  value: number;
  label?: string;
  compact?: boolean;
}

function ProgressBar({ value, label = '전체 진행도', compact = false }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={compact ? 'progress-block compact' : 'progress-block'}>
      <div className="progress-meta">
        <span>{label}</span>
        <strong>{clamped}%</strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="progress-fill" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

export default ProgressBar;
