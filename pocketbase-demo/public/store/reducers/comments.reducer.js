/**
 * Comments Reducer - Manages comment thread state per post
 * Pure function: (state, action) => newState
 */

import * as types from '../action-types.js';

export const initialCommentsState = {
  commentsByPost: {},          // postId -> Comment[]
  loadingByPost: {},           // postId -> boolean
  errorByPost: {},             // postId -> string|null
  replyToCommentId: null,      // Currently selected comment for reply
  expandedThreads: new Set(),  // Set of commentIds that are expanded in UI
  newCommentsCountByPost: {},  // postId -> number of unseen realtime comments
  lastFetchedAtByPost: {}       // postId -> timestamp of last successful fetch
};

/**
 * Utility to ensure comment is stored at the top of the list.
 */
function prependComment(list = [], comment) {
  if (!comment) return list;
  if (list.some(c => c.id === comment.id)) {
    return list;
  }
  return [comment, ...list];
}

/**
 * Utility to update a comment within a list.
 */
function updateCommentInList(list = [], commentId, updater) {
  let updated = false;
  const next = list.map(comment => {
    if (comment.id !== commentId) {
      return comment;
    }
    updated = true;
    return { ...comment, ...updater(comment) };
  });
  return updated ? next : list;
}

/**
 * Utility to remove a comment from a list.
 */
function removeCommentFromList(list = [], commentId) {
  const next = list.filter(comment => comment.id !== commentId);
  return next.length === list.length ? list : next;
}

/**
 * Comments reducer
 */
export function commentsReducer(state = initialCommentsState, action) {
  switch (action.type) {
    case types.COMMENT_LOAD: {
      const { postId } = action.payload;
      return {
        ...state,
        loadingByPost: {
          ...state.loadingByPost,
          [postId]: true
        },
        errorByPost: {
          ...state.errorByPost,
          [postId]: null
        }
      };
    }

    case types.COMMENT_LOAD_SUCCESS: {
      const { postId, comments } = action.payload;
      const timestamp = action.meta?.timestamp ?? Date.now();

      return {
        ...state,
        commentsByPost: {
          ...state.commentsByPost,
          [postId]: [...comments]
        },
        loadingByPost: {
          ...state.loadingByPost,
          [postId]: false
        },
        errorByPost: {
          ...state.errorByPost,
          [postId]: null
        },
        newCommentsCountByPost: {
          ...state.newCommentsCountByPost,
          [postId]: 0
        },
        lastFetchedAtByPost: {
          ...state.lastFetchedAtByPost,
          [postId]: timestamp
        }
      };
    }

    case types.COMMENT_LOAD_FAILURE: {
      const { postId, error } = action.payload;
      return {
        ...state,
        loadingByPost: {
          ...state.loadingByPost,
          [postId]: false
        },
        errorByPost: {
          ...state.errorByPost,
          [postId]: error
        }
      };
    }

    case types.COMMENT_CREATE: {
      const { postId, comment } = action.payload;
      const existing = state.commentsByPost[postId] || [];
      const nextComments = prependComment(existing, comment);

      // If nothing changed, return original state reference
      if (nextComments === existing) {
        return state;
      }

      return {
        ...state,
        commentsByPost: {
          ...state.commentsByPost,
          [postId]: nextComments
        },
        errorByPost: {
          ...state.errorByPost,
          [postId]: null
        }
      };
    }

    case types.COMMENT_UPDATE: {
      const { postId, commentId, updates } = action.payload;
      const existing = state.commentsByPost[postId];
      if (!existing) return state;

      const nextComments = updateCommentInList(existing, commentId, () => updates);
      if (nextComments === existing) return state;

      return {
        ...state,
        commentsByPost: {
          ...state.commentsByPost,
          [postId]: nextComments
        }
      };
    }

    case types.COMMENT_DELETE: {
      const { postId, commentId } = action.payload;
      const existing = state.commentsByPost[postId];
      if (!existing) return state;

      const nextComments = removeCommentFromList(existing, commentId);
      if (nextComments === existing) return state;

      return {
        ...state,
        commentsByPost: {
          ...state.commentsByPost,
          [postId]: nextComments
        }
      };
    }

    case types.COMMENT_VOTE: {
      const { postId, commentId, upvotes, downvotes, userVote } = action.payload;
      const existing = state.commentsByPost[postId];
      if (!existing) return state;

      const nextComments = updateCommentInList(existing, commentId, () => ({
        upvotes,
        downvotes,
        userVote
      }));

      if (nextComments === existing) return state;

      return {
        ...state,
        commentsByPost: {
          ...state.commentsByPost,
          [postId]: nextComments
        }
      };
    }

    case types.COMMENT_TOGGLE: {
      const { commentId } = action.payload;
      const expanded = new Set(state.expandedThreads);
      if (expanded.has(commentId)) {
        expanded.delete(commentId);
      } else {
        expanded.add(commentId);
      }

      return {
        ...state,
        expandedThreads: expanded
      };
    }

    case types.COMMENT_REPLY_SET: {
      return {
        ...state,
        replyToCommentId: action.payload.commentId
      };
    }

    case types.COMMENT_REPLY_CLEAR: {
      return {
        ...state,
        replyToCommentId: null
      };
    }

    case types.REALTIME_COMMENT_CREATED: {
      const { postId, comment } = action.payload;
      const existing = state.commentsByPost[postId] || [];
      const nextComments = prependComment(existing, comment);

      const existingCount = state.newCommentsCountByPost[postId] || 0;

      return {
        ...state,
        commentsByPost: {
          ...state.commentsByPost,
          [postId]: nextComments
        },
        newCommentsCountByPost: {
          ...state.newCommentsCountByPost,
          [postId]: existing === nextComments ? existingCount : existingCount + 1
        }
      };
    }

    case types.REALTIME_COMMENT_UPDATED: {
      const { postId, comment } = action.payload;
      const existing = state.commentsByPost[postId];
      if (!existing) return state;

      const nextComments = updateCommentInList(existing, comment.id, () => comment);
      if (nextComments === existing) return state;

      return {
        ...state,
        commentsByPost: {
          ...state.commentsByPost,
          [postId]: nextComments
        }
      };
    }

    case types.REALTIME_COMMENT_DELETED: {
      const { postId, commentId } = action.payload;
      const existing = state.commentsByPost[postId];
      if (!existing) return state;

      const nextComments = removeCommentFromList(existing, commentId);
      if (nextComments === existing) return state;

      return {
        ...state,
        commentsByPost: {
          ...state.commentsByPost,
          [postId]: nextComments
        }
      };
    }

    default:
      return state;
  }
}

export default commentsReducer;
