import React, { createContext, useContext, useEffect, useState } from 'react';
import accessControlService from '../services/accessControl.service';

const AuthContext = createContext(null);
const DEALER_USERS_KEY = 'bsc_demo_dealer_users';
const ACCESS_DEALER_CREDENTIALS_KEY = 'bsc_access_dealer_credentials';
const ACCESS_MSIL_PERSONS_KEY = 'bsc_access_msil_persons';

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

const getStoredList = (key, fallback = []) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(value) ? value : fallback;
  } catch (error) {
    return fallback;
  }
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
      try {
        const response = await accessControlService.login({
          username: cleanUsername,
          password: cleanPassword,
          role: 'msil',
        });

        if (response.user) {
          return persistUser(response.user);
        }
      } catch (error) {
        if (error.response?.status !== 401 && error.response?.status !== 400) {
          console.error('MSIL backend login failed:', error);
        }
      }

      const msilPersons = getStoredList(ACCESS_MSIL_PERSONS_KEY);
      const msilUser = msilPersons.find((person) => {
        const loginIds = [
          person.name,
          person.mailId,
          person.email,
        ].map((value) => String(value || '').trim().toLowerCase());

        return loginIds.includes(cleanUsername.toLowerCase());
      });

      if (msilUser) {
        const expectedPassword = String(msilUser.password || '1234').trim();
        if (cleanPassword !== expectedPassword) {
          throw new Error('Invalid MSIL password.');
        }

        return persistUser({
          role: 'msil',
          name: msilUser.name || cleanUsername,
          dealerName: msilUser.name || cleanUsername,
          dealerCode: msilUser.id || msilUser.code || 'MSIL',
          mailId: msilUser.mailId || '',
        });
      }

      throw new Error('MSIL login not found. Ask admin to create MSIL access credentials.');
    }

    try {
      const response = await accessControlService.login({
        username: cleanUsername,
        password: cleanPassword,
        role: 'dealer',
      });

      if (response.user) {
        return persistUser(response.user);
      }
    } catch (error) {
      if (error.response?.status !== 401 && error.response?.status !== 400) {
        console.error('Dealer backend login failed:', error);
      }
    }

    const accessDealer = getStoredList(ACCESS_DEALER_CREDENTIALS_KEY).find((dealer) => {
      const loginIds = [
        dealer.dealerCode,
        dealer.mailId,
      ].map((value) => String(value || '').trim().toLowerCase());

      return loginIds.includes(cleanUsername.toLowerCase());
    });

    if (accessDealer) {
      if (String(accessDealer.password || '').trim() !== cleanPassword) {
        throw new Error('Invalid dealer password.');
      }

      return persistUser({
        role: 'dealer',
        name: accessDealer.dealerName || accessDealer.dealerCode,
        dealerName: accessDealer.dealerName || accessDealer.dealerCode,
        dealerCode: accessDealer.dealerCode,
        mailId: accessDealer.mailId,
        zone: accessDealer.zone,
        region: accessDealer.region,
        msilPersons: accessDealer.msilPersons || [],
      });
    }

    const dealerUsers = getDealerUsers();
    const dealerUser = dealerUsers[cleanUsername];

    if (!dealerUser || dealerUser.password !== cleanPassword) {
      throw new Error('Dealer login not found. Ask admin to create access credentials.');
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
