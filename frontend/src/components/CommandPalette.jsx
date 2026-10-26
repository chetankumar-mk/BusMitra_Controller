import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useToast } from './ui/Toast';
import { Modal } from './ui/Modal';
import { SearchInput } from './ui/SearchInput';
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
  Sun,
  Moon,
  Monitor,
  LogOut
} from 'lucide-react';
import { logout } from '../api/auth';

const CommandPalette = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { success, error } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef(null);

  const pages = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, section: 'Pages' },
    { path: '/assign-bus', label: 'Assign Bus', icon: UserPlus, section: 'Pages' },
    { path: '/assignments', label: 'Assignments', icon: ClipboardList, section: 'Pages' },
    { path: '/buses', label: 'Buses', icon: Bus, section: 'Pages' },
    { path: '/drivers', label: 'Drivers', icon: Users, section: 'Pages' },
    { path: '/routes', label: 'Routes', icon: Route, section: 'Pages' },
    { path: '/live-monitoring', label: 'Live Monitoring', icon: Radio, section: 'Pages' },
    { path: '/emergency', label: 'Emergency', icon: AlertTriangle, section: 'Pages' },
    { path: '/driver-integration', label: 'Driver Integration', icon: Plug, section: 'Pages' },
    { path: '/settings', label: 'Settings', icon: Settings, section: 'Pages' },
  ];

  const actions = [
    { 
      label: 'Toggle Theme', 
      icon: theme === 'light' ? Moon : theme === 'dark' ? Sun : Monitor,
      action: () => {
        if (theme === 'light') setTheme('dark');
        else if (theme === 'dark') setTheme('system');
        else setTheme('light');
        onClose();
      },
      section: 'Actions'
    },
    {
      label: 'Logout',
      icon: LogOut,
      action: async () => {
        try {
          await logout();
          navigate('/login');
        } catch (err) {
          error('Logout failed');
        }
        onClose();
      },
      section: 'Actions'
    },
  ];

  const allItems = [...pages, ...actions];
  
  const filteredItems = allItems.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group items by section
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {});

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    setSearchQuery('');
    setSelectedIndex(0);
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  const handleSelect = (item) => {
    if (item.path) {
      navigate(item.path);
      onClose();
    } else if (item.action) {
      item.action();
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="command-palette" onKeyDown={handleKeyDown}>
        <SearchInput
          ref={searchInputRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search pages and actions..."
          autoFocus
        />
        
        <div className="command-results">
          {filteredItems.length === 0 ? (
            <div className="command-empty">No results found</div>
          ) : (
            Object.entries(groupedItems).map(([section, items]) => (
              <div key={section} className="command-section">
                <div className="command-section-label">{section}</div>
                {items.map((item, index) => {
                  const globalIndex = filteredItems.indexOf(item);
                  return (
                    <button
                      key={item.label}
                      className={`command-item ${globalIndex === selectedIndex ? 'command-item-selected' : ''}`}
                      onClick={() => handleSelect(item)}
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="command-footer">
          <div className="command-hint">
            <kbd>↑↓</kbd> to navigate
          </div>
          <div className="command-hint">
            <kbd>Enter</kbd> to select
          </div>
          <div className="command-hint">
            <kbd>Esc</kbd> to close
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CommandPalette;
