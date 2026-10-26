import React from 'react';
import { Inbox } from 'lucide-react';
import { renderIcon } from './renderIcon';
import './EmptyState.css';

export const EmptyState = React.forwardRef(({
  icon = Inbox,
  title = 'No data',
  description,
  action,
  className = '',
  ...props
}, ref) => {
  return (
    <div ref={ref} className={`empty-state ${className}`} {...props}>
      <div className="empty-state-icon">
        {renderIcon(icon, { size: 48 })}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';
