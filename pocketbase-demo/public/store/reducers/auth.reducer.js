/**
 * Auth Reducer - Handles authentication state mutations
 * Pure function: (state, action) => newState
 */

import * as types from '../action-types.js';

// Initial state
export const initialAuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastLogin: null
};

/**
 * Auth reducer
 * @param {Object} state - Current auth state
 * @param {Object} action - Action object with type and payload
 * @returns {Object} New auth state
 */
export function authReducer(state = initialAuthState, action) {
  switch (action.type) {
    // Login flow
    case types.AUTH_LOGIN:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        lastLogin: action.meta?.timestamp || Date.now()
      };

    // Logout
    case types.AUTH_LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };

    // Registration (similar to login)
    case types.AUTH_REGISTER:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        lastLogin: action.meta?.timestamp || Date.now()
      };

    // Update user profile
    case types.AUTH_UPDATE:
      return {
        ...state,
        user: action.payload.user,
        error: null
      };

    // Check auth status
    case types.AUTH_CHECK:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: !!action.payload.user,
        isLoading: false
      };

    // Auth error
    case types.AUTH_ERROR:
      return {
        ...state,
        isLoading: false,
        error: action.payload.error || action.payload.message
      };

    // Loading states for async actions
    case `${types.AUTH_LOGIN}_START`:
    case `${types.AUTH_REGISTER}_START`:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case `${types.AUTH_LOGIN}_FAILURE`:
    case `${types.AUTH_REGISTER}_FAILURE`:
      return {
        ...state,
        isLoading: false,
        error: action.payload.error
      };

    default:
      return state;
  }
}

export default authReducer;

