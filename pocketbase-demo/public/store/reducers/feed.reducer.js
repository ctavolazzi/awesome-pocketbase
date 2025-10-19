/**
 * Feed Reducer - Handles post feed state mutations
 * Pure function: (state, action) => newState
 */

import * as types from '../action-types.js';

// Initial state
export const initialFeedState = {
  posts: [],
  hasMore: true,
  currentPage: 1,
  totalItems: 0,
  isLoading: false,
  isRefreshing: false,
  error: null,
  newPostsAvailable: 0,
  lastFetchedAt: null
};

/**
 * Feed reducer
 * @param {Object} state - Current feed state
 * @param {Object} action - Action object with type and payload
 * @returns {Object} New feed state
 */
export function feedReducer(state = initialFeedState, action) {
  switch (action.type) {
    // Optimistic post creation
    case types.POST_CREATE_OPTIMISTIC: {
      const { post } = action.payload;
      return {
        ...state,
        posts: [post, ...state.posts],
        totalItems: state.totalItems + 1
      };
    }

    // Post creation success (replace optimistic)
    case types.POST_CREATE_SUCCESS: {
      const { tempId, post } = action.payload;
      return {
        ...state,
        posts: state.posts.map(p => p.id === tempId ? post : p),
        error: null
      };
    }

    // Post creation failure (remove optimistic)
    case types.POST_CREATE_FAILURE: {
      const { tempId } = action.payload;
      return {
        ...state,
        posts: state.posts.filter(p => p.id !== tempId),
        totalItems: Math.max(0, state.totalItems - 1),
        error: action.payload.error
      };
    }

    // Regular post creation (from realtime or initial load)
    case types.POST_CREATE: {
      const { post } = action.payload;
      // Avoid duplicates
      if (state.posts.some(p => p.id === post.id)) {
        return state;
      }
      return {
        ...state,
        posts: [post, ...state.posts],
        totalItems: state.totalItems + 1
      };
    }

    // Post update
    case types.POST_UPDATE: {
      const { post } = action.payload;
      return {
        ...state,
        posts: state.posts.map(p => p.id === post.id ? post : p),
        error: null
      };
    }

    // Post deletion
    case types.POST_DELETE: {
      const { postId } = action.payload;
      return {
        ...state,
        posts: state.posts.filter(p => p.id !== postId),
        totalItems: Math.max(0, state.totalItems - 1)
      };
    }

    // Post voting
    case types.POST_VOTE: {
      const { postId, upvotes, downvotes, upvotedBy, downvotedBy } = action.payload;
      return {
        ...state,
        posts: state.posts.map(p =>
          p.id === postId
            ? { ...p, upvotes, downvotes, upvotedBy, downvotedBy }
            : p
        )
      };
    }

    // Load page of posts (initial or pagination)
    case types.POST_LOAD_PAGE: {
      return {
        ...state,
        isLoading: true,
        error: null
      };
    }

    // Load success
    case types.POST_LOAD_SUCCESS: {
      const { posts, page, totalItems, hasMore } = action.payload;
      return {
        ...state,
        posts: page === 1 ? posts : [...state.posts, ...posts],
        currentPage: page,
        totalItems: totalItems || state.totalItems,
        hasMore: hasMore !== undefined ? hasMore : state.hasMore,
        isLoading: false,
        isRefreshing: false,
        error: null,
        lastFetchedAt: action.meta?.timestamp || Date.now()
      };
    }

    // Load failure
    case types.POST_LOAD_FAILURE: {
      return {
        ...state,
        isLoading: false,
        isRefreshing: false,
        error: action.payload.error
      };
    }

    // Refresh feed (pull-to-refresh)
    case types.POST_REFRESH: {
      return {
        ...state,
        isRefreshing: true,
        error: null
      };
    }

    // New posts available indicator (from realtime)
    case types.FEED_NEW_POSTS_AVAILABLE: {
      return {
        ...state,
        newPostsAvailable: state.newPostsAvailable + (action.payload.count || 1)
      };
    }

    // User viewed new posts
    case types.FEED_NEW_POSTS_VIEWED: {
      return {
        ...state,
        newPostsAvailable: 0
      };
    }

    // Realtime post events
    case types.REALTIME_POST_CREATED: {
      const { post } = action.payload;
      // Check if post already exists (avoid duplicates)
      if (state.posts.some(p => p.id === post.id)) {
        return state;
      }
      // Add to feed and increment new posts counter
      return {
        ...state,
        posts: [post, ...state.posts],
        totalItems: state.totalItems + 1,
        newPostsAvailable: state.newPostsAvailable + 1
      };
    }

    case types.REALTIME_POST_UPDATED: {
      const { post } = action.payload;
      return {
        ...state,
        posts: state.posts.map(p => p.id === post.id ? post : p)
      };
    }

    case types.REALTIME_POST_DELETED: {
      const { postId } = action.payload;
      return {
        ...state,
        posts: state.posts.filter(p => p.id !== postId),
        totalItems: Math.max(0, state.totalItems - 1)
      };
    }

    default:
      return state;
  }
}

export default feedReducer;

