(function () {
  const API_BASE_URL = window.BSC_API_BASE_URL || 'http://localhost:5001/api';
  const form = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const toastRegion = document.getElementById('toast-region');

  const dashboardByRole = {
    admin: '/vanilla/admin/',
    dealer: '/dealer/dashboard',
    msil: '/msil/dashboard',
  };

  function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type || 'info'}`;
    toast.textContent = message;
    toastRegion.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3200);
  }

  function persistUser(user) {
    localStorage.setItem('bsc_token', `demo-token-${user.role}`);
    localStorage.setItem('bsc_user', JSON.stringify(user));
  }

  async function loginWithAccessControl(username, password, role) {
    const response = await fetch(`${API_BASE_URL}/access-control/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.user) {
      throw new Error(data.message || 'Login failed. Please try again.');
    }

    return data.user;
  }

  async function login(username, password, role) {
    if (role === 'admin') {
      if (username !== 'admin' || password !== 'admin') {
        throw new Error('Use admin / admin for admin login.');
      }

      return {
        role: 'admin',
        name: 'Admin',
        dealerName: 'Admin',
        dealerCode: 'ADMIN',
      };
    }

    return loginWithAccessControl(username, password, role);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const submitter = event.submitter;
    const role = submitter?.dataset?.role || 'dealer';
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      showToast('Please enter username and password', 'error');
      return;
    }

    submitter.disabled = true;
    submitter.textContent = 'Logging in...';

    try {
      const user = await login(username, password, role);
      persistUser(user);
      showToast('Welcome back!', 'success');
      window.setTimeout(() => {
        window.location.href = dashboardByRole[user.role] || '/login';
      }, 350);
    } catch (error) {
      showToast(error.message || 'Login failed. Please try again.', 'error');
    } finally {
      submitter.disabled = false;
      submitter.textContent = submitter.dataset.role === 'admin'
        ? 'Admin Login'
        : `${submitter.dataset.role === 'msil' ? 'MSIL' : 'Dealer'} Login`;
    }
  }

  form.addEventListener('submit', handleSubmit);
})();
