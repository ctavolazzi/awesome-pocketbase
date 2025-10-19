/**
 * Comment Schema Definitions
 * Validation schemas for comment operations
 */

export const commentCreateSchema = {
  post: {
    type: 'string',
    required: true,
    minLength: 1,
  },
  content: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 500,
  },
  author: {
    type: 'string',
    required: true,
    minLength: 1,
  },
  parentComment: {
    type: 'string',
    required: false,
  },
  upvotes: {
    type: 'number',
    required: false,
  },
  downvotes: {
    type: 'number',
    required: false,
  },
};

export const commentUpdateSchema = {
  content: {
    type: 'string',
    required: false,
    minLength: 1,
    maxLength: 500,
  },
  upvotes: {
    type: 'number',
    required: false,
  },
  downvotes: {
    type: 'number',
    required: false,
  },
};

