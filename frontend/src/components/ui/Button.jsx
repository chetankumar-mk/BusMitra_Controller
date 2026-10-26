import React from 'react';
import { Loader2 } from 'lucide-react';
import { renderIcon } from './renderIcon';
import './Button.css';

export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  const isDisabled = disabled || loading;
  const hasIcon = !!icon;

  return (
    <button
      ref={ref}
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full-width' : ''} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <span className="btn-spinner">
          <Loader2 className="animate-spin" size={16} />
        </span>
      )}
      {!loading && hasIcon && iconPosition === 'left' && (
        <span className="btn-icon btn-icon-left">
          {renderIcon(icon, { size: 16 })}
        </span>
      )}
      <span className="btn-content">{children}</span>
      {!loading && hasIcon && iconPosition === 'right' && (
        <span className="btn-icon btn-icon-right">
          {renderIcon(icon, { size: 16 })}
        </span>
      )}
    </button>
  );
});

Button.displayName = 'Button';
