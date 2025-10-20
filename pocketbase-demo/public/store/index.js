// store/index.js - Central export for all stores

import { AI_EVENTS } from './ai.store.js';
import { AUTH_EVENTS } from './auth.store.js';
import { FEED_EVENTS } from './feed.store.js';
import { COMMENTS_EVENTS } from './comments.store.js';
import { UI_EVENTS } from './ui.store.js';

export { Store } from './store.js';

// Stores
export { default as aiStore } from './ai.store.js';
export { default as authStore } from './auth.store.js';
export { default as feedStore } from './feed.store.js';
export { default as commentsStore } from './comments.store.js';
export { default as uiStore } from './ui.store.js';

// AI Store exports
export {
  AI_EVENTS,
  setGenerating,
  setGenerationComplete,
  setGenerationError,
  setProviderSwitch,
  addToQueue,
  removeFromQueue,
  getAIStats,
  getAIHistory,
  resetAIStore
} from './ai.store.js';

// Auth Store exports
export {
  AUTH_EVENTS,
  setAuthLoading,
  setAuthUser,
  setAuthError,
  clearAuth,
  updateUser,
  isSessionValid
} from './auth.store.js';

// Feed Store exports
export {
  FEED_EVENTS,
  setFeedLoading,
  setFeedPosts,
  setFeedError,
  addPost,
  updatePost,
  deletePost,
  setFilter,
  clearFilter,
  setNewPostsAvailable,
  clearNewPosts,
  resetFeed
} from './feed.store.js';

// Comments Store exports
export {
  COMMENTS_EVENTS,
  setCommentsLoading,
  setCommentsForPost,
  setCommentsError,
  addComment,
  updateComment as updateCommentInStore,
  deleteComment as deleteCommentFromStore,
  setReplyTo,
  clearReplyTo,
  toggleThread,
  getCommentsForPost,
  getCommentCount,
  isThreadExpanded
} from './comments.store.js';

// UI Store exports
export {
  UI_EVENTS,
  toggleSlideMenu,
  openSlideMenu,
  closeSlideMenu,
  openComposer,
  closeComposer,
  openModal,
  closeModal,
  addToast,
  removeToast,
  clearAllToasts,
  toggleMidi,
  toggleStarfield,
  setGlobalLoading,
  updateScrollPosition
} from './ui.store.js';

// Export all events in one object
export const STORE_EVENTS = {
  ...AI_EVENTS,
  ...AUTH_EVENTS,
  ...FEED_EVENTS,
  ...COMMENTS_EVENTS,
  ...UI_EVENTS
};
