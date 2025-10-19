/**
 * Site stats schema validation rules
 * Based on PocketBase schema in setup.mjs
 */

export const statsUpdateSchema = {
  visitor_count: {
    type: 'number',
    required: true,
    min: 0,
  },
  last_visit: {
    type: 'string', // ISO date string
    required: false,
  },
};

export const statsCreateSchema = {
  visitor_count: {
    type: 'number',
    required: true,
    min: 0,
  },
  last_visit: {
    type: 'string', // ISO date string
    required: false,
  },
};

