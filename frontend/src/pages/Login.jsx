import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { login } from '../api/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { memoryCache } from '../utils/memoryCache';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  MapPin, 
  Users, 
  AlertTriangle,
  Sun,
  Moon,
  Monitor,
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { status: healthStatus } = useBackendHealth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberUser, setRememberUser] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [shakeError, setShakeError] = useState(false);

  // Load remembered username on mount, clear memory cache on logout/session expiry
  useEffect(() => {
    // Clear in-memory cache on login page mount (reached after logout, session expiry, ProtectedRoute redirect)
    memoryCache.clear();
    
    try {
      const saved = localStorage.getItem('busmitra-remember-user');
      if (saved) {
        setFormData(prev => ({ ...prev, username: saved }));
        setRememberUser(true);
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  // Set document title
  useEffect(() => {
    document.title = 'Sign in · BusMitra Controller';
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.username.trim()) {
      setError('Username is required');
      return;
    }
    if (!formData.password) {
      setError('Password is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await login(formData);
      
      if (response.success) {
        // Save username if remember is checked
        if (rememberUser) {
          try {
            localStorage.setItem('busmitra-remember-user', formData.username);
          } catch (e) {
            // Ignore localStorage errors
          }
        } else {
          try {
            localStorage.removeItem('busmitra-remember-user');
          } catch (e) {
            // Ignore localStorage errors
          }
        }
        navigate('/dashboard');
      } else {
        setError(response.error || 'Invalid username or password');
        setShakeError(true);
        setTimeout(() => setShakeError(false), 500);
      }
    } catch (err) {
      setError('Unable to connect to Controller server');
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    setCapsLockOn(e.getModifierState && e.getModifierState('CapsLock'));
  };

  const getHealthIcon = () => {
    switch (healthStatus) {
      case 'connected':
        return <Wifi size={14} />;
      case 'degraded':
        return <AlertCircle size={14} />;
      case 'offline':
        return <WifiOff size={14} />;
      default:
        return <Wifi size={14} />;
    }
  };

  const getHealthColor = () => {
    switch (healthStatus) {
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

  const currentYear = new Date().getFullYear();

  return (
    <div className="login-page">
      {/* Theme Toggle */}
      <div className="login-theme-toggle">
        <button 
          className="theme-toggle-btn"
          onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
          aria-label="Toggle theme"
        >
          {theme === 'light' && <Sun size={18} />}
          {theme === 'dark' && <Moon size={18} />}
          {theme === 'system' && <Monitor size={18} />}
        </button>
      </div>

      <div className="login-container">
        {/* Left Brand Panel */}
        <div className="brand-panel">
          <div className="brand-content">
            <img 
              src="/assets/busmitra-logo.png" 
              alt="BusMitra Controller" 
              className="brand-logo"
            />
            <h1 className="brand-title">Run your fleet from one control room</h1>
            <p className="brand-subtitle">
              Monitor operations, manage assignments, and respond to emergencies in real-time.
            </p>

            {/* Animated City Route Map */}
            <div className="city-map-visual">
              <svg className="map-svg" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
                {/* Grid texture */}
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(37, 99, 235, 0.1)" strokeWidth="0.5"/>
                  </pattern>
                  <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--color-brand-primary)" />
                    <stop offset="50%" stopColor="var(--color-warning)" />
                    <stop offset="100%" stopColor="var(--color-danger)" />
                  </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Route paths */}
                <path 
                  className="route-path route-1" 
                  d="M 20 100 Q 100 50 200 100 T 380 100" 
                  fill="none" 
                  stroke="url(#routeGradient)" 
                  strokeWidth="2"
                />
                <path 
                  className="route-path route-2" 
                  d="M 20 140 Q 150 80 300 140" 
                  fill="none" 
                  stroke="var(--color-brand-primary)" 
                  strokeWidth="2"
                  opacity="0.5"
                />
                <path 
                  className="route-path route-3" 
                  d="M 50 60 Q 200 120 350 60" 
                  fill="none" 
                  stroke="var(--color-brand-primary)" 
                  strokeWidth="2"
                  opacity="0.5"
                />

                {/* Moving bus dots */}
                <circle className="bus-dot bus-1" r="6" fill="var(--color-brand-primary)">
                  <animateMotion dur="8s" repeatCount="indefinite" path="M 20 100 Q 100 50 200 100 T 380 100" />
                </circle>
                <circle className="bus-dot bus-2" r="6" fill="var(--color-warning)">
                  <animateMotion dur="10s" repeatCount="indefinite" begin="2s" path="M 20 140 Q 150 80 300 140" />
                </circle>
                <circle className="bus-dot bus-3" r="6" fill="var(--color-danger)">
                  <animateMotion dur="12s" repeatCount="indefinite" begin="4s" path="M 50 60 Q 200 120 350 60" />
                </circle>

                {/* Station markers */}
                <circle cx="20" cy="100" r="4" fill="var(--color-neutral-400)" opacity="0.5" />
                <circle cx="200" cy="100" r="4" fill="var(--color-neutral-400)" opacity="0.5" />
                <circle cx="380" cy="100" r="4" fill="var(--color-neutral-400)" opacity="0.5" />
              </svg>
            </div>

            {/* Capability Chips */}
            <div className="capability-chips">
              <div className="chip">
                <MapPin size={16} />
                <span>Live GPS tracking</span>
              </div>
              <div className="chip">
                <Users size={16} />
                <span>Driver assignments</span>
              </div>
              <div className="chip">
                <AlertTriangle size={16} />
                <span>Emergency alerts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Login Panel */}
        <div className="login-panel">
          <div className="login-card">
            <div className="login-header">
              <h2 className="login-welcome">Welcome back</h2>
              <p className="login-subtitle">Sign in to your depot controller account</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <Input
                  id="username"
                  name="username"
                  label="Username"
                  icon={User}
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter username"
                  disabled={isLoading}
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <Input
                  id="password"
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  icon={Lock}
                  value={formData.password}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter password"
                  disabled={isLoading}
                  autoComplete="current-password"
                  rightElement={
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />
                {capsLockOn && (
                  <div className="caps-lock-warning">
                    <AlertCircle size={14} />
                    <span>Caps Lock is on</span>
                  </div>
                )}
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberUser}
                    onChange={(e) => setRememberUser(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span>Remember username</span>
                </label>
              </div>

              {error && (
                <div 
                  className={`error-banner ${shakeError ? 'shake' : ''}`}
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLoading}
                disabled={isLoading}
                fullWidth
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="login-footer">
              <p className="forgot-password">Forgot your password? Contact your depot administrator.</p>
              
              <div className="system-status">
                <div 
                  className="status-pill"
                  style={{ color: getHealthColor() }}
                >
                  {getHealthIcon()}
                  <span className="status-text">
                    {healthStatus === 'connected' && 'Connected'}
                    {healthStatus === 'degraded' && 'Degraded'}
                    {healthStatus === 'offline' && 'Offline'}
                  </span>
                </div>
              </div>

              <p className="copyright">© {currentYear} BusMitra</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
