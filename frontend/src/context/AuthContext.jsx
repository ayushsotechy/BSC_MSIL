import React, { createContext, useContext, useState, useEffect } from 'react';
// import authService from '../services/auth.service'; // 1. Comment this out for now

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // 2. Set a default fallback user just in case
  const [user, setUser] = useState({ role: 'msil', name: 'Ayush Verma' }); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 3. Comment out the local storage check so it doesn't overwrite our fake user with null
    /*
    const storedUser = localStorage.getItem('bsc_user');
    const storedToken = localStorage.getItem('bsc_token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    */
    setLoading(false);
  }, []);

  const login = async (username, password, role) => {
    // 4. Bypass the actual backend call
    // const data = await authService.login(username, password, role);
    
    // 5. Create a fake successful response matching whichever button you clicked
    const fakeData = {
      token: 'mock-jwt-token-12345',
      user: {
        role: role,
        name: 'Ayush Verma'
      }
    };

    localStorage.setItem('bsc_token', fakeData.token);
    localStorage.setItem('bsc_user', JSON.stringify(fakeData.user));
    setUser(fakeData.user);
    
    return fakeData.user;
  };

  const logout = () => {
    localStorage.removeItem('bsc_token');
    localStorage.removeItem('bsc_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};