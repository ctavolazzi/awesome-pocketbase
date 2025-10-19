/**
 * Dispatcher Integration Tests
 * Tests the complete action → middleware → reducer → store flow
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { ActionDispatcher } from '../../public/store/action-system.js';
import { Store } from '../../public/store/store.js';
import { authReducer, initialAuthState } from '../../public/store/reducers/auth.reducer.js';
import { feedReducer, initialFeedState } from '../../public/store/reducers/feed.reducer.js';
import * as types from '../../public/store/action-types.js';

describe('Dispatcher Integration', () => {
  let dispatcher;
  let authStore;
  let feedStore;

  beforeEach(() => {
    // Create dispatcher
    dispatcher = new ActionDispatcher({
      enableLogging: false,
      enableValidation: true,
      historyLimit: 50
    });

    // Create stores with initial state
    authStore = new Store('auth', initialAuthState);
    feedStore = new Store('feed', initialFeedState);

    // Register stores and reducers
    dispatcher.registerStore('auth', authStore);
    dispatcher.registerReducer('auth', authReducer);
    
    dispatcher.registerStore('feed', feedStore);
    dispatcher.registerReducer('feed', feedReducer);
  });

  afterEach(() => {
    dispatcher.clearHistory();
  });

  describe('Auth Flow Integration', () => {
    it('dispatches login action and updates auth store', () => {
      const user = { id: '123', email: 'test@example.com' };
      
      dispatcher.dispatch({
        type: types.AUTH_LOGIN,
        payload: { user },
        meta: { timestamp: Date.now() }
      });

      const authState = authStore.getState();
      assert.strictEqual(authState.isAuthenticated, true);
      assert.deepStrictEqual(authState.user, user);
      assert.strictEqual(authState.error, null);
    });

    it('handles login → logout flow', () => {
      // Login
      dispatcher.dispatch({
        type: types.AUTH_LOGIN,
        payload: { user: { id: '123' } }
      });

      assert.strictEqual(authStore.getState().isAuthenticated, true);

      // Logout
      dispatcher.dispatch({
        type: types.AUTH_LOGOUT
      });

      const authState = authStore.getState();
      assert.strictEqual(authState.isAuthenticated, false);
      assert.strictEqual(authState.user, null);
    });

    it('records actions in history', () => {
      dispatcher.dispatch({ type: types.AUTH_LOGIN, payload: { user: { id: '1' } } });
      dispatcher.dispatch({ type: types.AUTH_LOGOUT });

      const history = dispatcher.getHistory();
      assert.strictEqual(history.length, 2);
      assert.strictEqual(history[0].action.type, types.AUTH_LOGIN);
      assert.strictEqual(history[1].action.type, types.AUTH_LOGOUT);
    });
  });

  describe('Feed Flow Integration', () => {
    it('dispatches post creation and updates feed store', () => {
      const post = { id: '1', title: 'Test Post', content: 'Content' };
      
      dispatcher.dispatch({
        type: types.POST_CREATE,
        payload: { post }
      });

      const feedState = feedStore.getState();
      assert.strictEqual(feedState.posts.length, 1);
      assert.deepStrictEqual(feedState.posts[0], post);
      assert.strictEqual(feedState.totalItems, 1);
    });

    it('handles optimistic post creation flow', () => {
      const tempId = 'temp_123';
      const realId = 'real_456';

      // Optimistic
      dispatcher.dispatch({
        type: types.POST_CREATE_OPTIMISTIC,
        payload: { post: { id: tempId, title: 'Test' } }
      });

      assert.strictEqual(feedStore.getState().posts.length, 1);
      assert.strictEqual(feedStore.getState().posts[0].id, tempId);

      // Success (replace)
      dispatcher.dispatch({
        type: types.POST_CREATE_SUCCESS,
        payload: { 
          tempId,
          post: { id: realId, title: 'Test', created: '2025-01-01' }
        }
      });

      const feedState = feedStore.getState();
      assert.strictEqual(feedState.posts.length, 1);
      assert.strictEqual(feedState.posts[0].id, realId);
      assert.ok(feedState.posts[0].created);
    });

    it('handles post voting', () => {
      const post = { id: '1', title: 'Post', upvotes: 0, downvotes: 0 };
      
      dispatcher.dispatch({
        type: types.POST_CREATE,
        payload: { post }
      });

      dispatcher.dispatch({
        type: types.POST_VOTE,
        payload: { 
          postId: '1',
          upvotes: 1,
          downvotes: 0,
          upvotedBy: ['user123'],
          downvotedBy: []
        }
      });

      const feedState = feedStore.getState();
      assert.strictEqual(feedState.posts[0].upvotes, 1);
      assert.deepStrictEqual(feedState.posts[0].upvotedBy, ['user123']);
    });

    it('handles post deletion', () => {
      dispatcher.dispatch({
        type: types.POST_CREATE,
        payload: { post: { id: '1', title: 'Post' } }
      });

      assert.strictEqual(feedStore.getState().posts.length, 1);

      dispatcher.dispatch({
        type: types.POST_DELETE,
        payload: { postId: '1' }
      });

      assert.strictEqual(feedStore.getState().posts.length, 0);
    });
  });

  describe('Multi-Store Coordination', () => {
    it('can dispatch actions affecting multiple stores', () => {
      // Login
      dispatcher.dispatch({
        type: types.AUTH_LOGIN,
        payload: { user: { id: 'user1', email: 'test@example.com' } }
      });

      // Create post (as logged in user)
      dispatcher.dispatch({
        type: types.POST_CREATE,
        payload: { post: { id: 'post1', title: 'My Post', authorId: 'user1' } }
      });

      // Both stores updated
      assert.strictEqual(authStore.getState().isAuthenticated, true);
      assert.strictEqual(feedStore.getState().posts.length, 1);
      assert.strictEqual(feedStore.getState().posts[0].authorId, 'user1');
    });

    it('maintains independent store states', () => {
      // Update auth
      dispatcher.dispatch({
        type: types.AUTH_LOGIN,
        payload: { user: { id: '1' } }
      });

      // Feed state unchanged
      assert.deepStrictEqual(feedStore.getState(), initialFeedState);

      // Update feed
      dispatcher.dispatch({
        type: types.POST_CREATE,
        payload: { post: { id: '1', title: 'Post' } }
      });

      // Auth state unchanged (except in history)
      assert.strictEqual(authStore.getState().user.id, '1');
    });
  });

  describe('Time Travel & History', () => {
    it('can rewind state to previous action', () => {
      // Action 1: Login
      dispatcher.dispatch({
        type: types.AUTH_LOGIN,
        payload: { user: { id: '1' } }
      });

      // Action 2: Create post
      dispatcher.dispatch({
        type: types.POST_CREATE,
        payload: { post: { id: 'post1', title: 'Post' } }
      });

      // Action 3: Logout
      dispatcher.dispatch({
        type: types.AUTH_LOGOUT
      });

      // Current state: logged out, 1 post
      assert.strictEqual(authStore.getState().isAuthenticated, false);
      assert.strictEqual(feedStore.getState().posts.length, 1);

      // Rewind to after login (index 0)
      dispatcher.rewindTo(0);

      // State should be: logged in, 0 posts
      assert.strictEqual(authStore.getState().isAuthenticated, true);
      assert.strictEqual(feedStore.getState().posts.length, 0);
    });

    it('can export and import state', () => {
      dispatcher.dispatch({
        type: types.AUTH_LOGIN,
        payload: { user: { id: '1' } }
      });

      dispatcher.dispatch({
        type: types.POST_CREATE,
        payload: { post: { id: '1', title: 'Post' } }
      });

      // Export
      const exported = dispatcher.exportState();
      assert.ok(exported.state);
      assert.ok(exported.history);
      assert.strictEqual(exported.history.length, 2);

      // Clear and reimport
      dispatcher.clearHistory();
      authStore.reset();
      feedStore.reset();

      dispatcher.importState(exported);

      // History restored
      assert.strictEqual(dispatcher.getHistory().length, 2);
    });
  });

  describe('Store Subscription Integration', () => {
    it('store subscribers receive updates from actions', (t, done) => {
      let notificationCount = 0;

      authStore.subscribe('isAuthenticated', (value) => {
        notificationCount++;
        if (notificationCount === 1) {
          assert.strictEqual(value, true);
          done();
        }
      });

      dispatcher.dispatch({
        type: types.AUTH_LOGIN,
        payload: { user: { id: '1' } }
      });
    });

    it('multiple subscribers get notified', () => {
      const notifications = [];

      authStore.subscribe('user', (user) => {
        notifications.push({ subscriber: 'A', user });
      });

      authStore.subscribe('user', (user) => {
        notifications.push({ subscriber: 'B', user });
      });

      dispatcher.dispatch({
        type: types.AUTH_LOGIN,
        payload: { user: { id: '123', email: 'test@test.com' } }
      });

      assert.strictEqual(notifications.length, 2);
      assert.strictEqual(notifications[0].user.id, '123');
      assert.strictEqual(notifications[1].user.id, '123');
    });
  });

  describe('Error Handling', () => {
    it('handles auth errors gracefully', () => {
      dispatcher.dispatch({
        type: types.AUTH_ERROR,
        payload: { error: 'Invalid credentials' }
      });

      const authState = authStore.getState();
      assert.strictEqual(authState.error, 'Invalid credentials');
      assert.strictEqual(authState.isAuthenticated, false);
    });

    it('continues after error', () => {
      dispatcher.dispatch({
        type: types.AUTH_ERROR,
        payload: { error: 'Error' }
      });

      // Should still be able to login after error
      dispatcher.dispatch({
        type: types.AUTH_LOGIN,
        payload: { user: { id: '1' } }
      });

      assert.strictEqual(authStore.getState().isAuthenticated, true);
      assert.strictEqual(authStore.getState().error, null);
    });
  });
});

