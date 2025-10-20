/**
 * Composer Component Tests
 * Validates dispatcher-driven post creation flow
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

let ComposerComponent;

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
      <div class="composer-modern" id="composerCard">
        <form id="composerForm">
          <textarea name="content"></textarea>
          <select id="categorySelect" multiple>
            <option value="cat-1" selected>Category 1</option>
            <option value="cat-2">Category 2</option>
          </select>
          <button type="submit">Post</button>
        </form>
        <div id="charCount">0 / 420</div>
      </div>
    </body>
  </html>
`;

describe('ComposerComponent', () => {
  let dom;
  let component;
  let dispatchMock;
  let actionsMock;
  let toastMock;
  let pb;
  let dataService;

  const setupDOM = () => {
    dom = new JSDOM(createDOM(), { pretendToBeVisual: true });
    global.window = dom.window;
    global.document = dom.window.document;
    global.CustomEvent = dom.window.CustomEvent;
    global.EventTarget = dom.window.EventTarget;
    global.localStorage = createLocalStorageMock();
    window.__TEST_MODE__ = true;
  };

  const teardownDOM = () => {
    dom?.window.close();
    global.window = undefined;
    global.document = undefined;
    global.CustomEvent = undefined;
    global.EventTarget = undefined;
    global.localStorage = undefined;
  };

  beforeEach(async () => {
    setupDOM();

    dispatchMock = mock.fn(async (action) => {
      if (typeof action === 'function') {
        return action(dispatchMock);
      }
      return action;
    });

    actionsMock = {
      createPost: mock.fn((payload) => async () => payload)
    };

    toastMock = {
      showSuccess: mock.fn(),
      showError: mock.fn(),
      showWarning: mock.fn()
    };

    pb = {
      authStore: {
        isValid: true,
        model: {
          id: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User'
        }
      }
    };

    dataService = {};

    ({ default: ComposerComponent } = await import('../../../public/components/composer.js'));

    component = new ComposerComponent(pb, dataService, {
      dispatch: dispatchMock,
      actions: actionsMock,
      toast: toastMock
    });

    component.init('composerForm');
  });

  afterEach(() => {
    dispatchMock.mock.resetCalls();
    actionsMock.createPost.mock.resetCalls();
    toastMock.showSuccess.mock.resetCalls();
    toastMock.showError.mock.resetCalls();
    toastMock.showWarning.mock.resetCalls();
    teardownDOM();
  });

  it('shows warning when user not authenticated', async () => {
    pb.authStore.isValid = false;
    await component.handleSubmit(new window.Event('submit', { cancelable: true }));

    assert.strictEqual(toastMock.showWarning.mock.calls.length, 1);
    assert.strictEqual(actionsMock.createPost.mock.calls.length, 0);
  });

  it('dispatches createPost and resets form on success', async () => {
    component.textarea.value = 'Hello world';
    await component.handleSubmit(new window.Event('submit', { cancelable: true }));

    assert.strictEqual(actionsMock.createPost.mock.calls.length, 1);
    const payload = actionsMock.createPost.mock.calls[0].arguments[0];
    assert.ok(payload.title.includes('Hello'));
    assert.strictEqual(payload.author, 'user-123');
    assert.strictEqual(dispatchMock.mock.calls.length >= 1, true);
    assert.strictEqual(toastMock.showSuccess.mock.calls.length, 1);
    assert.strictEqual(component.textarea.value, '');
  });

  it('emits composer submit events for logging', async () => {
    component.textarea.value = 'Hello events';

    let startCalled = false;
    let successCalled = false;
    window.addEventListener('composer:submit', function handler(e) {
      if (e.detail?.status === 'start') startCalled = true;
      if (e.detail?.status === 'success') successCalled = true;
    }, { once: false });

    await component.handleSubmit(new window.Event('submit', { cancelable: true }));

    assert.ok(startCalled);
    assert.ok(successCalled);
  });

  it('shows error when dispatch fails', async () => {
    const originalCreatePost = component.actions.createPost;
    component.actions.createPost = mock.fn(() => async () => {
      throw new Error('Create failed');
    });

    component.textarea.value = 'Async error';
    await component.handleSubmit(new window.Event('submit', { cancelable: true }));

    assert.strictEqual(toastMock.showError.mock.calls.length, 1);
    assert.match(toastMock.showError.mock.calls[0].arguments[0], /Create failed/);

    component.actions.createPost = originalCreatePost;
  });
});
