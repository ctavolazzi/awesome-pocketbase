/**
 * Auth Action Creators
 * High-level actions for authentication flows
 */

import { createAction, createAsyncAction } from '../action-system.js';
import * as types from '../action-types.js';

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

      const user = await dataService.authWithPassword(email, password);
      
      dispatch(createAction(types.AUTH_LOGIN, { user }));
      
      return user;
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
export const register = (email, password, passwordConfirm) => createAsyncAction(
  async (dispatch, getState) => {
    dispatch(createAction(`${types.AUTH_REGISTER}_START`));
    
    try {
      const dataService = window.__dataService__;
      if (!dataService) {
        throw new Error('DataService not available');
      }

      const user = await dataService.createUser(email, password, passwordConfirm);
      
      dispatch(createAction(types.AUTH_REGISTER, { user }));
      
      return user;
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
export const checkAuth = (user) => createAction(types.AUTH_CHECK, { user });

