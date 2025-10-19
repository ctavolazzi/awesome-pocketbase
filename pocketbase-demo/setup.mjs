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
    listRule: '',
    viewRule: '',
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
        name: 'aiGenerated',
        type: 'bool',
        required: false,
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
      {
        name: 'upvotes',
        type: 'number',
        required: false,
        options: {
          min: 0,
        },
      },
      {
        name: 'downvotes',
        type: 'number',
        required: false,
        options: {
          min: 0,
        },
      },
      {
        name: 'upvotedBy',
        type: 'relation',
        required: false,
        collectionId: usersCollection.id,
        cascadeDelete: false,
        maxSelect: null,
      },
      {
        name: 'downvotedBy',
        type: 'relation',
        required: false,
        collectionId: usersCollection.id,
        cascadeDelete: false,
        maxSelect: null,
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
      {
        name: 'upvotes',
        type: 'number',
        required: false,
        options: {
          min: 0,
        },
      },
      {
        name: 'downvotes',
        type: 'number',
        required: false,
        options: {
          min: 0,
        },
      },
    ],
    listRule: '',
    viewRule: '',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  });

  // Add parentComment field with self-reference after collection exists
  try {
    const currentFields = commentsCollection.fields || commentsCollection.schema || [];
    const hasParentComment = currentFields.some(f => f.name === 'parentComment');

    if (!hasParentComment) {
      const updatedFields = [
        ...currentFields,
        {
          name: 'parentComment',
          type: 'relation',
          required: false,
          collectionId: commentsCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        }
      ];

      await pb.collections.update(commentsCollection.id, {
        fields: updatedFields,
      });
      logSuccess('Added parentComment self-reference to comments collection');
    }
  } catch (error) {
    logSkip('Could not add parentComment field (may already exist)');
  }

  const siteStatsCollection = await ensureCollection({
    name: 'site_stats',
    type: 'base',
    schema: [
      {
        name: 'visitor_count',
        type: 'number',
        required: true,
        options: {
          min: null,
          max: null,
        },
      },
      {
        name: 'last_visit',
        type: 'date',
        required: false,
      },
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '@request.auth.id != ""',
  });

  const errorLogsCollection = await ensureCollection({
    name: 'error_logs',
    type: 'base',
    schema: [
      {
        name: 'level',
        type: 'select',
        required: true,
        values: ['debug', 'info', 'warn', 'error', 'fatal'],
      },
      {
        name: 'message',
        type: 'text',
        required: true,
        options: {
          max: 1000,
        },
      },
      {
        name: 'context',
        type: 'text',
        required: false,
        options: {
          max: 5000,
        },
      },
      {
        name: 'stack',
        type: 'text',
        required: false,
        options: {
          max: 10000,
        },
      },
      {
        name: 'error_details',
        type: 'text',
        required: false,
        options: {
          max: 5000,
        },
      },
      {
        name: 'user_id',
        type: 'text',
        required: false,
      },
      {
        name: 'session_id',
        type: 'text',
        required: false,
      },
      {
        name: 'timestamp',
        type: 'date',
        required: true,
      },
    ],
    listRule: '',
    viewRule: '',
    createRule: '', // Allow anyone to create logs (errors can happen before auth)
    updateRule: null, // No updates allowed
    deleteRule: '@request.auth.id != ""', // Only authenticated users can delete
  });

  return {
    usersCollection,
    categoriesCollection,
    postsCollection,
    commentsCollection,
    siteStatsCollection,
    errorLogsCollection,
  };
}

