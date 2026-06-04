import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import marutiLogo from '../../assets/maruti-logoo.png';
import poweredByDeLogo from '../../assets/Powered By DE black.png';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    sessionStorage.removeItem('bsc_safe_route_history');
    navigate('/login', { replace: true });
  };

  return (
    <nav className="navbar">
      <div className="navbar__brand" aria-label="Maruti Suzuki">
        <img
          className="navbar__brand-mark"
          src={marutiLogo}
          alt="Maruti Suzuki"
        />
      </div>

      <div className="navbar__right">
        <img className="navbar__powered-logo" src={poweredByDeLogo} alt="Powered by DE" />

        <button className="navbar__icon-btn" title="Notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        <button className="navbar__icon-btn navbar__menu-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>

        <div className="navbar__user" onClick={handleLogout} title="Click to logout">
          <div className="navbar__avatar">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2zm0 12c5.33 0 8 2.67 8 4v2H4v-2c0-1.33 2.67-4 8-4z" />
            </svg>
          </div>
          <div className="navbar__user-info">
            <span className="navbar__user-name">{user?.dealerName || 'Maruti ABC'}</span>
            <span className="navbar__user-code">{user?.dealerCode || '124'}</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
