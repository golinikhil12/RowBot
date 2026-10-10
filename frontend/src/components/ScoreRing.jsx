import React from 'react';

export function ScoreRing({ score, size = 100, grade }) {
  const isCompact = size <= 65;
  const strokeWidth = size > 85 ? 8 : isCompact ? 5 : 6;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const filled = (safeScore / 100) * circumference;
  const color = safeScore >= 80 ? '#10b981' : safeScore >= 60 ? '#f59e0b' : '#ef4444';

  const numFontSize = isCompact ? Math.round(size * 0.34) : Math.round(size * 0.28);
  const gradeFontSize = Math.max(9, Math.round(size * 0.13));

  return (
    <div className="score-ring-container" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div className="score-ring" style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={`${filled} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>

        <div
          className="score-ring-text"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            className="score-num"
            style={{
              fontSize: `${numFontSize}px`,
              lineHeight: 1,
              fontWeight: 900,
              color: '#0f172a',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {safeScore}
          </span>

          {!isCompact && grade && (
            <span
              className="score-grade"
              style={{
                fontSize: `${gradeFontSize}px`,
                lineHeight: 1.1,
                fontWeight: 800,
                color,
                marginTop: Math.max(2, Math.round(size * 0.03)),
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Grade {grade}
            </span>
          )}
        </div>
      </div>

      {isCompact && grade && (
        <span
          className="score-grade-pill"
          style={{
            background: `${color}18`,
            color: color,
            border: `1px solid ${color}40`,
            padding: '2px 8px',
            borderRadius: 99,
            fontSize: '0.74rem',
            fontWeight: 800,
            whiteSpace: 'nowrap',
          }}
        >
          Grade {grade}
        </span>
      )}
    </div>
  );
}

export function ScoreBar({ score, label, size = 'md' }) {
  const color = score >= 75 ? '#14b8a6' : score >= 50 ? '#f59e0b' : '#f43f5e';
  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '.8rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <span style={{ fontWeight: 700, color }}>{score}/100</span>
        </div>
      )}
      <div className="progress-bar-outer">
        <div
          className="progress-bar-inner"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
}
