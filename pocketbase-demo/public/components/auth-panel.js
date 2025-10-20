/**
 * Authentication Panel Component
 * Handles login, registration, logout, and auth state display
 * Wired to authStore for reactive state management
 */

import { authStore } from '../store/auth.store.js';
import { dispatch } from '../store/dispatcher.js';
import { login, register, logout as logoutAction, checkAuth } from '../store/actions/auth.actions.js';
import { showSuccess, showError, showInfo } from './toast.js';
import { getUserAvatar } from '../utils/avatar.js';

export class AuthPanelComponent {
  constructor(pb, dataService) {
    this.pb = pb;
    this.dataService = dataService;
    this.state = 'idle'; // idle, loading, authenticated, error

    // DOM elements
    this.loginForm = null;
    this.registerForm = null;
    this.logoutBtn = null;
    this.userAvatar = null;
    this.menuUserAvatar = null;
    this.menuUserName = null;
    this.menuUserBio = null;
    this.composerAvatar = null;

    // Bound handlers (for add/remove symmetry)
    this.boundHandleLogin = this.handleLogin.bind(this);
    this.boundHandleRegister = this.handleRegister.bind(this);
    this.boundHandleLogout = this.handleLogout.bind(this);

    this.unsubscribeFns = [];
  }

  /**
   * Initialize the auth panel with DOM elements
   */
  init() {
    // Bind DOM elements
    this.loginForm = document.getElementById('loginForm');
    this.registerForm = document.getElementById('registerForm');
    this.logoutBtn = document.getElementById('logoutBtn');
    this.userAvatar = document.getElementById('userAvatar');
    this.menuUserAvatar = document.getElementById('menuUserAvatar');
    this.menuUserName = document.getElementById('menuUserName');
    this.menuUserBio = document.getElementById('menuUserBio');
    this.composerAvatar = document.getElementById('composerAvatar');

    // Attach event listeners
    this.attachEventListeners();

    // Subscribe to authStore changes
    this.subscribeToStore();

    // Initial auth status check (wait for dispatcher registration)
    setTimeout(() => this.updateAuthStatus(), 0);

    // Listen for PocketBase auth changes
    this.pb.authStore.onChange(() => this.updateAuthStatus());

    console.log('✅ AuthPanel initialized');
  }

