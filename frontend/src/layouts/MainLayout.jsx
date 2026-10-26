import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { logout, getCurrentUser } from '../api/auth';
import { 
  LayoutDashboard, 
  UserPlus, 
  ClipboardList, 
  Bus, 
  Users, 
  Route, 
  Radio, 
  AlertTriangle, 
  Plug, 
  Settings, 
  ChevronLeft, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Tooltip } from '../components/ui/Tooltip';
import { ErrorBoundary } from '../components/ErrorBoundary';
import Topbar from './Topbar';
import CommandPalette from '../components/CommandPalette';
import './MainLayout.css';

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await getCurrentUser();
        if (response.success) {
          setUser(response.user);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    // Load sidebar collapse state from localStorage
    try {
      const saved = localStorage.getItem('busmitra-sidebar');
      if (saved === 'collapsed') {
        setSidebarCollapsed(true);
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  };

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    try {
      localStorage.setItem('busmitra-sidebar', newState ? 'collapsed' : 'expanded');
    } catch (e) {
      // Ignore localStorage errors
    }
  };

  const toggleMobile = () => {
    setMobileOpen(!mobileOpen);
  };

  const closeMobile = () => {
    setMobileOpen(false);
  };

  const openPalette = () => {
    setPaletteOpen(true);
  };

  const closePalette = () => {
    setPaletteOpen(false);
  };

  // Close mobile drawer on route change
  useEffect(() => {
    closeMobile();
  }, [location.pathname]);

  // Update document title on route change
  useEffect(() => {
    const pageTitleMap = {
      '/': 'Dashboard',
      '/dashboard': 'Dashboard',
      '/assign-bus': 'Assign Bus',
      '/assignments': 'Assignments',
      '/buses': 'Buses',
      '/drivers': 'Drivers',
      '/routes': 'Routes',
      '/live-monitoring': 'Live Monitoring',
      '/emergency': 'Emergency',
      '/settings': 'Settings',
      '/driver-integration': 'Driver Integration',
    };

    const pageName = pageTitleMap[location.pathname] || 'Page not found';
    document.title = `${pageName} · BusMitra Controller`;
  }, [location.pathname]);

  // Body scroll lock when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Global keyboard shortcut for command palette (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
      }
      // Close palette on ESC
      if (e.key === 'Escape' && paletteOpen) {
        setPaletteOpen(false);
      }
      // Close mobile drawer on ESC
      if (e.key === 'Escape' && mobileOpen) {
        closeMobile();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [paletteOpen, mobileOpen]);

  const navSections = [
    {
      label: 'OPERATIONS',
      items: [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/live-monitoring', label: 'Live Monitoring', icon: Radio, hasIndicator: true },
        { path: '/emergency', label: 'Emergency', icon: AlertTriangle, isEmergency: true },
      ]
    },
    {
      label: 'FLEET',
      items: [
        { path: '/assign-bus', label: 'Assign Bus', icon: UserPlus },
        { path: '/assignments', label: 'Assignments', icon: ClipboardList },
        { path: '/buses', label: 'Buses', icon: Bus },
        { path: '/drivers', label: 'Drivers', icon: Users },
        { path: '/routes', label: 'Routes', icon: Route },
      ]
    },
    {
      label: 'SYSTEM',
      items: [
        { path: '/driver-integration', label: 'Driver Integration', icon: Plug },
        { path: '/settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="main-layout">
      {/* Skip to main content link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={closeMobile} />
      )}

      <aside 
        className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
        aria-label="Primary navigation"
      >
        {/* Brand Area */}
        <div className="sidebar-brand">
          {!sidebarCollapsed ? (
            <img 
              src="/assets/busmitra-logo.png" 
              alt="BusMitra Controller" 
              className="brand-logo"
            />
          ) : (
            <div className="brand-badge">
              <Bus size={24} />
            </div>
          )}
          <button 
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.label} className="nav-section">
              {!sidebarCollapsed && (
                <div className="nav-section-label">{section.label}</div>
              )}
              <ul className="nav-list">
                {section.items.map((item) => (
                  <li key={item.path} className="nav-item">
                    <Link
                      to={item.path}
                      className={`nav-link ${isActive(item.path) ? 'active' : ''} ${item.isEmergency ? 'nav-emergency' : ''}`}
                      aria-current={isActive(item.path) ? 'page' : undefined}
                    >
                      <span className="nav-icon">
                        {sidebarCollapsed ? (
                          <Tooltip content={item.label} position="right">
                            <item.icon size={20} />
                          </Tooltip>
                        ) : (
                          <item.icon size={20} />
                        )}
                      </span>
                      {!sidebarCollapsed && <span className="nav-text">{item.label}</span>}
                      {item.hasIndicator && <span className="nav-indicator"></span>}
                      {item.isEmergency && <span className="nav-emergency-dot"></span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {user ? (
            <>
              <div className="user-card">
                <div className="user-avatar">
                  {getInitials(user.username)}
                </div>
                {!sidebarCollapsed && (
                  <div className="user-info">
                    <div className="user-name">{user.username}</div>
                    <div className="user-depot">{user.depotName}</div>
                  </div>
                )}
              </div>
              <button 
                className="logout-btn"
                onClick={handleLogout}
                aria-label="Logout"
              >
                <LogOut size={18} />
                {!sidebarCollapsed && <span>Logout</span>}
              </button>
            </>
          ) : (
            <div className="user-card user-card-skeleton">
              <div className="skeleton-avatar skeleton" />
              {!sidebarCollapsed && (
                <div className="user-info">
                  <div className="skeleton-text skeleton" />
                  <div className="skeleton-text skeleton" />
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      <div className="main-content">
        <Topbar onMobileMenuToggle={toggleMobile} onOpenPalette={openPalette} />
        <main id="main-content" className={`page-content ${location.pathname === '/live-monitoring' ? 'full-width' : ''}`}>
          <ErrorBoundary key={location.pathname}>
            <div className="page-transition" key={location.pathname}>
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
        <CommandPalette open={paletteOpen} onClose={closePalette} />
      </div>
    </div>
  );
};

export default MainLayout;
