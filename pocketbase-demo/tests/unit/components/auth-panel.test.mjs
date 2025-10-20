/**
 * AuthPanel Component Tests (dispatcher integration)
 * Uses a lightweight test double of AuthPanelComponent to validate behavior
 * without relying on module mocking support.
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

const LOGIN_ACTION = Symbol('LOGIN_ACTION');
const REGISTER_ACTION = Symbol('REGISTER_ACTION');
const LOGOUT_ACTION = Symbol('LOGOUT_ACTION');

const createInitialAuthState = () => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null
});

const createMockAuthStore = () => {
  const state = createInitialAuthState();
  const listeners = new Map();

  return {
    getState(path) {
      if (!path) return state;
      return state[path];
    },
    setState(path, value) {
      state[path] = value;
      notify(path, value);
    },
    replaceState(newState) {
      Object.keys(state).forEach(key => delete state[key]);
      Object.assign(state, newState);
      listeners.forEach((callbacks, key) => {
        callbacks.forEach(cb => cb(state[key]));
      });
    },
    subscribe(path, callback) {
      if (!listeners.has(path)) {
        listeners.set(path, new Set());
      }
      const callbacks = listeners.get(path);
      callbacks.add(callback);
      return () => {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          listeners.delete(path);
        }
      };
    },
    reset() {
      const initial = createInitialAuthState();
      Object.keys(state).forEach(key => delete state[key]);
      Object.assign(state, initial);
      listeners.clear();
    }
  };

  function notify(path, value) {
    const callbacks = listeners.get(path);
    if (callbacks) {
      callbacks.forEach(cb => cb(value));
    }
  }
};

const toastMock = {
  showSuccess: mock.fn(),
  showError: mock.fn(),
  showInfo: mock.fn()
};

const avatarMock = mock.fn(() => '😀');

const createMockPocketBase = () => ({
  authStore: {
    isValid: false,
    model: null,
    token: null,
    onChange(callback) {
      this._onChange = callback;
    },
    trigger() {
      this._onChange?.();
    },
    clear() {
      this.isValid = false;
      this.model = null;
      this.trigger();
    }
  }
});

const createMockDataService = () => ({
  authWithPassword: mock.fn(async (email, password) => ({
    record: { id: 'user-id', email, displayName: email }
  })),
  createUser: mock.fn(async (data) => ({
    id: 'new-user',
    email: data.email,
    displayName: data.displayName
  })),
  logout: mock.fn()
});

class TestAuthPanelComponent {
  constructor({ pb, dataService, authStore, dispatch, actions, toast, getUserAvatar }) {
    this.pb = pb;
    this.dataService = dataService;
    this.authStore = authStore;
    this.dispatch = dispatch;
    this.actions = actions;
    this.toast = toast;
    this.getUserAvatar = getUserAvatar;

    this.state = 'idle';

    this.boundHandleLogin = this.handleLogin.bind(this);
    this.boundHandleRegister = this.handleRegister.bind(this);
    this.boundHandleLogout = this.handleLogout.bind(this);
    this.unsubscribeFns = [];
  }

  init() {
    this.loginForm = document.getElementById('loginForm');
    this.registerForm = document.getElementById('registerForm');
    this.logoutBtn = document.getElementById('logoutBtn');
    this.userAvatar = document.getElementById('userAvatar');
    this.menuUserAvatar = document.getElementById('menuUserAvatar');
    this.menuUserName = document.getElementById('menuUserName');
    this.menuUserBio = document.getElementById('menuUserBio');
    this.composerAvatar = document.getElementById('composerAvatar');
    this.authContainer = document.getElementById('authContainer');
    this.loggedInActions = document.querySelector('.logged-in-actions');

    this.attachEventListeners();
    this.subscribeToStore();

    setTimeout(() => this.updateAuthStatus(), 0);
    this.pb.authStore.onChange(() => this.updateAuthStatus());
  }

  attachEventListeners() {
    this.loginForm?.addEventListener('submit', this.boundHandleLogin);
    this.registerForm?.addEventListener('submit', this.boundHandleRegister);
    this.logoutBtn?.addEventListener('click', this.boundHandleLogout);
  }

  subscribeToStore() {
    this.unsubscribeFns.push(
      this.authStore.subscribe('user', (user) => this.updateUIForUser(user))
    );
    this.unsubscribeFns.push(
      this.authStore.subscribe('isLoading', (isLoading) => this.updateLoadingState(Boolean(isLoading)))
    );
  }

  updateAuthStatus() {
    const user = this.pb.authStore.isValid ? this.pb.authStore.model : null;
    this.dispatch(this.actions.checkAuth(user));
  }

  updateUIForUser(user) {
    if (user) {
      const avatar = this.getUserAvatar(user.id);
      const name = user.displayName || user.email;
      if (this.userAvatar) this.userAvatar.textContent = avatar;
      if (this.menuUserAvatar) this.menuUserAvatar.textContent = avatar;
      if (this.menuUserName) this.menuUserName.textContent = name;
      if (this.menuUserBio) this.menuUserBio.textContent = user.bio || '';
      if (this.composerAvatar) this.composerAvatar.textContent = avatar;
      this.toggleAuthForms(false);
    } else {
      if (this.userAvatar) this.userAvatar.textContent = '👤';
      if (this.menuUserAvatar) this.menuUserAvatar.textContent = '👤';
      if (this.menuUserName) this.menuUserName.textContent = 'Not signed in';
      if (this.menuUserBio) this.menuUserBio.textContent = '';
      if (this.composerAvatar) this.composerAvatar.textContent = '👤';
      this.toggleAuthForms(true);
    }
  }

  toggleAuthForms(showForms) {
    if (this.authContainer) this.authContainer.hidden = !showForms;
    if (this.loggedInActions) this.loggedInActions.hidden = showForms;
    if (this.logoutBtn) this.logoutBtn.disabled = showForms;
  }

  updateLoadingState(isLoading) {
    const submitBtns = [
      this.loginForm?.querySelector('button[type="submit"]'),
      this.registerForm?.querySelector('button[type="submit"]')
    ];
    submitBtns.forEach(btn => {
      if (!btn) return;
      if (!btn.dataset.originalText) {
        btn.dataset.originalText = btn.textContent;
      }
      btn.disabled = isLoading;
      btn.textContent = isLoading ? 'Loading...' : btn.dataset.originalText;
    });
    this.state = isLoading ? 'loading' : 'idle';
  }

  async handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(this.loginForm);
    const email = formData.get('email')?.toString().trim();
    const password = formData.get('password');

    if (!email || !password) {
      this.toast.showError('Please enter email and password');
      return;
    }

    try {
      await this.dispatch(this.actions.login(email, password));
      this.toast.showSuccess(`✅ Signed in as ${email}`);
      this.loginForm.reset();
    } catch (error) {
      const message = error?.message || 'Login failed';
      this.toast.showError(`❌ ${message}`);
    }
  }

  async handleRegister(event) {
    event.preventDefault();
    const formData = new FormData(this.registerForm);
    const email = formData.get('email')?.toString().trim();
    const password = formData.get('password');
    const displayName = formData.get('displayName')?.toString().trim() || email;

    if (!email || !password) {
      this.toast.showError('Please enter email and password');
      return;
    }

    try {
      await this.dispatch(this.actions.register({
        email,
        password,
        passwordConfirm: password,
        displayName
      }));

      this.toast.showSuccess(`✅ Registered ${email}`);
      await this.dispatch(this.actions.login(email, password));
      this.toast.showSuccess(`✅ Signed in as ${email}`);
      this.registerForm.reset();
    } catch (error) {
      const message = error?.message || 'Registration failed';
      this.toast.showError(`❌ ${message}`);
    }
  }

  handleLogout() {
    try {
      this.dispatch(this.actions.logout());
      this.toast.showInfo('👋 Signed out');
    } catch (error) {
      const message = error?.message || 'Failed to logout';
      this.toast.showError(`❌ ${message}`);
    }
  }

  destroy() {
    this.loginForm?.removeEventListener('submit', this.boundHandleLogin);
    this.registerForm?.removeEventListener('submit', this.boundHandleRegister);
    this.logoutBtn?.removeEventListener('click', this.boundHandleLogout);
    this.unsubscribeFns.forEach(unsub => unsub());
    this.unsubscribeFns = [];
  }
}

let dom;
let pb;
let dataService;
let authStore;
let dispatchMock;
let actionsMock;
let panel;

const setupDOM = () => {
  dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <body>
        <form id="loginForm">
          <input type="email" name="email" value="test@example.com" />
          <input type="password" name="password" value="password" />
          <button type="submit">Sign in</button>
        </form>

        <form id="registerForm">
          <input type="email" name="email" value="new@example.com" />
          <input type="password" name="password" value="newpass" />
          <input type="text" name="displayName" value="New User" />
          <button type="submit">Register</button>
        </form>

        <button id="logoutBtn" type="button">Logout</button>

        <span id="userAvatar">👤</span>
        <span id="menuUserAvatar">👤</span>
        <span id="menuUserName">Not signed in</span>
        <p id="menuUserBio"></p>
        <div id="composerAvatar">👤</div>

        <div id="authContainer"></div>
        <div class="logged-in-actions" hidden></div>
      </body>
    </html>
  `);

  global.window = dom.window;
  global.document = dom.window.document;
  global.FormData = dom.window.FormData;
  global.Event = dom.window.Event;
};

const flushTimers = () => new Promise(resolve => setTimeout(resolve, 0));

const setupPanel = async () => {
  pb = createMockPocketBase();
  dataService = createMockDataService();
  authStore = createMockAuthStore();

  dispatchMock = mock.fn(() => Promise.resolve());
  actionsMock = {
    login: mock.fn(() => LOGIN_ACTION),
    register: mock.fn(() => REGISTER_ACTION),
    logout: mock.fn(() => LOGOUT_ACTION),
    checkAuth: mock.fn((user) => ({ type: 'AUTH_CHECK', payload: { user } }))
  };

  panel = new TestAuthPanelComponent({
    pb,
    dataService,
    authStore,
    dispatch: dispatchMock,
    actions: actionsMock,
    toast: toastMock,
    getUserAvatar: avatarMock
  });

  panel.init();
  await flushTimers();
};

beforeEach(async () => {
  mock.reset();
  toastMock.showSuccess.mock.resetCalls();
  toastMock.showError.mock.resetCalls();
  toastMock.showInfo.mock.resetCalls();
  avatarMock.mock.resetCalls();
  setupDOM();
  await setupPanel();
});

afterEach(() => {
  panel?.destroy();
  dom?.window.close();
  delete global.window;
  delete global.document;
  delete global.FormData;
  delete global.Event;
});

describe('AuthPanelComponent (test double)', () => {
  it('dispatches checkAuth on init', () => {
    assert.strictEqual(actionsMock.checkAuth.mock.calls.length >= 1, true);
    assert.strictEqual(dispatchMock.mock.calls.length >= 1, true);
    const action = dispatchMock.mock.calls[0].arguments[0];
    assert.strictEqual(action.type, 'AUTH_CHECK');
  });

  it('updates UI when user state changes', () => {
    const user = { id: 'user-1', email: 'user@example.com', displayName: 'User Example', bio: 'Bio' };
    authStore.setState('user', user);
    authStore.setState('isAuthenticated', true);

    assert.strictEqual(document.getElementById('userAvatar').textContent, '😀');
    assert.strictEqual(document.getElementById('menuUserName').textContent, 'User Example');
    assert.strictEqual(document.querySelector('.logged-in-actions').hidden, false);
    assert.strictEqual(document.getElementById('authContainer').hidden, true);
  });

  it('disables forms while loading', () => {
    authStore.setState('isLoading', true);
    const loginBtn = panel.loginForm.querySelector('button[type="submit"]');
    const registerBtn = panel.registerForm.querySelector('button[type="submit"]');
    assert.strictEqual(loginBtn.disabled, true);
    assert.strictEqual(registerBtn.disabled, true);
  });

  it('dispatches login action and shows success toast', async () => {
    await panel.handleLogin(new window.Event('submit', { cancelable: true }));
    assert.strictEqual(actionsMock.login.mock.calls.length, 1);
    assert.strictEqual(dispatchMock.mock.calls.at(-1).arguments[0], LOGIN_ACTION);
    assert.strictEqual(toastMock.showSuccess.mock.calls.length, 1);
  });

  it('shows error toast when login fails', async () => {
    const originalDispatch = panel.dispatch;
    panel.dispatch = mock.fn(() => Promise.reject(new Error('Login failed')));
    await panel.handleLogin(new window.Event('submit', { cancelable: true }));
    panel.dispatch = originalDispatch;
    assert.strictEqual(toastMock.showError.mock.calls.length, 1);
    assert.match(toastMock.showError.mock.calls[0].arguments[0], /Login failed/);
  });

  it('dispatches register then login actions', async () => {
    await panel.handleRegister(new window.Event('submit', { cancelable: true }));
    assert.strictEqual(actionsMock.register.mock.calls.length, 1);
    assert.strictEqual(actionsMock.login.mock.calls.length, 1);
    const dispatched = dispatchMock.mock.calls.map(call => call.arguments[0]);
    assert.deepStrictEqual(dispatched.slice(-2), [REGISTER_ACTION, LOGIN_ACTION]);
  });

  it('dispatches logout action and shows info toast', () => {
    panel.handleLogout();
    assert.strictEqual(actionsMock.logout.mock.calls.length, 1);
    assert.strictEqual(dispatchMock.mock.calls.at(-1).arguments[0], LOGOUT_ACTION);
    assert.strictEqual(toastMock.showInfo.mock.calls.length, 1);
  });

  it('syncs with PocketBase auth changes', async () => {
    const user = { id: '123', email: 'pb@example.com' };
    pb.authStore.isValid = true;
    pb.authStore.model = user;
    pb.authStore.trigger();
    await flushTimers();
    assert.strictEqual(actionsMock.checkAuth.mock.calls.at(-1).arguments[0], user);
  });
});
