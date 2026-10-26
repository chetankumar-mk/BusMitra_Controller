import React from 'react';
import './Badge.css';

export const Badge = React.forwardRef(({
  children,
  variant = 'neutral',
  pulse = false,
  className = '',
  ...props
}, ref) => {
  return (
    <span
      ref={ref}
      className={`badge badge-${variant} ${pulse ? 'badge-pulse' : ''} ${className}`}
      {...props}
    >
      {pulse && <span className="badge-dot" />}
      <span className="badge-content">{children}</span>
    </span>
  );
});

Badge.displayName = 'Badge';
