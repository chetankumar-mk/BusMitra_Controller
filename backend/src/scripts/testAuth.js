import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:3001';

async function testAuth() {
  console.log('=== Authentication Test ===\n');

  // TEST 1: GET /api/auth/me before login
  console.log('TEST 1: GET /api/auth/me before login');
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`);
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    if (response.status === 401 && data.error === 'Authentication required') {
      console.log('✓ PASS: Returns 401 as expected\n');
    } else {
      console.log('✗ FAIL: Expected 401\n');
    }
  } catch (error) {
    console.log('✗ FAIL:', error.message, '\n');
  }

  // TEST 2: POST /api/auth/login with correct credentials
  console.log('TEST 2: POST /api/auth/login with KSRTC/1234');
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'KSRTC',
        password: '1234'
      }),
      credentials: 'include'
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    if (response.status === 200 && data.success) {
      console.log('✓ PASS: Login successful\n');
    } else {
      console.log('✗ FAIL: Expected 200 with success\n');
    }
  } catch (error) {
    console.log('✗ FAIL:', error.message, '\n');
  }

  // TEST 3: GET /api/auth/me after login
  console.log('TEST 3: GET /api/auth/me after login');
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: 'include'
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    if (response.status === 200 && data.success && data.user) {
      console.log('✓ PASS: Returns user data\n');
    } else {
      console.log('✗ FAIL: Expected 200 with user data\n');
    }
  } catch (error) {
    console.log('✗ FAIL:', error.message, '\n');
  }

  // TEST 4: POST /api/auth/logout
  console.log('TEST 4: POST /api/auth/logout');
  try {
    const response = await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    if (response.status === 200 && data.success) {
      console.log('✓ PASS: Logout successful\n');
    } else {
      console.log('✗ FAIL: Expected 200\n');
    }
  } catch (error) {
    console.log('✗ FAIL:', error.message, '\n');
  }

  // TEST 5: GET /api/auth/me after logout
  console.log('TEST 5: GET /api/auth/me after logout');
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: 'include'
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    if (response.status === 401 && data.error === 'Authentication required') {
      console.log('✓ PASS: Returns 401 as expected\n');
    } else {
      console.log('✗ FAIL: Expected 401\n');
    }
  } catch (error) {
    console.log('✗ FAIL:', error.message, '\n');
  }

  // TEST 6: Login with incorrect password
  console.log('TEST 6: POST /api/auth/login with incorrect password');
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'KSRTC',
        password: 'wrongpassword'
      }),
      credentials: 'include'
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    if (response.status === 401 && !data.success) {
      console.log('✓ PASS: Returns 401 as expected\n');
    } else {
      console.log('✗ FAIL: Expected 401\n');
    }
  } catch (error) {
    console.log('✗ FAIL:', error.message, '\n');
  }

  // TEST 7: Login with nonexistent username
  console.log('TEST 7: POST /api/auth/login with nonexistent username');
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'nonexistent',
        password: '1234'
      }),
      credentials: 'include'
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    if (response.status === 401 && !data.success) {
      console.log('✓ PASS: Returns 401 as expected\n');
    } else {
      console.log('✗ FAIL: Expected 401\n');
    }
  } catch (error) {
    console.log('✗ FAIL:', error.message, '\n');
  }

  console.log('=== Test Complete ===');
  process.exit(0);
}

testAuth().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
