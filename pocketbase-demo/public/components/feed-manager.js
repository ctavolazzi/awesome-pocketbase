/**
 * Feed Manager Component
 * Handles feed loading, pagination, infinite scroll, and new posts indicator
 * Wired to feedStore for state management
 */

import { feedStore, setPosts, addPosts, clearPosts } from '../store/feed.store.js';
import { showError, showInfo } from './toast.js';

export class FeedManagerComponent {
  constructor(postCardRenderer, dataService) {
    this.postCardRenderer = postCardRenderer;
    this.dataService = dataService;

    // State
    this.isLoading = false;
    this.currentPage = 1;
    this.hasMorePosts = true;
    this.postsPerPage = 20;
    this.newPostsCount = 0;

    // DOM elements
    this.feedContainer = null;
    this.loadingIndicator = null;
    this.endOfFeedEl = null;
    this.newPostsIndicator = null;
    this.newPostsCountEl = null;
    this.viewNewPostsBtn = null;

    // Event target for custom events
    this.eventTarget = new EventTarget();

    // Bind methods
    this.handleScroll = this.handleScroll.bind(this);
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

    // Attach event listeners
    this.attachEventListeners();

    // Initialize feed
    this.loadPosts(1, false);

    console.log('✅ FeedManager initialized');
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Infinite scroll
    window.addEventListener('scroll', this.handleScroll, { passive: true });

    // View new posts button
    if (this.viewNewPostsBtn) {
      this.viewNewPostsBtn.addEventListener('click', () => this.viewNewPosts());
    }
  }

  /**
   * Load posts with pagination
   * @param {number} page - Page number to load
   * @param {boolean} append - Whether to append or replace posts
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
      const result = await this.dataService.getPosts(page, this.postsPerPage);

      if (!append) {
        this.feedContainer.innerHTML = '';
        clearPosts();
      }

      // Render each post
      const posts = result.items || [];
      posts.forEach((post) => {
        const postCard = this.postCardRenderer.render(post);
        this.feedContainer.appendChild(postCard);
      });

      // Update pagination state
      this.hasMorePosts = result.page < result.totalPages;
      this.currentPage = page;
      this.toggleEndOfFeed(!this.hasMorePosts && this.feedContainer.children.length > 0);

      // Update store
      if (append) {
        addPosts(posts);
      } else {
        setPosts(posts);
      }

      this.emit('load:success', {
        page: result.page,
        totalPages: result.totalPages,
        count: posts.length,
        hasMore: this.hasMorePosts
      });

    } catch (error) {
      console.error('Failed to load posts:', error);
      showError('Failed to load posts');

      this.hasMorePosts = false;
      this.toggleEndOfFeed(false);

      if (error.message && error.message.includes('Failed to load posts')) {
        showInfo('Ensure PocketBase server is running');
      }

      this.emit('load:error', { page, error: error.message });

    } finally {
      this.toggleLoadingIndicator(false);
      this.isLoading = false;
    }
  }

  /**
   * Refresh the feed (reload first page)
   */
  async refresh() {
    await this.loadPosts(1, false);
  }

  /**
   * Handle infinite scroll
   */
  handleScroll() {
    const scrollPosition = window.scrollY + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // Load next page when near bottom
    if (scrollPosition >= documentHeight - 500 && this.hasMorePosts && !this.isLoading) {
      const nextPage = this.currentPage + 1;
      this.loadPosts(nextPage, true);
    }
  }

  /**
   * Add new post to the top of feed (optimistic UI)
   * @param {Object} post - Post to add
   */
  addNewPost(post, highlight = true) {
    const postCard = this.postCardRenderer.render(post, { highlight });
    this.feedContainer.prepend(postCard);

    // Update new posts indicator
    this.newPostsCount++;
    this.updateNewPostsIndicator();

    this.emit('post:added', { post });
  }

  /**
   * Remove post from feed
   * @param {string} postId - ID of post to remove
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
   * Update post in feed
   * @param {Object} post - Updated post data
   */
  updatePost(post) {
    const existingCard = document.getElementById(`post-${post.id}`);
    if (existingCard) {
      const newCard = this.postCardRenderer.render(post);
      existingCard.replaceWith(newCard);
      this.emit('post:updated', { post });
    }
  }

  /**
   * Toggle loading indicator
   */
  toggleLoadingIndicator(show) {
    if (!this.loadingIndicator) return;
    this.loadingIndicator.hidden = !show;
  }

  /**
   * Toggle end of feed indicator
   */
  toggleEndOfFeed(show) {
    if (!this.endOfFeedEl) return;
    this.endOfFeedEl.hidden = !show;
  }

  /**
   * Update new posts indicator
   */
  updateNewPostsIndicator() {
    if (!this.newPostsIndicator || !this.newPostsCountEl) return;

    if (this.newPostsCount > 0) {
      this.newPostsCountEl.textContent = this.newPostsCount.toString();
      this.newPostsIndicator.hidden = false;
    } else {
      this.newPostsIndicator.hidden = true;
    }
  }

  /**
   * Reset new posts state
   */
  resetNewPostsState() {
    this.newPostsCount = 0;
    this.updateNewPostsIndicator();
  }

  /**
   * View new posts (scroll to top and refresh)
   */
  async viewNewPosts() {
    this.resetNewPostsState();
    await this.loadPosts(1, false);
  }

  /**
   * Get current feed stats
   */
  getStats() {
    return {
      currentPage: this.currentPage,
      hasMorePosts: this.hasMorePosts,
      isLoading: this.isLoading,
      postsCount: this.feedContainer?.children.length || 0,
      newPostsCount: this.newPostsCount
    };
  }

  /**
   * Emit custom event
   */
  emit(eventName, detail = {}) {
    this.eventTarget.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  /**
   * Subscribe to component events
   */
  on(eventName, handler) {
    this.eventTarget.addEventListener(eventName, handler);
  }

  /**
   * Unsubscribe from component events
   */
  off(eventName, handler) {
    this.eventTarget.removeEventListener(eventName, handler);
  }

  /**
   * Cleanup
   */
  destroy() {
    window.removeEventListener('scroll', this.handleScroll);

    if (this.viewNewPostsBtn) {
      this.viewNewPostsBtn.removeEventListener('click', this.viewNewPosts);
    }

    console.log('🧹 FeedManager destroyed');
  }
}

export default FeedManagerComponent;

