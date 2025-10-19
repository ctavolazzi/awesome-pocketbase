/**
 * Post schema validation rules
 * Based on PocketBase schema in setup.mjs
 */

export const postCreateSchema = {
  title: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 140,
  },
  slug: {
    type: 'string',
    required: true,
    pattern: '^[a-z0-9-]+$',
  },
  content: {
    type: 'string',
    required: true,
    minLength: 1,
  },
  status: {
    type: 'string',
    required: true,
    enum: ['draft', 'published', 'archived'],
  },
  author: {
    type: 'string',
    required: true,
  },
  categories: {
    type: 'array',
    required: false,
    maxSelect: 3,
  },
  aiGenerated: {
    type: 'boolean',
    required: false,
  },
  featured: {
    type: 'boolean',
    required: false,
  },
};

export const postUpdateSchema = {
  title: {
    type: 'string',
    required: false,
    minLength: 3,
    maxLength: 140,
  },
  slug: {
    type: 'string',
    required: false,
    pattern: '^[a-z0-9-]+$',
  },
  content: {
    type: 'string',
    required: false,
    minLength: 1,
  },
  status: {
    type: 'string',
    required: false,
    enum: ['draft', 'published', 'archived'],
  },
  categories: {
    type: 'array',
    required: false,
    maxSelect: 3,
  },
  aiGenerated: {
    type: 'boolean',
    required: false,
  },
  featured: {
    type: 'boolean',
    required: false,
  },
};

