import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/ui/Toast';
import { 
  Search, 
  Clock, 
  Sun, 
  Moon, 
  Monitor, 
  LogOut, 
  User,
  ChevronDown,
  Wifi,
  WifiOff,
  AlertTriangle
} from 'lucide-react';
import { logout, getCurrentUser } from '../api/auth';
import './Topbar.css';

const Topbar = ({ onMobileMenuToggle, onOpenPalette }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { success, error, warning } = useToast();
  const [time, setTime] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [connectionLatency, setConnectionLatency] = useState(0);
  const [user, setUser] = useState(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);
  const themeDropdownRef = useRef(null);

  // Clock updates every second
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Connection status polling
  useEffect(() => {
    const checkConnection = async () => {
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
          const latency = Date.now() - startTime;
          setConnectionLatency(latency);
          
          if (latency > 2000) {
            setConnectionStatus('degraded');
          } else {
            setConnectionStatus('connected');
          }
        } else {
          setConnectionStatus('offline');
        }
      } catch (err) {
        // Silent failure - no toasts or console spam
        setConnectionStatus('offline');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    
    // Resume immediately on visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkConnection();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await getCurrentUser();
        if (response.success) {
          setUser(response.user);
        }
      } catch (err) {
        // Silent failure
      }
    };
    fetchUser();
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target)) {
        setThemeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      error('Logout failed');
    }
  };

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'Dashboard';
    
    const pageMap = {
      '/assign-bus': 'Assign Bus',
      '/assignments': 'Assignments',
      '/buses': 'Buses',
      '/drivers': 'Drivers',
      '/routes': 'Routes',
      '/live-monitoring': 'Live Monitoring',
      '/emergency': 'Emergency',
      '/driver-integration': 'Driver Integration',
      '/settings': 'Settings',
    };
    
    return pageMap[path] || 'Page';
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi size={16} />;
      case 'degraded':
        return <AlertTriangle size={16} />;
      case 'offline':
        return <WifiOff size={16} />;
      default:
        return <Wifi size={16} />;
    }
  };

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'var(--color-success)';
      case 'degraded':
        return 'var(--color-warning)';
      case 'offline':
        return 'var(--color-danger)';
      default:
        return 'var(--color-neutral-400)';
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'degraded':
        return 'Degraded';
      case 'offline':
        return 'Offline';
      default:
        return 'Checking...';
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button 
          className="mobile-menu-btn"
          onClick={onMobileMenuToggle}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <span className="breadcrumb-item">Home</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item breadcrumb-current">{getBreadcrumb()}</span>
        </nav>
      </div>

      <div className="topbar-center">
        <button 
          className="command-palette-btn"
          onClick={onOpenPalette}
          aria-label="Open command palette"
        >
          <Search size={16} />
          <span>Search or jump to...</span>
          <kbd>Ctrl</kbd>
          <kbd>K</kbd>
        </button>
      </div>

      <div className="topbar-right">
        {/* Clock */}
        <div className="clock-display">
          <Clock size={16} />
          <span className="tabular">{formatTime(time)}</span>
          <span className="clock-date">{formatDate(time)}</span>
        </div>

        {/* Connection Status */}
        <div 
          className="connection-pill"
          style={{ color: getConnectionColor() }}
          title={getConnectionText()}
        >
          {getConnectionIcon()}
          <span>{getConnectionText()}</span>
        </div>

        {/* Theme Toggle */}
        <div className="theme-toggle-wrapper" ref={themeDropdownRef}>
          <button 
            className="theme-toggle-btn"
            onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
            aria-label="Toggle theme"
          >
            {theme === 'light' && <Sun size={18} />}
            {theme === 'dark' && <Moon size={18} />}
            {theme === 'system' && <Monitor size={18} />}
          </button>
          {themeDropdownOpen && (
            <div className="dropdown-menu theme-dropdown">
              <button 
                className="dropdown-item"
                onClick={() => { setTheme('light'); setThemeDropdownOpen(false); }}
              >
                <Sun size={16} />
                <span>Light</span>
              </button>
              <button 
                className="dropdown-item"
                onClick={() => { setTheme('dark'); setThemeDropdownOpen(false); }}
              >
                <Moon size={16} />
                <span>Dark</span>
              </button>
              <button 
                className="dropdown-item"
                onClick={() => { setTheme('system'); setThemeDropdownOpen(false); }}
              >
                <Monitor size={16} />
                <span>System</span>
              </button>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="user-dropdown-wrapper" ref={userDropdownRef}>
          <button 
            className="user-avatar-btn"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            aria-label="User menu"
          >
            <div className="user-avatar-small">
              {user ? getInitials(user.username) : '?'}
            </div>
            <ChevronDown size={14} />
          </button>
          {userDropdownOpen && (
            <div className="dropdown-menu user-dropdown">
              <div className="dropdown-header">
                <div className="user-avatar-large">
                  {getInitials(user?.username)}
                </div>
                <div className="user-details">
                  <div className="user-name">{user?.username}</div>
                  <div className="user-depot">{user?.depotName}</div>
                </div>
              </div>
              <div className="dropdown-divider" />
              <button 
                className="dropdown-item danger"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