  /**
   * Attach event listeners to forms and buttons
   */
  attachEventListeners() {
    if (this.loginForm) {
      this.loginForm.addEventListener('submit', this.boundHandleLogin);
    }

    if (this.registerForm) {
      this.registerForm.addEventListener('submit', this.boundHandleRegister);
    }

    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', this.boundHandleLogout);
    }
  }

  /**
   * Subscribe to authStore changes
   */
  subscribeToStore() {
    this.unsubscribeFns.push(
      authStore.subscribe('user', (user) => {
        this.updateUIForUser(user);
      })
    );

    this.unsubscribeFns.push(
      authStore.subscribe('isLoading', (isLoading) => {
        this.updateLoadingState(Boolean(isLoading));
      })
    );
  }

  // getUserAvatar moved to utils/avatar.js

  /**
   * Update auth status from PocketBase
   */
  updateAuthStatus() {
    const isValid = this.pb.authStore.isValid;
    const user = isValid ? this.pb.authStore.model : null;
    dispatch(checkAuth(user));
  }

  /**
   * Update UI elements for current user
   */
  updateUIForUser(user) {
    if (user) {
      const avatar = getUserAvatar(user.id);
      const name = user.displayName || user.email;

      // Update navbar avatar
      if (this.userAvatar) {
        this.userAvatar.textContent = avatar;
      }

      // Update menu profile
      if (this.menuUserAvatar) {
        this.menuUserAvatar.textContent = avatar;
      }
      if (this.menuUserName) {
        this.menuUserName.textContent = name || 'User';
      }
      if (this.menuUserBio) {
        this.menuUserBio.textContent = user.bio || '';
      }

      // Update composer avatar
      if (this.composerAvatar) {
        this.composerAvatar.textContent = avatar;
      }

      // Show/hide auth forms
      this.toggleAuthForms(false);
    } else {
      // Reset to defaults
      if (this.userAvatar) this.userAvatar.textContent = '👤';
      if (this.menuUserAvatar) this.menuUserAvatar.textContent = '👤';
      if (this.menuUserName) this.menuUserName.textContent = 'Not signed in';
      if (this.menuUserBio) this.menuUserBio.textContent = '';
      if (this.composerAvatar) this.composerAvatar.textContent = '👤';

      // Show auth forms
      this.toggleAuthForms(true);
    }
  }

  /**
   * Toggle visibility of auth forms vs logout button
   */
  toggleAuthForms(show) {
    const authContainer = document.getElementById('authContainer');
    const loggedInContainer = document.querySelector('.logged-in-actions');

    if (authContainer) {
      authContainer.hidden = !show;
    }
    if (loggedInContainer) {
      loggedInContainer.hidden = show;
    }

    if (this.logoutBtn) {
      this.logoutBtn.disabled = show;
    }
  }

  /**
   * Update loading state during auth operations
   */
  updateLoadingState(isLoading) {
    const submitBtns = [
      this.loginForm?.querySelector('button[type="submit"]'),
      this.registerForm?.querySelector('button[type="submit"]')
    ];

    submitBtns.forEach(btn => {
      if (btn) {
        btn.disabled = isLoading;
        btn.textContent = isLoading ? 'Loading...' : btn.dataset.originalText || 'Submit';
        if (!btn.dataset.originalText) {
          btn.dataset.originalText = btn.textContent;
        }
      }
    });

    this.state = isLoading ? 'loading' : 'idle';
  }

  /**
   * Handle login form submission
   */
  async handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(this.loginForm);
    const email = formData.get('email').trim();
    const password = formData.get('password');

    if (!email || !password) {
      showError('Please enter email and password');
      return;
    }

    try {
      await dispatch(login(email, password));
      showSuccess(`✅ Signed in as ${email}`);

      // Reset form
      this.loginForm.reset();

    } catch (error) {
      const message = error.message || 'Login failed';
      showError(`❌ ${message}`);
    }
  }

  /**
   * Handle registration form submission
   */
  async handleRegister(event) {
    event.preventDefault();
    const formData = new FormData(this.registerForm);
    const email = formData.get('email').trim();
    const password = formData.get('password');
    const displayName = formData.get('displayName')?.trim() || email;

    if (!email || !password) {
      showError('Please enter email and password');
      return;
    }

    try {
      await dispatch(register({
        email,
        password,
        passwordConfirm: password,
        displayName
      }));

      showSuccess(`✅ Registered ${email}`);

      // Auto-login after registration
      await dispatch(login(email, password));
      showSuccess(`✅ Signed in as ${email}`);

      // Reset form
      this.registerForm.reset();

    } catch (error) {
      const message = error.message || 'Registration failed';
      showError(`❌ ${message}`);
    }
  }

  /**
   * Handle logout
   */
  handleLogout() {
    try {
      dispatch(logoutAction());
      showInfo('👋 Signed out');
    } catch (error) {
      const message = error?.message || 'Failed to logout';
      showError(`❌ ${message}`);
    }
  }

  /**
   * Get current auth state
   */
  getAuthState() {
    return {
      isAuthenticated: this.pb.authStore.isValid,
      user: authStore.getState('user'),
      isLoading: authStore.getState('isLoading'),
      error: authStore.getState('error')
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    // Remove event listeners
    if (this.loginForm) {
      this.loginForm.removeEventListener('submit', this.boundHandleLogin);
    }
    if (this.registerForm) {
      this.registerForm.removeEventListener('submit', this.boundHandleRegister);
    }
    if (this.logoutBtn) {
      this.logoutBtn.removeEventListener('click', this.boundHandleLogout);
    }

    this.unsubscribeFns.forEach(unsub => {
      if (typeof unsub === 'function') {
        unsub();
      }
    });
    this.unsubscribeFns = [];

    console.log('🧹 AuthPanel destroyed');
  }
}

export default AuthPanelComponent;
