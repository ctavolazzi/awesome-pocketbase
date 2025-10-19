import { dataService } from './services/data.service.js';
import { ComposerComponent } from './components/composer.js';

const BASE_URL = window.POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(BASE_URL);

// Initialize data service with PocketBase instance
dataService.init(pb);

// Avatar system
const avatarEmojis = ['💾', '🤖', '👾', '🌟', '💿', '📀', '🎮', '🕹️', '💻', '📱', '🖥️', '⌨️'];

function getUserAvatar(userId) {
  if (!userId) return '👤';
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarEmojis[hash % avatarEmojis.length];
}

// DOM Elements
const menuToggle = document.getElementById('menuToggle');
const menuClose = document.getElementById('menuClose');
const slideMenu = document.getElementById('slideMenu');
const menuOverlay = document.getElementById('menuOverlay');
const profileToggle = document.getElementById('profileToggle');
const userAvatar = document.getElementById('userAvatar');
const menuUserAvatar = document.getElementById('menuUserAvatar');
const menuUserName = document.getElementById('menuUserName');
const menuUserBio = document.getElementById('menuUserBio');
const postsListEl = document.getElementById('postsList');
const composerCard = document.getElementById('composerCard');
const composerForm = document.getElementById('composerForm');
const composerTextarea = composerForm.querySelector('textarea[name="content"]');
const charCountEl = document.getElementById('charCount');
const categorySelect = document.getElementById('categorySelect');
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const logOutput = document.getElementById('logOutput');
const statPosts = document.getElementById('statPosts');
const statAiPosts = document.getElementById('statAiPosts');
const musicToggle = document.getElementById('musicToggle');
const newPostsIndicator = document.getElementById('newPostsIndicator');
const newPostsCountEl = document.getElementById('newPostsCount');
const viewNewPostsBtn = document.getElementById('viewNewPostsBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const endOfFeedEl = document.getElementById('endOfFeed');

const feedState = new Map();
const commentState = new Map();
const MAX_LOG_LINES = 80;
const POSTS_PER_PAGE = 20;
let currentPage = 1;
let isLoading = false;
let hasMorePosts = true;
let newPostsCount = 0;

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

function toggleLoadingIndicator(show) {
  if (!loadingIndicator) return;
  loadingIndicator.hidden = !show;
}

function toggleEndOfFeed(show) {
  if (!endOfFeedEl) return;
  endOfFeedEl.hidden = !show;
}

function updateNewPostsIndicator() {
  if (!newPostsIndicator || !newPostsCountEl) return;
  if (newPostsCount > 0) {
    newPostsCountEl.textContent = newPostsCount.toString();
    newPostsIndicator.hidden = false;
  } else {
    newPostsIndicator.hidden = true;
  }
}

function resetNewPostsState() {
  newPostsCount = 0;
  updateNewPostsIndicator();
}

async function updateHitCounter() {
  try {
    const { newCount } = await dataService.updateHitCounter();
    displayCounter(newCount);
    appendLog(`👁️ Visitor count: ${newCount}`);
  } catch (error) {
    appendLog(`❌ ${error.message}`);
    if (error.message.includes('No site stats record found')) {
      appendLog('ℹ️ Run the setup script (`npm run setup`) to create the demo collections before using the viewer.');
    }
    console.error('Hit counter error:', error);
  }
}

function displayCounter(count) {
  const digits = document.querySelectorAll('#hitCounter .digit');
  if (!digits.length) {
    return;
  }

  const countStr = count.toString().padStart(digits.length, '0');

  digits.forEach((digit, index) => {
    const newDigit = countStr[index];
    const oldDigit = digit.textContent;

    if (newDigit !== oldDigit) {
      digit.classList.add('flip');
      digit.textContent = newDigit;
      setTimeout(() => digit.classList.remove('flip'), 400);
    } else {
      digit.textContent = newDigit;
    }
  });
}

function setAuthStatus() {
  if (pb.authStore.isValid) {
    const user = pb.authStore.model;
    const name = user?.displayName || user?.email;
    const avatar = getUserAvatar(user?.id);

    userAvatar.textContent = avatar;
    menuUserAvatar.textContent = avatar;
    menuUserName.textContent = name || 'User';
    menuUserBio.textContent = user?.bio || '';

    // Update composer avatar
    const composerAvatar = document.getElementById('composerAvatar');
    if (composerAvatar) {
      composerAvatar.textContent = avatar;
    }

    logoutBtn.disabled = false;
    setComposerEnabled(true);
  } else {
    userAvatar.textContent = '👤';
    menuUserAvatar.textContent = '👤';
    menuUserName.textContent = 'Not signed in';
    menuUserBio.textContent = '';
    logoutBtn.disabled = true;
    setComposerEnabled(false);
  }
}

function setComposerEnabled(enabled) {
  const elements = composerCard.querySelectorAll('textarea, select, button');
  elements.forEach((el) => {
    el.disabled = !enabled;
  });
  composerCard.classList.toggle('is-disabled', !enabled);
}

// Menu System
function openMenu() {
  slideMenu.classList.add('open');
  menuOverlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  slideMenu.classList.remove('open');
  menuOverlay.classList.remove('visible');
  document.body.style.overflow = '';
}

menuToggle?.addEventListener('click', openMenu);
menuClose?.addEventListener('click', closeMenu);
menuOverlay?.addEventListener('click', closeMenu);
profileToggle?.addEventListener('click', openMenu);

async function loadCategories() {
  try {
    const result = await dataService.getCategories();
    categorySelect.innerHTML = '';
    result.items.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.label;
      categorySelect.append(option);
    });
    appendLog('✅ Loaded categories');
  } catch (error) {
    appendLog(`❌ ${error.message}`);
  }
}

