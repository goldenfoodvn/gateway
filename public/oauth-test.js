// OAuth Test Dashboard JavaScript
// This file contains all the functionality for the OAuth testing dashboard

// ===========================
// LOGGING FUNCTIONS
// ===========================

function addLog(level, message) {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  const log = document.getElementById('log-content');
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry ${level.toLowerCase()}`;
  logEntry.textContent = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  log.appendChild(logEntry);
  
  // Auto-scroll to bottom
  log.scrollTop = log.scrollHeight;
}

function clearLog() {
  document.getElementById('log-content').innerHTML = '';
  addLog('INFO', 'Log cleared');
}

// ===========================
// CHECKLIST FUNCTIONS
// ===========================

function checkItem(id) {
  const checkbox = document.getElementById(id);
  if (checkbox) {
    checkbox.checked = true;
    addLog('SUCCESS', `Completed: ${checkbox.nextElementSibling.textContent}`);
  }
}

function uncheckAll(provider) {
  for (let i = 1; i <= 8; i++) {
    const checkbox = document.getElementById(`${provider}-${i}`);
    if (checkbox) {
      checkbox.checked = false;
    }
  }
}

// ===========================
// OAUTH LOGIN FUNCTIONS
// ===========================

function testGoogleLogin() {
  addLog('INFO', 'Starting Google OAuth flow...');
  checkItem('google-1');
  
  // Store which provider we're testing
  localStorage.setItem('testing-provider', 'google');
  
  setTimeout(() => {
    checkItem('google-2');
    addLog('INFO', 'Redirecting to Google...');
    window.location.href = '/auth/google';
  }, 500);
}

function testGitHubLogin() {
  addLog('INFO', 'Starting GitHub OAuth flow...');
  checkItem('github-1');
  
  localStorage.setItem('testing-provider', 'github');
  
  setTimeout(() => {
    checkItem('github-2');
    addLog('INFO', 'Redirecting to GitHub...');
    window.location.href = '/auth/github';
  }, 500);
}

function testFacebookLogin() {
  addLog('INFO', 'Starting Facebook OAuth flow...');
  checkItem('facebook-1');
  
  localStorage.setItem('testing-provider', 'facebook');
  
  setTimeout(() => {
    checkItem('facebook-2');
    addLog('INFO', 'Redirecting to Facebook...');
    window.location.href = '/auth/facebook';
  }, 500);
}

// ===========================
// USER INFO FUNCTIONS
// ===========================

function displayUserInfo() {
  const accessToken = localStorage.getItem('accessToken');
  const userName = localStorage.getItem('userName');
  const userEmail = localStorage.getItem('userEmail');
  const provider = localStorage.getItem('authProvider');
  
  if (accessToken && userName) {
    document.getElementById('user-info').style.display = 'block';
    document.getElementById('user-name').textContent = userName || 'Unknown User';
    document.getElementById('user-email').textContent = userEmail || 'No email';
    document.getElementById('provider-name').textContent = provider || 'Unknown';
    
    // Set avatar if available (placeholder for now)
    const userAvatar = document.getElementById('user-avatar');
    userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'User')}&background=667eea&color=fff&size=64`;
    
    addLog('SUCCESS', `User logged in: ${userName} (${userEmail})`);
    addLog('INFO', `Provider: ${provider}`);
    
    // Complete the checklist for the current provider
    const testingProvider = localStorage.getItem('testing-provider');
    if (testingProvider) {
      for (let i = 3; i <= 8; i++) {
        setTimeout(() => checkItem(`${testingProvider}-${i}`), i * 200);
      }
    }
  } else {
    document.getElementById('user-info').style.display = 'none';
  }
}

function logout() {
  addLog('INFO', 'Logging out...');
  
  // Clear all localStorage
  localStorage.clear();
  
  addLog('SUCCESS', 'Logged out successfully');
  
  // Reload page
  setTimeout(() => {
    window.location.reload();
  }, 500);
}

// ===========================
// TOKEN MANAGEMENT
// ===========================

let tokensVisible = {
  access: false,
  refresh: false
};

