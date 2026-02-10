// Helper function
async function call(path, options) {
  try {
    const r = await fetch(path, options);
    const t = await r.text();
    try {
      return JSON.stringify(JSON.parse(t), null, 2);
    } catch (e) {
      return t;
    }
  } catch (e) {
    return "ERROR: " + e.message;
  }
}

// Check if user is logged in
function checkAuth() {
  let token, userName, userEmail;
  
  // Try new unified key first
  try {
    const authData = localStorage.getItem('sapalens_auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      token = parsed.accessToken;
      userName = parsed.name;
      userEmail = parsed.email;
    }
  } catch (e) {
    // Fall back to individual keys
  }
  
  // Fall back to individual keys if unified key not found
  if (!token) {
    token = localStorage.getItem('accessToken');
    userName = localStorage.getItem('userName');
    userEmail = localStorage.getItem('userEmail');
  }
  
  if (token && userName) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('user-info').style.display = 'block';
    document.getElementById('user-name').textContent = `${userName} (${userEmail})`;
  } else {
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('user-info').style.display = 'none';
  }
}

// OAuth login buttons
document.getElementById('btn-google').onclick = () => {
  window.location.href = '/auth/google';
};

document.getElementById('btn-github').onclick = () => {
  window.location.href = '/auth/github';
};

document.getElementById('btn-facebook').onclick = () => {
  window.location.href = '/auth/facebook';
};

// Logout
document.getElementById('btn-logout').onclick = () => {
  localStorage.clear();
  window.location.reload();
};

// Health check
document.getElementById("btn-health").onclick = async () => {
  document.getElementById("health-res").textContent = "...";
  document.getElementById("health-res").textContent = await call("/health");
};

// Protected /me endpoint
document.getElementById("btn-me").onclick = async () => {
  let token;
  
  // Try new unified key first
  try {
    const authData = localStorage.getItem('sapalens_auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      token = parsed.accessToken;
    }
  } catch (e) {
    // Fall back to old key
  }
  
  // Fall back to old key
  if (!token) {
    token = localStorage.getItem('accessToken');
  }
  
  document.getElementById("me-res").textContent = "...";
  document.getElementById("me-res").textContent = await call("/me", {
    headers: {
      "Authorization": token ? `Bearer ${token}` : ""
    }
  });
};

// Webhook
document.getElementById("btn-webhook").onclick = async () => {
  const p = document.getElementById("idpProvider").value;
  const u = document.getElementById("idpUserId").value;
  document.getElementById("webhook-res").textContent = "...";
  document.getElementById("webhook-res").textContent = await call("/platform/auth/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idpProvider: p, idpUserId: u })
  });
};

// Initialize
checkAuth();
