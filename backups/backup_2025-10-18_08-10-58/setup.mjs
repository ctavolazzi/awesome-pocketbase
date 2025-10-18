import PocketBase from 'pocketbase';

const BASE_URL = process.env.PB_BASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'porchroot@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'AdminPassword69!';

const pb = new PocketBase(BASE_URL);

const logStep = (message) => console.log(`\n▶ ${message}`);
const logSuccess = (message) => console.log(`   ✓ ${message}`);
const logSkip = (message) => console.log(`   ↺ ${message}`);

const collectionExists = async (name) => {
  try {
    const collection = await pb.collections.getOne(name);
    return collection;
  } catch (error) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
};

const mergeSchema = (existing = [], desired = []) => {
  const desiredNames = desired.map((field) => field.name);
  const merged = desired.map((field) => {
    const matched = existing.find((current) => current.name === field.name);
    return matched ? { ...matched, ...field, id: matched.id } : field;
  });

  const extras = existing.filter((field) => !desiredNames.includes(field.name));
  return [...merged, ...extras];
};

async function ensureCollection(baseConfig) {
  // In PocketBase 0.30.4+, 'schema' is renamed to 'fields'
  // Support both for compatibility
  const configToSend = { ...baseConfig };
  if (configToSend.schema && !configToSend.fields) {
    configToSend.fields = configToSend.schema;
    delete configToSend.schema;
  }

  const existing = await collectionExists(baseConfig.name);

  if (!existing) {
    const created = await pb.collections.create(configToSend);
    logSuccess(`Created collection "${baseConfig.name}"`);
    return created;
  }

  const existingFields = existing.fields || existing.schema || [];
  const desiredFields = configToSend.fields || configToSend.schema || [];
  const mergedFields = mergeSchema(existingFields, desiredFields);

  const needsSchemaUpdate = JSON.stringify(existingFields) !== JSON.stringify(mergedFields);
  const needsRuleUpdate =
    existing.listRule !== baseConfig.listRule ||
    existing.viewRule !== baseConfig.viewRule ||
    existing.createRule !== baseConfig.createRule ||
    existing.updateRule !== baseConfig.updateRule ||
    existing.deleteRule !== baseConfig.deleteRule;
  const needsOptionUpdate = JSON.stringify(existing.options) !== JSON.stringify(baseConfig.options || {});

  if (needsSchemaUpdate || needsRuleUpdate || needsOptionUpdate) {
    const updatePayload = {
      ...configToSend,
      fields: mergedFields,
    };
    delete updatePayload.schema;  // Remove old schema key if present

    const updated = await pb.collections.update(existing.id, updatePayload);
    logSuccess(`Updated collection "${baseConfig.name}"`);
    return updated;
  }

  logSkip(`Collection "${baseConfig.name}" already up to date`);
  return existing;
}

async function seedRecord(collectionName, payload, uniqueFilter) {
  try {
    if (uniqueFilter) {
      // Try to find existing record - if found, skip creation
      try {
        await pb.collection(collectionName).getFirstListItem(uniqueFilter, { requestKey: null });
        logSkip(`${collectionName}: ${uniqueFilter} already present`);
        return null;
      } catch (error) {
        // 404 means record doesn't exist, so we'll create it
        if (error.status !== 404) {
          // For any other error, just proceed with creation anyway
          console.warn(`Filter check failed for ${collectionName}, proceeding with creation:`, error.message);
        }
      }
    }
  } catch (error) {
    // Catch any errors from the outer try and just proceed
    console.warn(`seedRecord check error:`, error.message);
  }

  const record = await pb.collection(collectionName).create(payload, { requestKey: null });
  logSuccess(`${collectionName}: created ${record.id}`);
  return record;
}

async function authenticateAdmin() {
  logStep('Authenticating as admin');
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  logSuccess('Admin authenticated');
}

