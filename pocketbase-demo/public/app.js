import { dataService } from './services/data.service.js';
import { ComposerComponent } from './components/composer.js';
import { AuthPanelComponent } from './components/auth-panel.js';
import { PostCardComponent } from './components/post-card.js';
import { FeedManagerComponent } from './components/feed-manager.js';
import { CommentThreadComponent } from './components/comment-thread.js';
import { getUserAvatar } from './utils/avatar.js';
import { stripHtml, formatRelativeTime } from './utils/formatting.js';
import { authStore, feedStore } from './store/index.js';

const BASE_URL = window.POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(BASE_URL);

// Initialize data service with PocketBase instance
dataService.init(pb);

// Expose data service for action creators (dispatcher)
if (typeof window !== 'undefined') {
  window.__dataService__ = dataService;
}

// Initialize PostCard component
const postCardRenderer = new PostCardComponent(pb, dataService);

// Initialize FeedManager component
const feedManager = new FeedManagerComponent(postCardRenderer, dataService);

// Initialize CommentThread component
const commentThread = new CommentThreadComponent(pb, dataService);

// Track rendered posts for stats/realtime helpers
const renderedPosts = new Map();
const syncRenderedPosts = (posts = []) => {
  renderedPosts.clear();
  posts.forEach(post => renderedPosts.set(post.id, post));
  updateStats(posts);
};

// DOM Elements (minimal - most handled by components)
const logOutput = document.getElementById('logOutput');
const statPosts = document.getElementById('statPosts');
const statAiPosts = document.getElementById('statAiPosts');
const refreshBtn = document.getElementById('refreshBtn');
const slideMenu = document.getElementById('slideMenu');
const menuOverlay = document.getElementById('menuOverlay');

const MAX_LOG_LINES = 80;

// Utility Functions
function appendLog(message) {
  const entry = document.createElement('p');
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logOutput.prepend(entry);

  while (logOutput.children.length > MAX_LOG_LINES) {
    logOutput.removeChild(logOutput.lastChild);
  }
}

function updateStats(posts = feedStore.getState('posts') || []) {
  statPosts.textContent = posts.length.toString();
  const aiCount = posts.filter((post) => post.aiGenerated).length;
  statAiPosts.textContent = aiCount.toString();
}

async function updateHitCounter() {
  try {
    const { newCount } = await dataService.updateHitCounter();
    const digits = document.querySelectorAll('#hitCounter .digit');
    if (digits.length) {
      const countStr = newCount.toString().padStart(digits.length, '0');
      digits.forEach((digit, i) => {
        if (countStr[i] !== digit.textContent) {
          digit.classList.add('flip');
          digit.textContent = countStr[i];
          setTimeout(() => digit.classList.remove('flip'), 400);
        } else {
          digit.textContent = countStr[i];
        }
      });
    }
    appendLog(`👁️ Visitor count: ${newCount}`);
  } catch (error) {
    appendLog(`❌ ${error.message}`);
    if (error.message.includes('No site stats record found')) {
      appendLog('ℹ️ Run setup script');
    }
  }
}

const getIsAuthenticated = () => {
  const storeValue = authStore?.getState ? authStore.getState('isAuthenticated') : undefined;
  if (typeof storeValue === 'boolean') {
    return storeValue;
  }
  return pb.authStore.isValid;
};

const setComposerEnabledFromAuth = () => setComposerEnabled(getIsAuthenticated());
const setComposerEnabled = (enabled) => {
  composerCard.querySelectorAll('textarea, select, button').forEach(el => el.disabled = !enabled);
  composerCard.classList.toggle('is-disabled', !enabled);
};

// Menu
const toggleMenu = (open) => {
  slideMenu.classList.toggle('open', open);
  menuOverlay.classList.toggle('visible', open);
  document.body.style.overflow = open ? 'hidden' : '';
};
['menuToggle', 'profileToggle'].forEach(id => document.getElementById(id)?.addEventListener('click', () => toggleMenu(true)));
document.getElementById('menuClose')?.addEventListener('click', () => toggleMenu(false));
menuOverlay?.addEventListener('click', () => toggleMenu(false));

async function loadCategories() {
  const el = document.getElementById('categorySelect');
  if (!el) return;
  try {
    const result = await dataService.getCategories();
    el.innerHTML = '';
    result.items.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.label;
      el.append(opt);
    });
  } catch (error) { appendLog(`❌ ${error.message}`); }
}

