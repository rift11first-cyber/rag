import React from 'react';

export default function MetricRing({ label, description, value }) {
  const r = 34;
  const circumference = 2 * Math.PI * r;
  const numVal = typeof value === 'number' ? value : null;
  const offset = numVal !== null ? circumference * (1 - Math.min(numVal, 1)) : circumference;
  const hue = numVal !== null ? (numVal > 0.7 ? 142 : numVal > 0.4 ? 45 : 0) : 240;
  const display = numVal !== null ? `${(numVal * 100).toFixed(1)}%` : '—';

  return (
    <div className="metric-overview-card">
      <div className="metric-ring">
        <svg viewBox="0 0 80 80">
          <circle className="ring-bg" cx="40" cy="40" r={r} />
          <circle
            className="ring-fill"
            cx="40"
            cy="40"
            r={r}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              stroke: numVal !== null ? `hsl(${hue}, 70%, 55%)` : 'var(--accent)',
            }}
          />
        </svg>
        <span className="ring-value">{display}</span>
      </div>
      <div className="metric-info">
        <h4>{label}</h4>
        <p>{description}</p>
      </div>
    </div>
  );
}
