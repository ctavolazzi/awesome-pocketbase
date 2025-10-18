import PocketBase from 'pocketbase';

const BASE_URL = process.env.PB_BASE_URL || 'http://127.0.0.1:8090';
const USER_EMAIL = process.env.PB_USER_EMAIL || 'demo@pocketbase.dev';
const USER_PASSWORD = process.env.PB_USER_PASSWORD || 'PocketBaseDemo42';

const pb = new PocketBase(BASE_URL);

const log = console.log;

async function authenticateUser() {
  log('Signing in as demo user for realtime demo...');
  await pb.collection('users').authWithPassword(USER_EMAIL, USER_PASSWORD);
  log('✓ Authenticated as', USER_EMAIL);
}

async function triggerPostLifecycle() {
  const categories = await pb.collection('categories').getList(1, 5);
  const categoryIds = categories.items.slice(0, 2).map((item) => item.id);

  const post = await pb.collection('posts').create(
    {
      title: 'Realtime walkthrough',
      slug: `realtime-walkthrough-${Date.now()}`,
      content: '<p>Created from realtime-demo.mjs to show live updates.</p>',
      status: 'draft',
      categories: categoryIds,
      author: pb.authStore.model.id,
    },
    { requestKey: null },
  );

  await pb.collection('posts').update(
    post.id,
    {
      status: 'published',
      featured: true,
    },
    { requestKey: null },
  );

  await pb.collection('posts').delete(post.id, { requestKey: null });
}

async function triggerCommentEvent() {
  const anchorPost = await pb.collection('posts').getList(1, 1, {
    sort: '-created',
  });

  if (anchorPost.items.length === 0) {
    return;
  }

  await pb.collection('comments').create(
    {
      post: anchorPost.items[0].id,
      author: pb.authStore.model.id,
      content: 'Realtime comment demo triggered from script.',
    },
    { requestKey: null },
  );
}

async function runRealtimeDemo() {
  await authenticateUser();

  log('\nEstablishing subscriptions (Ctrl+C to stop)...');
  const postSubscription = await pb.collection('posts').subscribe('*', (event) => {
    log('[posts]', event.action.toUpperCase(), event.record.id, `status=${event.record.status}`);
  });

  const commentSubscription = await pb.collection('comments').subscribe('*', (event) => {
    log('[comments]', event.action.toUpperCase(), event.record.id, `content="${event.record.content}"`);
  });

  await triggerPostLifecycle();
  await triggerCommentEvent();

  log('\nDemo complete. Waiting 3 seconds before unsubscribing...');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  await postSubscription();
  await commentSubscription();

  pb.realtime.unsubscribeAll();
  pb.realtime.disconnect();
  log('Realtime subscriptions closed.');
}

(async () => {
  try {
    await runRealtimeDemo();
  } catch (error) {
    console.error('Realtime demo failed:', error?.message || error);
  } finally {
    pb.authStore.clear();
  }
})();
