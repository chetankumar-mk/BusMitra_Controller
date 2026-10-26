import React, { Component } from 'react';
import { ErrorState } from './ui/ErrorState';
import { useLocation } from 'react-router-dom';

class ErrorBoundaryInner extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoToDashboard = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          message="Something went wrong on this page"
          onRetry={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = ({ children }) => {
  const location = useLocation();

  return (
    <ErrorBoundaryInner key={location.pathname}>
      {children}
    </ErrorBoundaryInner>
  );
};
