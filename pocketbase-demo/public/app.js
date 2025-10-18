const BASE_URL = window.POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(BASE_URL);

const authStatusEl = document.getElementById('authStatus');
const connectionStatusEl = document.getElementById('connectionStatus');
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

const feedState = new Map();
const MAX_LOG_LINES = 80;

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

function setAuthStatus() {
  if (pb.authStore.isValid) {
    const name = pb.authStore.model?.displayName || pb.authStore.model?.email;
    authStatusEl.textContent = `Signed in as ${name}`;
    logoutBtn.disabled = false;
    setComposerEnabled(true);
  } else {
    authStatusEl.textContent = 'Not signed in';
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

function setConnectionStatus(connected) {
  connectionStatusEl.textContent = connected ? 'Online' : 'Offline';
  connectionStatusEl.classList.toggle('status-pill--online', connected);
  connectionStatusEl.classList.toggle('status-pill--offline', !connected);
}

async function loadCategories() {
  try {
    const result = await pb.collection('categories').getList(1, 100, { sort: 'label' });
    categorySelect.innerHTML = '';
    result.items.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.label;
      categorySelect.append(option);
    });
    appendLog('✅ Loaded categories');
  } catch (error) {
    appendLog(`❌ Failed to load categories: ${error?.message || error}`);
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

function renderFeedItem(record) {
  const author = record.expand?.author;
  const categories = record.expand?.categories || [];

  const li = document.createElement('li');
  li.className = 'post-item';
  if (record.aiGenerated) {
    li.classList.add('ai-post');
  }
  li.dataset.id = record.id;

  const meta = document.createElement('div');
  meta.className = 'post-meta';

  const authorSpan = document.createElement('span');
  authorSpan.className = 'post-author';
  authorSpan.textContent = author?.displayName || author?.email || 'Unknown user';
  meta.append(authorSpan);

  const timeSpan = document.createElement('span');
  timeSpan.className = 'post-time';
  timeSpan.textContent = formatRelativeTime(record.created);
  meta.append(timeSpan);

  li.append(meta);

  if (categories.length > 0) {
    const categoriesDiv = document.createElement('div');
    categoriesDiv.className = 'post-categories';
    categories.forEach((cat) => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = cat.label;
      categoriesDiv.append(tag);
    });
    li.append(categoriesDiv);
  }

  const body = document.createElement('div');
  body.className = 'post-body';
  body.textContent = stripHtml(record.content);
  li.append(body);

  if (pb.authStore.isValid && pb.authStore.model?.id === record.author) {
    const actions = document.createElement('div');
    actions.className = 'post-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'secondary';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => handleDeletePost(record.id));

    actions.append(deleteBtn);
    li.append(actions);
  }

  return li;
}

async function loadPosts() {
  try {
    const list = await pb.collection('posts').getList(1, 50, {
      sort: '-created',
      expand: 'author,categories',
    });

    postsListEl.innerHTML = '';
    feedState.clear();

    list.items.forEach((post) => {
      feedState.set(post.id, post);
      postsListEl.append(renderFeedItem(post));
    });

    updateStats();
    appendLog(`✅ Loaded ${list.items.length} posts`);
    setConnectionStatus(true);
  } catch (error) {
    appendLog(`❌ Failed to load posts: ${error?.message || error}`);
    setConnectionStatus(false);
  }
}

async function handleDeletePost(id) {
  if (!window.confirm('Delete this post?')) return;

  try {
    await pb.collection('posts').delete(id, { requestKey: null });
    feedState.delete(id);
    const li = postsListEl.querySelector(`[data-id="${id}"]`);
    if (li) li.remove();
    updateStats();
    appendLog(`🗑️ Deleted post ${id}`);
  } catch (error) {
    appendLog(`❌ Delete failed: ${error?.message || error}`);
  }
}

// CHARACTER COUNTER
composerTextarea?.addEventListener('input', () => {
  const length = composerTextarea.value.length;
  charCountEl.textContent = `${length} / 420`;
  if (length > 380) {
    charCountEl.style.color = '#ff0000';
    charCountEl.style.fontWeight = 'bold';
  } else {
    charCountEl.style.color = '#800080';
    charCountEl.style.fontWeight = 'normal';
  }
});

// COMPOSER FORM
composerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!pb.authStore.isValid) {
    appendLog('⚠️ Sign in to publish posts');
    return;
  }

  const content = composerTextarea.value.trim();
  const categories = Array.from(categorySelect.selectedOptions).map(opt => opt.value);

  if (!content) {
    appendLog('⚠️ Post content cannot be empty');
    return;
  }

  try {
    const payload = {
      title: content.slice(0, 50),
      slug: `post-${Date.now()}`,
      content: `<p>${content}</p>`,
      status: 'published',
      categories,
      author: pb.authStore.model.id,
      featured: false,
      aiGenerated: false,
    };

    await pb.collection('posts').create(payload, { requestKey: null });
    appendLog('✨ Post published!');
    composerForm.reset();
    charCountEl.textContent = '0 / 420';
    await loadPosts();
  } catch (error) {
    appendLog(`❌ Publish failed: ${error?.message || error}`);
  }
});

