/**
 * Logger Middleware - Logs all dispatched actions
 * Useful for debugging and development
 */

import { getActionGroup } from '../store/action-types.js';

/**
 * Create logger middleware with options
 */
export function createLoggerMiddleware(options = {}) {
  const {
    collapsed = true,
    colors = true,
    timestamp = true,
    duration = true,
    diff = false,
    filter = null // Function to filter which actions to log
  } = options;

  const colorMap = {
    AUTH: '#4CAF50',
    POST: '#2196F3',
    COMMENT: '#FF9800',
    UI: '#9C27B0',
    REALTIME: '#F44336',
    FEED: '#00BCD4',
    CATEGORY: '#8BC34A',
    STATS: '#FFC107',
    AI: '#E91E63',
    SYSTEM: '#607D8B',
    UNKNOWN: '#9E9E9E'
  };

  return ({ getState }) => next => action => {
    // Filter actions if filter function provided
    if (filter && !filter(action)) {
      return next(action);
    }

    const prevState = getState();
    const startTime = performance.now();

    const group = getActionGroup(action.type);
    const color = colors ? colorMap[group] : null;

    // Create log title
    let title = `${action.type}`;
    if (timestamp) {
      const time = new Date().toLocaleTimeString();
      title = `${time} ${title}`;
    }

    // Start logging group
    if (collapsed) {
      console.groupCollapsed(`%c${title}`, `color: ${color}; font-weight: bold`);
    } else {
      console.group(`%c${title}`, `color: ${color}; font-weight: bold`);
    }

    console.log('%cAction', 'color: #03A9F4; font-weight: bold', action);
    console.log('%cPrev State', 'color: #9E9E9E; font-weight: bold', prevState);

    // Execute action
    const result = next(action);

    const nextState = getState();
    const endTime = performance.now();

    console.log('%cNext State', 'color: #4CAF50; font-weight: bold', nextState);

    if (diff) {
      console.log('%cDiff', 'color: #FF9800; font-weight: bold', {
        prev: prevState,
        next: nextState
      });
    }

    if (duration) {
      console.log('%cDuration', 'color: #9C27B0; font-weight: bold', `${(endTime - startTime).toFixed(2)}ms`);
    }

    console.groupEnd();

    return result;
  };
}

/**
 * Simple logger middleware (default export)
 */
export const loggerMiddleware = createLoggerMiddleware();

