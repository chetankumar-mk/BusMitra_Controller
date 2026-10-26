import { useState, useMemo, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing table state (search, filter, sort, pagination, density)
 * @param {Object} options - Configuration options
 * @param {Array} options.rows - Raw data rows
 * @param {string} options.tableKey - Unique key for localStorage persistence
 * @param {Function} options.filterFn - Optional custom filter function
 * @param {Array} options.columns - Column definitions for sorting with accessors
 * @returns {Object} Table state and processed data
 */
export const useTableState = ({ rows, tableKey, filterFn, columns = [] }) => {
  // Load persisted settings from localStorage
  const loadPersistedSettings = () => {
    try {
      const saved = localStorage.getItem(`busmitra-table-${tableKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          pageSize: parsed.pageSize || 25,
          density: parsed.density || 'comfortable',
        };
      }
    } catch (e) {
      // Fail silently
    }
    return {
      pageSize: 25,
      density: 'comfortable',
    };
  };

  const persistedSettings = loadPersistedSettings();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter state
  const [activeFilter, setActiveFilter] = useState('all');

  // Sort state
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(persistedSettings.pageSize);

  // Density state
  const [density, setDensity] = useState(persistedSettings.density);

  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        `busmitra-table-${tableKey}`,
        JSON.stringify({ pageSize, density })
      );
    } catch (e) {
      // Fail silently
    }
  }, [tableKey, pageSize, density]);

  // Reset to page 1 when search/filter/sort/pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter, sortColumn, sortDirection, pageSize]);

  // Filter rows
  const filteredRows = useMemo(() => {
    if (!rows || rows.length === 0) return [];

    let result = rows;

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(row => {
        return Object.values(row).some(value => {
          if (value == null) return false;
          return String(value).toLowerCase().includes(query);
        });
      });
    }

    // Apply custom filter or default filter
    if (filterFn) {
      result = filterFn(result, activeFilter);
    }

    return result;
  }, [rows, searchQuery, activeFilter, filterFn]);

  // Sort rows using column accessors
  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;

    const column = columns.find(col => col.id === sortColumn);
    if (!column) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      // Use column accessor or sortValue to get sort values
      const aVal = column.sortValue ? column.sortValue(a) : column.accessor(a);
      const bVal = column.sortValue ? column.sortValue(b) : column.accessor(b);

      // Treat placeholder values as empty (sort last)
      const isEmpty = (val) => val == null || val === '' || val === '—' || val === 'Location unavailable';
      
      if (isEmpty(aVal) && isEmpty(bVal)) return 0;
      if (isEmpty(aVal)) return 1;
      if (isEmpty(bVal)) return -1;

      // String comparison with numeric awareness
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal, undefined, { numeric: true });
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // Number comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Date comparison
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Fallback to string comparison
      const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredRows, sortColumn, sortDirection, columns]);

  // Pagination
  const pagination = useMemo(() => {
    const totalRows = sortedRows.length;
    const totalPages = Math.ceil(totalRows / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalRows);

    return {
      currentPage,
      pageSize,
      totalPages,
      totalRows,
      startIndex,
      endIndex,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    };
  }, [sortedRows, currentPage, pageSize]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const { startIndex, endIndex } = pagination;
    return sortedRows.slice(startIndex, endIndex);
  }, [sortedRows, pagination]);

  // Handlers
  const handleSearch = useCallback((value) => {
    setSearchQuery(value);
  }, []);

  const handleFilter = useCallback((filter) => {
    setActiveFilter(filter);
  }, []);

  const handleSort = useCallback((columnId) => {
    if (sortColumn === columnId) {
      // Third click clears sort
      if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection('asc');
      } else {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      }
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((size) => {
    setPageSize(size);
  }, []);

  const handleDensityChange = useCallback((newDensity) => {
    setDensity(newDensity);
  }, []);

  return {
    // State
    searchQuery,
    activeFilter,
    sortColumn,
    sortDirection,
    currentPage,
    pageSize,
    density,
    
    // Processed data
    filteredRows,
    sortedRows,
    paginatedRows,
    pagination,
    
    // Handlers
    handleSearch,
    handleFilter,
    handleSort,
    handlePageChange,
    handlePageSizeChange,
    handleDensityChange,
  };
};
