import { dataService } from './services/data.service.js';
import { ComposerComponent } from './components/composer.js';
import { AuthPanelComponent } from './components/auth-panel.js';
import { PostCardComponent } from './components/post-card.js';
import { FeedManagerComponent } from './components/feed-manager.js';
import { CommentThreadComponent } from './components/comment-thread.js';
import { getUserAvatar } from './utils/avatar.js';
import { stripHtml, formatRelativeTime } from './utils/formatting.js';

const BASE_URL = window.POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(BASE_URL);

// Initialize data service with PocketBase instance
dataService.init(pb);

// Initialize PostCard component
const postCardRenderer = new PostCardComponent(pb, dataService);

// Initialize FeedManager component
const feedManager = new FeedManagerComponent(postCardRenderer, dataService);

// Initialize CommentThread component
const commentThread = new CommentThreadComponent(pb, dataService);

// DOM Elements (minimal - most handled by components)
const logOutput = document.getElementById('logOutput');
const statPosts = document.getElementById('statPosts');
const statAiPosts = document.getElementById('statAiPosts');
const refreshBtn = document.getElementById('refreshBtn');
const slideMenu = document.getElementById('slideMenu');
const menuOverlay = document.getElementById('menuOverlay');

const feedState = new Map();
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

function updateStats() {
  const posts = Array.from(feedState.values());
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

const setComposerEnabledFromAuth = () => setComposerEnabled(pb.authStore.isValid);
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

composer.on('post:optimistic', (e) => {
  const { post } = e.detail;
  if (feedState.has(post.id)) return;
  feedState.set(post.id, post);
  const el = renderFeedItem(post, { highlight: true });
  el.dataset.optimistic = 'true';
  document.getElementById('postsList').prepend(el);
  appendLog('📤 Publishing...');
});

composer.on('post:saved', (e) => {
  const { tempId, post } = e.detail;
  feedState.delete(tempId);
  feedState.set(post.id, post);
  document.querySelector(`[data-id="${tempId}"]`)?.replaceWith(renderFeedItem(post, { highlight: true }));
  updateStats();
  appendLog('✨ Published!');
});

composer.on('post:failed', (e) => {
  feedState.delete(e.detail.tempId);
  document.querySelector(`[data-id="${e.detail.tempId}"]`)?.remove();
  appendLog(`❌ Failed: ${e.detail.error}`);
});

// AUTH
const authPanel = new AuthPanelComponent(pb, dataService);
authPanel.init();
const handleAuth = (msg) => { appendLog(msg); setComposerEnabledFromAuth(); feedManager.refresh(); toggleMenu(false); };
authPanel.on('auth:login', () => handleAuth('✅ Logged in'));
authPanel.on('auth:logout', () => handleAuth('👋 Signed out'));
authPanel.on('auth:success', (e) => handleAuth(e.detail.type === 'register' ? `✅ Welcome, ${e.detail.email}!` : '✅ Success'));

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

      if (action === 'create' && !feedState.has(post.id)) {
        feedState.set(post.id, post);
        feedEl.prepend(renderFeedItem(post, { highlight: true }));
        updateStats();
        appendLog(post.aiGenerated ? `🤖 AI: "${post.title}"` : `✨ New: "${post.title}"`);
      } else if (action === 'update') {
        feedState.set(post.id, post);
        document.querySelector(`[data-id="${post.id}"]`)?.replaceWith(renderFeedItem(post));
        updateStats();
      } else if (action === 'delete') {
        feedState.delete(record.id);
        const el = document.querySelector(`[data-id="${record.id}"]`);
        if (el) { el.classList.add('post-card--remove'); setTimeout(() => el.remove(), 300); }
        updateStats();
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
  feedManager.on('load:success', (e) => { updateStats(); appendLog(`✅ Loaded ${e.detail.count} posts`); });
  feedManager.on('load:error', (e) => appendLog(`❌ ${e.detail.error}`));
  await subscribeToRealtime();
  appendLog('🎉 Welcome! AI-powered 90s social feed is ONLINE!');
})();
