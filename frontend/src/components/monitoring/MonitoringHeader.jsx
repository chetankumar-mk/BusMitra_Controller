import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { RefreshCw, Play, Pause, Clock } from 'lucide-react';
import { renderIcon } from '../ui/renderIcon';
import './MonitoringHeader.css';

const TimeAgo = ({ timestamp }) => {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const update = () => {
      if (!timestamp) {
        setTimeAgo('—');
        return;
      }
      const now = Date.now();
      const diff = now - timestamp;
      
      if (diff < 60000) {
        setTimeAgo(`${Math.floor(diff / 1000)}s ago`);
      } else if (diff < 3600000) {
        setTimeAgo(`${Math.floor(diff / 60000)}m ago`);
      } else {
        setTimeAgo(`${Math.floor(diff / 3600000)}h ago`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return <span className="time-ago">{timeAgo}</span>;
};

const MonitoringHeader = ({
  isLive,
  lastUpdate,
  isPaused,
  onPauseToggle,
  onRefresh,
  stats,
  onStatClick,
  activeFilter
}) => {
  const kpiItems = [
    { key: 'online', label: 'Online', value: stats?.online ?? 0, color: 'success' },
    { key: 'offline', label: 'Offline', value: stats?.offline ?? 0, color: 'neutral' },
    { key: 'active', label: 'Active Tracking', value: stats?.activeTracking ?? 0, color: 'info' },
    { key: 'stale', label: 'Stale GPS', value: stats?.stale ?? 0, color: 'warning' },
  ];

  return (
    <div className="monitoring-header">
      <div className="header-left">
        <h1 className="header-title">Live Monitoring</h1>
        <span className="header-subtitle">Real-time fleet tracking and status</span>
      </div>
      
      <div className="header-kpi-strip">
        {kpiItems.map((item) => (
          <button
            key={item.key}
            className={`kpi-chip ${activeFilter === item.key ? 'kpi-chip-active' : ''}`}
            onClick={() => onStatClick?.(item.key)}
            type="button"
            title={`${item.label}: ${item.value}`}
          >
            <span className="kpi-dot kpi-dot-${item.color}"></span>
            <span className="kpi-label">{item.label}</span>
            <span className="kpi-value">{item.value}</span>
          </button>
        ))}
      </div>
      
      <div className="header-controls">
        <Badge variant={isLive ? 'success' : 'warning'} pulse={isLive}>
          {isLive ? 'Live' : 'Stale'}
        </Badge>
        
        <div className="update-time">
          {renderIcon(Clock, { size: 14 })}
          <TimeAgo timestamp={lastUpdate} />
        </div>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          icon={RefreshCw}
        >
          Refresh
        </Button>
        
        <Button
          variant={isPaused ? 'warning' : 'secondary'}
          size="sm"
          onClick={onPauseToggle}
          icon={isPaused ? Play : Pause}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </Button>
      </div>
    </div>
  );
};

export default React.memo(MonitoringHeader);
