/**
 * Feed Reducer Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { feedReducer, initialFeedState } from '../../../public/store/reducers/feed.reducer.js';
import * as types from '../../../public/store/action-types.js';

describe('Feed Reducer', () => {
  describe('Initial State', () => {
    it('returns initial state when state is undefined', () => {
      const state = feedReducer(undefined, { type: '@@INIT' });
      
      assert.deepStrictEqual(state, initialFeedState);
      assert.strictEqual(state.posts.length, 0);
      assert.strictEqual(state.hasMore, true);
      assert.strictEqual(state.currentPage, 1);
    });

    it('returns current state for unknown action', () => {
      const currentState = { ...initialFeedState, posts: [{ id: '1' }] };
      const state = feedReducer(currentState, { type: 'UNKNOWN_ACTION' });
      
      assert.deepStrictEqual(state, currentState);
    });
  });

  describe('Optimistic Post Creation', () => {
    it('adds optimistic post to beginning of feed', () => {
      const post = { id: 'temp_123', title: 'Test Post', content: 'Test' };
      const action = {
        type: types.POST_CREATE_OPTIMISTIC,
        payload: { post }
      };

      const state = feedReducer(initialFeedState, action);

      assert.strictEqual(state.posts.length, 1);
      assert.deepStrictEqual(state.posts[0], post);
      assert.strictEqual(state.totalItems, 1);
    });

    it('prepends optimistic post to existing posts', () => {
      const existingPost = { id: '1', title: 'Existing' };
      const currentState = { ...initialFeedState, posts: [existingPost], totalItems: 1 };
      const newPost = { id: 'temp_123', title: 'New' };

      const state = feedReducer(currentState, {
        type: types.POST_CREATE_OPTIMISTIC,
        payload: { post: newPost }
      });

      assert.strictEqual(state.posts.length, 2);
      assert.strictEqual(state.posts[0].id, 'temp_123');
      assert.strictEqual(state.posts[1].id, '1');
      assert.strictEqual(state.totalItems, 2);
    });
  });

  describe('POST_CREATE_SUCCESS', () => {
    it('replaces optimistic post with saved post', () => {
      const optimisticPost = { id: 'temp_123', title: 'Test' };
      const savedPost = { id: 'real_456', title: 'Test', createdAt: '2025-01-01' };
      const currentState = { ...initialFeedState, posts: [optimisticPost] };

      const state = feedReducer(currentState, {
        type: types.POST_CREATE_SUCCESS,
        payload: { tempId: 'temp_123', post: savedPost }
      });

      assert.strictEqual(state.posts.length, 1);
      assert.strictEqual(state.posts[0].id, 'real_456');
      assert.ok(state.posts[0].createdAt);
      assert.strictEqual(state.error, null);
    });
  });

  describe('POST_CREATE_FAILURE', () => {
    it('removes optimistic post on failure', () => {
      const optimisticPost = { id: 'temp_123', title: 'Test' };
      const currentState = { ...initialFeedState, posts: [optimisticPost], totalItems: 1 };

      const state = feedReducer(currentState, {
        type: types.POST_CREATE_FAILURE,
        payload: { tempId: 'temp_123', error: 'Network error' }
      });

      assert.strictEqual(state.posts.length, 0);
      assert.strictEqual(state.totalItems, 0);
      assert.strictEqual(state.error, 'Network error');
    });

    it('does not go below zero total items', () => {
      const state = feedReducer(initialFeedState, {
        type: types.POST_CREATE_FAILURE,
        payload: { tempId: 'temp_123', error: 'Error' }
      });

      assert.strictEqual(state.totalItems, 0);
    });
  });

  describe('POST_CREATE', () => {
    it('adds new post to feed', () => {
      const post = { id: '123', title: 'New Post' };
      const state = feedReducer(initialFeedState, {
        type: types.POST_CREATE,
        payload: { post }
      });

      assert.strictEqual(state.posts.length, 1);
      assert.deepStrictEqual(state.posts[0], post);
      assert.strictEqual(state.totalItems, 1);
    });

    it('avoids duplicate posts', () => {
      const post = { id: '123', title: 'Post' };
      const currentState = { ...initialFeedState, posts: [post], totalItems: 1 };

      const state = feedReducer(currentState, {
        type: types.POST_CREATE,
        payload: { post }
      });

      assert.strictEqual(state.posts.length, 1);
      assert.strictEqual(state.totalItems, 1);
      assert.strictEqual(state, currentState); // Same reference (no change)
    });
  });

  describe('POST_UPDATE', () => {
    it('updates existing post', () => {
      const oldPost = { id: '123', title: 'Old Title', upvotes: 0 };
      const updatedPost = { id: '123', title: 'New Title', upvotes: 5 };
      const currentState = { ...initialFeedState, posts: [oldPost] };

      const state = feedReducer(currentState, {
        type: types.POST_UPDATE,
        payload: { post: updatedPost }
      });

      assert.strictEqual(state.posts.length, 1);
      assert.strictEqual(state.posts[0].title, 'New Title');
      assert.strictEqual(state.posts[0].upvotes, 5);
      assert.strictEqual(state.error, null);
    });

    it('does not affect other posts', () => {
      const post1 = { id: '1', title: 'Post 1' };
      const post2 = { id: '2', title: 'Post 2' };
      const currentState = { ...initialFeedState, posts: [post1, post2] };

      const state = feedReducer(currentState, {
        type: types.POST_UPDATE,
        payload: { post: { id: '1', title: 'Updated Post 1' } }
      });

      assert.strictEqual(state.posts[0].title, 'Updated Post 1');
      assert.strictEqual(state.posts[1].title, 'Post 2');
    });
  });

  describe('POST_DELETE', () => {
    it('removes post from feed', () => {
      const post = { id: '123', title: 'To Delete' };
      const currentState = { ...initialFeedState, posts: [post], totalItems: 1 };

      const state = feedReducer(currentState, {
        type: types.POST_DELETE,
        payload: { postId: '123' }
      });

      assert.strictEqual(state.posts.length, 0);
      assert.strictEqual(state.totalItems, 0);
    });

    it('removes correct post from multiple posts', () => {
      const post1 = { id: '1', title: 'Keep' };
      const post2 = { id: '2', title: 'Delete' };
      const post3 = { id: '3', title: 'Keep' };
      const currentState = { ...initialFeedState, posts: [post1, post2, post3], totalItems: 3 };

      const state = feedReducer(currentState, {
        type: types.POST_DELETE,
        payload: { postId: '2' }
      });

      assert.strictEqual(state.posts.length, 2);
      assert.strictEqual(state.posts[0].id, '1');
      assert.strictEqual(state.posts[1].id, '3');
      assert.strictEqual(state.totalItems, 2);
    });
  });

  describe('POST_VOTE', () => {
    it('updates vote counts and user lists', () => {
      const post = { id: '123', upvotes: 0, downvotes: 0, upvotedBy: [], downvotedBy: [] };
      const currentState = { ...initialFeedState, posts: [post] };

      const state = feedReducer(currentState, {
        type: types.POST_VOTE,
        payload: { 
          postId: '123', 
          upvotes: 1, 
          downvotes: 0,
          upvotedBy: ['user123'],
          downvotedBy: []
        }
      });

      assert.strictEqual(state.posts[0].upvotes, 1);
      assert.strictEqual(state.posts[0].downvotes, 0);
      assert.deepStrictEqual(state.posts[0].upvotedBy, ['user123']);
    });
  });

  describe('POST_LOAD_PAGE', () => {
    it('sets loading state', () => {
      const state = feedReducer(initialFeedState, {
        type: types.POST_LOAD_PAGE
      });

      assert.strictEqual(state.isLoading, true);
      assert.strictEqual(state.error, null);
    });
  });

  describe('POST_LOAD_SUCCESS', () => {
    it('loads first page of posts', () => {
      const posts = [
        { id: '1', title: 'Post 1' },
        { id: '2', title: 'Post 2' }
      ];

      const state = feedReducer(initialFeedState, {
        type: types.POST_LOAD_SUCCESS,
        payload: { posts, page: 1, totalItems: 10, hasMore: true },
        meta: { timestamp: 1234567890 }
      });

      assert.strictEqual(state.posts.length, 2);
      assert.strictEqual(state.currentPage, 1);
      assert.strictEqual(state.totalItems, 10);
      assert.strictEqual(state.hasMore, true);
      assert.strictEqual(state.isLoading, false);
      assert.strictEqual(state.lastFetchedAt, 1234567890);
    });

    it('appends posts on pagination', () => {
      const existingPosts = [{ id: '1' }, { id: '2' }];
      const currentState = { ...initialFeedState, posts: existingPosts, currentPage: 1 };
      const newPosts = [{ id: '3' }, { id: '4' }];

      const state = feedReducer(currentState, {
        type: types.POST_LOAD_SUCCESS,
        payload: { posts: newPosts, page: 2, hasMore: true }
      });

      assert.strictEqual(state.posts.length, 4);
      assert.strictEqual(state.currentPage, 2);
      assert.strictEqual(state.posts[2].id, '3');
      assert.strictEqual(state.posts[3].id, '4');
    });

    it('replaces posts on page 1', () => {
      const oldPosts = [{ id: '1' }, { id: '2' }];
      const currentState = { ...initialFeedState, posts: oldPosts };
      const newPosts = [{ id: '3' }, { id: '4' }];

      const state = feedReducer(currentState, {
        type: types.POST_LOAD_SUCCESS,
        payload: { posts: newPosts, page: 1 }
      });

      assert.strictEqual(state.posts.length, 2);
      assert.strictEqual(state.posts[0].id, '3');
      assert.strictEqual(state.posts[1].id, '4');
    });
  });

  describe('POST_LOAD_FAILURE', () => {
    it('sets error and clears loading', () => {
      const loadingState = { ...initialFeedState, isLoading: true };
      const state = feedReducer(loadingState, {
        type: types.POST_LOAD_FAILURE,
        payload: { error: 'Failed to load posts' }
      });

      assert.strictEqual(state.isLoading, false);
      assert.strictEqual(state.error, 'Failed to load posts');
    });
  });

  describe('FEED_NEW_POSTS_AVAILABLE', () => {
    it('increments new posts counter', () => {
      const state = feedReducer(initialFeedState, {
        type: types.FEED_NEW_POSTS_AVAILABLE,
        payload: { count: 1 }
      });

      assert.strictEqual(state.newPostsAvailable, 1);
    });

    it('accumulates new posts count', () => {
      const currentState = { ...initialFeedState, newPostsAvailable: 3 };
      const state = feedReducer(currentState, {
        type: types.FEED_NEW_POSTS_AVAILABLE,
        payload: { count: 2 }
      });

      assert.strictEqual(state.newPostsAvailable, 5);
    });
  });

  describe('FEED_NEW_POSTS_VIEWED', () => {
    it('resets new posts counter', () => {
      const currentState = { ...initialFeedState, newPostsAvailable: 5 };
      const state = feedReducer(currentState, {
        type: types.FEED_NEW_POSTS_VIEWED
      });

      assert.strictEqual(state.newPostsAvailable, 0);
    });
  });

  describe('Realtime Events', () => {
    it('handles REALTIME_POST_CREATED', () => {
      const post = { id: '123', title: 'Realtime Post' };
      const state = feedReducer(initialFeedState, {
        type: types.REALTIME_POST_CREATED,
        payload: { post }
      });

      assert.strictEqual(state.posts.length, 1);
      assert.deepStrictEqual(state.posts[0], post);
      assert.strictEqual(state.newPostsAvailable, 1);
      assert.strictEqual(state.totalItems, 1);
    });

    it('avoids duplicate realtime posts', () => {
      const post = { id: '123', title: 'Post' };
      const currentState = { ...initialFeedState, posts: [post], totalItems: 1 };

      const state = feedReducer(currentState, {
        type: types.REALTIME_POST_CREATED,
        payload: { post }
      });

      assert.strictEqual(state.posts.length, 1);
      assert.strictEqual(state, currentState);
    });

    it('handles REALTIME_POST_UPDATED', () => {
      const oldPost = { id: '123', title: 'Old' };
      const updatedPost = { id: '123', title: 'Updated' };
      const currentState = { ...initialFeedState, posts: [oldPost] };

      const state = feedReducer(currentState, {
        type: types.REALTIME_POST_UPDATED,
        payload: { post: updatedPost }
      });

      assert.strictEqual(state.posts[0].title, 'Updated');
    });

    it('handles REALTIME_POST_DELETED', () => {
      const post = { id: '123', title: 'To Delete' };
      const currentState = { ...initialFeedState, posts: [post], totalItems: 1 };

      const state = feedReducer(currentState, {
        type: types.REALTIME_POST_DELETED,
        payload: { postId: '123' }
      });

      assert.strictEqual(state.posts.length, 0);
      assert.strictEqual(state.totalItems, 0);
    });
  });

  describe('Immutability', () => {
    it('does not mutate original state', () => {
      const originalState = {
        ...initialFeedState,
        posts: [{ id: '1', title: 'Post' }]
      };
      const stateCopy = JSON.parse(JSON.stringify(originalState));

      feedReducer(originalState, {
        type: types.POST_DELETE,
        payload: { postId: '1' }
      });

      assert.deepStrictEqual(originalState, stateCopy);
    });

    it('returns new state object on change', () => {
      const state1 = feedReducer(initialFeedState, {
        type: types.POST_CREATE,
        payload: { post: { id: '1' } }
      });

      const state2 = feedReducer(state1, {
        type: types.POST_DELETE,
        payload: { postId: '1' }
      });

      assert.notStrictEqual(state1, state2);
    });

    it('returns same reference when no change', () => {
      const state = feedReducer(initialFeedState, {
        type: 'UNKNOWN_ACTION'
      });

      assert.strictEqual(state, initialFeedState);
    });
  });
});

