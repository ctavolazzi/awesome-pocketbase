/**
 * Comment Thread Component
 * Handles comment loading, rendering, voting, and replies
 */

import { getUserAvatar } from '../utils/avatar.js';
import { stripHtml, formatRelativeTime } from '../utils/formatting.js';
import { showSuccess, showError } from './toast.js';

export class CommentThreadComponent {
  constructor(pb, dataService) {
    this.pb = pb;
    this.dataService = dataService;
    this.commentState = new Map();
    this.maxDepth = 3;
    this.eventTarget = new EventTarget();
  }

  async loadComments(postId) {
    try {
      const comments = await this.dataService.getComments(postId);
      this.commentState.set(postId, comments);
      return comments;
    } catch (error) {
      showError('Failed to load comments');
      return [];
    }
  }

  async toggleComments(postId, container) {
    let commentThread = container.querySelector('.comment-thread');

    if (commentThread) {
      commentThread.classList.toggle('hidden');
      return;
    }

    const comments = await this.loadComments(postId);
    commentThread = document.createElement('div');
    commentThread.className = 'comment-thread';

    this.renderCommentTree(commentThread, comments, null, 0);

    const composer = this.createCommentComposer(postId);
    commentThread.appendChild(composer);

    container.appendChild(commentThread);
    this.emit('comments:loaded', { postId, count: comments.length });
  }

  renderCommentTree(container, allComments, parentId, depth) {
    const comments = allComments.filter(c => c.parentComment === parentId);

    comments.forEach(comment => {
      const commentEl = this.createCommentElement(comment, depth);
      container.appendChild(commentEl);

      if (depth < this.maxDepth) {
        this.renderCommentTree(container, allComments, comment.id, depth + 1);
      }
    });
  }

  createCommentElement(comment, depth) {
    const author = comment.expand?.author;
    const avatar = getUserAvatar(author?.id);
    const div = document.createElement('div');
    div.className = `comment-item ${depth > 0 ? `reply-level-${depth}` : ''}`;
    div.dataset.id = comment.id;

    const netVotes = (comment.upvotes || 0) - (comment.downvotes || 0);

    div.innerHTML = `
      <div class="comment-header">
        <div class="comment-avatar">${avatar}</div>
        <span class="comment-author">${author?.displayName || author?.email || 'Unknown'}</span>
        <span class="comment-time">${formatRelativeTime(comment.created)}</span>
      </div>
      <div class="comment-body">${stripHtml(comment.content)}</div>
      <div class="comment-actions">
        <div class="comment-vote-buttons">
          <button type="button" class="comment-vote-btn" data-type="up">⬆️</button>
          <span class="comment-vote-count">${netVotes > 0 ? `+${netVotes}` : netVotes}</span>
          <button type="button" class="comment-vote-btn" data-type="down">⬇️</button>
        </div>
        ${depth < this.maxDepth ? `<button type="button" class="reply-btn">Reply</button>` : ''}
        ${this.pb.authStore.model?.id === comment.author ? `<button type="button" class="delete-comment-btn">Delete</button>` : ''}
      </div>
    `;

    const voteButtons = div.querySelectorAll('.comment-vote-btn');
    voteButtons.forEach(btn => {
      btn.addEventListener('click', () => this.handleCommentVote(comment.id, btn.dataset.type));
    });

    const replyBtn = div.querySelector('.reply-btn');
    if (replyBtn) {
      replyBtn.addEventListener('click', () => this.showReplyForm(div, comment.id, comment.post));
    }

    const deleteBtn = div.querySelector('.delete-comment-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.handleDeleteComment(comment.id, comment.post));
    }

    return div;
  }

  createCommentComposer(postId) {
    const div = document.createElement('div');
    div.className = 'comment-composer';
    div.innerHTML = `
      <form class="comment-form">
        <textarea name="content" placeholder="Write a comment..." rows="2" required></textarea>
        <button type="submit">Post Comment</button>
      </form>
    `;

    const form = div.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = form.content.value.trim();
      if (!content) return;

      try {
        await this.dataService.createComment({
          post: postId,
          content,
          parentComment: null
        });
        form.reset();

        const commentThread = div.parentElement;
        if (commentThread) {
          commentThread.innerHTML = '';
          const comments = await this.loadComments(postId);
          this.renderCommentTree(commentThread, comments, null, 0);
          commentThread.appendChild(this.createCommentComposer(postId));
        }

        showSuccess('Comment posted');
        this.emit('comment:created', { postId });
      } catch (error) {
        showError('Failed to post comment');
      }
    });

    return div;
  }

  showReplyForm(commentEl, parentCommentId, postId) {
    let replyForm = commentEl.querySelector('.reply-form');
    if (replyForm) {
      replyForm.remove();
      return;
    }

    replyForm = document.createElement('div');
    replyForm.className = 'reply-form';
    replyForm.innerHTML = `
      <form>
        <textarea name="content" placeholder="Write a reply..." rows="2" required></textarea>
        <div class="reply-actions">
          <button type="submit">Reply</button>
          <button type="button" class="cancel-btn">Cancel</button>
        </div>
      </form>
    `;

    const form = replyForm.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = form.content.value.trim();
      if (!content) return;

      try {
        await this.dataService.createComment({
          post: postId,
          content,
          parentComment: parentCommentId
        });

        const commentThread = commentEl.closest('.comment-thread');
        if (commentThread) {
          commentThread.innerHTML = '';
          const comments = await this.loadComments(postId);
          this.renderCommentTree(commentThread, comments, null, 0);
          commentThread.appendChild(this.createCommentComposer(postId));
        }

        showSuccess('Reply posted');
        this.emit('reply:created', { postId, parentCommentId });
      } catch (error) {
        showError('Failed to post reply');
      }
    });

    const cancelBtn = replyForm.querySelector('.cancel-btn');
    cancelBtn.addEventListener('click', () => replyForm.remove());

    commentEl.appendChild(replyForm);
  }

  async handleCommentVote(commentId, voteType) {
    if (!this.pb.authStore.isValid) {
      showError('Please sign in to vote');
      return;
    }

    try {
      await this.dataService.voteComment(commentId, voteType);
      showSuccess('Vote recorded');
      this.emit('comment:voted', { commentId, voteType });
    } catch (error) {
      showError('Failed to vote');
    }
  }

  async handleDeleteComment(commentId, postId) {
    if (!confirm('Delete this comment?')) return;

    try {
      await this.dataService.deleteComment(commentId);

      const commentThread = document.querySelector(`[data-id="${postId}"] .comment-thread`);
      if (commentThread) {
        commentThread.innerHTML = '';
        const comments = await this.loadComments(postId);
        this.renderCommentTree(commentThread, comments, null, 0);
        commentThread.appendChild(this.createCommentComposer(postId));
      }

      showSuccess('Comment deleted');
      this.emit('comment:deleted', { commentId, postId });
    } catch (error) {
      showError('Failed to delete comment');
    }
  }

  emit(eventName, detail = {}) {
    this.eventTarget.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  on(eventName, handler) {
    this.eventTarget.addEventListener(eventName, handler);
  }
}

export default CommentThreadComponent;

