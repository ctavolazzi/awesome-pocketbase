/**
 * Error Middleware - Catches and handles errors in actions
 * Provides centralized error handling and recovery
 */

import * as ActionTypes from '../store/action-types.js';

/**
 * Create error middleware with custom error handlers
 */
export function createErrorMiddleware(options = {}) {
  const {
    onError = null, // Custom error handler
    logErrors = true,
    showToasts = true,
    recover = true // Try to recover from errors
  } = options;

  return ({ dispatch }) => next => action => {
    try {
      return next(action);
    } catch (error) {
      // Log error
      if (logErrors) {
        console.error(`Error in action ${action.type}:`, error);
        console.error('Action:', action);
        console.error('Stack:', error.stack);
      }

      // Dispatch error action
      dispatch({
        type: ActionTypes.SYSTEM_ERROR,
        payload: {
          error: error.message,
          actionType: action.type,
          originalAction: action
        },
        error: true,
        meta: { timestamp: Date.now() }
      });

      // Show toast if enabled
      if (showToasts) {
        dispatch({
          type: ActionTypes.UI_TOAST_SHOW,
          payload: {
            message: `Error: ${error.message}`,
            type: 'error'
          }
        });
      }

      // Call custom error handler
      if (onError) {
        onError(error, action);
      }

      // Don't throw the error if recovery is enabled
      if (!recover) {
        throw error;
      }

      return null;
    }
  };
}

/**
 * Default error middleware
 */
export const errorMiddleware = createErrorMiddleware();

