import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);
const DEALER_USERS_KEY = 'bsc_demo_dealer_users';

const getDealerUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(DEALER_USERS_KEY) || '{}');
  } catch (error) {
    return {};
  }
};

const saveDealerUsers = (users) => {
  localStorage.setItem(DEALER_USERS_KEY, JSON.stringify(users));
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('bsc_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const persistUser = (nextUser) => {
    localStorage.setItem('bsc_token', `demo-token-${nextUser.role}`);
    localStorage.setItem('bsc_user', JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  };

  const login = async (username, password, requestedRole) => {
    const cleanUsername = String(username || '').trim();
    const cleanPassword = String(password || '').trim();

    if (requestedRole === 'admin') {
      if (cleanUsername !== 'admin' || cleanPassword !== 'admin') {
        throw new Error('Use admin / admin for admin login.');
      }
      return persistUser({ role: 'admin', name: 'Admin', dealerName: 'Admin', dealerCode: 'ADMIN' });
    }

    if (requestedRole === 'msil') {
      if (cleanUsername !== 'msil' || !['msil', '1234'].includes(cleanPassword)) {
        throw new Error('Use msil / msil or msil / 1234 for MSIL login.');
      }
      return persistUser({ role: 'msil', name: 'MSIL User', dealerName: 'MSIL User', dealerCode: 'MSIL' });
    }

    const dealerUsers = getDealerUsers();
    const dealerUser = dealerUsers[cleanUsername];

    if (!dealerUser || dealerUser.password !== cleanPassword) {
      throw new Error('Dealer login not found. Sign up with dealer code and password 1234 first.');
    }

    return persistUser({
      role: 'dealer',
      name: dealerUser.dealerName || `Dealer ${cleanUsername}`,
      dealerName: dealerUser.dealerName || `Dealer ${cleanUsername}`,
      dealerCode: cleanUsername,
    });
  };

  const signupDealer = async (dealerCode, password = '1234') => {
    const cleanDealerCode = String(dealerCode || '').trim();
    const cleanPassword = String(password || '').trim() || '1234';

    if (!cleanDealerCode) {
      throw new Error('Enter dealer code as username.');
    }

    if (cleanPassword !== '1234') {
      throw new Error('For demo, dealer password must be 1234.');
    }

    const dealerUsers = getDealerUsers();
    dealerUsers[cleanDealerCode] = {
      username: cleanDealerCode,
      password: cleanPassword,
      dealerName: `Dealer ${cleanDealerCode}`,
    };
    saveDealerUsers(dealerUsers);

    return dealerUsers[cleanDealerCode];
  };

  const logout = () => {
    localStorage.removeItem('bsc_token');
    localStorage.removeItem('bsc_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signupDealer, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
