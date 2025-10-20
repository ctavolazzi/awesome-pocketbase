/**
 * Feed Manager Component
 * Handles feed loading, pagination, infinite scroll, and new posts indicator
 * Driven by the dispatcher and feed store subscriptions.
 */

import { feedStore } from '../store/index.js';
import { dispatch, getState } from '../store/dispatcher.js';
import { loadPosts, viewNewPosts as viewNewPostsAction } from '../store/actions/feed.actions.js';
import { showError, showInfo } from './toast.js';

export class FeedManagerComponent {
  constructor(postCardRenderer, dataService, options = {}) {
    this.postCardRenderer = postCardRenderer;
    this.dataService = dataService;

    // Derived state
    this.isLoading = false;
    this.currentPage = 1;
    this.hasMorePosts = true;
    this.postsPerPage = options.postsPerPage || 20;
    this.newPostsCount = 0;

    // DOM nodes
    this.feedContainer = null;
    this.loadingIndicator = null;
    this.endOfFeedEl = null;
    this.newPostsIndicator = null;
    this.newPostsCountEl = null;
    this.viewNewPostsBtn = null;

    // Event system
    this.eventTarget = new EventTarget();
    this.unsubscribeFns = [];

    // Bindings
    this.handleScroll = this.handleScroll.bind(this);

    // Dependency injection hooks (used in tests)
    this.dispatch = options.dispatch || dispatch;
    this.getState = options.getState || getState;
    this.feedStore = options.feedStore || feedStore;
    this.actions = {
      loadPosts: options.actions?.loadPosts || loadPosts,
      viewNewPosts: options.actions?.viewNewPosts || viewNewPostsAction
    };
    this.toast = {
      error: options.toast?.showError || showError,
      info: options.toast?.showInfo || showInfo
    };
  }

  /**
   * Initialize the feed manager
   */
  init(feedContainerId = 'postsList') {
    this.feedContainer = document.getElementById(feedContainerId);
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.endOfFeedEl = document.getElementById('endOfFeed');
    this.newPostsIndicator = document.getElementById('newPostsIndicator');
    this.newPostsCountEl = document.getElementById('newPostsCount');
    this.viewNewPostsBtn = document.getElementById('viewNewPostsBtn');

    if (!this.feedContainer) {
      console.error('Feed container not found');
      return;
    }

    this.attachEventListeners();
    this.subscribeToStore();

    // Render current store snapshot (if any)
    const initialPosts = this.feedStore.getState('posts') || [];
    this.renderPosts(initialPosts);

    // Kick off initial load
    this.loadPosts(1, false);

    console.log('✅ FeedManager initialized');
  }

  /**
   * Attach DOM listeners
   */
  attachEventListeners() {
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    if (this.viewNewPostsBtn) {
      this.viewNewPostsBtn.addEventListener('click', () => this.viewNewPosts());
    }
    if (typeof window.scrollTo !== 'function') {
      window.scrollTo = () => {};
    }
  }

  /**
   * Subscribe to feed store updates
   */
  subscribeToStore() {
    this.unsubscribeFns.push(
      this.feedStore.subscribe('posts', (posts = []) => {
        this.renderPosts(posts);
      })
    );

    this.unsubscribeFns.push(
      this.feedStore.subscribe('isLoading', (loading) => {
        this.toggleLoadingIndicator(Boolean(loading));
      })
    );

    this.unsubscribeFns.push(
      this.feedStore.subscribe('hasMore', (hasMore) => {
        if (typeof hasMore === 'boolean') {
          this.hasMorePosts = hasMore;
          if (this.feedContainer) {
            this.toggleEndOfFeed(!this.hasMorePosts && this.feedContainer.children.length > 0);
          }
        }
      })
    );

    this.unsubscribeFns.push(
      this.feedStore.subscribe('currentPage', (page) => {
        if (typeof page === 'number') {
          this.currentPage = page;
        }
      })
    );

    this.unsubscribeFns.push(
      this.feedStore.subscribe('newPostsAvailable', (count) => {
        this.newPostsCount = count || 0;
        this.updateNewPostsIndicator();
      })
    );
  }

  /**
   * Render posts into the container
   */
  renderPosts(posts) {
    if (!this.feedContainer) return;

    const fragment = document.createDocumentFragment();
    posts.forEach((post) => {
      fragment.appendChild(this.postCardRenderer.render(post));
    });

    this.feedContainer.replaceChildren(fragment);
  }

