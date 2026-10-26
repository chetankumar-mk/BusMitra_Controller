import { useState, useEffect } from 'react';

export const useBackendHealth = () => {
  const [status, setStatus] = useState('connected');
  const [latency, setLatency] = useState(0);

  useEffect(() => {
    const checkHealth = async () => {
      if (document.hidden) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const startTime = Date.now();

      try {
        const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
        const response = await fetch(`${apiBase}/api/health`, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const responseLatency = Date.now() - startTime;
          setLatency(responseLatency);

          if (responseLatency > 2000) {
            setStatus('degraded');
          } else {
            setStatus('connected');
          }
        } else {
          setStatus('offline');
        }
      } catch (err) {
        // Silent failure
        setStatus('offline');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkHealth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { status, latency };
};
