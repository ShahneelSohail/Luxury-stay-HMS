import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

// Decode JWT payload without a library
function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const payload = decodeToken(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

function initAuth() {
  const token = localStorage.getItem('ls_token');
  const user  = localStorage.getItem('ls_user');
  if (token && user && !isTokenExpired(token)) {
    return { token, user: JSON.parse(user) };
  }
  localStorage.removeItem('ls_token');
  localStorage.removeItem('ls_user');
  return { token: null, user: null };
}

export function AuthProvider({ children }) {
  const initial = initAuth();
  const [token, setToken] = useState(initial.token);
  const [user,  setUser]  = useState(initial.user);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    const { token: newToken, user: newUser } = data.data;
    localStorage.setItem('ls_token', newToken);
    localStorage.setItem('ls_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/api/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem('ls_token');
    localStorage.removeItem('ls_user');
    setToken(null);
    setUser(null);
  }, []);

  // Refresh user profile from server (call after updateMe)
  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/api/auth/me');
    const updated = data.data.user;
    localStorage.setItem('ls_user', JSON.stringify(updated));
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
