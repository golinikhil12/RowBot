import React from 'react';

export default function RowBotLogo({ size = 'md', showText = true, subtitle = null, className = '' }) {
  const sizeMap = {
    sm: { icon: 30, text: '1.1rem', sub: '0.65rem' },
    md: { icon: 38, text: '1.35rem', sub: '0.72rem' },
    lg: { icon: 46, text: '1.65rem', sub: '0.8rem' },
    xl: { icon: 60, text: '2.1rem', sub: '0.88rem' },
  };

  const current = sizeMap[size] || sizeMap.md;

  return (
    <div className={`rowbot-brand-container ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, userSelect: 'none' }}>
      <div
        className="rowbot-logo-badge"
        style={{
          width: current.icon,
          height: current.icon,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <defs>
            <linearGradient id="rowbotRealisticGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#845162" />
              <stop offset="100%" stopColor="#a36378" />
            </linearGradient>
            <linearGradient id="rowbotRowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E3B6B1" />
              <stop offset="100%" stopColor="#d19a94" />
            </linearGradient>
            <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#845162" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Hexagonal shield */}
          <polygon
            points="50,6 92,27 92,73 50,94 8,73 8,27"
            fill="url(#rowbotRealisticGrad)"
            stroke="#E3B6B1"
            strokeWidth="2.5"
            filter="url(#softShadow)"
          />

          {/* Clean row grids inside robot face */}
          <rect x="26" y="34" width="48" height="7" rx="3.5" fill="#ffffff" />
          <rect x="30" y="47" width="40" height="6.5" rx="3.25" fill="#E3B6B1" />
          <rect x="34" y="59" width="32" height="6.5" rx="3.25" fill="url(#rowbotRowGrad)" />

          {/* Intelligent Scanner Core Eyes */}
          <circle cx="42" cy="37.5" r="2.2" fill="#845162" />
          <circle cx="58" cy="37.5" r="2.2" fill="#845162" />

          {/* Spark pulse node */}
          <circle cx="50" cy="76" r="3.2" fill="#E3B6B1" />
        </svg>
      </div>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          {/* Fixed: text color changed from '#f8fafc' (invisible white) to '#845162' so 'Row' is always clearly visible! */}
          <div style={{ fontSize: current.text, fontWeight: 900, letterSpacing: '-0.5px', color: '#845162' }}>
            <span style={{ color: '#845162', fontWeight: 900 }}>Row</span>
            <span
              style={{
                background: 'linear-gradient(135deg, #845162 0%, #b37085 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 900,
                marginLeft: 1,
              }}
            >
              Bot
            </span>
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#E3B6B1',
                boxShadow: '0 0 6px #E3B6B1',
                marginLeft: 5,
                verticalAlign: 'middle',
              }}
            />
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: current.sub,
                color: '#7d5c66',
                letterSpacing: '0.4px',
                fontWeight: 600,
                marginTop: 2,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
