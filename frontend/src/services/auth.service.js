import api from './api';

const authService = {
  login: async (username, password, role) => {
    const { data } = await api.post('/auth/login', { username, password, role });
    return data;
  },

  getMe: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },
};

export default authService;
