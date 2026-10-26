import React from 'react';
import { Bus } from 'lucide-react';
import './SplashScreen.css';

const SplashScreen = () => {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-logo">
          <Bus size={64} />
        </div>
        <h1 className="splash-title">BusMitra Controller</h1>
        <p className="splash-subtitle">Connecting to Controller...</p>
        <div className="splash-progress">
          <div className="progress-bar">
            <div className="progress-fill" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
