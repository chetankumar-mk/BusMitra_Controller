import React from 'react';
import { renderIcon } from './renderIcon';
import './Input.css';

export const Input = React.forwardRef(({
  label,
  hint,
  error,
  icon,
  rightElement,
  className = '',
  ...props
}, ref) => {
  const inputId = React.useId();
  const errorId = React.useId();
  const hintId = React.useId();

  const describedBy = [
    hint ? hintId : null,
    error ? errorId : null,
  ].filter(Boolean).join(' ');

  const hasIcon = !!icon;
  const hasRightElement = !!rightElement;

  return (
    <div className={`input-wrapper ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <div className="input-container">
        {hasIcon && (
          <span className="input-icon">
            {renderIcon(icon)}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`input ${hasIcon ? 'input-with-icon' : ''} ${hasRightElement ? 'input-with-right' : ''} ${error ? 'input-error' : ''}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy || undefined}
          {...props}
        />
        {hasRightElement && (
          <span className="input-right-element">
            {rightElement}
          </span>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="input-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="input-error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
