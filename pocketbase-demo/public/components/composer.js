/**
 * Post Composer Component
 * Handles post creation with optimistic UI updates
 * Now uses Express API for mutations with fallback to PocketBase
 */

import { showSuccess, showError, showWarning } from './toast.js';
import { apiService, ApiError, NetworkError } from '../services/api.service.js';

export class ComposerComponent {
  constructor(pb, dataService) {
    this.pb = pb;
    this.dataService = dataService;
    this.apiService = apiService;
    this.state = 'idle'; // idle, submitting, success, error
    this.optimisticPosts = new Map(); // Track optimistic posts
    this.retryQueue = [];
    this.useExpressAPI = true; // Feature flag for Express API

    // DOM elements
    this.form = null;
    this.textarea = null;
    this.submitBtn = null;
    this.charCount = null;
    this.categorySelect = null;

    // Event target for custom events
    this.eventTarget = new EventTarget();
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
    // Form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Character count
    this.textarea.addEventListener('input', () => this.updateCharCount());
  }

  /**
   * Handle form submission
   */
  async handleSubmit(event) {
    event.preventDefault();

    // Validation
    if (!this.pb.authStore.isValid) {
      showWarning('Please sign in to publish posts');
      return;
    }

    const content = this.textarea.value.trim();
    if (!content) {
      showWarning('Post content cannot be empty');
      return;
    }

    if (content.length > 420) {
      showWarning('Post is too long (max 420 characters)');
      return;
    }

    // Create optimistic post
    const optimisticPost = this.createOptimisticPost(content);

    // Immediately show in feed
    this.emitEvent('post:optimistic', { post: optimisticPost });

    // Change state to submitting
    this.setState('submitting');

    // Save to PocketBase in background
    try {
      const savedPost = await this.savePost(optimisticPost);

      // Success!
      this.emitEvent('post:saved', {
        tempId: optimisticPost.id,
        post: savedPost
      });

      this.setState('success');
      this.resetForm();
      showSuccess('Post published!');

      // Reset to idle after brief success state
      setTimeout(() => this.setState('idle'), 500);

    } catch (error) {
      // Failure - remove optimistic post
      this.emitEvent('post:failed', {
        tempId: optimisticPost.id,
        error: error.message
      });

      this.setState('error');
      this.handleSaveError(error, optimisticPost);

      // Reset to idle to allow retry
      setTimeout(() => this.setState('idle'), 1000);
    }
  }

  /**
   * Create an optimistic post object
   */
  createOptimisticPost(content) {
    const categories = Array.from(this.categorySelect.selectedOptions).map(opt => opt.value);
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const user = this.pb.authStore.model;

    return {
      id: tempId,
      title: content.slice(0, 50),
      slug: `post-${Date.now()}`,
      content: `<p>${content}</p>`,
      status: 'published',
      categories,
      author: user.id,
      featured: false,
      aiGenerated: false,
      upvotes: 0,
      downvotes: 0,
      upvotedBy: [],
      downvotedBy: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      expand: {
        author: {
          id: user.id,
          email: user.email,
          displayName: user.displayName || user.email,
          bio: user.bio || ''
        },
        categories: [] // Will be populated if categories exist
      },
      _optimistic: true // Flag to track optimistic posts
    };
  }

  /**
   * Save post via Express API (or fallback to PocketBase)
   */
  async savePost(optimisticPost) {
    const payload = {
      title: optimisticPost.title,
      slug: optimisticPost.slug,
      content: optimisticPost.content,
      status: optimisticPost.status,
      categories: optimisticPost.categories,
      author: optimisticPost.author,
      featured: optimisticPost.featured,
      aiGenerated: optimisticPost.aiGenerated,
      upvotes: optimisticPost.upvotes,
      downvotes: optimisticPost.downvotes,
      upvotedBy: optimisticPost.upvotedBy,
      downvotedBy: optimisticPost.downvotedBy,
    };

    // Try Express API first
    if (this.useExpressAPI) {
      try {
        const result = await this.apiService.createPost(payload);

        // Fetch full record with expanded relations from PocketBase
        // (Express API doesn't expand relations yet)
        const fullRecord = await this.dataService.getPost(result.id);

        return fullRecord;
      } catch (error) {
        // If Express API fails, log and fallback to direct PocketBase
        console.warn('Express API failed, falling back to PocketBase:', error.message);

        // Fallback to direct PocketBase
        const result = await this.dataService.createPost(payload);
        const fullRecord = await this.dataService.getPost(result.id);
        return fullRecord;
      }
    }

    // Direct PocketBase (if Express API disabled)
    const result = await this.dataService.createPost(payload);
    const fullRecord = await this.dataService.getPost(result.id);
    return fullRecord;
  }

  /**
   * Handle save errors with enhanced API error support
   */
  handleSaveError(error, optimisticPost) {
    let message = 'Failed to publish post';
    let duration = 7000;

    // Handle ApiError types
    if (error instanceof ApiError) {
      if (error.isValidationError()) {
        message = 'Validation error - please check your post content';
        if (error.details?.issues) {
          // Show first validation error
          const firstIssue = error.details.issues[0];
          message = `${firstIssue.path?.[0] || 'Field'}: ${firstIssue.message}`;
        }
      } else if (error.isAuthError()) {
        message = 'Authentication error - please sign in again';
      } else if (error.isRateLimitError()) {
        message = 'Too many posts - please wait a moment';
        duration = 5000;
      } else if (error.isServerError()) {
        message = 'Server error - please try again';
      } else {
        message = error.message || 'Failed to publish post';
      }
    } else if (error instanceof NetworkError) {
      message = 'Network error - please check your connection';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
      message = 'Network error - please check your connection';
    } else if (error.message.includes('auth')) {
      message = 'Authentication error - please sign in again';
    } else if (error.message) {
      message = error.message;
    }

    showError(message, duration);

    // Keep content in form so user can retry
    console.error('Post save failed:', error);
  }

  /**
   * Update character count
   */
  updateCharCount() {
    const length = this.textarea.value.length;
    this.charCount.textContent = `${length} / 420`;

    // Visual feedback with modern classes
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
   * Emit custom event
   */
  emitEvent(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    this.eventTarget.dispatchEvent(event);

    // Also dispatch on window for global listeners
    window.dispatchEvent(event);
  }

  /**
   * Add event listener
   */
  on(eventName, callback) {
    this.eventTarget.addEventListener(eventName, callback);
  }

  /**
   * Remove event listener
   */
  off(eventName, callback) {
    this.eventTarget.removeEventListener(eventName, callback);
  }
}

export default ComposerComponent;

