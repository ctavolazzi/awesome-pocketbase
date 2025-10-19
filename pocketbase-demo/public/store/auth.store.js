// store/auth.store.js - Authentication state management
import { Store } from './store.js';

export const authStore = new Store('auth', {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
  lastLogin: null,
  sessionExpiry: null
});

// Auth events
export const AUTH_EVENTS = {
  LOGIN_REQUEST: 'auth/login/request',
  LOGIN_SUCCESS: 'auth/login/success',
  LOGIN_ERROR: 'auth/login/error',
  LOGOUT: 'auth/logout',
  SESSION_EXPIRED: 'auth/session/expired',
  USER_UPDATE: 'auth/user/update'
};

// Helper functions

export function setAuthLoading(loading = true) {
  authStore.setState('loading', loading);
}

export function setAuthUser(user, token) {
  authStore.batchUpdate({
    isAuthenticated: true,
    user,
    token,
    loading: false,
    error: null,
    lastLogin: Date.now(),
    sessionExpiry: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  });
}

export function setAuthError(error) {
  authStore.batchUpdate({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
    error: error.message || String(error)
  });
}

export function clearAuth() {
  authStore.batchUpdate({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
    error: null,
    lastLogin: null,
    sessionExpiry: null
  });
}

export function updateUser(updates) {
  const user = authStore.getState('user');
  if (user) {
    authStore.setState('user', { ...user, ...updates });
  }
}

export function isSessionValid() {
  const expiry = authStore.getState('sessionExpiry');
  return expiry && Date.now() < expiry;
}

export default authStore;

