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
  } catch (error) {
    appendLog(`Failed to load categories: ${error?.message || error}`);
  }
}

function avatarForUser(user) {
  const name = user?.displayName || user?.email || 'User';
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return initials || 'U';
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

function stripHtml(input) {
  const temp = document.createElement('div');
  temp.innerHTML = input || '';
  return temp.textContent || temp.innerText || '';
}

function renderFeedItem(record) {
  const author = record.expand?.author;
  const categories = record.expand?.categories || [];
  const li = document.createElement('li');
  li.className = 'feed-item';
  li.dataset.id = record.id;

  const avatar = document.createElement('div');
  avatar.className = 'feed-avatar';
  avatar.textContent = avatarForUser(author);

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'feed-content';

  const meta = document.createElement('div');
  meta.className = 'feed-meta';
  const nameEl = document.createElement('strong');
  nameEl.textContent = author?.displayName || author?.email || 'Unknown user';
  meta.append(nameEl);

  const timeEl = document.createElement('span');
  timeEl.textContent = formatRelativeTime(record.created);
  meta.append(timeEl);

  if (record.aiGenerated) {
    const aiBadge = document.createElement('span');
    aiBadge.className = 'badge';
    aiBadge.dataset.type = 'ai';
    aiBadge.textContent = 'AI generated';
    meta.append(aiBadge);
  }

  categories.forEach((category) => {
    const catBadge = document.createElement('span');
    catBadge.className = 'badge';
    catBadge.dataset.type = 'category';
    catBadge.textContent = category.label;
    meta.append(catBadge);
  });

  const body = document.createElement('div');
  body.className = 'feed-body';
  body.textContent = stripHtml(record.content);

  const actions = document.createElement('div');
  actions.className = 'feed-actions';

  const likeBtn = document.createElement('button');
  likeBtn.type = 'button';
  likeBtn.textContent = 'Appreciate';
  likeBtn.addEventListener('click', () => {
    appendLog(`You appreciated ${nameEl.textContent}'s post.`);
  });
  actions.append(likeBtn);

  if (pb.authStore.isValid && pb.authStore.model?.id === record.author) {
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => handleDelete(record.id));
    actions.append(deleteBtn);
  }

  contentWrapper.append(meta, body, actions);
  li.append(avatar, contentWrapper);
  return li;
}

function renderFeed() {
  postsListEl.innerHTML = '';
  const sorted = Array.from(feedState.values()).sort((a, b) => new Date(b.created) - new Date(a.created));
  sorted.forEach((record) => {
    const item = renderFeedItem(record);
    postsListEl.append(item);
  });
  updateStats();
}

async function fetchPostWithExpand(id) {
  return pb.collection('posts').getOne(id, { expand: 'author,categories' });
}

async function loadPosts() {
  try {
    const list = await pb.collection('posts').getList(1, 50, {
      sort: '-created',
      expand: 'author,categories',
    });

    feedState.clear();
    list.items.forEach((item) => feedState.set(item.id, item));

    renderFeed();
    setConnectionStatus(true);
    appendLog(`Loaded ${list.items.length} posts.`);
  } catch (error) {
    setConnectionStatus(false);
    appendLog(`Failed to load posts: ${error?.message || error}`);
  }
}

function handleCharCount() {
  const current = composerTextarea.value.length;
  charCountEl.textContent = `${current} / 420`;
}

function createTitleFromBody(body) {
  const plain = body.replace(/\s+/g, ' ').trim();
  if (!plain) {
    return 'Untitled post';
  }
  const sentenceMatch = plain.match(/[^.!?]+[.!?]/);
  const sentence = sentenceMatch ? sentenceMatch[0] : plain;
  return sentence.length > 60 ? `${sentence.slice(0, 57)}…` : sentence;
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    || `post-${Date.now().toString(36)}`;
}

composerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!pb.authStore.isValid) {
    appendLog('Sign in to publish posts.');
    return;
  }

  const content = composerTextarea.value.trim();
  if (!content) {
    appendLog('Add some content before posting.');
    return;
  }

  const categories = Array.from(categorySelect.selectedOptions).map((option) => option.value);
  const title = createTitleFromBody(content);
  const slug = `${slugify(title)}-${Date.now().toString(36)}`;

  try {
    await pb.collection('posts').create(
      {
        title,
        slug,
        content,
        status: 'published',
        categories,
        author: pb.authStore.model.id,
        featured: false,
        aiGenerated: false,
      },
      { requestKey: null },
    );

    composerTextarea.value = '';
    handleCharCount();
    appendLog('Post published.');
  } catch (error) {
    appendLog(`Publish failed: ${error?.message || error}`);
  }
});

composerTextarea.addEventListener('input', handleCharCount);
handleCharCount();

registerForm.addEventListener('submit', async (event) => {
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

    appendLog(`Registered ${email}`);
    await pb.collection('users').authWithPassword(email, password);
    appendLog(`Signed in as ${email}`);
    setAuthStatus();
    registerForm.reset();
  } catch (error) {
    appendLog(`Registration failed: ${error?.message || error}`);
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const email = formData.get('email').trim();
  const password = formData.get('password');

  try {
    await pb.collection('users').authWithPassword(email, password);
    appendLog(`Signed in as ${email}`);
    setAuthStatus();
  } catch (error) {
    appendLog(`Sign in failed: ${error?.message || error}`);
  }
});

logoutBtn.addEventListener('click', () => {
  pb.authStore.clear();
  setAuthStatus();
  appendLog('Signed out.');
});

refreshBtn.addEventListener('click', loadPosts);

async function handleDelete(id) {
  const confirmed = window.confirm('Delete this post?');
  if (!confirmed) return;

  try {
    await pb.collection('posts').delete(id, { requestKey: null });
    appendLog(`Deleted post ${id}`);
  } catch (error) {
    appendLog(`Delete failed: ${error?.message || error}`);
  }
}

async function subscribeToRealtime() {
  try {
    await pb.collection('posts').subscribe('*', async (event) => {
      if (event.action === 'delete') {
        feedState.delete(event.record.id);
        renderFeed();
        appendLog(`Post ${event.record.id} removed.`);
        return;
      }

      try {
        const fullRecord = await fetchPostWithExpand(event.record.id);
        feedState.set(fullRecord.id, fullRecord);
        renderFeed();
        const verb = event.action === 'create' ? 'New post' : 'Post updated';
        appendLog(`${verb}: ${fullRecord.title}`);
      } catch (fetchError) {
        appendLog(`Realtime fetch failed: ${fetchError?.message || fetchError}`);
      }
    });
    setConnectionStatus(true);
  } catch (error) {
    setConnectionStatus(false);
    appendLog(`Realtime subscription failed: ${error?.message || error}`);
  }
}

window.addEventListener('beforeunload', () => {
  pb.realtime.unsubscribeAll();
  pb.realtime.disconnect();
});

(async function init() {
  pb.authStore.onChange(() => setAuthStatus());
  setAuthStatus();

  await loadCategories();
  await loadPosts();
  await subscribeToRealtime();
})();
