import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { renderIcon } from './renderIcon';
import './ErrorState.css';

export const ErrorState = React.forwardRef(({
  icon = AlertCircle,
  message = 'Something went wrong',
  onRetry,
  className = '',
  ...props
}, ref) => {
  return (
    <div ref={ref} className={`error-state ${className}`} {...props}>
      <div className="error-state-icon">
        {renderIcon(icon, { size: 48 })}
      </div>
      <h3 className="error-state-title">Error</h3>
      <p className="error-state-message">{message}</p>
      {onRetry && (
        <div className="error-state-action">
          <Button variant="secondary" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
});

ErrorState.displayName = 'ErrorState';
