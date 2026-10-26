import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../api/auth';

function ProtectedRoute({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await getCurrentUser();
        if (!response.success) {
          // Not authenticated, redirect to login
          navigate('/login');
        }
      } catch (error) {
        // Error checking auth, redirect to login
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate]);

  return children;
}

export default ProtectedRoute;
