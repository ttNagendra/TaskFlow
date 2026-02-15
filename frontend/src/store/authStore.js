import { create } from 'zustand';
import api from '../services/api';

export const useAuthStore = create((set) => ({
    token: localStorage.getItem('taskflow_token') || null,
    user: JSON.parse(localStorage.getItem('taskflow_user') || 'null'),

    login: async (email, password) => {
        const { data } = await api.post('/api/auth/login', { email, password });
        localStorage.setItem('taskflow_token', data.token);
        localStorage.setItem('taskflow_user', JSON.stringify(data.user));
        set({ token: data.token, user: data.user });
        return data;
    },

    signup: async (name, email, password) => {
        const { data } = await api.post('/api/auth/signup', { name, email, password });
        localStorage.setItem('taskflow_token', data.token);
        localStorage.setItem('taskflow_user', JSON.stringify(data.user));
        set({ token: data.token, user: data.user });
        return data;
    },

    logout: () => {
        localStorage.removeItem('taskflow_token');
        localStorage.removeItem('taskflow_user');
        set({ token: null, user: null });
    },
}));