// REGISTER FORM
registerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(registerForm);
  const email = formData.get('email').trim();
  const password = formData.get('password');
  const displayName = formData.get('displayName').trim();

  try {
    await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      displayName,
    });

    appendLog(`✅ Registered ${email}`);
    await pb.collection('users').authWithPassword(email, password);
    appendLog(`✅ Signed in as ${email}`);
    setAuthStatus();
    await loadPosts();
    registerForm.reset();
  } catch (error) {
    appendLog(`❌ Registration failed: ${error?.message || error}`);
  }
});

// LOGIN FORM
loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const email = formData.get('email').trim();
  const password = formData.get('password');

  try {
    await pb.collection('users').authWithPassword(email, password);
    appendLog(`✅ Signed in as ${email}`);
    setAuthStatus();
    await loadPosts();
  } catch (error) {
    appendLog(`❌ Sign in failed: ${error?.message || error}`);
  }
});

// LOGOUT
logoutBtn?.addEventListener('click', () => {
  pb.authStore.clear();
  setAuthStatus();
  appendLog('👋 Signed out');
  loadPosts();
});

// REFRESH
refreshBtn?.addEventListener('click', () => {
  appendLog('🔄 Refreshing feed...');
  loadPosts();
});

// REALTIME SUBSCRIPTIONS
async function subscribeToRealtime() {
  try {
    await pb.collection('posts').subscribe('*', async (event) => {
      if (event.action === 'create') {
        const fullRecord = await pb.collection('posts').getOne(event.record.id, {
          expand: 'author,categories',
        });
        feedState.set(fullRecord.id, fullRecord);
        const newItem = renderFeedItem(fullRecord);
        postsListEl.prepend(newItem);
        updateStats();

        if (fullRecord.aiGenerated) {
          appendLog(`🤖 AI Bot posted: "${fullRecord.title}"`);
        } else {
          appendLog(`✨ New post: "${fullRecord.title}"`);
        }
      } else if (event.action === 'delete') {
        feedState.delete(event.record.id);
        const li = postsListEl.querySelector(`[data-id="${event.record.id}"]`);
        if (li) li.remove();
        updateStats();
        appendLog(`🗑️ Post deleted`);
      }
    });
    setConnectionStatus(true);
  } catch (error) {
    appendLog(`❌ Realtime subscription failed: ${error?.message || error}`);
    setConnectionStatus(false);
  }
}

window.addEventListener('beforeunload', () => {
  pb.realtime.unsubscribeAll();
  pb.realtime.disconnect();
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
  await loadCategories();
  await loadPosts();
  await subscribeToRealtime();

  appendLog('🎉 Welcome to the PocketBase Cyber Plaza!');
  appendLog('🤖 AI-powered 90s social feed is ONLINE!');
  appendLog('💡 Run "npm run ollama" to start AI post generation');
})();
