/**
 * Post Card Component
 * Renders individual post cards with voting, deletion, and comment toggling
 * Wired to feedStore and authStore
 */

import { feedStore, updatePost, removePost } from '../store/feed.store.js';
import { authStore } from '../store/auth.store.js';
import { showSuccess, showError, showWarning } from './toast.js';
import { getUserAvatar } from '../utils/avatar.js';
import { stripHtml, formatRelativeTime } from '../utils/formatting.js';

export class PostCardComponent {
  constructor(pb, dataService) {
    this.pb = pb;
    this.dataService = dataService;
    this.state = 'idle';

    // Event target for custom events
    this.eventTarget = new EventTarget();
  }

  // Utility functions moved to utils/avatar.js and utils/formatting.js

  /**
   * Render a post card element
   * @param {Object} record - Post record from PocketBase
   * @param {Object} options - Rendering options (highlight, etc.)
   * @returns {HTMLElement} - Post card DOM element
   */
  render(record, options = {}) {
    const { highlight = false } = options;
    const author = record.expand?.author;
    const categories = record.expand?.categories || [];
    const avatar = getUserAvatar(author?.id);

    const div = document.createElement('div');
    div.className = 'post-card';
    div.id = `post-${record.id}`;
    div.dataset.postId = record.id;

    if (highlight) {
      div.classList.add('highlight-animation');
    }

    // Check if current user is author
    const currentUserId = this.pb.authStore.model?.id;
    const isAuthor = author?.id === currentUserId;

    div.innerHTML = `
      <div class="post-header">
        <div class="post-author">
          <span class="author-avatar">${avatar}</span>
          <div class="author-info">
            <span class="author-name">${author?.displayName || 'Anonymous'}</span>
            ${record.aiGenerated ? '<span class="badge-ai">AI</span>' : ''}
            ${record.aiPersona ? `<span class="badge-persona">${record.aiPersona}</span>` : ''}
            <span class="post-time">${formatRelativeTime(record.created)}</span>
          </div>
        </div>
        ${isAuthor ? `
          <button type="button" class="btn-delete-post" data-post-id="${record.id}" aria-label="Delete post">
            🗑️
          </button>
        ` : ''}
      </div>

      <div class="post-content">
        <p>${stripHtml(record.content)}</p>
      </div>

      ${categories.length > 0 ? `
        <div class="post-categories">
          ${categories.map(cat => `<span class="category-tag">#${cat.name}</span>`).join('')}
        </div>
      ` : ''}

      <div class="post-actions">
        <div class="vote-buttons">
          <button
            type="button"
            class="btn-vote btn-upvote ${record.userVote === 'up' ? 'voted' : ''}"
            data-post-id="${record.id}"
            data-vote-type="up"
            aria-label="Upvote">
            ▲ <span class="vote-count">${record.upvotes || 0}</span>
          </button>
          <button
            type="button"
            class="btn-vote btn-downvote ${record.userVote === 'down' ? 'voted' : ''}"
            data-post-id="${record.id}"
            data-vote-type="down"
            aria-label="Downvote">
            ▼ <span class="vote-count">${record.downvotes || 0}</span>
          </button>
        </div>

        <button
          type="button"
          class="btn-toggle-comments"
          data-post-id="${record.id}"
          aria-label="Toggle comments">
          💬 <span class="comment-count">${record.commentCount || 0}</span> comments
        </button>
      </div>

      <div class="comments-section" id="comments-${record.id}" data-post-id="${record.id}" hidden></div>
    `;

    // Attach event listeners
    this.attachEventListeners(div, record);

    return div;
  }

