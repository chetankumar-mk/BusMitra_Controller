import React from 'react';
import './PageHeader.css';

export const PageHeader = React.forwardRef(({
  title,
  subtitle,
  breadcrumb,
  actions,
  className = '',
  ...props
}, ref) => {
  return (
    <div ref={ref} className={`page-header ${className}`} {...props}>
      <div className="page-header-main">
        {breadcrumb && <div className="page-header-breadcrumb">{breadcrumb}</div>}
        <h1 className="page-header-title">{title}</h1>
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
});

PageHeader.displayName = 'PageHeader';
