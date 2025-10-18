import PocketBase from 'pocketbase';

const BASE_URL = process.env.PB_BASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'porchroot@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'AdminPassword69!';

const pb = new PocketBase(BASE_URL);

const log = console.log;

async function authenticate() {
  log('Authenticating as admin...');
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  log('✓ Admin session established.');
}

async function createPost(data) {
  try {
    const record = await pb.collection('posts').create(data, { requestKey: null });
    log(`Created post (${record.id}): ${record.title}`);
    return record;
  } catch (error) {
    log('Create failed:', summariseError(error));
    return null;
  }
}

async function updatePost(id, data) {
  try {
    const updated = await pb.collection('posts').update(id, data, { requestKey: null });
    log(`Updated post (${id}): ${updated.title}`);
    return updated;
  } catch (error) {
    log('Update failed:', summariseError(error));
    return null;
  }
}

async function deletePost(id) {
  try {
    await pb.collection('posts').delete(id, { requestKey: null });
    log(`Deleted post (${id}).`);
  } catch (error) {
    log('Delete failed:', summariseError(error));
  }
}

async function fetchPagedPosts(page = 1, perPage = 5, filter = '') {
  try {
    const params = {
      sort: '-created',
      expand: 'author,categories',
    };

    if (filter) {
      params.filter = filter;
    }

    const list = await pb.collection('posts').getList(page, perPage, params);
    log(`\nFetched page ${list.page}/${list.totalPages} (total ${list.totalItems} records)`);
    list.items.forEach((item, index) => {
      const categories = item.expand?.categories?.map((cat) => cat.label).join(', ') || '—';
      const author = item.expand?.author?.displayName || 'Unknown author';
      log(`${index + 1}. ${item.title} [${item.status}]`);
      log(`   Author: ${author}`);
      log(`   Categories: ${categories}`);
      log(`   Created: ${item.created}`);
    });
    return list;
  } catch (error) {
    log('List fetch failed:', summariseError(error));
    return null;
  }
}

function summariseError(error) {
  if (!error) {
    return 'Unknown error';
  }

  if (error.data?.message) {
    return error.data.message;
  }

  if (error.response?.message) {
    return error.response.message;
  }

  if (error.message) {
    return error.message;
  }

  return JSON.stringify(error);
}

async function demoCrudFlow() {
  await authenticate();

  const categoriesExpand = await pb.collection('categories').getList(1, 50);
  const categoryIds = categoriesExpand.items.map((item) => item.id);
  const author = await pb.collection('users').getFirstListItem('email = "demo@pocketbase.dev"');

  const created = await createPost({
    title: 'PocketBase CLI Automation',
    slug: `pocketbase-cli-automation-${Date.now()}`,
    content:
      '<p>Demonstrates how to drive PocketBase collections entirely from Node scripts.</p>',
    status: 'published',
    categories: categoryIds.slice(0, 2),
    author: author.id,
    featured: false,
  });

  await createPost({
    title: '',
    slug: 'invalid-record',
    content: '<p>This record intentionally fails validation.</p>',
    status: 'draft',
    author: author.id,
  });

  await fetchPagedPosts(1, 3);
  await fetchPagedPosts(1, 5, 'status = "published" && featured = true');

  if (created) {
    await updatePost(created.id, {
      title: 'PocketBase CLI Automation (Updated)',
      status: 'archived',
    });

    await fetchPagedPosts(1, 3, `id = "${created.id}"`);

    await deletePost(created.id);
  }

  try {
    await pb.collection('posts').getOne('nonexistent-id');
  } catch (error) {
    log('\nHandled lookup error:', summariseError(error));
  }
}

(async () => {
  try {
    await demoCrudFlow();
  } finally {
    pb.authStore.clear();
  }
})();
