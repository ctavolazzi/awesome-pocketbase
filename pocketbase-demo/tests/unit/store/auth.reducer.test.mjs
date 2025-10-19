/**
 * Auth Reducer Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { authReducer, initialAuthState } from '../../../public/store/reducers/auth.reducer.js';
import * as types from '../../../public/store/action-types.js';

describe('Auth Reducer', () => {
  describe('Initial State', () => {
    it('returns initial state when state is undefined', () => {
      const state = authReducer(undefined, { type: '@@INIT' });

      assert.deepStrictEqual(state, initialAuthState);
      assert.strictEqual(state.isAuthenticated, false);
      assert.strictEqual(state.user, null);
    });

    it('returns current state for unknown action', () => {
      const currentState = { ...initialAuthState, user: { id: '123' } };
      const state = authReducer(currentState, { type: 'UNKNOWN_ACTION' });

      assert.deepStrictEqual(state, currentState);
    });
  });

  describe('AUTH_LOGIN', () => {
    it('sets user and authenticated state', () => {
      const user = { id: '123', email: 'test@example.com' };
      const action = {
        type: types.AUTH_LOGIN,
        payload: { user },
        meta: { timestamp: 1234567890 }
      };

      const state = authReducer(initialAuthState, action);

      assert.strictEqual(state.isAuthenticated, true);
      assert.deepStrictEqual(state.user, user);
      assert.strictEqual(state.isLoading, false);
      assert.strictEqual(state.error, null);
      assert.strictEqual(state.lastLogin, 1234567890);
    });

    it('uses current timestamp if meta.timestamp not provided', () => {
      const user = { id: '123', email: 'test@example.com' };
      const before = Date.now();

      const state = authReducer(initialAuthState, {
        type: types.AUTH_LOGIN,
        payload: { user }
      });

      const after = Date.now();

      assert.ok(state.lastLogin >= before && state.lastLogin <= after);
    });
  });

  describe('AUTH_LOGOUT', () => {
    it('clears user and auth state', () => {
      const loggedInState = {
        ...initialAuthState,
        user: { id: '123' },
        isAuthenticated: true,
        lastLogin: 1234567890
      };

      const state = authReducer(loggedInState, { type: types.AUTH_LOGOUT });

      assert.strictEqual(state.user, null);
      assert.strictEqual(state.isAuthenticated, false);
      assert.strictEqual(state.isLoading, false);
      assert.strictEqual(state.error, null);
    });
  });

  describe('AUTH_REGISTER', () => {
    it('sets user and authenticated state like login', () => {
      const user = { id: '456', email: 'newuser@example.com' };
      const action = {
        type: types.AUTH_REGISTER,
        payload: { user },
        meta: { timestamp: 9876543210 }
      };

      const state = authReducer(initialAuthState, action);

      assert.strictEqual(state.isAuthenticated, true);
      assert.deepStrictEqual(state.user, user);
      assert.strictEqual(state.lastLogin, 9876543210);
    });
  });

  describe('AUTH_UPDATE', () => {
    it('updates user profile', () => {
      const currentState = {
        ...initialAuthState,
        user: { id: '123', email: 'old@example.com' },
        isAuthenticated: true
      };

      const updatedUser = { id: '123', email: 'new@example.com', name: 'John' };
      const action = {
        type: types.AUTH_UPDATE,
        payload: { user: updatedUser }
      };

      const state = authReducer(currentState, action);

      assert.deepStrictEqual(state.user, updatedUser);
      assert.strictEqual(state.isAuthenticated, true); // Unchanged
      assert.strictEqual(state.error, null);
    });
  });

  describe('AUTH_CHECK', () => {
    it('sets authenticated state when user exists', () => {
      const user = { id: '123', email: 'test@example.com' };
      const action = {
        type: types.AUTH_CHECK,
        payload: { user }
      };

      const state = authReducer(initialAuthState, action);

      assert.strictEqual(state.isAuthenticated, true);
      assert.deepStrictEqual(state.user, user);
      assert.strictEqual(state.isLoading, false);
    });

    it('sets unauthenticated state when user is null', () => {
      const action = {
        type: types.AUTH_CHECK,
        payload: { user: null }
      };

      const state = authReducer(initialAuthState, action);

      assert.strictEqual(state.isAuthenticated, false);
      assert.strictEqual(state.user, null);
    });
  });

  describe('AUTH_ERROR', () => {
    it('sets error message', () => {
      const action = {
        type: types.AUTH_ERROR,
        payload: { error: 'Invalid credentials' }
      };

      const state = authReducer(initialAuthState, action);

      assert.strictEqual(state.error, 'Invalid credentials');
      assert.strictEqual(state.isLoading, false);
    });

    it('handles error in message field', () => {
      const action = {
        type: types.AUTH_ERROR,
        payload: { message: 'Network error' }
      };

      const state = authReducer(initialAuthState, action);

      assert.strictEqual(state.error, 'Network error');
    });
  });

  describe('Loading States', () => {
    it('sets loading state for AUTH_LOGIN_START', () => {
      const state = authReducer(initialAuthState, {
        type: `${types.AUTH_LOGIN}_START`
      });

      assert.strictEqual(state.isLoading, true);
      assert.strictEqual(state.error, null);
    });

    it('sets loading state for AUTH_REGISTER_START', () => {
      const state = authReducer(initialAuthState, {
        type: `${types.AUTH_REGISTER}_START`
      });

      assert.strictEqual(state.isLoading, true);
      assert.strictEqual(state.error, null);
    });

    it('clears loading and sets error for AUTH_LOGIN_FAILURE', () => {
      const loadingState = { ...initialAuthState, isLoading: true };
      const state = authReducer(loadingState, {
        type: `${types.AUTH_LOGIN}_FAILURE`,
        payload: { error: 'Login failed' }
      });

      assert.strictEqual(state.isLoading, false);
      assert.strictEqual(state.error, 'Login failed');
    });
  });

  describe('Immutability', () => {
    it('does not mutate original state', () => {
      const originalState = {
        ...initialAuthState,
        user: { id: '123', email: 'test@example.com' }
      };
      const stateCopy = JSON.parse(JSON.stringify(originalState));

      authReducer(originalState, {
        type: types.AUTH_LOGOUT
      });

      // Original state should be unchanged
      assert.deepStrictEqual(originalState, stateCopy);
    });

    it('returns new state object on change', () => {
      const state1 = authReducer(initialAuthState, {
        type: types.AUTH_LOGIN,
        payload: { user: { id: '123' } }
      });

      const state2 = authReducer(state1, {
        type: types.AUTH_LOGOUT
      });

      assert.notStrictEqual(state1, state2);
    });

    it('returns same reference when no change', () => {
      const state = authReducer(initialAuthState, {
        type: 'UNKNOWN_ACTION'
      });

      assert.strictEqual(state, initialAuthState);
    });
  });
});

