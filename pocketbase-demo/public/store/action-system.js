/**
 * Action System - Redux-inspired action dispatcher with middleware support
 *
 * Core Features:
 * - Centralized action dispatch
 * - Middleware pipeline
 * - Action history tracking
 * - Time-travel debugging
 * - Action validation
 */

import { isValidActionType, getActionGroup } from './action-types.js';

/**
 * ActionDispatcher - Central action dispatch system
 */
export class ActionDispatcher {
  constructor(options = {}) {
    this.middleware = [];
    this.reducers = new Map();
    this.stores = new Map();
    this.history = [];
    this.historyLimit = options.historyLimit || 100;
    this.enableHistory = options.enableHistory !== false;
    this.enableValidation = options.enableValidation !== false;
    this.enableLogging = options.enableLogging || false;

    // Time-travel state
    this.currentHistoryIndex = -1;
    this.isReplaying = false;
  }

  /**
   * Add middleware to the pipeline
   * Middleware signature: ({ dispatch, getState }) => next => action => next(action)
   */
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middleware.push(middleware);
    return this;
  }

  /**
   * Register a reducer for a specific store
   */
  registerReducer(storeName, reducer) {
    if (typeof reducer !== 'function') {
      throw new Error('Reducer must be a function');
    }
    this.reducers.set(storeName, reducer);
    return this;
  }

  /**
   * Register a store instance
   */
  registerStore(storeName, store) {
    this.stores.set(storeName, store);
    return this;
  }

  /**
   * Get state from all stores
   */
  getState() {
    const state = {};
    this.stores.forEach((store, name) => {
      state[name] = store.getState();
    });
    return state;
  }

  /**
   * Dispatch an action through the middleware pipeline
   */
  dispatch(action) {
    // Build middleware chain
    const middlewareAPI = {
      dispatch: (a) => this.dispatch(a),
      getState: () => this.getState()
    };

    // Create the chain: middleware[0](middleware[1](...(dispatch)))
    const chain = this.middleware.map(mw => mw(middlewareAPI));
    const composedDispatch = this._compose(...chain)(this._baseDispatch.bind(this));

    // Execute the action through the chain
    // Middleware (like async) can transform functions/promises before validation
    return composedDispatch(action);
  }

  /**
   * Base dispatch - applies action to reducers and updates stores
   */
  _baseDispatch(action) {
    // Validate action after middleware transforms
    if (this.enableValidation) {
      this._validateAction(action);
    }

    // Don't record actions during replay
    if (!this.isReplaying && this.enableHistory) {
      this._recordAction(action);
    }

    if (this.enableLogging) {
      console.group(`[Action] ${action.type}`);
      console.log('Payload:', action.payload);
      console.log('Meta:', action.meta);
    }

    const prevState = this.getState();
    const startTime = performance.now();

    // Apply action to each registered reducer
    this.reducers.forEach((reducer, storeName) => {
      const store = this.stores.get(storeName);
      if (!store) return;

      const currentState = store.getState();
      const newState = reducer(currentState, action);

      // Only update if state changed
      if (newState !== currentState) {
        // Use replaceState if available, otherwise batch update all keys
        if (typeof store.replaceState === 'function') {
          store.replaceState(newState);
        } else {
          // Batch update all top-level keys
          const updates = {};
          Object.keys(newState).forEach(key => {
            updates[key] = newState[key];
          });
          store.batchUpdate(updates);
        }
      }
    });

    const duration = performance.now() - startTime;

    if (this.enableLogging) {
      console.log('Prev State:', prevState);
      console.log('Next State:', this.getState());
      console.log(`Duration: ${duration.toFixed(2)}ms`);
      console.groupEnd();
    }

    return action;
  }

  /**
   * Compose middleware functions
   */
  _compose(...funcs) {
    if (funcs.length === 0) {
      return arg => arg;
    }
    if (funcs.length === 1) {
      return funcs[0];
    }
    return funcs.reduce((a, b) => (...args) => a(b(...args)));
  }

  /**
   * Validate action structure
   */
  _validateAction(action) {
    if (!action || typeof action !== 'object') {
      throw new Error('Action must be an object');
    }

    if (typeof action.type !== 'string') {
      throw new Error('Action must have a string type property');
    }

    if (!isValidActionType(action.type)) {
      console.warn(`Unknown action type: ${action.type}`);
    }

    return true;
  }

  /**
   * Record action in history
   */
  _recordAction(action) {
    const historyEntry = {
      action,
      timestamp: Date.now(),
      state: this.getState()
    };

    this.history.push(historyEntry);
    this.currentHistoryIndex = this.history.length - 1;

    // Limit history size
    if (this.history.length > this.historyLimit) {
      this.history.shift();
      this.currentHistoryIndex--;
    }
  }

  /**
   * Get action history
   */
  getHistory(filter = {}) {
    let filtered = this.history;

    if (filter.type) {
      filtered = filtered.filter(h => h.action.type === filter.type);
    }

    if (filter.group) {
      filtered = filtered.filter(h => getActionGroup(h.action.type) === filter.group);
    }

    if (filter.since) {
      filtered = filtered.filter(h => h.timestamp >= filter.since);
    }

    if (filter.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  /**
   * Clear action history
   */
  clearHistory() {
    this.history = [];
    this.currentHistoryIndex = -1;
    return this;
  }

  /**
   * Replay a sequence of actions
   */
  replayActions(actions) {
    this.isReplaying = true;

    try {
      actions.forEach(action => {
        this.dispatch(action);
      });
    } finally {
      this.isReplaying = false;
    }

    return this;
  }

  /**
   * Time-travel: rewind to a specific history index
   */
  rewindTo(index) {
    if (index < 0 || index >= this.history.length) {
      throw new Error(`Invalid history index: ${index}`);
    }

    // Reset all stores to initial state
    this.stores.forEach(store => store.reset());

    // Replay actions up to the target index
    const actionsToReplay = this.history
      .slice(0, index + 1)
      .map(h => h.action);

    this.replayActions(actionsToReplay);
    this.currentHistoryIndex = index;

    return this;
  }

  /**
   * Time-travel: move forward one action
   */
  forward() {
    if (this.currentHistoryIndex < this.history.length - 1) {
      this.rewindTo(this.currentHistoryIndex + 1);
    }
    return this;
  }

  /**
   * Time-travel: move backward one action
   */
  backward() {
    if (this.currentHistoryIndex > 0) {
      this.rewindTo(this.currentHistoryIndex - 1);
    }
    return this;
  }

  /**
   * Export current state for debugging
   */
  exportState() {
    return {
      state: this.getState(),
      history: this.history,
      currentIndex: this.currentHistoryIndex,
      timestamp: Date.now()
    };
  }

  /**
   * Import state for debugging/testing
   */
  importState(exported) {
    this.clearHistory();

    // Reset all stores
    this.stores.forEach(store => store.reset());

    // Restore history without replaying (to preserve exact state)
    if (exported.history) {
      this.history = exported.history.map(h => ({...h})); // Deep copy
      this.currentHistoryIndex = exported.currentIndex !== undefined ? exported.currentIndex : this.history.length - 1;
    }

    return this;
  }
}

/**
 * Create an action with standard structure
 */
export function createAction(type, payload = {}, meta = {}) {
  return {
    type,
    payload,
    meta: {
      timestamp: Date.now(),
      ...meta
    }
  };
}

/**
 * Create async action creator (thunk)
 */
export function createAsyncAction(asyncFn) {
  return (dispatch, getState) => {
    return asyncFn(dispatch, getState);
  };
}

/**
 * Combine multiple reducers into one
 */
export function combineReducers(reducers) {
  return (state = {}, action) => {
    const nextState = {};
    let hasChanged = false;

    Object.keys(reducers).forEach(key => {
      const reducer = reducers[key];
      const previousStateForKey = state[key];
      const nextStateForKey = reducer(previousStateForKey, action);
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    });

    return hasChanged ? nextState : state;
  };
}

