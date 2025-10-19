/**
 * Validation Middleware - Validates action structure and payload
 */

import { isValidActionType } from '../store/action-types.js';

/**
 * Create validation middleware with custom rules
 */
export function createValidationMiddleware(rules = {}) {
  return () => next => action => {
    // Basic validation
    if (!action || typeof action !== 'object') {
      console.error('Invalid action: must be an object', action);
      throw new Error('Action must be an object');
    }

    if (!action.type || typeof action.type !== 'string') {
      console.error('Invalid action: must have string type', action);
      throw new Error('Action must have a type property of type string');
    }

    // Check if action type is registered
    if (!isValidActionType(action.type)) {
      console.warn(`Unregistered action type: ${action.type}`);
    }

    // Apply custom validation rules
    if (rules[action.type]) {
      const validator = rules[action.type];
      const result = validator(action);

      if (result !== true) {
        const errorMsg = typeof result === 'string' ? result : `Validation failed for ${action.type}`;
        console.error(errorMsg, action);
        throw new Error(errorMsg);
      }
    }

    return next(action);
  };
}

/**
 * Default validation middleware
 */
export const validationMiddleware = createValidationMiddleware();

/**
 * Common validation helpers
 */
export const validators = {
  // Require specific payload fields
  requireFields: (fields) => (action) => {
    if (!action.payload) {
      return `${action.type} requires a payload`;
    }

    const missing = fields.filter(field => !(field in action.payload));
    if (missing.length > 0) {
      return `${action.type} missing required fields: ${missing.join(', ')}`;
    }

    return true;
  },

  // Validate payload type
  payloadType: (type) => (action) => {
    if (!action.payload) {
      return `${action.type} requires a payload`;
    }

    if (typeof action.payload !== type) {
      return `${action.type} payload must be of type ${type}`;
    }

    return true;
  },

  // Validate payload is not empty
  notEmpty: () => (action) => {
    if (!action.payload || (typeof action.payload === 'object' && Object.keys(action.payload).length === 0)) {
      return `${action.type} payload cannot be empty`;
    }

    return true;
  },

  // Custom validator
  custom: (fn, message) => (action) => {
    const result = fn(action);
    return result ? true : message || `Validation failed for ${action.type}`;
  }
};