  /**
   * Load posts through dispatcher
   */
  async loadPosts(page = 1, append = false) {
    if (this.isLoading) return;
    this.isLoading = true;
    this.emit('load:start', { page, append });

    if (!append) {
      this.resetNewPostsState();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.toggleEndOfFeed(false);
    }

    this.toggleLoadingIndicator(true);

    try {
      await this.dispatch(this.actions.loadPosts(page, this.postsPerPage));

      const feedState = this.getState()?.feed || {};
      this.hasMorePosts = feedState.hasMore ?? this.hasMorePosts;
      this.currentPage = feedState.currentPage ?? page;

      this.emit('load:success', {
        page: this.currentPage,
        count: (feedState.posts || []).length,
        hasMore: this.hasMorePosts
      });
    } catch (error) {
      console.error('Failed to load posts:', error);
      this.toast.error('Failed to load posts');
      this.hasMorePosts = false;
      this.toggleEndOfFeed(false);

      if (error?.message?.includes('Failed to load posts')) {
        this.toast.info('Ensure PocketBase server is running');
      }

      this.emit('load:error', { page, error: error.message || String(error) });
    } finally {
      this.toggleLoadingIndicator(false);
      this.isLoading = false;
    }
  }

  /**
   * Refresh feed
   */
  async refresh() {
    await this.loadPosts(1, false);
  }

  /**
   * Infinite scroll handler
   */
  handleScroll() {
    const scrollPosition = window.scrollY + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight || 0;

    if (scrollPosition >= documentHeight - 500 && this.hasMorePosts && !this.isLoading) {
      const nextPage = this.currentPage + 1;
      this.loadPosts(nextPage, true);
    }
  }

  /**
   * Add new post with highlight (used by realtime/optimistic flows)
   */
  addNewPost(post, highlight = true) {
    if (!this.feedContainer) return;
    const postCard = this.postCardRenderer.render(post, { highlight });
    this.feedContainer.prepend(postCard);
    this.newPostsCount++;
    this.updateNewPostsIndicator();
    this.emit('post:added', { post });
  }

  /**
   * Remove post from DOM
   */
  removePost(postId) {
    const postCard = document.getElementById(`post-${postId}`);
    if (postCard) {
      postCard.classList.add('post-card--removing');
      setTimeout(() => postCard.remove(), 300);
      this.emit('post:removed', { postId });
    }
  }

  /**
   * Update specific post card
   */
  updatePost(post) {
    const existingCard = document.getElementById(`post-${post.id}`);
    if (existingCard) {
      const newCard = this.postCardRenderer.render(post);
      existingCard.replaceWith(newCard);
      this.emit('post:updated', { post });
    }
  }

  toggleLoadingIndicator(show) {
    if (!this.loadingIndicator) return;
    this.loadingIndicator.hidden = !show;
  }

  toggleEndOfFeed(show) {
    if (!this.endOfFeedEl) return;
    this.endOfFeedEl.hidden = !show;
  }

  updateNewPostsIndicator() {
    if (!this.newPostsIndicator || !this.newPostsCountEl) return;
    if (this.newPostsCount > 0) {
      this.newPostsCountEl.textContent = this.newPostsCount.toString();
      this.newPostsIndicator.hidden = false;
    } else {
      this.newPostsIndicator.hidden = true;
    }
  }

  resetNewPostsState() {
    this.newPostsCount = 0;
    this.updateNewPostsIndicator();
  }

  async viewNewPosts() {
    await this.dispatch(this.actions.viewNewPosts());
    this.resetNewPostsState();
    await this.loadPosts(1, false);
  }

  getStats() {
    return {
      currentPage: this.currentPage,
      hasMorePosts: this.hasMorePosts,
      isLoading: this.isLoading,
      postsCount: this.feedContainer?.children.length || 0,
      newPostsCount: this.newPostsCount
    };
  }

  emit(eventName, detail = {}) {
    this.eventTarget.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  on(eventName, handler) {
    this.eventTarget.addEventListener(eventName, handler);
  }

  off(eventName, handler) {
    this.eventTarget.removeEventListener(eventName, handler);
  }

  destroy() {
    window.removeEventListener('scroll', this.handleScroll);
    if (this.viewNewPostsBtn) {
      this.viewNewPostsBtn.removeEventListener('click', this.viewNewPosts);
    }
    this.unsubscribeFns.forEach(unsub => {
      if (typeof unsub === 'function') unsub();
    });
    this.unsubscribeFns = [];
    console.log('🧹 FeedManager destroyed');
  }
}

export default FeedManagerComponent;
