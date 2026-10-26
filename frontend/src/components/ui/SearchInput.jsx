import React from 'react';
import { Search, X } from 'lucide-react';
import { renderIcon } from './renderIcon';
import './SearchInput.css';

export const SearchInput = React.forwardRef(({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search...',
  icon = Search,
  className = '',
  ...props
}, ref) => {
  const hasValue = value && value.length > 0;

  const handleClear = () => {
    onChange('');
    if (onClear) onClear();
  };

  return (
    <div className={`search-input-wrapper ${className}`}>
      <span className="search-input-icon">
        {renderIcon(icon)}
      </span>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="search-input"
        {...props}
      />
      {hasValue && (
        <button
          type="button"
          className="search-input-clear"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';