async function ensureSchema() {
  logStep('Ensuring data model');

  const usersCollection = await ensureCollection({
    name: 'users',
    type: 'auth',
    schema: [
      {
        name: 'displayName',
        type: 'text',
        required: false,
        options: {
          max: 120,
        },
      },
      {
        name: 'bio',
        type: 'text',
        required: false,
        options: {
          max: 500,
        },
      },
    ],
    listRule: '@request.auth.id = id',
    viewRule: '@request.auth.id = id',
    createRule: '',
    updateRule: '@request.auth.id = id',
    deleteRule: '@request.auth.id = id',
    options: {
      allowEmailAuth: true,
      allowOAuth2Auth: false,
      allowUsernameAuth: true,
      exceptEmailDomains: null,
      manageRule: null,
      minPasswordLength: 8,
      onlyVerified: false,
      requireEmail: true,
    },
  });

  const categoriesCollection = await ensureCollection({
    name: 'categories',
    type: 'base',
    schema: [
      {
        name: 'label',
        type: 'text',
        required: true,
        options: {
          min: 3,
          max: 80,
        },
      },
      {
        name: 'slug',
        type: 'text',
        required: true,
        options: {
          pattern: '^[a-z0-9-]+$',
        },
      },
      {
        name: 'description',
        type: 'text',
        required: false,
        options: {
          max: 160,
        },
      },
    ],
    listRule: '',
    viewRule: '',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  });

  const postsCollection = await ensureCollection({
    name: 'posts',
    type: 'base',
    schema: [
      {
        name: 'title',
        type: 'text',
        required: true,
        options: {
          min: 3,
          max: 140,
        },
      },
      {
        name: 'slug',
        type: 'text',
        required: true,
        options: {
          pattern: '^[a-z0-9-]+$',
        },
      },
      {
        name: 'content',
        type: 'editor',
        required: true,
      },
      {
        name: 'status',
        type: 'select',
        required: true,
        values: ['draft', 'published', 'archived'],
      },
      {
        name: 'categories',
        type: 'relation',
        required: false,
        collectionId: categoriesCollection.id,
        cascadeDelete: false,
        maxSelect: 3,
      },
      {
        name: 'author',
        type: 'relation',
        required: true,
        collectionId: usersCollection.id,
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        name: 'featured',
        type: 'bool',
        required: false,
      },
    ],
    listRule: '',
    viewRule: '',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  });

  const commentsCollection = await ensureCollection({
    name: 'comments',
    type: 'base',
    schema: [
      {
        name: 'content',
        type: 'text',
        required: true,
        options: {
          max: 500,
        },
      },
      {
        name: 'post',
        type: 'relation',
        required: true,
        collectionId: postsCollection.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        name: 'author',
        type: 'relation',
        required: true,
        collectionId: usersCollection.id,
        cascadeDelete: false,
        maxSelect: 1,
      },
    ],
    listRule: '',
    viewRule: '',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  });

  return {
    usersCollection,
    categoriesCollection,
    postsCollection,
    commentsCollection,
  };
}

async function seedData({ usersCollection, categoriesCollection, postsCollection }) {
  logStep('Seeding demo data');

  const [demoUser] = await Promise.all([
    seedRecord('users', {
      email: 'demo@pocketbase.dev',
      password: 'PocketBaseDemo42',
      passwordConfirm: 'PocketBaseDemo42',
      displayName: 'Demo Presenter',
      bio: 'Shows how PocketBase handles auth, CRUD, and realtime updates.',
    }, 'email = "demo@pocketbase.dev"'),
    seedRecord('users', {
      email: 'editor@pocketbase.dev',
      password: 'PocketBaseEditor42',
      passwordConfirm: 'PocketBaseEditor42',
      displayName: 'Content Editor',
      bio: 'Curates posts and moderates comments.',
    }, 'email = "editor@pocketbase.dev"'),
  ]);

  const categories = await Promise.all([
    seedRecord('categories', {
      label: 'Tutorials',
      slug: 'tutorials',
      description: 'Step-by-step guides for building with PocketBase.',
    }, 'slug = "tutorials"'),
    seedRecord('categories', {
      label: 'Showcases',
      slug: 'showcases',
      description: 'Community projects that highlight PocketBase capabilities.',
    }, 'slug = "showcases"'),
    seedRecord('categories', {
      label: 'Tooling',
      slug: 'tooling',
      description: 'CLIs, libraries, and utilities that integrate with PocketBase.',
    }, 'slug = "tooling"'),
  ]);

  const categoryIds = categories
    .filter(Boolean)
    .map((record) => record.id);

  const demoUserRecord = demoUser
    ? demoUser
    : await pb.collection('users').getFirstListItem('email = "demo@pocketbase.dev"');

  const editorRecord = await pb.collection('users').getFirstListItem('email = "editor@pocketbase.dev"');

  const firstPost = await seedRecord('posts', {
    title: 'Welcome to the PocketBase Demo',
    slug: 'welcome-to-the-pocketbase-demo',
    content:
      '<p>This walkthrough highlights CRUD operations, realtime subscriptions, and auth flows built on PocketBase.</p>',
    status: 'published',
    categories: categoryIds,
    author: demoUserRecord.id,
    featured: true,
  }, 'slug = "welcome-to-the-pocketbase-demo"');

  await seedRecord('posts', {
    title: 'Moderating Community Posts',
    slug: 'moderating-community-posts',
    content:
      '<p>Editors can review submissions, update content inline, and manage categories without leaving the dashboard.</p>',
    status: 'published',
    categories: categoryIds.slice(1),
    author: editorRecord.id,
  }, 'slug = "moderating-community-posts"');

  if (firstPost) {
    await seedRecord('comments', {
      content: 'Excited to explore the realtime API updates!',
      post: firstPost.id,
      author: editorRecord.id,
    }, null);
  }
}

async function setup() {
  try {
    await authenticateAdmin();
    const collections = await ensureSchema();
    await seedData(collections);
    console.log('\n🎉 Setup complete!');
  } catch (error) {
    console.error('\n❌ Setup failed');
    console.error(error);
    if (error.response?.data) {
      console.error('\nDetailed error:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    pb.authStore.clear();
  }
}

setup();
