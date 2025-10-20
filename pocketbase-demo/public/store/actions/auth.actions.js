/**
 * Auth Action Creators
 * High-level actions for authentication flows
 */

import { createAction, createAsyncAction } from '../action-system.js';
import * as types from '../action-types.js';

function normalizeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName || user.email || '',
    bio: user.bio || '',
    avatar: user.avatar || null,
    collectionId: user.collectionId,
    collectionName: user.collectionName,
    created: user.created,
    updated: user.updated
  };
}

/**
 * Login action creator
 * Handles async login with loading/success/error states
 */
export const login = (email, password) => createAsyncAction(
  async (dispatch, getState) => {
    dispatch(createAction(`${types.AUTH_LOGIN}_START`));

    try {
      // DataService will be injected via closure or context
      const dataService = window.__dataService__;
      if (!dataService) {
        throw new Error('DataService not available');
      }

      const result = await dataService.authWithPassword(email, password);
      const userRecord = normalizeUser(result?.record || result);

      dispatch(createAction(types.AUTH_LOGIN, { user: userRecord }));

      return userRecord;
    } catch (error) {
      dispatch(createAction(types.AUTH_ERROR, {
        error: error.message || 'Login failed'
      }));
      throw error;
    }
  }
);

/**
 * Register action creator
 */
export const register = (userData) => createAsyncAction(
  async (dispatch, getState) => {
    dispatch(createAction(`${types.AUTH_REGISTER}_START`));

    try {
      const dataService = window.__dataService__;
      if (!dataService) {
        throw new Error('DataService not available');
      }

      const result = await dataService.createUser(userData);
      const userRecord = normalizeUser(result);

      dispatch(createAction(types.AUTH_REGISTER, { user: userRecord }));

      return userRecord;
    } catch (error) {
      dispatch(createAction(types.AUTH_ERROR, {
        error: error.message || 'Registration failed'
      }));
      throw error;
    }
  }
);

/**
 * Logout action creator
 */
export const logout = () => {
  // Clear auth on dataService
  if (window.__dataService__) {
    window.__dataService__.logout();
  }

  return createAction(types.AUTH_LOGOUT);
};

/**
 * Update user profile
 */
export const updateProfile = (user) => createAction(types.AUTH_UPDATE, { user });

/**
 * Check auth status (on app init)
 */
export const checkAuth = (user) => createAction(types.AUTH_CHECK, { user: normalizeUser(user) });
