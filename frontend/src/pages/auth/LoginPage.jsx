import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import marutiLogo from '../../assets/maruti-logoo.png';
import poweredByDeLogo from '../../assets/Powered By DE black.png';
import './LoginPage.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role) {
      navigate(`/${user.role}/dashboard`, { replace: true });
    }
  }, [navigate, user?.role]);

  const handleLogin = async (role) => {
    if (!username.trim() || !password.trim()) {
      toast.error('Please enter username and password');
      return;
    }
    setLoading(true);
    try {
      const user = await login(username, password, role);
      toast.success(`Welcome back!`);
      navigate(`/${user.role}/dashboard`, { replace: true });
    } catch (err) {
      toast.error(err?.message || err?.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Header Navbar */}
      <nav className="login-navbar">
        <div className="login-navbar__logo">
          <img className="login-navbar__logo-img" src={marutiLogo} alt="Maruti Suzuki" />
        </div>
        <div className="login-navbar__right">
          <img className="login-navbar__powered-logo" src={poweredByDeLogo} alt="Powered by DE" />
          <button className="login-navbar__icon-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <button className="login-navbar__icon-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="5" r="1" fill="currentColor" />
              <circle cx="12" cy="12" r="1" fill="currentColor" />
              <circle cx="12" cy="19" r="1" fill="currentColor" />
            </svg>
          </button>
          <div className="login-navbar__user">
            <div className="login-navbar__avatar">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2zm0 12c5.33 0 8 2.67 8 4v2H4v-2c0-1.33 2.67-4 8-4z" />
              </svg>
            </div>
            <div className="login-navbar__user-info">
              <span className="login-navbar__user-name">Please login</span>
              <span className="login-navbar__user-code">Select your role</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="login-content">
        {/* Left Illustration */}
        <div className="login-illustration">
          <div className="illustration-wrapper">
            {/* Clock icon */}
            <div className="float-elem float-clock">
              <svg viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="30" r="28" fill="#7C83FD" stroke="white" strokeWidth="2" />
                <path d="M30 16v14l8 8" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            {/* Document icon top-left */}
            <div className="float-elem float-doc1">
              <svg viewBox="0 0 50 60" fill="none">
                <rect x="4" y="4" width="42" height="52" rx="4" fill="#e8eaff" stroke="#7C83FD" strokeWidth="1.5" />
                <rect x="10" y="16" width="22" height="3" rx="1.5" fill="#7C83FD" opacity="0.6" />
                <rect x="10" y="23" width="30" height="3" rx="1.5" fill="#7C83FD" opacity="0.4" />
                <rect x="10" y="30" width="26" height="3" rx="1.5" fill="#7C83FD" opacity="0.4" />
                <path d="M10 10 L14 6" stroke="#7C83FD" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            {/* User avatar bubble */}
            <div className="float-elem float-user1">
              <svg viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="30" r="28" fill="#4F46E5" />
                <circle cx="30" cy="22" r="10" fill="white" opacity="0.9" />
                <path d="M10 50c0-11 9-18 20-18s20 7 20 18" fill="white" opacity="0.9" />
              </svg>
            </div>
            {/* Wave/chat bubble */}
            <div className="float-elem float-wave">
              <svg viewBox="0 0 80 50" fill="none">
                <rect x="2" y="2" width="76" height="46" rx="12" fill="#e8eaff" stroke="#7C83FD" strokeWidth="1.5" />
                <path d="M16 20 Q40 14 64 20" stroke="#7C83FD" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M20 30 Q40 24 60 30" stroke="#7C83FD" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            {/* Chat bubble blue */}
            <div className="float-elem float-chat">
              <svg viewBox="0 0 80 55" fill="none">
                <rect x="2" y="2" width="76" height="44" rx="12" fill="#2563EB" />
                <circle cx="24" cy="24" r="5" fill="white" />
                <circle cx="40" cy="24" r="5" fill="white" />
                <circle cx="56" cy="24" r="5" fill="white" />
                <path d="M20 46 L12 55 L32 46" fill="#2563EB" />
              </svg>
            </div>
            {/* Checklist card */}
            <div className="float-elem float-checklist">
              <svg viewBox="0 0 120 100" fill="none">
                <rect x="2" y="2" width="116" height="96" rx="12" fill="#c7d2fe" opacity="0.8" />
                <rect x="14" y="16" width="16" height="16" rx="4" fill="#4F46E5" />
                <polyline points="17,24 21,28 28,18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                <rect x="36" y="18" width="68" height="4" rx="2" fill="#6366f1" opacity="0.5" />
                <rect x="36" y="26" width="50" height="4" rx="2" fill="#6366f1" opacity="0.3" />
                <rect x="14" y="44" width="16" height="16" rx="4" fill="#4F46E5" opacity="0.7" />
                <polyline points="17,52 21,56 28,46" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                <rect x="36" y="46" width="68" height="4" rx="2" fill="#6366f1" opacity="0.5" />
                <rect x="36" y="54" width="50" height="4" rx="2" fill="#6366f1" opacity="0.3" />
                <circle cx="100" cy="76" r="14" fill="#4F46E5" />
                <circle cx="100" cy="70" r="5" fill="white" opacity="0.9" />
                <path d="M90 84c0-5.5 4.5-9 10-9s10 3.5 10 9" fill="white" opacity="0.9" />
              </svg>
            </div>
            {/* Data terminal */}
            <div className="float-elem float-terminal">
              <svg viewBox="0 0 100 70" fill="none">
                <rect x="2" y="2" width="96" height="66" rx="8" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1.5" />
                <rect x="10" y="18" width="60" height="10" rx="4" fill="#3b82f6" opacity="0.3" />
                <rect x="10" y="34" width="50" height="10" rx="4" fill="#3b82f6" opacity="0.2" />
                <rect x="10" y="50" width="70" height="10" rx="4" fill="#3b82f6" opacity="0.15" />
                <circle cx="80" cy="40" r="14" fill="#f59e0b" opacity="0.9" />
                <polygon points="77,34 87,40 77,46" fill="white" />
              </svg>
            </div>
            {/* Person sitting at desk (main illustration) */}
            <div className="illustration-person">
              <svg viewBox="0 0 340 280" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Desk */}
                <rect x="20" y="240" width="300" height="6" rx="3" fill="#1e293b" />
                {/* Laptop base */}
                <rect x="100" y="190" width="140" height="52" rx="6" fill="#2563EB" />
                <rect x="108" y="196" width="124" height="38" rx="4" fill="#1d4ed8" />
                <ellipse cx="170" cy="230" rx="10" ry="4" fill="#e2e8f0" opacity="0.4" />
                {/* Screen glow */}
                <rect x="112" y="200" width="116" height="30" rx="3" fill="#eff6ff" opacity="0.15" />
                {/* Person body */}
                <ellipse cx="170" cy="130" rx="26" ry="26" fill="#fbbf24" />
                {/* Hair */}
                <ellipse cx="170" cy="112" rx="22" ry="16" fill="#1e293b" />
                <rect x="148" y="104" width="44" height="12" rx="6" fill="#1e293b" />
                {/* Shirt - blue */}
                <path d="M130 240 C130 190 144 178 170 174 C196 178 210 190 210 240Z" fill="#2563EB" />
                {/* Arms */}
                <path d="M144 195 C135 205 128 215 120 220" stroke="#fbbf24" strokeWidth="14" strokeLinecap="round" />
                <path d="M196 195 C205 205 212 215 220 220" stroke="#fbbf24" strokeWidth="14" strokeLinecap="round" />
                {/* Coffee mug */}
                <rect x="218" y="222" width="22" height="18" rx="4" fill="#475569" />
                <path d="M240 226 Q248 226 248 234 Q248 242 240 242" stroke="#475569" strokeWidth="3" fill="none" strokeLinecap="round" />
                <rect x="221" y="216" width="16" height="6" rx="2" fill="#94a3b8" opacity="0.5" />
                {/* Ground line */}
                <rect x="0" y="246" width="340" height="2" rx="1" fill="#cbd5e1" />
              </svg>
            </div>
            {/* Floating dots */}
            <div className="float-dots">
              <svg viewBox="0 0 80 20" fill="none">
                <circle cx="10" cy="10" r="4" fill="#7C83FD" />
                <circle cx="26" cy="10" r="4" fill="#7C83FD" opacity="0.7" />
                <circle cx="42" cy="10" r="4" fill="#7C83FD" opacity="0.4" />
                <circle cx="58" cy="10" r="4" fill="#7C83FD" opacity="0.2" />
              </svg>
            </div>
          </div>
        </div>

        {/* Right Login Card */}
        <div className="login-card-wrapper">
          <div className="login-card">
            <h2 className="login-card__welcome">Welcome back!</h2>
            <h1 className="login-card__title">Balance Score Card Portal</h1>
            <div className="login-card__divider" />

            <div className="login-card__field">
              <label className="login-card__label">Username/mail id</label>
              <input
                type="text"
                className="login-card__input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder=""
                autoComplete="username"
              />
            </div>

            <div className="login-card__field">
              <label className="login-card__label">Password</label>
              <input
                type="password"
                className="login-card__input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                autoComplete="current-password"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin('dealer')}
              />
            </div>

            {/* Black button = Dealer login */}
            <button
              className="login-card__btn login-card__btn--dealer"
              onClick={() => handleLogin('dealer')}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Dealer Login'}
            </button>

            <div className="login-card__or">
              <span>OR</span>
            </div>

            {/* Blue button = MSIL login */}
            <button
              className="login-card__btn login-card__btn--msil"
              onClick={() => handleLogin('msil')}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'MSIL Login'}
            </button>

            {/* Admin link */}
            <div className="login-card__admin-link">
              <button
                className="login-card__btn--admin-text"
                onClick={() => handleLogin('admin')}
                disabled={loading}
              >
                Admin Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
