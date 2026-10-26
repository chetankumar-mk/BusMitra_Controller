import React from 'react';
import { renderIcon } from './renderIcon';
import './StatCard.css';

export const StatCard = React.forwardRef(({
  icon,
  label,
  value,
  subText,
  accent = 'primary',
  loading = false,
  className = '',
  ...props
}, ref) => {
  const accentColors = {
    primary: 'var(--color-brand-primary)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
    info: 'var(--color-info)',
  };

  const accentColor = accentColors[accent] || accentColors.primary;

  if (loading) {
    return (
      <div ref={ref} className={`stat-card stat-card-loading ${className}`} {...props}>
        <div className="stat-card-icon skeleton" />
        <div className="stat-card-content">
          <div className="stat-card-label skeleton" />
          <div className="stat-card-value skeleton" />
          <div className="stat-card-sub skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={`stat-card ${className}`} {...props}>
      <div className="stat-card-icon" style={{ color: accentColor }}>
        {renderIcon(icon, { size: 24 })}
      </div>
      <div className="stat-card-content">
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">{value}</div>
        {subText && <div className="stat-card-sub">{subText}</div>}
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';
