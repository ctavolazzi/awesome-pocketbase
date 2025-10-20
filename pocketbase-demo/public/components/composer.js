/**
 * Post Composer Component
 * Submits new posts through the dispatcher and feed actions.
 * Optimistic updates are handled by the feed reducer.
 */

import { dispatch } from '../store/dispatcher.js';
import { createPost } from '../store/actions/feed.actions.js';
import { showSuccess, showError, showWarning } from './toast.js';

export class ComposerComponent {
  constructor(pb, dataService, options = {}) {
    this.pb = pb;
    this.dataService = dataService;
    this.state = 'idle'; // idle, submitting, success, error

    // DOM elements
    this.form = null;
    this.textarea = null;
    this.submitBtn = null;
    this.charCount = null;
    this.categorySelect = null;

    // Event target for custom events (logging/global hooks)
    this.eventTarget = new EventTarget();

    // Dependency injection hooks (used in tests)
    this.dispatch = options.dispatch || dispatch;
    this.actions = {
      createPost: options.actions?.createPost || createPost
    };
    this.toast = {
      success: options.toast?.showSuccess || showSuccess,
      error: options.toast?.showError || showError,
      warning: options.toast?.showWarning || showWarning
    };
  }

  /**
   * Initialize the composer with DOM elements
   */
  init(formId = 'composerForm') {
    this.form = document.getElementById(formId);
    if (!this.form) {
      console.error('Composer form not found');
      return;
    }

    this.textarea = this.form.querySelector('textarea[name="content"]');
    this.submitBtn = this.form.querySelector('button[type="submit"]');
    this.charCount = document.getElementById('charCount');
    this.categorySelect = document.getElementById('categorySelect');

    this.attachEventListeners();
    this.setState('idle');
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.textarea.addEventListener('input', () => this.updateCharCount());
  }

  /**
   * Handle form submission
   */
  async handleSubmit(event) {
    event.preventDefault();

    if (!this.pb.authStore.isValid) {
      this.toast.warning('Please sign in to publish posts');
      return;
    }

    const content = this.textarea.value.trim();
    if (!content) {
      this.toast.warning('Post content cannot be empty');
      return;
    }

    if (content.length > 420) {
      this.toast.warning('Post is too long (max 420 characters)');
      return;
    }

    const payload = this.buildPostPayload(content);

    this.emitEvent('composer:submit', { status: 'start' });
    this.setState('submitting');

    try {
      await this.dispatch(this.actions.createPost(payload));

      this.setState('success');
      this.resetForm();
      this.toast.success('Post published!');
      this.emitEvent('composer:submit', { status: 'success' });

      setTimeout(() => this.setState('idle'), 500);
    } catch (error) {
      this.setState('error');
      const message = this.handleSubmitError(error);
      this.emitEvent('composer:submit', { status: 'error', message });
      setTimeout(() => this.setState('idle'), 1000);
    }
  }

  /**
   * Build post payload for dispatch
   */
  buildPostPayload(content) {
    const categories = Array.from(this.categorySelect.selectedOptions || []).map(opt => opt.value);
    const user = this.pb.authStore.model;
    const timestamp = Date.now();

    return {
      title: content.slice(0, 140) || 'Untitled Post',
      slug: `post-${timestamp}`,
      content: `<p>${content}</p>`,
      status: 'published',
      categories,
      author: user.id,
      featured: false,
      aiGenerated: false
    };
  }

  /**
   * Handle submission errors and surface message
   */
  handleSubmitError(error) {
    const message = error?.message || 'Failed to publish post';
    this.toast.error(message);
    console.error('Post publish failed:', error);
    return message;
  }

  /**
   * Update character count
   */
  updateCharCount() {
    const length = this.textarea.value.length;
    this.charCount.textContent = `${length} / 420`;
    this.charCount.classList.remove('warning', 'danger');

    if (length > 400) {
      this.charCount.classList.add('danger');
    } else if (length > 350) {
      this.charCount.classList.add('warning');
    }
  }

  /**
   * Reset form
   */
  resetForm() {
    this.form.reset();
    this.charCount.textContent = '0 / 420';
    this.charCount.classList.remove('warning', 'danger');
  }

  /**
   * Set component state
   */
  setState(newState) {
    this.state = newState;
    this.updateUI();
  }

  /**
   * Update UI based on state
   */
  updateUI() {
    const composerCard = this.form.closest('.composer-modern');

    switch (this.state) {
      case 'idle':
        this.textarea.disabled = false;
        this.submitBtn.disabled = false;
        this.submitBtn.textContent = 'Post';
        composerCard?.classList.remove('composer-modern--submitting', 'composer-modern--success', 'composer-modern--error');
        break;

      case 'submitting':
        this.textarea.disabled = true;
        this.submitBtn.disabled = true;
        this.submitBtn.innerHTML = '<span style="opacity: 0.7;">Posting...</span>';
        composerCard?.classList.add('composer-modern--submitting');
        composerCard?.classList.remove('composer-modern--success', 'composer-modern--error');
        break;

      case 'success':
        this.textarea.disabled = false;
        this.submitBtn.disabled = false;
        this.submitBtn.innerHTML = '✓ Posted';
        composerCard?.classList.add('composer-modern--success');
        composerCard?.classList.remove('composer-modern--submitting', 'composer-modern--error');
        break;

      case 'error':
        this.textarea.disabled = false;
        this.submitBtn.disabled = false;
        this.submitBtn.textContent = 'Try again';
        composerCard?.classList.add('composer-modern--error');
        composerCard?.classList.remove('composer-modern--submitting', 'composer-modern--success');
        break;
    }
  }

  /**
   * Emit custom event (and proxy to window)
   */
  emitEvent(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    this.eventTarget.dispatchEvent(event);
    window.dispatchEvent(event);
  }

  on(eventName, callback) {
    this.eventTarget.addEventListener(eventName, callback);
  }

  off(eventName, callback) {
    this.eventTarget.removeEventListener(eventName, callback);
  }
}

export default ComposerComponent;
