import React from 'react';
import './FilterChips.css';

const FilterChips = ({ options, activeFilter, onChange, counts }) => {
  return (
    <div className="bm-filter-chips">
      {options.map((option) => {
        const count = counts?.[option.value] ?? 0;
        const isActive = activeFilter === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={`bm-filter-chip ${isActive ? 'bm-filter-chip-active' : ''}`}
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
          >
            <span className="bm-filter-label">{option.label}</span>
            {count !== undefined && (
              <span className="bm-filter-count">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default React.memo(FilterChips);
