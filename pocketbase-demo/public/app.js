const BASE_URL = window.POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(BASE_URL);

const authStatusEl = document.getElementById('authStatus');
const connectionStatusEl = document.getElementById('connectionStatus');
const postsListEl = document.getElementById('postsList');
const postForm = document.getElementById('postForm');
const formTitleEl = document.getElementById('formTitle');
const resetFormBtn = document.getElementById('resetFormBtn');
const refreshBtn = document.getElementById('refreshBtn');
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const logOutput = document.getElementById('logOutput');
const categorySelect = document.getElementById('categorySelect');
const postIdField = postForm.querySelector('input[name="id"]');

const state = {
  editingId: null,
  categories: [],
};

function appendLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  logOutput.textContent = `[${timestamp}] ${message}\n` + logOutput.textContent;
}

function setAuthStatus() {
  if (pb.authStore.isValid) {
    authStatusEl.textContent = `Signed in as ${pb.authStore.model.email}`;
    logoutBtn.disabled = false;
    postForm.querySelectorAll('input, select, textarea, button').forEach((el) => {
      el.disabled = false;
    });
  } else {
    authStatusEl.textContent = 'Not signed in';
    logoutBtn.disabled = true;
    postForm.querySelectorAll('input, select, textarea, button').forEach((el) => {
      if (el.id !== 'resetFormBtn') {
        el.disabled = true;
      }
    });
  }
}

function setConnectionStatus(connected) {
  connectionStatusEl.textContent = connected ? 'online' : 'offline';
  connectionStatusEl.classList.toggle('is-online', connected);
}

async function loadCategories() {
  try {
    const result = await pb.collection('categories').getList(1, 50, {
      sort: 'label',
    });

    state.categories = result.items;
    categorySelect.innerHTML = '';

    result.items.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.label;
      categorySelect.append(option);
    });

    appendLog('Loaded categories.');
  } catch (error) {
    appendLog(`Failed to load categories: ${error?.message || error}`);
  }
}

function createPostCard(post) {
  const li = document.createElement('li');
  li.className = 'post-card';
  li.dataset.id = post.id;

  const heading = document.createElement('h4');
  heading.textContent = post.title;
  li.append(heading);

  const meta = document.createElement('div');
  meta.className = 'post-meta';
  const statusTag = document.createElement('span');
  statusTag.className = 'tag';
  statusTag.textContent = post.status;
  meta.append(statusTag);

  if (post.featured) {
    const featured = document.createElement('span');
    featured.className = 'tag';
    featured.textContent = 'featured';
    meta.append(featured);
  }

  const authorName = post.expand?.author?.displayName || post.expand?.author?.email || 'Unknown';
  const author = document.createElement('span');
  author.textContent = `Author: ${authorName}`;
  meta.append(author);

  const created = document.createElement('span');
  created.textContent = new Date(post.created).toLocaleString();
  meta.append(created);

  if (post.expand?.categories?.length) {
    const categories = document.createElement('span');
    categories.textContent = post.expand.categories.map((cat) => cat.label).join(', ');
    meta.append(categories);
  }

  li.append(meta);

  const excerpt = document.createElement('p');
  excerpt.innerHTML = post.content;
  li.append(excerpt);

  if (pb.authStore.isValid) {
    const actions = document.createElement('div');
    actions.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => populateForm(post));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'secondary';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => handleDelete(post.id));

    actions.append(editBtn, deleteBtn);
    li.append(actions);
  }

  return li;
}

async function loadPosts() {
  try {
    const list = await pb.collection('posts').getList(1, 20, {
      sort: '-created',
      expand: 'author,categories',
    });

    postsListEl.innerHTML = '';
    list.items.forEach((post) => postsListEl.append(createPostCard(post)));
    appendLog(`Loaded ${list.items.length} posts.`);
    setConnectionStatus(true);
  } catch (error) {
    appendLog(`Failed to load posts: ${error?.message || error}`);
    setConnectionStatus(false);
  }
}

function populateForm(post) {
  state.editingId = post.id;
  formTitleEl.textContent = 'Edit post';
  postIdField.value = post.id;
  postForm.title.value = post.title;
  postForm.slug.value = post.slug;
  postForm.content.value = post.content.replace(/<[^>]+>/g, '');
  postForm.status.value = post.status;
  Array.from(categorySelect.options).forEach((option) => {
    option.selected = post.categories?.includes(option.value) || post.expand?.categories?.some((cat) => cat.id === option.value);
  });
  postForm.featured.checked = !!post.featured;
  appendLog(`Editing post ${post.id}`);
}

function resetForm() {
  state.editingId = null;
  postForm.reset();
  formTitleEl.textContent = 'Create post';
  postIdField.value = '';
  appendLog('Post form reset.');
}

async function handleDelete(id) {
  const confirmed = window.confirm('Delete this post?');
  if (!confirmed) return;

  try {
    await pb.collection('posts').delete(id, { requestKey: null });
    appendLog(`Deleted post ${id}`);
    await loadPosts();
  } catch (error) {
    appendLog(`Delete failed: ${error?.message || error}`);
  }
}

postForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!pb.authStore.isValid) {
    appendLog('Sign in to create or update posts.');
    return;
  }

  const formData = new FormData(postForm);
  const payload = {
    title: formData.get('title').trim(),
    slug: formData.get('slug').trim(),
    content: formData.get('content').trim(),
    status: formData.get('status'),
    categories: formData.getAll('categories'),
    featured: formData.get('featured') === 'on',
  };

  if (!state.editingId) {
    payload.author = pb.authStore.model.id;
  }

  try {
    if (state.editingId) {
      await pb.collection('posts').update(state.editingId, payload, { requestKey: null });
      appendLog(`Updated post ${state.editingId}`);
    } else {
      await pb.collection('posts').create(payload, { requestKey: null });
      appendLog('Created new post.');
    }

    resetForm();
    await loadPosts();
  } catch (error) {
    appendLog(`Save failed: ${error?.message || error}`);
  }
});

resetFormBtn.addEventListener('click', resetForm);
refreshBtn.addEventListener('click', loadPosts);

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
    await loadPosts();
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
    await loadPosts();
  } catch (error) {
    appendLog(`Sign in failed: ${error?.message || error}`);
  }
});

logoutBtn.addEventListener('click', () => {
  pb.authStore.clear();
  setAuthStatus();
  appendLog('Signed out.');
  resetForm();
  loadPosts();
});

async function subscribeToRealtime() {
  try {
    await pb.collection('posts').subscribe('*', (event) => {
      appendLog(`Realtime: ${event.action} ${event.record.title}`);
      loadPosts();
    });
    setConnectionStatus(true);
  } catch (error) {
    appendLog(`Realtime subscription failed: ${error?.message || error}`);
    setConnectionStatus(false);
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
