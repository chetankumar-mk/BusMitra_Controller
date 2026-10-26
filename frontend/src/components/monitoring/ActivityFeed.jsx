import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EmptyState } from '../ui/EmptyState';
import { Activity, Wifi, WifiOff, AlertCircle, MapPin, UserPlus, UserMinus, Plus } from 'lucide-react';
import { renderIcon } from '../ui/renderIcon';
import { isStale, isOnline, hasValidGps, getBusDisplayName } from '../../utils/fleet';
import './ActivityFeed.css';

const ActivityFeed = ({ fleet, onBusSelect }) => {
  const [events, setEvents] = useState([]);
  const previousFleetRef = useRef(null);
  const isFirstLoadRef = useRef(true);

  // Diff fleet snapshots and generate events
  useEffect(() => {
    if (isFirstLoadRef.current) {
      previousFleetRef.current = fleet;
      isFirstLoadRef.current = false;
      return;
    }

    const prevFleet = previousFleetRef.current || [];
    const newEvents = [];

    // Create maps for easier lookup
    const prevMap = new Map(prevFleet.map(b => [b.busId, b]));
    const currMap = new Map(fleet.map(b => [b.busId, b]));

    // Check for new buses
    for (const bus of fleet) {
      if (!prevMap.has(bus.busId)) {
        newEvents.push({
          id: `new-${bus.busId}-${Date.now()}`,
          type: 'new_bus',
          busId: bus.busId,
          busNumber: bus.busNumber,
          message: `${getBusDisplayName(bus)} appeared in fleet`,
          timestamp: Date.now(),
          icon: Plus,
        });
      }
    }

    // Check for changes in existing buses
    for (const bus of fleet) {
      const prevBus = prevMap.get(bus.busId);
      if (!prevBus) continue;

      // Online status change
      const wasOnline = isOnline(prevBus);
      const isNowOnline = isOnline(bus);
      if (wasOnline !== isNowOnline) {
        newEvents.push({
          id: `online-${bus.busId}-${Date.now()}`,
          type: isNowOnline ? 'came_online' : 'went_offline',
          busId: bus.busId,
          busNumber: bus.busNumber,
          message: `${getBusDisplayName(bus)} ${isNowOnline ? 'came online' : 'went offline'}`,
          timestamp: Date.now(),
          icon: isNowOnline ? Wifi : WifiOff,
        });
      }

      // Stale status change
      const wasStale = isStale(prevBus);
      const isNowStale = isStale(bus);
      if (wasStale !== isNowStale) {
        newEvents.push({
          id: `stale-${bus.busId}-${Date.now()}`,
          type: isNowStale ? 'became_stale' : 'gps_recovered',
          busId: bus.busId,
          busNumber: bus.busNumber,
          message: `${getBusDisplayName(bus)} GPS ${isNowStale ? 'became stale' : 'recovered'}`,
          timestamp: Date.now(),
          icon: AlertCircle,
        });
      }

      // Assignment change
      const hadAssignment = !!prevBus.assignment;
      const hasAssignment = !!bus.assignment;
      if (hadAssignment !== hasAssignment) {
        newEvents.push({
          id: `assign-${bus.busId}-${Date.now()}`,
          type: hasAssignment ? 'got_assignment' : 'lost_assignment',
          busId: bus.busId,
          busNumber: bus.busNumber,
          message: `${getBusDisplayName(bus)} ${hasAssignment ? 'got assignment' : 'lost assignment'}`,
          timestamp: Date.now(),
          icon: hasAssignment ? UserPlus : UserMinus,
        });
      }
    }

    // Update events (keep last 50)
    if (newEvents.length > 0) {
      setEvents(prev => {
        const combined = [...newEvents, ...prev];
        return combined.slice(0, 50);
      });
    }

    previousFleetRef.current = fleet;
  }, [fleet]);

  // Clear events on unmount
  useEffect(() => {
    return () => {
      setEvents([]);
      previousFleetRef.current = null;
      isFirstLoadRef.current = true;
    };
  }, []);

  const formatEventTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  const handleEventClick = useCallback((busId) => {
    onBusSelect?.(busId);
  }, [onBusSelect]);

  if (events.length === 0) {
    return (
      <div className="activity-feed">
        <div className="feed-empty">
          <EmptyState
            icon={Activity}
            title="No changes yet"
            description="Activity will appear here as the fleet updates"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      <h3 className="feed-title">Activity</h3>
      <div className="feed-list" aria-live="polite">
        {events.map((event) => (
          <button
            key={event.id}
            className="feed-item"
            onClick={() => handleEventClick(event.busId)}
            type="button"
          >
            <span className="feed-icon">
              {renderIcon(event.icon, { size: 16 })}
            </span>
            <span className="feed-message">{event.message}</span>
            <span className="feed-time">{formatEventTime(event.timestamp)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default React.memo(ActivityFeed);
