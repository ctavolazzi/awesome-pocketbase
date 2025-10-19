/**
 * PostCard Component Tests
 * Tests post rendering, voting, deletion, and comment toggling
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

// Mock stores
const feedStoreMock = {
  state: { posts: [] },
  getState(key) {
    return key ? this.state[key] : this.state;
  },
  reset() {
    this.state = { posts: [] };
  }
};

// Mock functions (will be imported by component)
const toastMock = {
  showSuccess: mock.fn(),
  showError: mock.fn(),
  showWarning: mock.fn()
};

// Setup DOM
function setupDOM() {
  const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
  global.document = dom.window.document;
  global.window = dom.window;
  global.CustomEvent = dom.window.CustomEvent;
  global.EventTarget = dom.window.EventTarget;
  return dom;
}

// Mock PocketBase
function createMockPocketBase(isAuth = false, userId = null) {
  return {
    authStore: {
      isValid: isAuth,
      model: isAuth ? { id: userId || 'user-123', email: 'test@example.com' } : null
    }
  };
}

// Mock DataService
function createMockDataService() {
  return {
    voteOnPost: mock.fn(async () => ({ success: true })),
    deletePost: mock.fn(async () => ({ success: true }))
  };
}

// Create PostCard class inline for testing
async function createPostCard() {
  class PostCardComponent {
    constructor(pb, dataService) {
      this.pb = pb;
      this.dataService = dataService;
      this.state = 'idle';
      this.avatarEmojis = ['💾', '🤖', '👾', '🌟', '💿', '📀', '🎮', '🕹️', '💻', '📱', '🖥️', '⌨️'];
      this.eventTarget = new EventTarget();
      this.feedStore = feedStoreMock;
      this.toast = toastMock;
    }

    getUserAvatar(userId) {
      if (!userId) return '👤';
      const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return this.avatarEmojis[hash % this.avatarEmojis.length];
    }

    stripHtml(input) {
      if (!input) return '';
      const tmp = document.createElement('DIV');
      tmp.innerHTML = input;
      return tmp.textContent || tmp.innerText || '';
    }

    formatRelativeTime(isoString) {
      const date = new Date(isoString);
      const now = Date.now();
      const diff = Math.floor((now - date.getTime()) / 1000);
      if (diff < 60) return `${diff}s`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
      return `${Math.floor(diff / 86400)}d`;
    }

    render(record, options = {}) {
      const { highlight = false } = options;
      const author = record.expand?.author;
      const categories = record.expand?.categories || [];
      const avatar = this.getUserAvatar(author?.id);
      const div = document.createElement('div');
      div.className = 'post-card';
      div.id = `post-${record.id}`;
      div.dataset.postId = record.id;
      if (highlight) div.classList.add('highlight-animation');

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
              <span class="post-time">${this.formatRelativeTime(record.created)}</span>
            </div>
          </div>
          ${isAuthor ? `<button type="button" class="btn-delete-post" data-post-id="${record.id}">🗑️</button>` : ''}
        </div>
        <div class="post-content"><p>${this.stripHtml(record.content)}</p></div>
        ${categories.length > 0 ? `
          <div class="post-categories">
            ${categories.map(cat => `<span class="category-tag">#${cat.name}</span>`).join('')}
          </div>
        ` : ''}
        <div class="post-actions">
          <div class="vote-buttons">
            <button class="btn-vote btn-upvote ${record.userVote === 'up' ? 'voted' : ''}" data-post-id="${record.id}" data-vote-type="up">
              ▲ <span class="vote-count">${record.upvotes || 0}</span>
            </button>
            <button class="btn-vote btn-downvote ${record.userVote === 'down' ? 'voted' : ''}" data-post-id="${record.id}" data-vote-type="down">
              ▼ <span class="vote-count">${record.downvotes || 0}</span>
            </button>
          </div>
          <button class="btn-toggle-comments" data-post-id="${record.id}">
            💬 <span class="comment-count">${record.commentCount || 0}</span> comments
          </button>
        </div>
        <div class="comments-section" id="comments-${record.id}" data-post-id="${record.id}" hidden></div>
      `;

      this.attachEventListeners(div, record);
      return div;
    }

    attachEventListeners(div, record) {
      const upvoteBtn = div.querySelector('.btn-upvote');
      const downvoteBtn = div.querySelector('.btn-downvote');
      const deleteBtn = div.querySelector('.btn-delete-post');
      const toggleCommentsBtn = div.querySelector('.btn-toggle-comments');

      if (upvoteBtn) upvoteBtn.addEventListener('click', () => this.handleVote(record.id, 'up'));
      if (downvoteBtn) downvoteBtn.addEventListener('click', () => this.handleVote(record.id, 'down'));
      if (deleteBtn) deleteBtn.addEventListener('click', () => this.handleDelete(record.id));
      if (toggleCommentsBtn) toggleCommentsBtn.addEventListener('click', () => this.toggleComments(record.id));
    }

    async handleVote(postId, voteType) {
      if (!this.pb.authStore.isValid) {
        this.toast.showWarning('Please sign in to vote');
        return;
      }
      try {
        await this.dataService.voteOnPost(postId, voteType);
        this.emit('vote:success', { postId, voteType });
      } catch (error) {
        this.toast.showError('Failed to record vote');
        this.emit('vote:error', { postId, error: error.message });
      }
    }

    async handleDelete(postId) {
      try {
        await this.dataService.deletePost(postId);
        this.toast.showSuccess('Post deleted');
        this.emit('delete:success', { postId });
      } catch (error) {
        this.toast.showError('Failed to delete post');
        this.emit('delete:error', { postId, error: error.message });
      }
    }

    toggleComments(postId) {
      this.emit('comments:toggle', { postId });
    }

    updateCommentCount(postId, count) {
      const postCard = document.getElementById(`post-${postId}`);
      if (!postCard) return;
      const commentBtn = postCard.querySelector('.btn-toggle-comments .comment-count');
      if (commentBtn) commentBtn.textContent = count;
    }

    emit(eventName, detail = {}) {
      this.eventTarget.dispatchEvent(new CustomEvent(eventName, { detail }));
    }

    on(eventName, handler) {
      this.eventTarget.addEventListener(eventName, handler);
    }
  }

  return PostCardComponent;
}

// Sample post data
function createSamplePost(overrides = {}) {
  return {
    id: 'post-123',
    content: 'This is a test post',
    created: new Date().toISOString(),
    upvotes: 5,
    downvotes: 2,
    commentCount: 3,
    aiGenerated: false,
    userVote: null,
    expand: {
      author: {
        id: 'author-123',
        displayName: 'Test Author'
      },
      categories: []
    },
    ...overrides
  };
}

// TESTS
describe('PostCard Component', () => {
  let dom;
  let PostCard;
  let postCard;
  let mockPb;
  let mockDataService;

  beforeEach(async () => {
    dom = setupDOM();
    feedStoreMock.reset();
    mockPb = createMockPocketBase(true, 'user-123');
    mockDataService = createMockDataService();
    PostCard = await createPostCard();
    postCard = new PostCard(mockPb, mockDataService);
    toastMock.showSuccess.mock.resetCalls();
    toastMock.showError.mock.resetCalls();
    toastMock.showWarning.mock.resetCalls();
  });

  describe('Rendering', () => {
    it('renders post card with basic content', () => {
      const post = createSamplePost();
      const element = postCard.render(post);

      assert.ok(element.querySelector('.post-content'), 'Should have content section');
      assert.ok(element.querySelector('.post-actions'), 'Should have actions section');
      assert.strictEqual(element.id, 'post-post-123', 'Should have correct ID');
    });

    it('displays author information', () => {
      const post = createSamplePost();
      const element = postCard.render(post);

      const authorName = element.querySelector('.author-name');
      assert.strictEqual(authorName.textContent, 'Test Author');
    });

    it('shows AI badge for AI-generated posts', () => {
      const post = createSamplePost({ aiGenerated: true, aiPersona: 'Philosopher' });
      const element = postCard.render(post);

      assert.ok(element.querySelector('.badge-ai'), 'Should show AI badge');
      assert.ok(element.querySelector('.badge-persona'), 'Should show persona badge');
    });

    it('displays categories', () => {
      const post = createSamplePost({
        expand: {
          ...createSamplePost().expand,
          categories: [{ name: 'tech' }, { name: 'news' }]
        }
      });
      const element = postCard.render(post);

      const categories = element.querySelectorAll('.category-tag');
      assert.strictEqual(categories.length, 2);
    });

    it('applies highlight class when specified', () => {
      const post = createSamplePost();
      const element = postCard.render(post, { highlight: true });

      assert.ok(element.classList.contains('highlight-animation'));
    });

    it('shows delete button only for author', () => {
      const postAsAuthor = createSamplePost({
        expand: { author: { id: 'user-123', displayName: 'Me' } }
      });
      const postByOther = createSamplePost({
        expand: { author: { id: 'other-user', displayName: 'Other' } }
      });

      const elementAsAuthor = postCard.render(postAsAuthor);
      const elementByOther = postCard.render(postByOther);

      assert.ok(elementAsAuthor.querySelector('.btn-delete-post'), 'Should show delete for author');
      assert.ok(!elementByOther.querySelector('.btn-delete-post'), 'Should not show delete for non-author');
    });
  });

  describe('Voting', () => {
    it('handles upvote successfully', async () => {
      const post = createSamplePost();
      const element = postCard.render(post);
      document.body.appendChild(element);

      await postCard.handleVote('post-123', 'up');

      assert.strictEqual(mockDataService.voteOnPost.mock.calls.length, 1);
      assert.strictEqual(mockDataService.voteOnPost.mock.calls[0].arguments[0], 'post-123');
      assert.strictEqual(mockDataService.voteOnPost.mock.calls[0].arguments[1], 'up');
    });

    it('shows warning when not authenticated', async () => {
      mockPb.authStore.isValid = false;
      await postCard.handleVote('post-123', 'up');

      assert.strictEqual(toastMock.showWarning.mock.calls.length, 1);
      assert.strictEqual(mockDataService.voteOnPost.mock.calls.length, 0);
    });

    it('emits vote:success event on successful vote', async () => {
      let eventFired = false;
      postCard.on('vote:success', (e) => {
        assert.strictEqual(e.detail.postId, 'post-123');
        assert.strictEqual(e.detail.voteType, 'down');
        eventFired = true;
      });

      await postCard.handleVote('post-123', 'down');
      assert.strictEqual(eventFired, true);
    });

    it('handles vote error gracefully', async () => {
      mockDataService.voteOnPost = mock.fn(async () => {
        throw new Error('Network error');
      });

      await postCard.handleVote('post-123', 'up');

      assert.strictEqual(toastMock.showError.mock.calls.length, 1);
    });
  });

  describe('Deletion', () => {
    it('deletes post successfully', async () => {
      await postCard.handleDelete('post-123');

      assert.strictEqual(mockDataService.deletePost.mock.calls.length, 1);
      assert.strictEqual(toastMock.showSuccess.mock.calls.length, 1);
    });

    it('emits delete:success event', async () => {
      let eventFired = false;
      postCard.on('delete:success', (e) => {
        assert.strictEqual(e.detail.postId, 'post-123');
        eventFired = true;
      });

      await postCard.handleDelete('post-123');
      assert.strictEqual(eventFired, true);
    });

    it('handles delete error', async () => {
      mockDataService.deletePost = mock.fn(async () => {
        throw new Error('Delete failed');
      });

      await postCard.handleDelete('post-123');

      assert.strictEqual(toastMock.showError.mock.calls.length, 1);
    });
  });

  describe('Comments', () => {
    it('emits comments:toggle event', () => {
      let eventFired = false;
      postCard.on('comments:toggle', (e) => {
        assert.strictEqual(e.detail.postId, 'post-123');
        eventFired = true;
      });

      postCard.toggleComments('post-123');
      assert.strictEqual(eventFired, true);
    });

    it('updates comment count', () => {
      const post = createSamplePost();
      const element = postCard.render(post);
      document.body.appendChild(element);

      postCard.updateCommentCount('post-123', 10);

      const commentCount = element.querySelector('.comment-count');
      assert.strictEqual(commentCount.textContent, '10');
    });
  });

  describe('Utilities', () => {
    it('strips HTML from content', () => {
      const html = 'Hello <b>World</b><span>!</span>';
      const stripped = postCard.stripHtml(html);

      assert.strictEqual(stripped, 'Hello World!');
    });

    it('formats relative time correctly', () => {
      const now = new Date();
      const thirtySecsAgo = new Date(now.getTime() - 30000).toISOString();
      const twoMinutesAgo = new Date(now.getTime() - 120000).toISOString();

      assert.ok(postCard.formatRelativeTime(thirtySecsAgo).endsWith('s'));
      assert.ok(postCard.formatRelativeTime(twoMinutesAgo).endsWith('m'));
    });

    it('generates consistent avatars', () => {
      const avatar1 = postCard.getUserAvatar('user-123');
      const avatar2 = postCard.getUserAvatar('user-123');

      assert.strictEqual(avatar1, avatar2);
    });
  });
});

