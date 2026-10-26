import React from 'react';
import { ChevronDown } from 'lucide-react';
import { renderIcon } from './renderIcon';
import './Select.css';

export const Select = React.forwardRef(({
  label,
  hint,
  error,
  icon = ChevronDown,
  options = [],
  placeholder = 'Select an option',
  className = '',
  ...props
}, ref) => {
  const selectId = React.useId();
  const errorId = React.useId();
  const hintId = React.useId();

  const describedBy = [
    hint ? hintId : null,
    error ? errorId : null,
  ].filter(Boolean).join(' ');

  return (
    <div className={`select-wrapper ${className}`}>
      {label && (
        <label htmlFor={selectId} className="select-label">
          {label}
        </label>
      )}
      <div className="select-container">
        <select
          ref={ref}
          id={selectId}
          className={`select ${error ? 'select-error' : ''}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy || undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="select-icon">
          {renderIcon(icon)}
        </span>
      </div>
      {hint && !error && (
        <p id={hintId} className="select-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="select-error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
