/**
 * Action Types - Complete Registry
 * Central source of truth for all action types in the application
 */

// ============================================================================
// AUTH ACTIONS
// ============================================================================
export const AUTH_LOGIN = 'AUTH_LOGIN';
export const AUTH_LOGOUT = 'AUTH_LOGOUT';
export const AUTH_REGISTER = 'AUTH_REGISTER';
export const AUTH_UPDATE = 'AUTH_UPDATE';
export const AUTH_CHECK = 'AUTH_CHECK';
export const AUTH_ERROR = 'AUTH_ERROR';

// ============================================================================
// POST ACTIONS
// ============================================================================
export const POST_CREATE = 'POST_CREATE';
export const POST_CREATE_OPTIMISTIC = 'POST_CREATE_OPTIMISTIC';
export const POST_CREATE_SUCCESS = 'POST_CREATE_SUCCESS';
export const POST_CREATE_FAILURE = 'POST_CREATE_FAILURE';

export const POST_UPDATE = 'POST_UPDATE';
export const POST_DELETE = 'POST_DELETE';
export const POST_VOTE = 'POST_VOTE';

export const POST_LOAD_PAGE = 'POST_LOAD_PAGE';
export const POST_LOAD_SUCCESS = 'POST_LOAD_SUCCESS';
export const POST_LOAD_FAILURE = 'POST_LOAD_FAILURE';

export const POST_REFRESH = 'POST_REFRESH';

// ============================================================================
// COMMENT ACTIONS
// ============================================================================
export const COMMENT_CREATE = 'COMMENT_CREATE';
export const COMMENT_UPDATE = 'COMMENT_UPDATE';
export const COMMENT_DELETE = 'COMMENT_DELETE';
export const COMMENT_VOTE = 'COMMENT_VOTE';

export const COMMENT_LOAD = 'COMMENT_LOAD';
export const COMMENT_LOAD_SUCCESS = 'COMMENT_LOAD_SUCCESS';
export const COMMENT_LOAD_FAILURE = 'COMMENT_LOAD_FAILURE';

export const COMMENT_TOGGLE = 'COMMENT_TOGGLE';
export const COMMENT_REPLY_SET = 'COMMENT_REPLY_SET';
export const COMMENT_REPLY_CLEAR = 'COMMENT_REPLY_CLEAR';

// ============================================================================
// UI ACTIONS
// ============================================================================
export const UI_TOAST_SHOW = 'UI_TOAST_SHOW';
export const UI_TOAST_HIDE = 'UI_TOAST_HIDE';
export const UI_MENU_TOGGLE = 'UI_MENU_TOGGLE';
export const UI_LOADING_SET = 'UI_LOADING_SET';
export const UI_ERROR_SET = 'UI_ERROR_SET';
export const UI_ERROR_CLEAR = 'UI_ERROR_CLEAR';

// ============================================================================
// REALTIME ACTIONS
// ============================================================================
export const REALTIME_CONNECTED = 'REALTIME_CONNECTED';
export const REALTIME_DISCONNECTED = 'REALTIME_DISCONNECTED';
export const REALTIME_RECONNECTING = 'REALTIME_RECONNECTING';

export const REALTIME_POST_CREATED = 'REALTIME_POST_CREATED';
export const REALTIME_POST_UPDATED = 'REALTIME_POST_UPDATED';
export const REALTIME_POST_DELETED = 'REALTIME_POST_DELETED';

export const REALTIME_COMMENT_CREATED = 'REALTIME_COMMENT_CREATED';
export const REALTIME_COMMENT_UPDATED = 'REALTIME_COMMENT_UPDATED';
export const REALTIME_COMMENT_DELETED = 'REALTIME_COMMENT_DELETED';

// ============================================================================
// FEED ACTIONS
// ============================================================================
export const FEED_SCROLL = 'FEED_SCROLL';
export const FEED_NEW_POSTS_AVAILABLE = 'FEED_NEW_POSTS_AVAILABLE';
export const FEED_NEW_POSTS_VIEWED = 'FEED_NEW_POSTS_VIEWED';

// ============================================================================
// CATEGORY ACTIONS
// ============================================================================
export const CATEGORY_LOAD = 'CATEGORY_LOAD';
export const CATEGORY_LOAD_SUCCESS = 'CATEGORY_LOAD_SUCCESS';
export const CATEGORY_LOAD_FAILURE = 'CATEGORY_LOAD_FAILURE';