function stripHtml(input) {
  const temp = document.createElement('div');
  temp.innerHTML = input || '';
  return temp.textContent || temp.innerText || '';
}

function formatRelativeTime(isoString) {
  const now = new Date();
  const then = new Date(isoString);
  const diff = (now - then) / 1000;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return then.toLocaleDateString();
}

// Voting System
async function handleVote(postId, voteType) {
  if (!pb.authStore.isValid) {
    appendLog('⚠️ Sign in to vote');
    return;
  }

  try {
    const updatedPost = await dataService.votePost(postId, voteType);
    feedState.set(postId, updatedPost);

    // Update UI
    const postCard = postsListEl.querySelector(`[data-id="${postId}"]`);
    if (postCard) {
      updateVoteUI(postCard, updatedPost);
    }

    appendLog(`✅ Voted ${voteType} on post`);
  } catch (error) {
    appendLog(`❌ ${error.message}`);
  }
}

function updateVoteUI(postCard, post) {
  const upvoteBtn = postCard.querySelector('.vote-btn[data-type="up"]');
  const downvoteBtn = postCard.querySelector('.vote-btn[data-type="down"]');
  const voteCount = postCard.querySelector('.vote-count');

  const currentUser = pb.authStore.model?.id;
  const upvotedBy = post.upvotedBy || [];
  const downvotedBy = post.downvotedBy || [];

  upvoteBtn?.classList.toggle('active-upvote', upvotedBy.includes(currentUser));
  downvoteBtn?.classList.toggle('active-downvote', downvotedBy.includes(currentUser));

  const netVotes = (post.upvotes || 0) - (post.downvotes || 0);
  if (voteCount) {
    voteCount.textContent = netVotes > 0 ? `+${netVotes}` : netVotes.toString();
  }
}

// Comment System
async function loadComments(postId) {
  try {
    const comments = await dataService.getComments(postId);
    commentState.set(postId, comments);
    return comments;
  } catch (error) {
    appendLog(`❌ ${error.message}`);
    return [];
  }
}

async function toggleComments(postId) {
  const postCard = postsListEl.querySelector(`[data-id="${postId}"]`);
  if (!postCard) return;

  let commentThread = postCard.querySelector('.comment-thread');

  if (commentThread) {
    // Toggle visibility
    commentThread.classList.toggle('hidden');
    return;
  }

  // Load and render comments
  const comments = await loadComments(postId);
  commentThread = document.createElement('div');
  commentThread.className = 'comment-thread';

  renderCommentTree(commentThread, comments, null, 0);

  // Add comment composer
  const composer = createCommentComposer(postId);
  commentThread.appendChild(composer);

  postCard.appendChild(commentThread);
}