  /**
   * Attach event listeners to post card
   */
  attachEventListeners(div, record) {
    // Vote buttons
    const upvoteBtn = div.querySelector('.btn-upvote');
    const downvoteBtn = div.querySelector('.btn-downvote');

    if (upvoteBtn) {
      upvoteBtn.addEventListener('click', () => this.handleVote(record.id, 'up'));
    }
    if (downvoteBtn) {
      downvoteBtn.addEventListener('click', () => this.handleVote(record.id, 'down'));
    }

    // Delete button
    const deleteBtn = div.querySelector('.btn-delete-post');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.handleDelete(record.id));
    }

    // Toggle comments button
    const toggleCommentsBtn = div.querySelector('.btn-toggle-comments');
    if (toggleCommentsBtn) {
      toggleCommentsBtn.addEventListener('click', () => this.toggleComments(record.id));
    }
  }

  /**
   * Handle upvote/downvote
   */
  async handleVote(postId, voteType) {
    if (!this.pb.authStore.isValid) {
      showWarning('Please sign in to vote');
      return;
    }

    try {
      const currentPost = feedStore.getState('posts').find(p => p.id === postId);
      if (!currentPost) return;

      // Optimistic update
      const newVote = currentPost.userVote === voteType ? null : voteType;
      const updates = { ...currentPost };

      if (currentPost.userVote === 'up') {
        updates.upvotes = (currentPost.upvotes || 0) - 1;
      } else if (currentPost.userVote === 'down') {
        updates.downvotes = (currentPost.downvotes || 0) - 1;
      }

      if (newVote === 'up') {
        updates.upvotes = (updates.upvotes || 0) + 1;
      } else if (newVote === 'down') {
        updates.downvotes = (updates.downvotes || 0) + 1;
      }

      updates.userVote = newVote;
      updatePost(updates);

      // Update UI
      this.updateVoteUI(postId, updates);

      // Persist to backend
      await this.dataService.voteOnPost(postId, voteType);

      this.emit('vote:success', { postId, voteType, newVote });

    } catch (error) {
      showError('Failed to record vote');
      console.error('Vote error:', error);

      // Revert optimistic update on error
      const posts = feedStore.getState('posts');
      const originalPost = posts.find(p => p.id === postId);
      if (originalPost) {
        this.updateVoteUI(postId, originalPost);
      }

      this.emit('vote:error', { postId, error: error.message });
    }
  }

  /**
   * Update vote button UI
   */
  updateVoteUI(postId, post) {
    const postCard = document.getElementById(`post-${postId}`);
    if (!postCard) return;

    const upvoteBtn = postCard.querySelector('.btn-upvote');
    const downvoteBtn = postCard.querySelector('.btn-downvote');

    if (upvoteBtn) {
      upvoteBtn.classList.toggle('voted', post.userVote === 'up');
      upvoteBtn.querySelector('.vote-count').textContent = post.upvotes || 0;
    }

    if (downvoteBtn) {
      downvoteBtn.classList.toggle('voted', post.userVote === 'down');
      downvoteBtn.querySelector('.vote-count').textContent = post.downvotes || 0;
    }
  }

  /**
   * Handle post deletion
   */
  async handleDelete(postId) {
    if (!confirm('Delete this post?')) return;

    try {
      // Optimistically remove from UI
      const postCard = document.getElementById(`post-${postId}`);
      if (postCard) {
        postCard.classList.add('deleting');
      }

      // Delete from backend
      await this.dataService.deletePost(postId);

      // Remove from store
      removePost(postId);

      // Remove from DOM
      if (postCard) {
        postCard.remove();
      }

      showSuccess('Post deleted');
      this.emit('delete:success', { postId });

    } catch (error) {
      showError('Failed to delete post');
      console.error('Delete error:', error);

      // Revert optimistic removal
      const postCard = document.getElementById(`post-${postId}`);
      if (postCard) {
        postCard.classList.remove('deleting');
      }

      this.emit('delete:error', { postId, error: error.message });
    }
  }

  /**
   * Toggle comments section visibility
   */
  toggleComments(postId) {
    this.emit('comments:toggle', { postId });
  }

  /**
   * Update comment count on a post card
   */
  updateCommentCount(postId, count) {
    const postCard = document.getElementById(`post-${postId}`);
    if (!postCard) return;

    const commentBtn = postCard.querySelector('.btn-toggle-comments .comment-count');
    if (commentBtn) {
      commentBtn.textContent = count;
    }
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
}

export default PostCardComponent;