// COMPONENTS - Render wrapper
const renderFeedItem = (record, options = {}) => {
  const postCard = postCardRenderer.render(record, options);
  postCardRenderer.on('comments:toggle', (e) => commentThread.toggleComments(e.detail.postId, postCard));
  return postCard;
};

// COMPOSER
const composer = new ComposerComponent(pb, dataService);
composer.init('composerForm');

window.addEventListener('composer:submit', (event) => {
  const { status, message } = event.detail || {};
  if (status === 'start') appendLog('📤 Publishing...');
  if (status === 'success') appendLog('✨ Published!');
  if (status === 'error' && message) appendLog(`❌ ${message}`);
});

syncRenderedPosts(feedStore.getState('posts') || []);
let previousPostCount = renderedPosts.size;

feedStore.subscribe('posts', (posts = []) => {
  const prevCount = previousPostCount;
  syncRenderedPosts(posts);
  if (posts.length > prevCount) {
    appendLog('✨ Feed updated');
  } else if (posts.length < prevCount) {
    appendLog('🗑️ Post removed');
  }
  previousPostCount = posts.length;
});

// AUTH
const authPanel = new AuthPanelComponent(pb, dataService);
authPanel.init();

const handleAuthChange = (isAuthenticated) => {
  const user = authStore.getState('user');
  const displayName = user?.displayName || user?.email;
  const message = isAuthenticated
    ? (displayName ? `✅ Logged in as ${displayName}` : '✅ Logged in')
    : '👋 Signed out';

  appendLog(message);
  setComposerEnabled(isAuthenticated);
  feedManager.refresh();
  toggleMenu(false);
};

let lastAuthState = getIsAuthenticated();
setComposerEnabled(lastAuthState);

authStore.subscribe('isAuthenticated', (value) => {
  const isAuthenticated = Boolean(value);
  if (isAuthenticated === lastAuthState) {
    return;
  }
  lastAuthState = isAuthenticated;
  handleAuthChange(isAuthenticated);
});

// REFRESH
refreshBtn?.addEventListener('click', () => {
  appendLog('🔄 Refreshing feed...');
  feedManager.refresh();
});

// REALTIME
async function subscribeToRealtime() {
  const feedEl = document.getElementById('postsList');
  dataService.subscribeToCollection('posts', '*', async (e) => {
    try {
      const { action, record } = e;
      const post = action !== 'delete' ? await dataService.getPost(record.id) : null;

      if (action === 'create' && post && !renderedPosts.has(post.id)) {
        renderedPosts.set(post.id, post);
        feedEl.prepend(renderFeedItem(post, { highlight: true }));
        updateStats(Array.from(renderedPosts.values()));
        appendLog(post.aiGenerated ? `🤖 AI: "${post.title}"` : `✨ New: "${post.title}"`);
      } else if (action === 'update' && post) {
        renderedPosts.set(post.id, post);
        document.querySelector(`[data-id="${post.id}"]`)?.replaceWith(renderFeedItem(post));
        updateStats(Array.from(renderedPosts.values()));
      } else if (action === 'delete') {
        renderedPosts.delete(record.id);
        const el = document.querySelector(`[data-id="${record.id}"]`);
        if (el) { el.classList.add('post-card--remove'); setTimeout(() => el.remove(), 300); }
        updateStats(Array.from(renderedPosts.values()));
        appendLog('🗑️ Deleted');
      }
    } catch (err) { appendLog(`❌ ${err.message}`); }
  });
}

window.addEventListener('beforeunload', () => { dataService.unsubscribeAll(); dataService.disconnect(); });

// INITIALIZE
(async function() {
  setComposerEnabledFromAuth();
  await Promise.all([updateHitCounter(), loadCategories()]);
  feedManager.init('postsList');
  feedManager.on('load:success', (e) => {
    updateStats(feedStore.getState('posts') || []);
    appendLog(`✅ Loaded ${e.detail.count} posts`);
  });
  feedManager.on('load:error', (e) => appendLog(`❌ ${e.detail.error}`));
  await subscribeToRealtime();
  appendLog('🎉 Welcome! AI-powered 90s social feed is ONLINE!');
})();
