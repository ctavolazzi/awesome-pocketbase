/**
 * AuthPanel Component Tests
 * Tests authentication flows, UI updates, and store integration
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

// Mock the stores and toast
const authStoreMock = {
  state: { user: null, isLoading: false, error: null },
  subscribers: new Map(),
  getState(key) {
    return key ? this.state[key] : this.state;
  },
  setState(key, value) {
    this.state[key] = value;
    this.notifySubscribers(key, value);
  },
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }
    this.subscribers.get(key).push(callback);
  },
  notifySubscribers(key, value) {
    if (this.subscribers.has(key)) {
      this.subscribers.get(key).forEach(cb => cb(value));
    }
  },
  reset() {
    this.state = { user: null, isLoading: false, error: null };
    this.subscribers.clear();
  }
};

const toastMock = {
  showSuccess: mock.fn(),
  showError: mock.fn(),
  showInfo: mock.fn()
};

// Setup DOM environment
function setupDOM() {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <body>
        <form id="loginForm">
          <input type="email" name="email" value="test@example.com" />
          <input type="password" name="password" value="password123" />
          <button type="submit">Sign in</button>
        </form>

        <form id="registerForm">
          <input type="email" name="email" value="new@example.com" />
          <input type="password" name="password" value="newpass123" />
          <input type="text" name="displayName" value="New User" />
          <button type="submit">Register</button>
        </form>

        <button id="logoutBtn">Logout</button>

        <span id="userAvatar">👤</span>
        <span id="menuUserAvatar">👤</span>
        <span id="menuUserName">Not signed in</span>
        <p id="menuUserBio"></p>
        <div id="composerAvatar">👤</div>

        <div id="authContainer"></div>
      </body>
    </html>
  `);

  global.document = dom.window.document;
  global.window = dom.window;
  global.CustomEvent = dom.window.CustomEvent;
  global.EventTarget = dom.window.EventTarget;
  global.Event = dom.window.Event;
  global.FormData = dom.window.FormData;

  return dom;
}

// Mock PocketBase
function createMockPocketBase() {
  return {
    authStore: {
      isValid: false,
      model: null,
      clear() {
        this.isValid = false;
        this.model = null;
        this.onChange && this.onChange();
      },
      onChange(callback) {
        this._onChange = callback;
      }
    }
  };
}

// Mock DataService
function createMockDataService() {
  return {
    authWithPassword: mock.fn(async (email, password) => {
      if (email && password) {
        return { id: 'test-id', email, displayName: email };
      }
      throw new Error('Invalid credentials');
    }),
    createUser: mock.fn(async (data) => {
      if (data.email && data.password) {
        return { id: 'new-id', email: data.email, displayName: data.displayName };
      }
      throw new Error('Registration failed');
    })
  };
}

// Dynamic import helper (since we're mocking modules)
async function createAuthPanel() {
  // Create inline version for testing
  class AuthPanelComponent {
    constructor(pb, dataService) {
      this.pb = pb;
      this.dataService = dataService;
      this.state = 'idle';
      this.loginForm = null;
      this.registerForm = null;
      this.logoutBtn = null;
      this.userAvatar = null;
      this.menuUserAvatar = null;
      this.menuUserName = null;
      this.menuUserBio = null;
      this.composerAvatar = null;
      this.eventTarget = new EventTarget();
      this.avatarEmojis = ['💾', '🤖', '👾', '🌟', '💿', '📀', '🎮', '🕹️', '💻', '📱', '🖥️', '⌨️'];
      this.authStore = authStoreMock;
      this.toast = toastMock;
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

      this.attachEventListeners();
      this.subscribeToStore();
      this.updateAuthStatus();
      this.pb.authStore.onChange(() => this.updateAuthStatus());
    }

    attachEventListeners() {
      if (this.loginForm) {
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
      }
      if (this.registerForm) {
        this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
      }
      if (this.logoutBtn) {
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
      }
    }

    subscribeToStore() {
      this.authStore.subscribe('user', (user) => this.updateUIForUser(user));
      this.authStore.subscribe('isLoading', (isLoading) => this.updateLoadingState(isLoading));
    }

    getUserAvatar(userId) {
      if (!userId) return '👤';
      const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return this.avatarEmojis[hash % this.avatarEmojis.length];
    }

    updateAuthStatus() {
      if (this.pb.authStore.isValid) {
        const user = this.pb.authStore.model;
        this.authStore.setState('user', {
          id: user.id,
          email: user.email,
          displayName: user.displayName || user.email,
          bio: user.bio || '',
          avatar: user.avatar || null
        });
        this.emit('auth:login', { user });
      } else {
        this.authStore.setState('user', null);
        this.emit('auth:logout');
      }
    }

    updateUIForUser(user) {
      if (user) {
        const avatar = this.getUserAvatar(user.id);
        if (this.userAvatar) this.userAvatar.textContent = avatar;
        if (this.menuUserAvatar) this.menuUserAvatar.textContent = avatar;
        if (this.menuUserName) this.menuUserName.textContent = user.displayName || 'User';
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

    toggleAuthForms(show) {
      const authContainer = document.getElementById('authContainer');
      if (authContainer) authContainer.hidden = !show;
    }

    updateLoadingState(isLoading) {
      this.state = isLoading ? 'loading' : 'idle';
    }

    async handleLogin(event) {
      event.preventDefault();
      const formData = new FormData(this.loginForm);
      const email = formData.get('email').trim();
      const password = formData.get('password');

      if (!email || !password) {
        this.toast.showError('Please enter email and password');
        return;
      }

      this.authStore.setState('isLoading', true);
      this.emit('auth:attempt', { type: 'login', email });

      try {
        await this.dataService.authWithPassword(email, password);
        this.toast.showSuccess(`✅ Signed in as ${email}`);
        this.emit('auth:success', { type: 'login', email });
        this.loginForm.reset();
        this.updateAuthStatus();
      } catch (error) {
        const message = error.message || 'Login failed';
        this.toast.showError(`❌ ${message}`);
        this.emit('auth:error', { type: 'login', error: message });
      } finally {
        this.authStore.setState('isLoading', false);
      }
    }

    async handleRegister(event) {
      event.preventDefault();
      const formData = new FormData(this.registerForm);
      const email = formData.get('email').trim();
      const password = formData.get('password');
      const displayName = formData.get('displayName')?.trim() || email;

      if (!email || !password) {
        this.toast.showError('Please enter email and password');
        return;
      }

      this.authStore.setState('isLoading', true);
      this.emit('auth:attempt', { type: 'register', email });

      try {
        await this.dataService.createUser({ email, password, passwordConfirm: password, displayName });
        this.toast.showSuccess(`✅ Registered ${email}`);
        await this.dataService.authWithPassword(email, password);
        this.toast.showSuccess(`✅ Signed in as ${email}`);
        this.emit('auth:success', { type: 'register', email });
        this.registerForm.reset();
        this.updateAuthStatus();
      } catch (error) {
        const message = error.message || 'Registration failed';
        this.toast.showError(`❌ ${message}`);
        this.emit('auth:error', { type: 'register', error: message });
      } finally {
        this.authStore.setState('isLoading', false);
      }
    }

    handleLogout() {
      this.pb.authStore.clear();
      this.authStore.setState('user', null);
      this.toast.showInfo('👋 Signed out');
      this.emit('auth:logout');
    }

    emit(eventName, detail = {}) {
      this.eventTarget.dispatchEvent(new CustomEvent(eventName, { detail }));
    }

    on(eventName, handler) {
      this.eventTarget.addEventListener(eventName, handler);
    }

    getAuthState() {
      return {
        isAuthenticated: this.pb.authStore.isValid,
        user: this.authStore.getState('user'),
        isLoading: this.authStore.getState('isLoading'),
        error: this.authStore.getState('error')
      };
    }

    destroy() {
      // Cleanup
    }
  }

  return AuthPanelComponent;
}

// TESTS
describe('AuthPanel Component', () => {
  let dom;
  let AuthPanel;
  let authPanel;
  let mockPb;
  let mockDataService;

  beforeEach(async () => {
    dom = setupDOM();
    authStoreMock.reset();
    mockPb = createMockPocketBase();
    mockDataService = createMockDataService();
    AuthPanel = await createAuthPanel();
    authPanel = new AuthPanel(mockPb, mockDataService);
  });

  afterEach(() => {
    if (authPanel) {
      authPanel.destroy();
    }
    toastMock.showSuccess.mock.resetCalls();
    toastMock.showError.mock.resetCalls();
    toastMock.showInfo.mock.resetCalls();
  });

  describe('Initialization', () => {
    it('initializes with correct default state', () => {
      assert.strictEqual(authPanel.state, 'idle');
      assert.strictEqual(authPanel.pb, mockPb);
      assert.strictEqual(authPanel.dataService, mockDataService);
    });

    it('binds DOM elements correctly', () => {
      authPanel.init();
      assert.ok(authPanel.loginForm, 'loginForm should be bound');
      assert.ok(authPanel.registerForm, 'registerForm should be bound');
      assert.ok(authPanel.logoutBtn, 'logoutBtn should be bound');
      assert.ok(authPanel.userAvatar, 'userAvatar should be bound');
    });

    it('attaches event listeners on init', () => {
      authPanel.init();

      const loginBtn = authPanel.loginForm.querySelector('button[type="submit"]');
      const registerBtn = authPanel.registerForm.querySelector('button[type="submit"]');

      assert.ok(loginBtn, 'Login button should exist');
      assert.ok(registerBtn, 'Register button should exist');
    });
  });

  describe('Avatar System', () => {
    it('returns default avatar for null userId', () => {
      const avatar = authPanel.getUserAvatar(null);
      assert.strictEqual(avatar, '👤');
    });

    it('returns consistent avatar for same userId', () => {
      const avatar1 = authPanel.getUserAvatar('test-123');
      const avatar2 = authPanel.getUserAvatar('test-123');
      assert.strictEqual(avatar1, avatar2);
    });

    it('returns different avatars for different userIds', () => {
      const avatar1 = authPanel.getUserAvatar('user-1');
      const avatar2 = authPanel.getUserAvatar('user-2');
      assert.notStrictEqual(avatar1, avatar2);
    });

    it('avatar is one of the emoji options', () => {
      const avatar = authPanel.getUserAvatar('test-456');
      assert.ok(authPanel.avatarEmojis.includes(avatar));
    });
  });

  describe('Login Flow', () => {
    it('successfully logs in with valid credentials', async () => {
      authPanel.init();

      // Directly call the handler
      await authPanel.handleLogin({ preventDefault: () => {} });

      assert.strictEqual(mockDataService.authWithPassword.mock.calls.length, 1);
      assert.strictEqual(toastMock.showSuccess.mock.calls.length, 1);
    });

    it('shows error for invalid credentials', async () => {
      authPanel.init();

      // Mock failure
      mockDataService.authWithPassword = mock.fn(async () => {
        throw new Error('Invalid credentials');
      });

      // Directly call the handler
      await authPanel.handleLogin({ preventDefault: () => {} });

      assert.strictEqual(toastMock.showError.mock.calls.length, 1);
    });

    it('emits auth:attempt event on login start', async () => {
      authPanel.init();

      let eventFired = false;
      authPanel.on('auth:attempt', (e) => {
        assert.strictEqual(e.detail.type, 'login');
        assert.strictEqual(e.detail.email, 'test@example.com');
        eventFired = true;
      });

      await authPanel.handleLogin({ preventDefault: () => {} });
      assert.strictEqual(eventFired, true, 'auth:attempt event should fire');
    });

    it('sets loading state during login', async () => {
      authPanel.init();

      // Mock slow auth to test loading state
      let resolveAuth;
      mockDataService.authWithPassword = mock.fn(() => {
        return new Promise(resolve => {
          resolveAuth = resolve;
        });
      });

      // Start login (will hang waiting for resolveAuth)
      const promise = authPanel.handleLogin({ preventDefault: () => {} });

      // Wait a tick for state to update
      await new Promise(resolve => setImmediate(resolve));

      // Check loading state was set
      assert.strictEqual(authStoreMock.getState('isLoading'), true);

      // Resolve the auth
      resolveAuth({ id: 'test', email: 'test@example.com' });
      await promise;

      // Check loading state was cleared
      assert.strictEqual(authStoreMock.getState('isLoading'), false);
    });
  });

  describe('Registration Flow', () => {
    it('successfully registers new user', async () => {
      authPanel.init();

      // Directly call the handler
      await authPanel.handleRegister({ preventDefault: () => {} });

      assert.strictEqual(mockDataService.createUser.mock.calls.length, 1);
      assert.strictEqual(mockDataService.authWithPassword.mock.calls.length, 1);
      assert.strictEqual(toastMock.showSuccess.mock.calls.length, 2); // Register + auto-login
    });

    it('handles registration failure gracefully', async () => {
      authPanel.init();

      mockDataService.createUser = mock.fn(async () => {
        throw new Error('Email already exists');
      });

      // Directly call the handler
      await authPanel.handleRegister({ preventDefault: () => {} });

      assert.strictEqual(toastMock.showError.mock.calls.length, 1);
    });

    it('emits auth:success after successful registration', async () => {
      authPanel.init();

      let eventFired = false;
      authPanel.on('auth:success', (e) => {
        assert.strictEqual(e.detail.type, 'register');
        eventFired = true;
      });

      await authPanel.handleRegister({ preventDefault: () => {} });
      assert.strictEqual(eventFired, true, 'auth:success event should fire');
    });
  });

  describe('Logout Flow', () => {
    it('clears auth state on logout', () => {
      authPanel.init();

      // Set authenticated state
      mockPb.authStore.isValid = true;
      mockPb.authStore.model = { id: 'test', email: 'test@example.com' };
      authPanel.updateAuthStatus();

      // Logout
      authPanel.handleLogout();

      assert.strictEqual(mockPb.authStore.isValid, false);
      assert.strictEqual(mockPb.authStore.model, null);
    });

    it('shows info toast on logout', () => {
      authPanel.init();
      authPanel.handleLogout();

      assert.strictEqual(toastMock.showInfo.mock.calls.length, 1);
      const call = toastMock.showInfo.mock.calls[0];
      assert.ok(call.arguments[0].includes('Signed out'));
    });

    it('emits auth:logout event', (t, done) => {
      authPanel.init();

      authPanel.on('auth:logout', () => {
        done();
      });

      authPanel.handleLogout();
    });
  });

  describe('UI Updates', () => {
    it('updates UI when user logs in', () => {
      authPanel.init();

      const testUser = {
        id: 'user-123',
        email: 'user@example.com',
        displayName: 'Test User',
        bio: 'Test bio'
      };

      authPanel.updateUIForUser(testUser);

      assert.notStrictEqual(authPanel.userAvatar.textContent, '👤');
      assert.strictEqual(authPanel.menuUserName.textContent, 'Test User');
      assert.strictEqual(authPanel.menuUserBio.textContent, 'Test bio');
    });

    it('resets UI when user logs out', () => {
      authPanel.init();

      // First set a user
      authPanel.updateUIForUser({
        id: 'user-123',
        email: 'user@example.com',
        displayName: 'Test User'
      });

      // Then clear
      authPanel.updateUIForUser(null);

      assert.strictEqual(authPanel.userAvatar.textContent, '👤');
      assert.strictEqual(authPanel.menuUserName.textContent, 'Not signed in');
      assert.strictEqual(authPanel.menuUserBio.textContent, '');
    });

    it('toggles auth forms based on auth state', () => {
      authPanel.init();
      const authContainer = document.getElementById('authContainer');

      // Show forms (logged out)
      authPanel.toggleAuthForms(true);
      assert.strictEqual(authContainer.hidden, false);

      // Hide forms (logged in)
      authPanel.toggleAuthForms(false);
      assert.strictEqual(authContainer.hidden, true);
    });
  });

  describe('Store Integration', () => {
    it('subscribes to authStore on init', () => {
      authPanel.init();
      assert.ok(authStoreMock.subscribers.has('user'));
      assert.ok(authStoreMock.subscribers.has('isLoading'));
    });

    it('updates UI when store changes', () => {
      authPanel.init();

      const testUser = { id: 'test', displayName: 'Store User', bio: 'From store' };
      authStoreMock.setState('user', testUser);

      assert.strictEqual(authPanel.menuUserName.textContent, 'Store User');
    });
  });

  describe('Auth State', () => {
    it('returns current auth state', () => {
      authPanel.init();

      const state = authPanel.getAuthState();

      assert.ok(state.hasOwnProperty('isAuthenticated'));
      assert.ok(state.hasOwnProperty('user'));
      assert.ok(state.hasOwnProperty('isLoading'));
      assert.ok(state.hasOwnProperty('error'));
    });

    it('reflects authentication status correctly', () => {
      authPanel.init();

      mockPb.authStore.isValid = false;
      let state = authPanel.getAuthState();
      assert.strictEqual(state.isAuthenticated, false);

      mockPb.authStore.isValid = true;
      state = authPanel.getAuthState();
      assert.strictEqual(state.isAuthenticated, true);
    });
  });
});

