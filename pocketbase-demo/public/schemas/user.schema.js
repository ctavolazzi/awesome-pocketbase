/**
 * User schema validation rules
 * Based on PocketBase schema in setup.mjs
 */

export const userCreateSchema = {
  email: {
    type: 'string',
    required: true,
    pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', // Basic email pattern
  },
  password: {
    type: 'string',
    required: true,
    minLength: 8,
  },
  passwordConfirm: {
    type: 'string',
    required: true,
    minLength: 8,
  },
  displayName: {
    type: 'string',
    required: false,
    maxLength: 120,
  },
  bio: {
    type: 'string',
    required: false,
    maxLength: 500,
  },
};

export const userUpdateSchema = {
  displayName: {
    type: 'string',
    required: false,
    maxLength: 120,
  },
  bio: {
    type: 'string',
    required: false,
    maxLength: 500,
  },
};

export const authSchema = {
  email: {
    type: 'string',
    required: true,
    pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
  },
  password: {
    type: 'string',
    required: true,
    minLength: 8,
  },
};

