const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

/**
 * Login API call
 * @param {Object} credentials - { username, password }
 * @returns {Promise<Object>} Response with success and user data
 */
export async function login(credentials) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();
  return data;
}

/**
 * Logout API call
 * @returns {Promise<Object>} Response with success status
 */
export async function logout() {
  const response = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  const data = await response.json();
  return data;
}

/**
 * Get current authenticated user
 * @returns {Promise<Object>} Response with success and user data
 */
export async function getCurrentUser() {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await response.json();
  return data;
}