function renderCommentTree(container, allComments, parentId, depth) {
  const comments = allComments.filter(c => c.parentComment === parentId);

  comments.forEach(comment => {
    const commentEl = createCommentElement(comment, depth);
    container.appendChild(commentEl);

    // Recursively render replies (max depth 3)
    if (depth < 3) {
      renderCommentTree(container, allComments, comment.id, depth + 1);
    }
  });
}

function createCommentElement(comment, depth) {
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
      ${depth < 3 ? `<button type="button" class="reply-btn">Reply</button>` : ''}
      ${pb.authStore.model?.id === comment.author ? `<button type="button" class="delete-comment-btn">Delete</button>` : ''}
    </div>
  `;

  // Attach event listeners
  const voteButtons = div.querySelectorAll('.comment-vote-btn');
  voteButtons.forEach(btn => {
    btn.addEventListener('click', () => handleCommentVote(comment.id, btn.dataset.type));
  });

  const replyBtn = div.querySelector('.reply-btn');
  if (replyBtn) {
    replyBtn.addEventListener('click', () => showReplyForm(div, comment.id, comment.post));
  }

  const deleteBtn = div.querySelector('.delete-comment-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => handleDeleteComment(comment.id, comment.post));
  }

  return div;
}

function createCommentComposer(postId) {
  const div = document.createElement('div');
  div.className = 'comment-composer';
  div.innerHTML = `
    <textarea placeholder="Add a comment..." maxlength="500" rows="3"></textarea>
    <button type="button" class="primary">Post Comment</button>
  `;

  const textarea = div.querySelector('textarea');
  const button = div.querySelector('button');

  button.addEventListener('click', async () => {
    const content = textarea.value.trim();
    if (!content) return;

    if (!pb.authStore.isValid) {
      appendLog('⚠️ Sign in to comment');
      return;
    }

    try {
      await dataService.createComment(postId, content);
      textarea.value = '';
      appendLog('✅ Comment posted');

      // Reload comments
      const postCard = postsListEl.querySelector(`[data-id="${postId}"]`);
      const commentThread = postCard.querySelector('.comment-thread');
      if (commentThread) {
        commentThread.remove();
      }
      await toggleComments(postId);
    } catch (error) {
      appendLog(`❌ ${error.message}`);
    }
  });

  return div;
}

function showReplyForm(commentEl, parentCommentId, postId) {
  // Remove any existing reply forms
  const existingForm = commentEl.querySelector('.reply-form');
  if (existingForm) {
    existingForm.remove();
    return;
  }

  const form = document.createElement('div');
  form.className = 'reply-form';
  form.innerHTML = `
    <textarea placeholder="Write a reply..." maxlength="500" rows="2"></textarea>
    <button type="button" class="primary">Post Reply</button>
    <button type="button" class="secondary">Cancel</button>
  `;

  const textarea = form.querySelector('textarea');
  const postBtn = form.querySelectorAll('button')[0];
  const cancelBtn = form.querySelectorAll('button')[1];

  postBtn.addEventListener('click', async () => {
    const content = textarea.value.trim();
    if (!content) return;

    if (!pb.authStore.isValid) {
      appendLog('⚠️ Sign in to reply');
      return;
    }

    try {
      await dataService.createComment(postId, content, parentCommentId);
      appendLog('✅ Reply posted');

      // Reload comments
      const postCard = postsListEl.querySelector(`[data-id="${postId}"]`);
      const commentThread = postCard.querySelector('.comment-thread');
      if (commentThread) {
        commentThread.remove();
      }
      await toggleComments(postId);
    } catch (error) {
      appendLog(`❌ ${error.message}`);
    }
  });

  cancelBtn.addEventListener('click', () => {
    form.remove();
  });

  commentEl.appendChild(form);
  textarea.focus();
}

async function handleCommentVote(commentId, voteType) {
  if (!pb.authStore.isValid) {
    appendLog('⚠️ Sign in to vote');
    return;
  }

  try {
    await dataService.voteComment(commentId, voteType);
    appendLog(`✅ Voted ${voteType} on comment`);
  } catch (error) {
    appendLog(`❌ ${error.message}`);
  }
}

async function handleDeleteComment(commentId, postId) {
  if (!window.confirm('Delete this comment?')) return;

  try {
    await dataService.deleteComment(commentId);
    appendLog('✅ Comment deleted');

    // Reload comments
    const postCard = postsListEl.querySelector(`[data-id="${postId}"]`);
    const commentThread = postCard.querySelector('.comment-thread');
    if (commentThread) {
      commentThread.remove();
    }
    await toggleComments(postId);
  } catch (error) {
    appendLog(`❌ ${error.message}`);
  }
}

// Post Rendering
function renderFeedItem(record, options = {}) {
  const { highlight = false } = options;
  const author = record.expand?.author;
  const categories = record.expand?.categories || [];
  const avatar = getUserAvatar(author?.id);

  const div = document.createElement('div');
  div.className = 'post-card';
  if (record.aiGenerated) {
    div.classList.add('ai-post');
  }
  if (highlight) {
    div.classList.add('post-card--new');
  }
  div.dataset.id = record.id;

  // Calculate net votes
  const upvotedBy = record.upvotedBy || [];
  const downvotedBy = record.downvotedBy || [];
  const netVotes = (record.upvotes || 0) - (record.downvotes || 0);
  const currentUser = pb.authStore.model?.id;

  // Header with avatar
  const header = document.createElement('div');
  header.className = 'post-header';
  header.innerHTML = `
    <div class="post-avatar">${avatar}</div>
    <div class="post-header-content">
      <div class="post-author-name">${author?.displayName || author?.email || 'Unknown user'}</div>
      <div class="post-meta-info">${formatRelativeTime(record.created)}</div>
      ${categories.length > 0 ? `
        <div class="post-categories">
          ${categories.map(cat => `<span class="tag">${cat.label}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `;
  div.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'post-body';
  body.textContent = stripHtml(record.content);
  div.appendChild(body);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'post-actions';

  // Vote buttons
  const voteButtons = document.createElement('div');
  voteButtons.className = 'vote-buttons';
  voteButtons.innerHTML = `
    <button type="button" class="vote-btn ${upvotedBy.includes(currentUser) ? 'active-upvote' : ''}" data-type="up">⬆️</button>
    <span class="vote-count">${netVotes > 0 ? `+${netVotes}` : netVotes}</span>
    <button type="button" class="vote-btn ${downvotedBy.includes(currentUser) ? 'active-downvote' : ''}" data-type="down">⬇️</button>
  `;
  actions.appendChild(voteButtons);

  // Comment button
  const commentBtn = document.createElement('button');
  commentBtn.type = 'button';
  commentBtn.className = 'comment-btn';
  commentBtn.textContent = '💬 Comments';
  commentBtn.addEventListener('click', () => toggleComments(record.id));
  actions.appendChild(commentBtn);

  // Delete button (if own post)
  if (pb.authStore.isValid && pb.authStore.model?.id === record.author) {
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => handleDeletePost(record.id));
    actions.appendChild(deleteBtn);
  }

  div.appendChild(actions);

  // Attach vote listeners
  const voteBtns = voteButtons.querySelectorAll('.vote-btn');
  voteBtns.forEach(btn => {
    btn.addEventListener('click', () => handleVote(record.id, btn.dataset.type));
  });

  return div;
}

async function loadPosts(page = 1, append = false) {
  if (isLoading) return;
  isLoading = true;

  if (!append) {
    resetNewPostsState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toggleEndOfFeed(false);
  }

  toggleLoadingIndicator(true);

  try {
    const list = await dataService.getPosts(page, POSTS_PER_PAGE);

    if (!append) {
      postsListEl.innerHTML = '';
      feedState.clear();
    }

    list.items.forEach((post) => {
      if (feedState.has(post.id)) {
        return;
      }
      feedState.set(post.id, post);
      const item = renderFeedItem(post);
      postsListEl.append(item);
    });

    hasMorePosts = list.page < list.totalPages;
    currentPage = page;
    toggleEndOfFeed(!hasMorePosts && postsListEl.children.length > 0);

    updateStats();
    appendLog(`✅ Loaded ${list.items.length} posts (page ${list.page}/${list.totalPages || 1})`);
  } catch (error) {
    appendLog(`❌ ${error.message}`);
    hasMorePosts = false;
    toggleEndOfFeed(false);
    if (error.message.includes('Failed to load posts')) {
      appendLog('ℹ️ Ensure the PocketBase server is running and seeded (run `npm run setup`) before loading the feed.');
    }
  } finally {
    toggleLoadingIndicator(false);
    isLoading = false;
  }
}

async function handleDeletePost(id) {
  if (!window.confirm('Delete this post?')) return;

  try {
    await dataService.deletePost(id);
    feedState.delete(id);
    const card = postsListEl.querySelector(`[data-id="${id}"]`);
    if (card) {
      card.classList.add('post-card--remove');
      setTimeout(() => card.remove(), 300);
    }
    updateStats();
    appendLog(`🗑️ Deleted post ${id}`);
  } catch (error) {
    appendLog(`❌ ${error.message}`);
  }
}

// Infinite scroll
function handleScroll() {
  const scrollPosition = window.scrollY + window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;

  if (scrollPosition >= documentHeight - 500 && hasMorePosts && !isLoading) {
    const nextPage = currentPage + 1;
    loadPosts(nextPage, true);
  }
}

window.addEventListener('scroll', handleScroll, { passive: true });

// View new posts
viewNewPostsBtn?.addEventListener('click', () => {
  resetNewPostsState();
  loadPosts(1, false);
});

// COMPOSER COMPONENT - Initialize and wire up optimistic UI
const composer = new ComposerComponent(pb, dataService);
composer.init('composerForm');

// Handle optimistic post creation (show immediately)
composer.on('post:optimistic', (event) => {
  const { post } = event.detail;

  // Check if already in feed (avoid duplicates)
  if (feedState.has(post.id)) {
    return;
  }

  // Add to feed state
  feedState.set(post.id, post);

  // Render and prepend to feed
  const postElement = renderFeedItem(post, { highlight: true });
  postElement.dataset.optimistic = 'true'; // Mark as optimistic
  postsListEl.prepend(postElement);

  // Log activity
  appendLog('📤 Publishing post...');
});

// Handle successful save (update temp ID to real ID)
composer.on('post:saved', (event) => {
  const { tempId, post } = event.detail;

  // Remove temp post from state
  feedState.delete(tempId);

  // Add real post to state
  feedState.set(post.id, post);

  // Find and update DOM element
  const tempElement = postsListEl.querySelector(`[data-id="${tempId}"]`);
  if (tempElement) {
    // Update data-id to real ID
    tempElement.dataset.id = post.id;
    tempElement.removeAttribute('data-optimistic');

    // Re-render with real data (includes expanded relations)
    const realElement = renderFeedItem(post, { highlight: true });
    postsListEl.replaceChild(realElement, tempElement);
  }

  // Update stats
  updateStats();

  // Log success
  appendLog('✨ Post published successfully!');
});

// Handle save failure (remove optimistic post)
composer.on('post:failed', (event) => {
  const { tempId, error } = event.detail;

  // Remove from state
  feedState.delete(tempId);

  // Find and remove from DOM with animation
  const tempElement = postsListEl.querySelector(`[data-id="${tempId}"]`);
  if (tempElement) {
    tempElement.classList.add('post-card--remove');
    setTimeout(() => {
      tempElement.remove();
    }, 300);
  }

  // Log failure
  appendLog(`❌ Failed to publish: ${error}`);
});

// REGISTER FORM
registerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(registerForm);
  const email = formData.get('email').trim();
  const password = formData.get('password');
  const displayName = formData.get('displayName').trim();

  try {
    await dataService.createUser({
      email,
      password,
      passwordConfirm: password,
      displayName,
    });

    appendLog(`✅ Registered ${email}`);
    await dataService.authWithPassword(email, password);
    appendLog(`✅ Signed in as ${email}`);
    setAuthStatus();
    await loadPosts(1, false);
    registerForm.reset();
    closeMenu();
  } catch (error) {
    appendLog(`❌ ${error.message}`);
  }
});

// LOGIN FORM
loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const email = formData.get('email').trim();
  const password = formData.get('password');

  try {
    await dataService.authWithPassword(email, password);
    appendLog(`✅ Signed in as ${email}`);
    setAuthStatus();
    await loadPosts(1, false);
    closeMenu();
  } catch (error) {
    appendLog(`❌ ${error.message}`);
  }
});

// LOGOUT
logoutBtn?.addEventListener('click', () => {
  pb.authStore.clear();
  setAuthStatus();
  appendLog('👋 Signed out');
  loadPosts(1, false);
  closeMenu();
});

// REFRESH
refreshBtn?.addEventListener('click', () => {
  appendLog('🔄 Refreshing feed...');
  loadPosts(1, false);
});

// REALTIME SUBSCRIPTIONS
async function subscribeToRealtime() {
  try {
    await dataService.subscribeToCollection('posts', '*', async (event) => {
      if (event.action === 'create') {
        try {
          const fullRecord = await dataService.getPost(event.record.id);

          if (feedState.has(fullRecord.id)) {
            return;
          }

          // Always show at top for now
          feedState.set(fullRecord.id, fullRecord);
          const newItem = renderFeedItem(fullRecord, { highlight: true });
          postsListEl.prepend(newItem);
          updateStats();
          toggleEndOfFeed(false);

          if (fullRecord.aiGenerated) {
            appendLog(`🤖 AI Bot posted: "${fullRecord.title}"`);
          } else {
            appendLog(`✨ New post: "${fullRecord.title}"`);
          }
        } catch (error) {
          appendLog(`❌ ${error.message}`);
        }
      } else if (event.action === 'update') {
        try {
          const fullRecord = await dataService.getPost(event.record.id);
          feedState.set(fullRecord.id, fullRecord);
          const existing = postsListEl.querySelector(`[data-id="${fullRecord.id}"]`);
          if (existing) {
            const replacement = renderFeedItem(fullRecord);
            postsListEl.replaceChild(replacement, existing);
          }
          updateStats();
        } catch (error) {
          appendLog(`❌ ${error.message}`);
        }
      } else if (event.action === 'delete') {
        feedState.delete(event.record.id);
        const card = postsListEl.querySelector(`[data-id="${event.record.id}"]`);
        if (card) {
          card.classList.add('post-card--remove');
          setTimeout(() => card.remove(), 300);
        }
        updateStats();
        appendLog('🗑️ Post deleted');
      }
    });
  } catch (error) {
    appendLog(`❌ ${error.message}`);
  }
}

window.addEventListener('beforeunload', () => {
  dataService.unsubscribeAll();
  dataService.disconnect();
});

// 🌟 STARFIELD ANIMATION 🌟
const canvas = document.getElementById('starfield');
if (canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const stars = [];
  const starCount = 200;

  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2,
      speed: Math.random() * 0.5 + 0.1,
      opacity: Math.random()
    });
  }

  function animateStars() {
    ctx.fillStyle = 'rgba(0, 128, 128, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach(star => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      ctx.fill();

      star.y += star.speed;
      star.opacity = Math.sin(Date.now() * 0.001 + star.x) * 0.5 + 0.5;

      if (star.y > canvas.height) {
        star.y = 0;
        star.x = Math.random() * canvas.width;
      }
    });

    requestAnimationFrame(animateStars);
  }

  animateStars();

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// 🎵 MIDI MUSIC TOGGLE 🎵
if (musicToggle) {
  let musicEnabled = false;
  musicToggle.addEventListener('click', () => {
    musicEnabled = !musicEnabled;
    const badgeText = musicToggle.querySelector('.badge-text');
    if (badgeText) {
      badgeText.innerHTML = musicEnabled ? 'MIDI<br>ON' : 'MIDI<br>OFF';
    }
    if (musicEnabled) {
      appendLog('🎵 MIDI music enabled! (Just kidding, no actual MIDI file loaded)');
    } else {
      appendLog('🔇 MIDI music disabled');
    }
  });
}

// INITIALIZE
(async function init() {
  pb.authStore.onChange(() => setAuthStatus());
  setAuthStatus();
  await updateHitCounter();
  await loadCategories();
  await loadPosts(1, false);
  await subscribeToRealtime();

  appendLog('🎉 Welcome to the PocketBase Cyber Plaza!');
  appendLog('🤖 AI-powered 90s social feed is ONLINE!');
  appendLog('💡 Run "npm run ollama" to start AI post generation');
})();
