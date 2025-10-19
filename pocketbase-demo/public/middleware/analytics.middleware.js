/**
 * Analytics Middleware - Tracks user actions for analytics
 */

import { getActionGroup } from '../store/action-types.js';

/**
 * Create analytics middleware
 */
export function createAnalyticsMiddleware(options = {}) {
  const {
    trackingFn = null, // Custom tracking function
    includePayload = false,
    excludeActions = [], // Action types to exclude from tracking
    samplingRate = 1.0 // Sample rate (0-1)
  } = options;

  return () => next => action => {
    // Check if action should be tracked
    const shouldTrack = (
      !excludeActions.includes(action.type) &&
      Math.random() < samplingRate
    );

    if (shouldTrack) {
      const event = {
        type: action.type,
        group: getActionGroup(action.type),
        timestamp: Date.now()
      };

      if (includePayload) {
        event.payload = action.payload;
      }

      // Use custom tracking function or default console.log
      if (trackingFn) {
        trackingFn(event);
      } else {
        // Placeholder for analytics service (e.g., Google Analytics, Mixpanel)
        console.log('[Analytics]', event);
      }
    }

    return next(action);
  };
}

/**
 * Default analytics middleware (no-op in production)
 */
export const analyticsMiddleware = createAnalyticsMiddleware({
  excludeActions: [
    'UI_LOADING_SET',
    'UI_ERROR_CLEAR'
  ]
});

