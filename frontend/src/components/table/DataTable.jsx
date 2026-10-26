import React, { useMemo } from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { renderIcon } from '../ui/renderIcon';
import { Skeleton } from '../ui/Skeleton';
import './DataTable.css';

const DataTable = ({
  columns,
  rows,
  getRowId,
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
  selectedRowId,
  loading = false,
  density = 'comfortable',
  emptyState,
  caption,
}) => {
  const visibleColumns = useMemo(() => {
    if (typeof window === 'undefined') return columns;
    const width = window.innerWidth;
    return columns.filter(col => {
      if (!col.hideBelow) return true;
      return width >= col.hideBelow;
    });
  }, [columns]);

  const handleSort = (columnId) => {
    if (onSort && columns.find(c => c.id === columnId)?.sortable) {
      onSort(columnId);
    }
  };

  const handleRowClick = (row) => {
    if (onRowClick) {
      onRowClick(row);
    }
  };

  const handleRowKeyDown = (e, row) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRowClick(row);
    }
  };

  const getSortIcon = (columnId) => {
    if (sortColumn !== columnId) return null;
    if (sortDirection === 'asc') return ArrowUp;
    return ArrowDown;
  };

  const getAriaSort = (columnId) => {
    if (sortColumn !== columnId) return 'none';
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  };

  const renderCell = (row, column) => {
    const value = column.accessor ? column.accessor(row) : row[column.id];
    if (column.cell) {
      return column.cell(row, value);
    }
    return value ?? '—';
  };

  if (loading) {
    return (
      <div className="bm-table-scroll">
        <div className="bm-table-wrapper">
          <table className="bm-table bm-table-loading">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                {visibleColumns.map((col) => (
                  <th key={col.id} scope="col" style={{ width: col.width }}>
                    <Skeleton height={20} width="60%" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  {visibleColumns.map((col, j) => (
                    <td key={j}>
                      <Skeleton height={density === 'compact' ? 24 : 32} width="80%" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return <div className="bm-table-empty">{emptyState}</div>;
  }

  return (
    <div className="bm-table-scroll">
      <div className="bm-table-wrapper">
        <table className={`bm-table bm-table-${density}`}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {visibleColumns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={col.sticky === 'left' ? 'bm-th-sticky-left' : ''}
                  style={{ width: col.width }}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      className="bm-sort-button"
                      onClick={() => handleSort(col.id)}
                      aria-sort={getAriaSort(col.id)}
                    >
                      <span className="bm-sort-header">{col.header}</span>
                      <span className="bm-sort-icon">
                        {renderIcon(getSortIcon(col.id) || Minus, { size: 14 })}
                      </span>
                    </button>
                  ) : (
                    <span className="bm-sort-header">{col.header}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowId = getRowId(row);
              const isSelected = selectedRowId === rowId;
              return (
                <tr
                  key={rowId}
                  className={isSelected ? 'bm-row-selected' : ''}
                  onClick={() => handleRowClick(row)}
                  onKeyDown={(e) => handleRowKeyDown(e, row)}
                  tabIndex={0}
                  aria-selected={isSelected}
                >
                  {visibleColumns.map((col) => (
                    <td
                      key={col.id}
                      className={`
                        bm-cell-${col.align || 'left'}
                        ${col.mono ? 'bm-cell-mono' : ''}
                        ${col.sticky === 'left' ? 'bm-td-sticky-left' : ''}
                      `}
                    >
                      {renderCell(row, col)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(DataTable);
