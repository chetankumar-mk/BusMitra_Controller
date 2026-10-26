import React, { useMemo } from 'react';
import './FleetDonut.css';

const FleetDonut = ({ fleet }) => {
  const data = useMemo(() => {
    if (!fleet || fleet.length === 0) {
      return { online: 0, offline: 0, stale: 0, total: 0 };
    }

    // Mutually exclusive: Online (isOnline true) vs Offline (isOnline false)
    // Stale is a separate stat, not a donut segment
    const online = fleet.filter(b => b.tracking?.isOnline).length;
    const offline = fleet.filter(b => !b.tracking?.isOnline).length;
    const stale = fleet.filter(b => b.freshness?.state === 'STALE').length;

    return { online, offline, stale, total: fleet.length };
  }, [fleet]);

  const { online, offline, stale, total } = data;

  if (total === 0) {
    return (
      <div className="fleet-donut">
        <div className="donut-empty">
          <span className="donut-empty-text">No data</span>
        </div>
      </div>
    );
  }

  const onlinePercent = Math.round((online / total) * 100);
  const offlinePercent = Math.round((offline / total) * 100);

  // Calculate SVG arc paths (only online and offline segments)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const onlineStroke = (online / total) * circumference;
  const offlineStroke = (offline / total) * circumference;

  const onlineOffset = 0;
  const offlineOffset = -onlineStroke;

  return (
    <div className="fleet-donut">
      <svg className="donut-chart" viewBox="0 0 100 100" role="img" aria-label={`Fleet availability: ${online} online, ${offline} offline`}>
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--color-neutral-200)"
          strokeWidth="12"
        />
        
        {/* Online segment */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="12"
          strokeDasharray={onlineStroke}
          strokeDashoffset={onlineOffset}
          transform="rotate(-90 50 50)"
          className="donut-segment donut-online"
        />
        
        {/* Offline segment */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--color-neutral-400)"
          strokeWidth="12"
          strokeDasharray={offlineStroke}
          strokeDashoffset={offlineOffset}
          transform="rotate(-90 50 50)"
          className="donut-segment donut-offline"
        />
        
        {/* Center text */}
        <text x="50" y="50" textAnchor="middle" dy="0.35em" className="donut-center">
          {total}
        </text>
      </svg>

      <div className="donut-legend">
        <div className="legend-item">
          <span className="legend-dot legend-online"></span>
          <span className="legend-label">Online</span>
          <span className="legend-value">{online} ({onlinePercent}%)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot legend-offline"></span>
          <span className="legend-label">Offline</span>
          <span className="legend-value">{offline} ({offlinePercent}%)</span>
        </div>
      </div>

      {/* Stale GPS as separate stat row */}
      {stale > 0 && (
        <div className="donut-stale-stat">
          <span className="stale-label">Stale GPS</span>
          <span className="stale-value">{stale}</span>
        </div>
      )}
    </div>
  );
};

export default React.memo(FleetDonut);
