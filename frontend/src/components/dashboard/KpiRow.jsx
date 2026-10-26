import React, { useState, useEffect, useRef } from 'react';
import { StatCard } from '../ui/StatCard';
import { Bus, Wifi, WifiOff, ClipboardList, AlertTriangle } from 'lucide-react';
import './KpiRow.css';

const KpiRow = ({ summary, fleet, loading, onCardClick }) => {
  const [prevValues, setPrevValues] = useState({});
  const [animatedValues, setAnimatedValues] = useState({});
  const animationRefs = useRef({});
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (loading || !summary) return;

    const newAnimatedValues = { ...animatedValues };
    const newPrevValues = { ...prevValues };

    const kpis = [
      { key: 'total', value: summary.trackedBuses ?? 0 },
      { key: 'online', value: summary.onlineBuses ?? 0 },
      { key: 'offline', value: summary.offlineBuses ?? 0 },
      { key: 'assignments', value: summary.activeAssignments ?? 0 },
      { key: 'stale', value: fleet.filter(b => b.freshness?.state === 'STALE').length },
    ];

    kpis.forEach(({ key, value }) => {
      if (prevValues[key] !== value && !prefersReducedMotion.current) {
        newPrevValues[key] = animatedValues[key] || value;
        newAnimatedValues[key] = value;
        
        // Cancel any existing animation for this key
        if (animationRefs.current[key]) {
          cancelAnimationFrame(animationRefs.current[key]);
        }

        const startValue = newPrevValues[key];
        const endValue = value;
        const duration = 400;
        const startTime = performance.now();

        const animate = (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
          
          newAnimatedValues[key] = Math.round(startValue + (endValue - startValue) * easeProgress);
          setAnimatedValues({ ...newAnimatedValues });

          if (progress < 1) {
            animationRefs.current[key] = requestAnimationFrame(animate);
          }
        };

        animationRefs.current[key] = requestAnimationFrame(animate);
      } else {
        newAnimatedValues[key] = value;
      }
    });

    setPrevValues(newPrevValues);
    setAnimatedValues(newAnimatedValues);

    return () => {
      Object.values(animationRefs.current).forEach(id => cancelAnimationFrame(id));
    };
  }, [summary, fleet, loading]);

  if (loading) {
    return (
      <div className="kpi-row">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="kpi-skeleton">
            <div className="kpi-skeleton-icon" />
            <div className="kpi-skeleton-label" />
            <div className="kpi-skeleton-value" />
            <div className="kpi-skeleton-sub" />
          </div>
        ))}
      </div>
    );
  }

  const staleCount = fleet.filter(b => b.freshness?.state === 'STALE').length;

  return (
    <div className="kpi-row">
      <StatCard
        icon={Bus}
        label="Total Buses"
        value={animatedValues.total ?? summary.trackedBuses ?? 0}
        subText="Fleet registered"
        accent="primary"
        onClick={() => onCardClick?.('total')}
      />
      <StatCard
        icon={Wifi}
        label="Online"
        value={animatedValues.online ?? summary.onlineBuses ?? 0}
        subText="Recent GPS update"
        accent="success"
        onClick={() => onCardClick?.('online')}
      />
      <StatCard
        icon={WifiOff}
        label="Offline"
        value={animatedValues.offline ?? summary.offlineBuses ?? 0}
        subText="No recent GPS"
        accent="danger"
        onClick={() => onCardClick?.('offline')}
      />
      <StatCard
        icon={ClipboardList}
        label="Active Assignments"
        value={animatedValues.assignments ?? summary.activeAssignments ?? 0}
        subText="Currently assigned"
        accent="info"
        onClick={() => onCardClick?.('assignments')}
      />
      <StatCard
        icon={AlertTriangle}
        label="GPS Stale"
        value={animatedValues.stale ?? staleCount}
        subText="Stale GPS data"
        accent="warning"
        onClick={() =>	onCardClick?.('stale')}
      />
    </div>
  );
};

export default React.memo(KpiRow);
