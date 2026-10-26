import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import AssignBus from './pages/AssignBus';
import Assignments from './pages/Assignments';
import Buses from './pages/Buses';
import Drivers from './pages/Drivers';
import RoutesPage from './pages/Routes';
import LiveMonitoring from './pages/LiveMonitoring';
import Emergency from './pages/Emergency';
import Settings from './pages/Settings';
import DriverIntegration from './pages/DriverIntegration';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import SplashScreen from './components/SplashScreen';
import ProtectedRoute from './components/ProtectedRoute';
import { getCurrentUser } from './api/auth';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await getCurrentUser();
        setIsAuthenticated(response.success);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <Login />
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="assign-bus" element={<AssignBus />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="buses" element={<Buses />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="live-monitoring" element={<LiveMonitoring />} />
          <Route path="emergency" element={<Emergency />} />
          <Route path="settings" element={<Settings />} />
          <Route path="driver-integration" element={<DriverIntegration />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
