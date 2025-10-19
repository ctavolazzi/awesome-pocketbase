/**
 * Simple validation utility for data validation
 * Validates data against schema definitions before sending to PocketBase
 */

/**
 * Validates data against a schema
 * @param {Object} data - The data to validate
 * @param {Object} schema - The schema definition
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validate(data, schema) {
  const errors = [];

  for (const [fieldName, rules] of Object.entries(schema)) {
    const value = data[fieldName];

    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${fieldName} is required`);
      continue;
    }

    // Skip validation if field is not required and not provided
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }

    // Type validation
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;

      if (rules.type === 'string' && actualType !== 'string') {
        errors.push(`${fieldName} must be a string`);
        continue;
      }

      if (rules.type === 'number' && actualType !== 'number') {
        errors.push(`${fieldName} must be a number`);
        continue;
      }

      if (rules.type === 'boolean' && actualType !== 'boolean') {
        errors.push(`${fieldName} must be a boolean`);
        continue;
      }

      if (rules.type === 'array' && !Array.isArray(value)) {
        errors.push(`${fieldName} must be an array`);
        continue;
      }
    }

    // String validations
    if (rules.type === 'string' && typeof value === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
      }

      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push(`${fieldName} must be at most ${rules.maxLength} characters`);
      }

      if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
        errors.push(`${fieldName} has invalid format`);
      }
    }

    // Number validations
    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${fieldName} must be at least ${rules.min}`);
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${fieldName} must be at most ${rules.max}`);
      }
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${fieldName} must be one of: ${rules.enum.join(', ')}`);
    }

    // Array validations
    if (rules.type === 'array' && Array.isArray(value)) {
      if (rules.maxSelect !== undefined && value.length > rules.maxSelect) {
        errors.push(`${fieldName} can have at most ${rules.maxSelect} items`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a single field against its schema rules
 * @param {*} value - The value to validate
 * @param {Object} rules - The validation rules
 * @param {string} fieldName - The field name for error messages
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateField(value, rules, fieldName) {
  return validate({ [fieldName]: value }, { [fieldName]: rules });
}

