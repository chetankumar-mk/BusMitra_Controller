import React, { useState, useMemo } from 'react';
import { AlertCircle, WifiOff, User, MapPin } from 'lucide-react';
import { renderIcon } from '../ui/renderIcon';
import './AttentionList.css';

const AttentionList = ({ fleet, onBusClick }) => {
  const [showAll, setShowAll] = useState(false);

  const attentionItems = useMemo(() => {
    if (!fleet || fleet.length === 0) return [];

    const items = [];

    fleet.forEach(bus => {
      const reasons = [];

      // Offline buses
      if (!bus.tracking?.isOnline) {
        reasons.push({ type: 'offline', icon: WifiOff, label: 'Offline' });
      }

      // Stale GPS
      if (bus.freshness?.state === 'STALE') {
        reasons.push({ type: 'stale', icon: AlertCircle, label: 'Stale GPS' });
      }

      // No driver
      if (!bus.driver) {
        reasons.push({ type: 'no-driver', icon: User, label: 'No driver' });
      }

      // No GPS
      if (!bus.tracking?.latitude || !bus.tracking?.longitude) {
        reasons.push({ type: 'no-gps', icon: MapPin, label: 'No GPS' });
      }

      if (reasons.length > 0) {
        items.push({
          bus,
          reasons,
          primaryReason: reasons[0],
        });
      }
    });

    return items;
  }, [fleet]);

  const visibleItems = showAll ? attentionItems : attentionItems.slice(0, 5);

  if (attentionItems.length === 0) {
    return (
      <div className="attention-list">
        <div className="attention-clear">
          <span className="attention-clear-icon">✓</span>
          <span className="attention-clear-text">All clear</span>
        </div>
      </div>
    );
  }

  return (
    <div className="attention-list">
      <h4 className="attention-title">Attention needed</h4>
      <div className="attention-items">
        {visibleItems.map(({ bus, reasons, primaryReason }) => (
          <button
            key={bus.busId}
            className="attention-item"
            onClick={() => onBusClick?.(bus)}
            type="button"
          >
            <span className="attention-item-icon">
              {renderIcon(primaryReason.icon, { size: 16 })}
            </span>
            <span className="attention-item-bus">{bus.busNumber || bus.busId}</span>
            <span className="attention-item-reasons">
              {reasons.map((r, i) => (
                <span key={i} className="reason-pill">{r.label}</span>
              ))}
            </span>
          </button>
        ))}
      </div>
      {attentionItems.length > 5 && (
        <button
          className="attention-expand"
          onClick={() => setShowAll(!showAll)}
          type="button"
        >
          {showAll ? 'Show less' : `Show all ${attentionItems.length}`}
        </button>
      )}
    </div>
  );
};

export default React.memo(AttentionList);
