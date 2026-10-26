import React, { useMemo } from 'react';
import './SessionTrend.css';

const SessionTrend = ({ onlineHistory }) => {
  const points = useMemo(() => {
    if (!onlineHistory || onlineHistory.length < 3) return null;

    const max = Math.max(...onlineHistory);
    const min = Math.min(...onlineHistory);
    const range = max - min || 1;

    return onlineHistory.map((value, index) => {
      const x = (index / (onlineHistory.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return { x, y };
    });
  }, [onlineHistory]);

  if (!points) return null;

  // Create SVG path for area chart
  const areaPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const linePath = areaPath;

  return (
    <div className="session-trend">
      <span className="trend-label">Online buses, this session</span>
      <svg className="trend-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-brand-primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--color-brand-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${areaPath} L 100 100 L 0 100 Z`}
          fill="url(#trendGradient)"
          className="trend-area"
        />
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-brand-primary)"
          strokeWidth="2"
          className="trend-line"
        />
      </svg>
    </div>
  );
};

export default React.memo(SessionTrend);
