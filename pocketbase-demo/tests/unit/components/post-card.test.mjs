/**
 * PostCard Component Tests
 * Validates action dispatch flow and DOM updates
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
const createSamplePost = (overrides = {}) => ({
  id: 'post-123',
  content: 'This is a test post',
  created: new Date().toISOString(),
  upvotes: 5,
  downvotes: 2,
  commentCount: 3,
  aiGenerated: false,
  userVote: null,
  expand: {
    author: {
      id: 'author-123',
      displayName: 'Test Author'
    },
    categories: []
  },
  ...overrides
});

const createMockPocketBase = (isAuth = true, userId = 'user-123') => ({
  authStore: {
    isValid: isAuth,
    model: isAuth ? { id: userId, email: 'test@example.com' } : null
  }
});

let PostCardComponent;

const createLocalStorageMock = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
};

describe('PostCardComponent', () => {
  let dom;
  let originalConfirm;
  let feedState;
  let getStateMock;
  let dispatchMock;
  let actionsMock;
  let toastMock;
  let pb;
  let component;

  const setupDOM = () => {
    dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, { pretendToBeVisual: true });
    global.window = dom.window;
    global.document = dom.window.document;
    originalConfirm = global.confirm;
    global.confirm = () => true;
  };

  const cleanupDOM = () => {
    if (component?.eventTarget) {
      // no-op, retained for future cleanup hooks
    }
    dom?.window.close();
    global.window = undefined;
    global.document = undefined;
    global.confirm = originalConfirm;
  };

  beforeEach(async () => {
    setupDOM();
    global.localStorage = createLocalStorageMock();
    window.__TEST_MODE__ = true;

    ({ default: PostCardComponent } = await import('../../../public/components/post-card.js'));

    feedState = { posts: [] };
    getStateMock = mock.fn(() => ({ feed: feedState }));

    dispatchMock = mock.fn(async (action) => {
      if (typeof action === 'function') {
        return action(dispatchMock, getStateMock);
      }
      return action;
    });

    actionsMock = {
      updatePost: mock.fn((post) => ({ type: 'POST_UPDATE', payload: { post } })),
      votePost: mock.fn((postId, voteType) => async () => ({ postId, voteType })),
      deletePost: mock.fn((postId) => async () => ({ postId }))
    };

    toastMock = {
      showSuccess: mock.fn(),
      showError: mock.fn(),
      showWarning: mock.fn()
    };

    pb = createMockPocketBase(true, 'user-123');
    component = new PostCardComponent(pb, {}, {
      dispatch: dispatchMock,
      getState: getStateMock,
      actions: actionsMock,
      toast: toastMock
    });
  });

  afterEach(() => {
    dispatchMock.mock.resetCalls();
    actionsMock.updatePost.mock.resetCalls();
    actionsMock.votePost.mock.resetCalls();
    actionsMock.deletePost.mock.resetCalls();
    toastMock.showSuccess.mock.resetCalls();
    toastMock.showError.mock.resetCalls();
    toastMock.showWarning.mock.resetCalls();
    cleanupDOM();
    delete global.localStorage;
  });

  describe('Rendering', () => {
    it('renders post card with basic content', () => {
      const post = createSamplePost();
      const element = component.render(post);

      assert.ok(element.querySelector('.post-content'));
      assert.ok(element.querySelector('.post-actions'));
      assert.strictEqual(element.id, 'post-post-123');
    });

    it('displays author information and badges', () => {
      const post = createSamplePost({
        aiGenerated: true,
        aiPersona: 'Historian',
        expand: {
          author: { id: 'author-123', displayName: 'Historian' },
          categories: [{ name: 'tech' }]
        }
      });
      const element = component.render(post);

      assert.ok(element.querySelector('.author-name'));
      assert.ok(element.querySelector('.badge-ai'));
      assert.ok(element.querySelector('.badge-persona'));
      assert.strictEqual(element.querySelectorAll('.category-tag').length, 1);
    });
  });

  describe('Voting', () => {
    it('dispatches optimistic update and vote action', async () => {
      const post = createSamplePost();
      feedState.posts = [post];
      const element = component.render(post);
      document.body.appendChild(element);

      await component.handleVote('post-123', 'up');

      assert.strictEqual(actionsMock.updatePost.mock.calls.length, 1);
      const updatedPost = actionsMock.updatePost.mock.calls[0].arguments[0];
      assert.strictEqual(updatedPost.userVote, 'up');
      assert.strictEqual(actionsMock.votePost.mock.calls.length, 1);
      assert.strictEqual(actionsMock.votePost.mock.calls[0].arguments[0], 'post-123');
      assert.strictEqual(actionsMock.votePost.mock.calls[0].arguments[1], 'up');
    });

    it('shows warning when not authenticated', async () => {
      pb.authStore.isValid = false;
      await component.handleVote('post-123', 'up');
      assert.strictEqual(toastMock.showWarning.mock.calls.length, 1);
      assert.strictEqual(actionsMock.updatePost.mock.calls.length, 0);
    });

    it('emits vote events', async () => {
      const post = createSamplePost();
      feedState.posts = [post];
      let successFired = false;
      component.on('vote:success', (e) => {
        successFired = true;
        assert.strictEqual(e.detail.postId, 'post-123');
        assert.strictEqual(e.detail.voteType, 'down');
      });

      await component.handleVote('post-123', 'down');
      assert.strictEqual(successFired, true);
    });

    it('reverts optimistic update on failure', async () => {
      const post = createSamplePost();
      feedState.posts = [post];
      const originalVotePost = component.actions.votePost;
      component.actions.votePost = mock.fn(() => async () => {
        throw new Error('Network error');
      });

      await component.handleVote('post-123', 'up');

      assert.strictEqual(toastMock.showError.mock.calls.length, 1);
      // updatePost called twice: optimistic + revert
      assert.strictEqual(actionsMock.updatePost.mock.calls.length, 2);
      const revertCall = actionsMock.updatePost.mock.calls[1].arguments[0];
      assert.strictEqual(revertCall.userVote, post.userVote);

      component.actions.votePost = originalVotePost;
    });
  });

  describe('Deletion', () => {
    it('dispatches delete action and removes DOM node', async () => {
      const post = createSamplePost();
      const element = component.render(post);
      document.body.appendChild(element);

      await component.handleDelete('post-123');

      assert.strictEqual(actionsMock.deletePost.mock.calls.length, 1);
      assert.strictEqual(actionsMock.deletePost.mock.calls[0].arguments[0], 'post-123');
      assert.strictEqual(toastMock.showSuccess.mock.calls.length, 1);
      assert.strictEqual(document.getElementById('post-post-123'), null);
    });

    it('handles delete errors gracefully', async () => {
      const post = createSamplePost();
      const element = component.render(post);
      document.body.appendChild(element);

      const originalDeletePost = component.actions.deletePost;
      component.actions.deletePost = mock.fn(() => async () => {
        throw new Error('Delete failed');
      });

      await component.handleDelete('post-123');

      assert.strictEqual(toastMock.showError.mock.calls.length, 1);
      assert.ok(document.getElementById('post-post-123'));

      component.actions.deletePost = originalDeletePost;
    });
  });

  describe('Comments', () => {
    it('emits comments:toggle event', () => {
      let toggled = false;
      component.on('comments:toggle', (e) => {
        toggled = true;
        assert.strictEqual(e.detail.postId, 'post-123');
      });

      component.toggleComments('post-123');
      assert.strictEqual(toggled, true);
    });

    it('updates comment count in DOM', () => {
      const post = createSamplePost();
      const element = component.render(post);
      document.body.appendChild(element);

      component.updateCommentCount('post-123', 42);
      const commentCount = element.querySelector('.comment-count').textContent;
      assert.strictEqual(commentCount, '42');
    });
  });
});