// ============================================================================
// STATS ACTIONS
// ============================================================================
export const STATS_UPDATE = 'STATS_UPDATE';
export const STATS_HIT_COUNTER_UPDATE = 'STATS_HIT_COUNTER_UPDATE';

// ============================================================================
// AI ACTIONS
// ============================================================================
export const AI_GENERATE_START = 'AI_GENERATE_START';
export const AI_GENERATE_SUCCESS = 'AI_GENERATE_SUCCESS';
export const AI_GENERATE_FAILURE = 'AI_GENERATE_FAILURE';
export const AI_PROVIDER_SWITCH = 'AI_PROVIDER_SWITCH';

// ============================================================================
// SYSTEM ACTIONS
// ============================================================================
export const SYSTEM_INIT = 'SYSTEM_INIT';
export const SYSTEM_READY = 'SYSTEM_READY';
export const SYSTEM_ERROR = 'SYSTEM_ERROR';
export const SYSTEM_CLEANUP = 'SYSTEM_CLEANUP';

// ============================================================================
// Action Type Groups (for filtering and debugging)
// ============================================================================
export const AUTH_ACTIONS = [
  AUTH_LOGIN, AUTH_LOGOUT, AUTH_REGISTER, AUTH_UPDATE, AUTH_CHECK, AUTH_ERROR
];

export const POST_ACTIONS = [
  POST_CREATE, POST_CREATE_OPTIMISTIC, POST_CREATE_SUCCESS, POST_CREATE_FAILURE,
  POST_UPDATE, POST_DELETE, POST_VOTE,
  POST_LOAD_PAGE, POST_LOAD_SUCCESS, POST_LOAD_FAILURE, POST_REFRESH
];

export const COMMENT_ACTIONS = [
  COMMENT_CREATE, COMMENT_UPDATE, COMMENT_DELETE, COMMENT_VOTE,
  COMMENT_LOAD, COMMENT_LOAD_SUCCESS, COMMENT_LOAD_FAILURE, COMMENT_TOGGLE,
  COMMENT_REPLY_SET, COMMENT_REPLY_CLEAR
];

export const UI_ACTIONS = [
  UI_TOAST_SHOW, UI_TOAST_HIDE, UI_MENU_TOGGLE,
  UI_LOADING_SET, UI_ERROR_SET, UI_ERROR_CLEAR
];

export const REALTIME_ACTIONS = [
  REALTIME_CONNECTED, REALTIME_DISCONNECTED, REALTIME_RECONNECTING,
  REALTIME_POST_CREATED, REALTIME_POST_UPDATED, REALTIME_POST_DELETED,
  REALTIME_COMMENT_CREATED, REALTIME_COMMENT_UPDATED, REALTIME_COMMENT_DELETED
];

// ============================================================================
// Utility: Check if action type is valid
// ============================================================================
const ALL_ACTION_TYPES = new Set([
  ...AUTH_ACTIONS,
  ...POST_ACTIONS,
  ...COMMENT_ACTIONS,
  ...UI_ACTIONS,
  ...REALTIME_ACTIONS,
  FEED_SCROLL, FEED_NEW_POSTS_AVAILABLE, FEED_NEW_POSTS_VIEWED,
  CATEGORY_LOAD, CATEGORY_LOAD_SUCCESS, CATEGORY_LOAD_FAILURE,
  STATS_UPDATE, STATS_HIT_COUNTER_UPDATE,
  AI_GENERATE_START, AI_GENERATE_SUCCESS, AI_GENERATE_FAILURE, AI_PROVIDER_SWITCH,
  SYSTEM_INIT, SYSTEM_READY, SYSTEM_ERROR, SYSTEM_CLEANUP
]);

export function isValidActionType(type) {
  return ALL_ACTION_TYPES.has(type);
}

export function getActionGroup(type) {
  if (AUTH_ACTIONS.includes(type)) return 'AUTH';
  if (POST_ACTIONS.includes(type)) return 'POST';
  if (COMMENT_ACTIONS.includes(type)) return 'COMMENT';
  if (UI_ACTIONS.includes(type)) return 'UI';
  if (REALTIME_ACTIONS.includes(type)) return 'REALTIME';
  if (type.startsWith('FEED_')) return 'FEED';
  if (type.startsWith('CATEGORY_')) return 'CATEGORY';
  if (type.startsWith('STATS_')) return 'STATS';
  if (type.startsWith('AI_')) return 'AI';
  if (type.startsWith('SYSTEM_')) return 'SYSTEM';
  return 'UNKNOWN';
}
