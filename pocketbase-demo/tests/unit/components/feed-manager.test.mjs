/**
 * FeedManager Component Tests
 * Validates dispatcher-driven feed loading and rendering
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
let FeedManagerComponent;

const createMockFeedStore = () => {
  const state = {
    posts: [],
    isLoading: false,
    hasMore: true,
    currentPage: 1,
    newPostsAvailable: 0
  };

  const subscribers = new Map();

  const notify = (key, value) => {
    const callbacks = subscribers.get(key);
    if (callbacks) {
      callbacks.forEach(cb => cb(value));
    }
  };

  return {
    getState(path) {
      if (!path) return state;
      return state[path];
    },
    setState(path, value) {
      state[path] = value;
      notify(path, value);
    },
    update(partial) {
      Object.entries(partial).forEach(([key, value]) => {
        state[key] = value;
        notify(key, value);
      });
    },
    subscribe(path, callback) {
      if (!subscribers.has(path)) {
        subscribers.set(path, new Set());
      }
      const set = subscribers.get(path);
      set.add(callback);
      return () => {
        set.delete(callback);
        if (set.size === 0) {
          subscribers.delete(path);
        }
      };
    }
  };
};

const createLocalStorageMock = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
};

const createDOM = () => `
  <!DOCTYPE html>
  <html>
    <body>
      <div id="postsList"></div>
      <div id="loadingIndicator" hidden></div>
      <div id="endOfFeed" hidden></div>
      <div id="newPostsIndicator" hidden>
        <span id="newPostsCount">0</span>
      </div>
      <button id="viewNewPostsBtn" type="button">View new posts</button>
    </body>
  </html>
`;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('FeedManagerComponent', () => {
  let dom;
  let component;
  let mockFeedStore;
  let dispatchMock;
  let actionsMock;
  let toastMock;
  let postCardRenderer;

  beforeEach(async () => {
    dom = new JSDOM(createDOM(), { pretendToBeVisual: true });
    global.window = dom.window;
    global.document = dom.window.document;
    global.CustomEvent = dom.window.CustomEvent;
    global.EventTarget = dom.window.EventTarget;
    global.localStorage = createLocalStorageMock();
    window.__TEST_MODE__ = true;
    window.scrollTo = () => {};

    ({ default: FeedManagerComponent } = await import('../../../public/components/feed-manager.js'));

    mockFeedStore = createMockFeedStore();

    dispatchMock = mock.fn(async (action) => {
      if (typeof action === 'function') {
        return action(dispatchMock, () => ({ feed: mockFeedStore.getState() }));
      }
      return action;
    });

    actionsMock = {
      loadPosts: mock.fn((page, perPage) => async () => {
        mockFeedStore.update({
          isLoading: true
        });
        const posts = Array.from({ length: perPage }, (_, idx) => ({
          id: `post-${page}-${idx}`,
          created: new Date().toISOString(),
          content: `Post ${page}-${idx}`
        }));
        mockFeedStore.update({
          posts,
          currentPage: page,
          hasMore: false,
          isLoading: false
        });
      }),
      viewNewPosts: mock.fn(() => ({ type: 'FEED_NEW_POSTS_VIEWED' }))
    };

    toastMock = {
      showError: mock.fn(),
      showInfo: mock.fn()
    };

    postCardRenderer = {
      render: mock.fn((record) => {
        const el = document.createElement('div');
        el.className = 'post-card';
        el.id = `post-${record.id}`;
        return el;
      })
    };

    component = new FeedManagerComponent(postCardRenderer, null, {
      dispatch: dispatchMock,
      getState: () => ({ feed: mockFeedStore.getState() }),
      feedStore: mockFeedStore,
      actions: actionsMock,
      toast: {
        showError: toastMock.showError,
        showInfo: toastMock.showInfo
      }
    });
  });

  afterEach(() => {
    component?.destroy();
    dispatchMock.mock.resetCalls();
    actionsMock.loadPosts.mock.resetCalls();
    actionsMock.viewNewPosts.mock.resetCalls();
    toastMock.showError.mock.resetCalls();
    toastMock.showInfo.mock.resetCalls();
    postCardRenderer.render.mock.resetCalls();
    dom?.window.close();
    global.window = undefined;
    global.document = undefined;
    global.CustomEvent = undefined;
    global.EventTarget = undefined;
    global.localStorage = undefined;
  });

  it('dispatches loadPosts on init and renders posts from store', async () => {
    component.init();
    await flush();

    assert.strictEqual(actionsMock.loadPosts.mock.calls.length, 1);
    const [firstCallPage, firstCallPerPage] = actionsMock.loadPosts.mock.calls[0].arguments;
    assert.strictEqual(firstCallPage, 1);
    assert.strictEqual(firstCallPerPage, component.postsPerPage);

    const cards = document.querySelectorAll('.post-card');
    assert.ok(cards.length > 0);
    assert.strictEqual(component.currentPage, 1);
    assert.strictEqual(component.hasMorePosts, false);
  });

  it('re-renders when store posts change', async () => {
    component.init();
    await flush();

    mockFeedStore.update({
      posts: [
        { id: 'post-custom-1', created: new Date().toISOString(), content: 'Custom' }
      ]
    });
    await flush();

    const cards = document.querySelectorAll('.post-card');
    assert.strictEqual(cards.length, 1);
    assert.strictEqual(cards[0].id, 'post-post-custom-1');
  });

  it('shows error toast when load fails', async () => {
    const originalLoadPosts = component.actions.loadPosts;
    component.actions.loadPosts = () => async () => {
      throw new Error('Network down');
    };

    await component.loadPosts(1, false);

    assert.strictEqual(toastMock.showError.mock.calls.length, 1);
    assert.match(toastMock.showError.mock.calls[0].arguments[0], /Failed to load posts/);

    component.actions.loadPosts = originalLoadPosts;
  });

  it('dispatches viewNewPosts and refreshes feed', async () => {
    component.init();
    await flush();

    mockFeedStore.update({ newPostsAvailable: 3 });
    await flush();

    const loadCallCount = actionsMock.loadPosts.mock.calls.length;

    await component.viewNewPosts();
    await flush();

    assert.strictEqual(actionsMock.viewNewPosts.mock.calls.length, 1);
    assert.ok(actionsMock.loadPosts.mock.calls.length >= loadCallCount + 1);
    assert.strictEqual(component.newPostsCount, 0);
  });
});
