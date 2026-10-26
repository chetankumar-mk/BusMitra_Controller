import React from 'react';
import { List, LayoutGrid, Download, RefreshCw } from 'lucide-react';
import { renderIcon } from '../ui/renderIcon';
import './TableToolbar.css';

const TableToolbar = ({
  searchSlot,
  filterSlot,
  resultCount,
  totalRows,
  density,
  onDensityChange,
  onExport,
  onRefresh,
  refreshing,
  extraActions,
}) => {
  return (
    <div className="bm-toolbar">
      <div className="bm-toolbar-left">
        {searchSlot}
        {filterSlot}
      </div>
      
      <div className="bm-toolbar-right">
        <div className="bm-result-count" aria-live="polite">
          {resultCount}
        </div>
        
        <div className="bm-density-toggle">
          <button
            type="button"
            className={`bm-density-btn ${density === 'comfortable' ? 'bm-density-btn-active' : ''}`}
            onClick={() => onDensityChange('comfortable')}
            aria-label="Comfortable density"
            aria-pressed={density === 'comfortable'}
            title="Comfortable"
          >
            {renderIcon(LayoutGrid, { size: 16 })}
          </button>
          <button
            type="button"
            className={`bm-density-btn ${density === 'compact' ? 'bm-density-btn-active' : ''}`}
            onClick={() => onDensityChange('compact')}
            aria-label="Compact density"
            aria-pressed={density === 'compact'}
            title="Compact"
          >
            {renderIcon(List, { size: 16 })}
          </button>
        </div>
        
        {onExport && (
          <button
            type="button"
            className="bm-toolbar-btn"
            onClick={onExport}
            title="Export CSV"
          >
            {renderIcon(Download, { size: 16 })}
            Export
          </button>
        )}
        
        {onRefresh && (
          <button
            type="button"
            className="bm-toolbar-btn"
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh"
          >
            {renderIcon(RefreshCw, { 
              size: 16,
              className: refreshing ? 'bm-spinning' : ''
            })}
            Refresh
          </button>
        )}
        
        {extraActions}
      </div>
    </div>
  );
};

export default React.memo(TableToolbar);
