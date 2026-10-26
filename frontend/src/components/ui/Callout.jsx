import React from 'react';
import { Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { renderIcon } from './renderIcon';
import './Callout.css';

const Callout = ({ variant = 'info', icon, title, children }) => {
  const defaultIcons = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle,
  };

  const Icon = icon || defaultIcons[variant] || Info;

  return (
    <div className={`callout callout-${variant}`}>
      <div className="callout-icon">
        {renderIcon(Icon, { size: 20 })}
      </div>
      <div className="callout-content">
        {title && <div className="callout-title">{title}</div>}
        <div className="callout-text">{children}</div>
      </div>
    </div>
  );
};

export default React.memo(Callout);
