/**
 * Global Dispatcher - Central action dispatch system
 * Wires stores, reducers, and middleware together
 */

import { ActionDispatcher } from './action-system.js';
import { loggerMiddleware } from '../middleware/logger.middleware.js';
import { asyncMiddleware } from '../middleware/async.middleware.js';
import { validationMiddleware } from '../middleware/validation.middleware.js';
import { errorMiddleware } from '../middleware/error.middleware.js';
import { analyticsMiddleware } from '../middleware/analytics.middleware.js';

// Import stores (will be initialized in app.js)
import { authStore, feedStore, commentsStore, uiStore, aiStore } from './index.js';

// Import reducers
import { authReducer } from './reducers/auth.reducer.js';
import { feedReducer } from './reducers/feed.reducer.js';

/**
 * Create and configure the global dispatcher
 */
export const dispatcher = new ActionDispatcher({
  enableLogging: true, // Enable in development
  enableValidation: true,
  enableHistory: true,
  historyLimit: 100
});

/**
 * Initialize dispatcher with middleware
 */
function setupMiddleware() {
  dispatcher
    .use(loggerMiddleware)
    .use(asyncMiddleware)
    .use(validationMiddleware)
    .use(errorMiddleware)
    .use(analyticsMiddleware);
}

/**
 * Register stores and their reducers
 */
function registerStores() {
  // Auth store
  dispatcher.registerStore('auth', authStore);
  dispatcher.registerReducer('auth', authReducer);

  // Feed store
  dispatcher.registerStore('feed', feedStore);
  dispatcher.registerReducer('feed', feedReducer);

  // Other stores (no reducers yet, but registered for future)
  dispatcher.registerStore('comments', commentsStore);
  dispatcher.registerStore('ui', uiStore);
  dispatcher.registerStore('ai', aiStore);
}

/**
 * Initialize the dispatcher system
 * Call this once on app startup
 */
export function initDispatcher() {
  setupMiddleware();
  registerStores();
  
  console.log('[Dispatcher] Initialized with stores:', {
    auth: authStore.name,
    feed: feedStore.name,
    comments: commentsStore.name,
    ui: uiStore.name,
    ai: aiStore.name
  });

  return dispatcher;
}

/**
 * Helper: Dispatch an action
 * Convenience wrapper for dispatcher.dispatch()
 */
export function dispatch(action) {
  return dispatcher.dispatch(action);
}

/**
 * Helper: Get current state
 */
export function getState() {
  return dispatcher.getState();
}

/**
 * Helper: Get action history
 */
export function getHistory(filter) {
  return dispatcher.getHistory(filter);
}

/**
 * Helper: Export state for debugging
 */
export function exportState() {
  return dispatcher.exportState();
}

/**
 * Helper: Time-travel debugging
 */
export function rewindTo(index) {
  return dispatcher.rewindTo(index);
}

// Auto-initialize if not in test environment
if (typeof window !== 'undefined' && !window.__TEST_MODE__) {
  // Delay init until stores are created
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initDispatcher, 0);
    });
  } else {
    setTimeout(initDispatcher, 0);
  }
}

export default dispatcher;

