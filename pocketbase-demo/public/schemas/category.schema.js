/**
 * Category schema validation rules
 * Based on PocketBase schema in setup.mjs
 */

export const categoryCreateSchema = {
  label: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 80,
  },
  slug: {
    type: 'string',
    required: true,
    pattern: '^[a-z0-9-]+$',
  },
  description: {
    type: 'string',
    required: false,
    maxLength: 160,
  },
};

export const categoryUpdateSchema = {
  label: {
    type: 'string',
    required: false,
    minLength: 3,
    maxLength: 80,
  },
  slug: {
    type: 'string',
    required: false,
    pattern: '^[a-z0-9-]+$',
  },
  description: {
    type: 'string',
    required: false,
    maxLength: 160,
  },
};