function toggleTokenVisibility(tokenType) {
  const displayElement = document.getElementById(`${tokenType}-token-display`);
  const token = localStorage.getItem(tokenType === 'access' ? 'accessToken' : 'refreshToken');
  
  if (!token) {
    displayElement.textContent = 'No token available';
    displayElement.classList.add('hidden');
    return;
  }
  
  tokensVisible[tokenType] = !tokensVisible[tokenType];
  
  if (tokensVisible[tokenType]) {
    displayElement.textContent = token;
    displayElement.classList.remove('hidden');
    addLog('INFO', `Showing ${tokenType} token`);
  } else {
    displayElement.textContent = 'Click to show';
    displayElement.classList.add('hidden');
    addLog('INFO', `Hiding ${tokenType} token`);
  }
}

// ===========================
// API TESTING FUNCTIONS
// ===========================

async function testGetMe() {
  addLog('INFO', 'Testing GET /me endpoint...');
  
  const token = localStorage.getItem('accessToken');
  if (!token) {
    addLog('ERROR', 'No access token found. Please login first.');
    document.getElementById('endpoint-result').textContent = 'ERROR: No access token';
    return;
  }
  
  try {
    const response = await fetch('/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      addLog('SUCCESS', 'GET /me succeeded');
      document.getElementById('endpoint-result').textContent = JSON.stringify(data, null, 2);
    } else {
      addLog('ERROR', `GET /me failed: ${response.status}`);
      document.getElementById('endpoint-result').textContent = JSON.stringify(data, null, 2);
    }
  } catch (error) {
    addLog('ERROR', `GET /me error: ${error.message}`);
    document.getElementById('endpoint-result').textContent = `ERROR: ${error.message}`;
  }
}

async function testGetHealth() {
  addLog('INFO', 'Testing GET /health endpoint...');
  
  try {
    const response = await fetch('/health');
    const data = await response.json();
    
    if (response.ok) {
      addLog('SUCCESS', 'GET /health succeeded');
      document.getElementById('endpoint-result').textContent = JSON.stringify(data, null, 2);
    } else {
      addLog('ERROR', `GET /health failed: ${response.status}`);
      document.getElementById('endpoint-result').textContent = JSON.stringify(data, null, 2);
    }
  } catch (error) {
    addLog('ERROR', `GET /health error: ${error.message}`);
    document.getElementById('endpoint-result').textContent = `ERROR: ${error.message}`;
  }
}

async function testRefreshToken() {
  addLog('INFO', 'Testing POST /auth/refresh endpoint...');
  
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    addLog('ERROR', 'No refresh token found. Please login first.');
    document.getElementById('endpoint-result').textContent = 'ERROR: No refresh token';
    return;
  }
  
  try {
    const response = await fetch('/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      addLog('SUCCESS', 'Token refresh succeeded');
      
      // Update tokens if new ones were provided
      if (data.data && data.data.accessToken) {
        localStorage.setItem('accessToken', data.data.accessToken);
        addLog('INFO', 'Access token updated');
      }
      if (data.data && data.data.refreshToken) {
        localStorage.setItem('refreshToken', data.data.refreshToken);
        addLog('INFO', 'Refresh token updated');
      }
      
      document.getElementById('endpoint-result').textContent = JSON.stringify(data, null, 2);
    } else {
      addLog('ERROR', `Token refresh failed: ${response.status}`);
      document.getElementById('endpoint-result').textContent = JSON.stringify(data, null, 2);
    }
  } catch (error) {
    addLog('ERROR', `Token refresh error: ${error.message}`);
    document.getElementById('endpoint-result').textContent = `ERROR: ${error.message}`;
  }
}

// ===========================
// INITIALIZATION
// ===========================

document.addEventListener('DOMContentLoaded', () => {
  addLog('INFO', 'OAuth Testing Dashboard initialized');
  
  // Display user info if logged in
  displayUserInfo();
  
  // Check if we just completed an OAuth flow
  const testingProvider = localStorage.getItem('testing-provider');
  if (testingProvider && localStorage.getItem('accessToken')) {
    addLog('SUCCESS', `${testingProvider} OAuth flow completed successfully`);
  }
});
