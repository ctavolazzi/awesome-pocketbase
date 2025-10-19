/**
 * Error log schema validation rules
 */

export const errorLogCreateSchema = {
  level: {
    type: 'string',
    required: true,
    enum: ['debug', 'info', 'warn', 'error', 'fatal'],
  },
  message: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 1000,
  },
  context: {
    type: 'string', // JSON string
    required: false,
  },
  stack: {
    type: 'string',
    required: false,
  },
  error_details: {
    type: 'string', // JSON string
    required: false,
  },
  user_id: {
    type: 'string',
    required: false,
  },
  session_id: {
    type: 'string',
    required: false,
  },
  timestamp: {
    type: 'string', // ISO date string
    required: true,
  },
};