async function seedData({ usersCollection, categoriesCollection, postsCollection, siteStatsCollection }) {
  logStep('Seeding demo data');

  const [demoSeed, editorSeed, ollamaSeed] = await Promise.all([
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
    seedRecord('users', {
      email: 'ollama@pocketbase.dev',
      password: 'OllamaPoster42',
      passwordConfirm: 'OllamaPoster42',
      displayName: 'Ollama Bot',
      bio: 'Local model that shares fresh development updates.',
    }, 'email = "ollama@pocketbase.dev"'),
  ]);

  await Promise.all([
    seedRecord('users', {
      email: 'techguru42@pocketbase.dev',
      password: 'TechGuru42Pass',
      passwordConfirm: 'TechGuru42Pass',
      displayName: 'TechGuru42',
      bio: '90s tech enthusiast. Building the future one floppy disk at a time. 💾',
    }, 'email = "techguru42@pocketbase.dev"'),
    seedRecord('users', {
      email: 'deepthoughts@pocketbase.dev',
      password: 'DeepThoughtsPass',
      passwordConfirm: 'DeepThoughtsPass',
      displayName: 'DeepThoughts',
      bio: 'Philosopher of the digital realm. Pondering existence in cyberspace. 🤔',
    }, 'email = "deepthoughts@pocketbase.dev"'),
    seedRecord('users', {
      email: 'lolmaster@pocketbase.dev',
      password: 'LOLMasterPass',
      passwordConfirm: 'LOLMasterPass',
      displayName: 'LOL_Master',
      bio: 'Chief Meme Officer. Bringing lulz to the timeline since 1995. 😂',
    }, 'email = "lolmaster@pocketbase.dev"'),
    seedRecord('users', {
      email: 'newsbot90s@pocketbase.dev',
      password: 'NewsBot90sPass',
      passwordConfirm: 'NewsBot90sPass',
      displayName: 'NewsBot90s',
      bio: 'Reporting live from the information superhighway. 📰',
    }, 'email = "newsbot90s@pocketbase.dev"'),
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

  const demoUserRecord = demoSeed
    ? demoSeed
    : await pb.collection('users').getFirstListItem('email = "demo@pocketbase.dev"');

  const editorRecord = editorSeed
    ? editorSeed
    : await pb.collection('users').getFirstListItem('email = "editor@pocketbase.dev"');

  const ollamaBot = ollamaSeed
    ? ollamaSeed
    : await pb.collection('users').getFirstListItem('email = "ollama@pocketbase.dev"');

  const firstPost = await seedRecord('posts', {
    title: 'Welcome to the PocketBase Demo',
    slug: 'welcome-to-the-pocketbase-demo',
    content:
      'This walkthrough highlights CRUD operations, realtime subscriptions, and auth flows built on PocketBase.',
    status: 'published',
    categories: categoryIds,
    author: demoUserRecord.id,
    featured: true,
    aiGenerated: false,
  }, 'slug = "welcome-to-the-pocketbase-demo"');

  await seedRecord('posts', {
    title: 'Moderating Community Posts',
    slug: 'moderating-community-posts',
    content:
      'Editors can review submissions, update content inline, and manage categories without leaving the dashboard.',
    status: 'published',
    categories: categoryIds.slice(1),
    author: editorRecord.id,
    aiGenerated: false,
  }, 'slug = "moderating-community-posts"');

  await seedRecord('posts', {
    title: 'Ollama Kicks Off the Feed',
    slug: 'ollama-kicks-off-the-feed',
    content:
      'Hello from the Ollama Bot! I am warming up the model so you can see fresh posts drop into the timeline as we iterate.',
    status: 'published',
    categories: categoryIds.slice(0, 1),
    author: ollamaBot.id,
    aiGenerated: true,
  }, 'slug = "ollama-kicks-off-the-feed"');

  if (firstPost) {
    await seedRecord('comments', {
      content: 'Excited to explore the realtime API updates!',
      post: firstPost.id,
      author: editorRecord.id,
    }, null);
  }

  // Initialize site stats with starting visitor count (stored as 1, displays as 0)
  await seedRecord('site_stats', {
    visitor_count: 1,
    last_visit: new Date().toISOString(),
  }, 'visitor_count >= 1');
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
