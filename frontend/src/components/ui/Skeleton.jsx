import React from 'react';
import './Skeleton.css';

export const Skeleton = ({ variant = 'rect', className = '', ...props }) => {
  return (
    <div className={`skeleton skeleton-${variant} ${className}`} {...props} />
  );
};

export const SkeletonText = ({ lines = 1, className = '', ...props }) => (
  <div className={`skeleton-text ${className}`} {...props}>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="skeleton-text-line" style={{ width: i === lines - 1 ? '60%' : '100%' }} />
    ))}
  </div>
);

export const SkeletonCircle = ({ size = 40, className = '', ...props }) => (
  <div 
    className={`skeleton skeleton-circle ${className}`} 
    style={{ width: size, height: size }}
    {...props} 
  />
);

export const SkeletonRect = ({ width = '100%', height = 16, className = '', ...props }) => (
  <div 
    className={`skeleton skeleton-rect ${className}`} 
    style={{ width, height }}
    {...props} 
  />
);

export const SkeletonTableRow = ({ cols = 4, className = '', ...props }) => (
  <div className={`skeleton-table-row ${className}`} {...props}>
    {Array.from({ length: cols }).map((_, i) => (
      <div key={i} className="skeleton-table-cell skeleton" />
    ))}
  </div>
);
