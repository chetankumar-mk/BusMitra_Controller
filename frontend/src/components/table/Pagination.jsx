import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { renderIcon } from '../ui/renderIcon';
import './Pagination.css';

const Pagination = ({
  currentPage,
  pageSize,
  totalPages,
  totalRows,
  hasNextPage,
  hasPrevPage,
  onPageChange,
  onPageSizeChange,
}) => {
  const handleFirstPage = () => {
    onPageChange(1);
  };

  const handlePrevPage = () => {
    if (hasPrevPage) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      onPageChange(currentPage + 1);
    }
  };

  const handleLastPage = () => {
    onPageChange(totalPages);
  };

  const handlePageSizeChange = (e) => {
    onPageSizeChange(Number(e.target.value));
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="bm-pagination">
      <div className="bm-pagination-left">
        <label className="bm-page-size-label" htmlFor="page-size-select">
          Rows per page:
        </label>
        <select
          id="page-size-select"
          className="bm-page-size-select"
          value={pageSize}
          onChange={handlePageSizeChange}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
      
      <div className="bm-pagination-right">
        <button
          type="button"
          className="bm-page-btn"
          onClick={handleFirstPage}
          disabled={!hasPrevPage}
          aria-label="First page"
        >
          {renderIcon(ChevronsLeft, { size: 16 })}
        </button>
        
        <button
          type="button"
          className="bm-page-btn"
          onClick={handlePrevPage}
          disabled={!hasPrevPage}
          aria-label="Previous page"
        >
          {renderIcon(ChevronLeft, { size: 16 })}
        </button>
        
        <div className="bm-page-numbers">
          {getPageNumbers().map((page, index) => (
            typeof page === 'number' ? (
              <button
                key={page}
                type="button"
                className={`bm-page-number ${currentPage === page ? 'bm-page-number-active' : ''}`}
                onClick={() => onPageChange(page)}
                aria-label={`Page ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            ) : (
              <span key={`ellipsis-${index}`} className="bm-page-ellipsis">
                {page}
              </span>
            )
          ))}
        </div>
        
        <button
          type="button"
          className="bm-page-btn"
          onClick={handleNextPage}
          disabled={!hasNextPage}
          aria-label="Next page"
        >
          {renderIcon(ChevronRight, { size: 16 })}
        </button>
        
        <button
          type="button"
          className="bm-page-btn"
          onClick={handleLastPage}
          disabled={!hasNextPage}
          aria-label="Last page"
        >
          {renderIcon(ChevronsRight, { size: 16 })}
        </button>
        
        <span className="bm-page-info">
          Page {currentPage} of {totalPages}
        </span>
      </div>
    </div>
  );
};

export default React.memo(Pagination);
