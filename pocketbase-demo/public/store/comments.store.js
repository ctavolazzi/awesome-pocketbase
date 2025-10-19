// store/comments.store.js - Comments state management
import { Store } from './store.js';

export const commentsStore = new Store('comments', {
  commentsByPost: {}, // postId -> array of comments
  loading: {},        // postId -> boolean
  error: {},          // postId -> error message
  replyTo: null,      // Currently replying to comment ID
  expandedThreads: new Set() // Set of expanded comment IDs
});

// Comments events
export const COMMENTS_EVENTS = {
  COMMENTS_REQUEST: 'comments/request',
  COMMENTS_SUCCESS: 'comments/success',
  COMMENTS_ERROR: 'comments/error',
  COMMENT_CREATE: 'comments/create',
  COMMENT_UPDATE: 'comments/update',
  COMMENT_DELETE: 'comments/delete',
  REPLY_START: 'comments/reply/start',
  REPLY_CANCEL: 'comments/reply/cancel',
  THREAD_TOGGLE: 'comments/thread/toggle'
};

// Helper functions

export function setCommentsLoading(postId, loading = true) {
  const loadingState = commentsStore.getState('loading');
  commentsStore.setState('loading', { ...loadingState, [postId]: loading });
}

export function setCommentsForPost(postId, comments) {
  const commentsByPost = commentsStore.getState('commentsByPost');
  const loadingState = commentsStore.getState('loading');
  const errorState = commentsStore.getState('error');

  commentsStore.batchUpdate({
    commentsByPost: { ...commentsByPost, [postId]: comments },
    loading: { ...loadingState, [postId]: false },
    error: { ...errorState, [postId]: null }
  });
}

export function setCommentsError(postId, error) {
  const loadingState = commentsStore.getState('loading');
  const errorState = commentsStore.getState('error');

  commentsStore.batchUpdate({
    loading: { ...loadingState, [postId]: false },
    error: { ...errorState, [postId]: error.message || String(error) }
  });
}

export function addComment(postId, comment) {
  const commentsByPost = commentsStore.getState('commentsByPost');
  const postComments = commentsByPost[postId] || [];

  commentsStore.setState('commentsByPost', {
    ...commentsByPost,
    [postId]: [comment, ...postComments]
  });
}

export function updateComment(postId, commentId, updates) {
  const commentsByPost = commentsStore.getState('commentsByPost');
  const postComments = commentsByPost[postId] || [];

  const updatedComments = postComments.map(c =>
    c.id === commentId ? { ...c, ...updates } : c
  );

  commentsStore.setState('commentsByPost', {
    ...commentsByPost,
    [postId]: updatedComments
  });
}

export function deleteComment(postId, commentId) {
  const commentsByPost = commentsStore.getState('commentsByPost');
  const postComments = commentsByPost[postId] || [];

  commentsStore.setState('commentsByPost', {
    ...commentsByPost,
    [postId]: postComments.filter(c => c.id !== commentId)
  });
}

export function setReplyTo(commentId) {
  commentsStore.setState('replyTo', commentId);
}

export function clearReplyTo() {
  commentsStore.setState('replyTo', null);
}

export function toggleThread(commentId) {
  const expanded = commentsStore.getState('expandedThreads');
  const newExpanded = new Set(expanded);

  if (newExpanded.has(commentId)) {
    newExpanded.delete(commentId);
  } else {
    newExpanded.add(commentId);
  }

  commentsStore.setState('expandedThreads', newExpanded);
}

export function getCommentsForPost(postId) {
  const commentsByPost = commentsStore.getState('commentsByPost');
  return commentsByPost[postId] || [];
}

export function getCommentCount(postId) {
  return getCommentsForPost(postId).length;
}

export function isThreadExpanded(commentId) {
  const expanded = commentsStore.getState('expandedThreads');
  return expanded.has(commentId);
}

export default commentsStore;

