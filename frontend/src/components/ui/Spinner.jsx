import React from 'react';
import './Spinner.css';

export const Spinner = ({ size = 'md', className = '', ...props }) => {
  const sizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  return (
    <svg
      className={`spinner spinner-${size} ${className}`}
      width={sizes[size]}
      height={sizes[size]}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle
        className="spinner-track"
        cx="12"
        cy="12"
        r="10"
        strokeWidth="2"
      />
      <path
        className="spinner-path"
        d="M12 2C6.477 2 2 6.477 2 12"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};
