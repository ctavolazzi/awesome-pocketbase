#!/usr/bin/env node
import PocketBase from 'pocketbase';

const BASE_URL = process.env.PB_BASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'porchroot@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'AdminPassword69!';
const OUTPUT_FORMAT = process.env.OUTPUT_FORMAT || 'pretty'; // 'json' or 'pretty'

const pb = new PocketBase(BASE_URL);

const report = {
  timestamp: new Date().toISOString(),
  server: BASE_URL,
  checks: {},
  status: 'unknown',
  errors: [],
};

async function check(name, testFn) {
  try {
    const result = await testFn();
    report.checks[name] = { status: 'pass', ...result };
    return true;
  } catch (error) {
    report.checks[name] = { status: 'fail', error: error.message };
    report.errors.push({ check: name, error: error.message });
    return false;
  }
}

async function verifyServer() {
  return check('server_reachable', async () => {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    return { message: 'Server is responding' };
  });
}

async function verifyAdminAuth() {
  return check('admin_auth', async () => {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    return { message: 'Admin authentication successful' };
  });
}

async function verifyCollections() {
  return check('collections', async () => {
    const expectedCollections = {
      users: 'auth',
      categories: 'base',
      posts: 'base',
      comments: 'base',
    };

    const found = {};
    const missing = [];

    for (const [name, expectedType] of Object.entries(expectedCollections)) {
      try {
        const collection = await pb.collections.getOne(name);
        found[name] = {
          type: collection.type,
          fields: collection.schema.length,
        };

        if (collection.type !== expectedType) {
          throw new Error(`Collection "${name}" has type "${collection.type}", expected "${expectedType}"`);
        }
      } catch (error) {
        missing.push(name);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing collections: ${missing.join(', ')}`);
    }

    return { collections: found, message: 'All collections present' };
  });
}

async function verifySampleData() {
  return check('sample_data', async () => {
    const collections = ['users', 'categories', 'posts', 'comments'];
    const counts = {};
    const empty = [];

    for (const name of collections) {
      try {
        const list = await pb.collection(name).getList(1, 1);
        counts[name] = list.totalItems;

        if (list.totalItems === 0) {
          empty.push(name);
        }
      } catch (error) {
        throw new Error(`Could not count records in ${name}: ${error.message}`);
      }
    }

    if (empty.length === collections.length) {
      throw new Error('No sample data found in any collection');
    }

    return {
      counts,
      message: empty.length > 0 ? `Some collections empty: ${empty.join(', ')}` : 'Sample data present',
    };
  });
}

async function verifyAccessRules() {
  return check('access_rules', async () => {
    const posts = await pb.collections.getOne('posts');

    // Check that posts has public read
    if (posts.listRule !== '' || posts.viewRule !== '') {
      throw new Error('Posts should have public read access');
    }

    // Check that posts has auth-protected write
    if (!posts.createRule || !posts.updateRule || !posts.deleteRule) {
      throw new Error('Posts should have auth-protected write rules');
    }

    return { message: 'Access rules configured correctly' };
  });
}

async function verifyRelations() {
  return check('relations', async () => {
    const posts = await pb.collections.getOne('posts');
    const postSchema = posts.schema;

    const authorField = postSchema.find((f) => f.name === 'author');
    const categoriesField = postSchema.find((f) => f.name === 'categories');

    if (!authorField || authorField.type !== 'relation') {
      throw new Error('Posts missing author relation');
    }

    if (!categoriesField || categoriesField.type !== 'relation') {
      throw new Error('Posts missing categories relation');
    }

    return {
      relations: {
        author: authorField.options?.collectionId || 'configured',
        categories: categoriesField.options?.collectionId || 'configured',
      },
      message: 'Relations configured correctly',
    };
  });
}

async function runVerification() {
  if (OUTPUT_FORMAT !== 'json') {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║        PocketBase Demo - Quick Verification               ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log(`Server: ${BASE_URL}\n`);
  }

  const checks = [
    verifyServer,
    verifyAdminAuth,
    verifyCollections,
    verifySampleData,
    verifyAccessRules,
    verifyRelations,
  ];

  let allPassed = true;

  for (const checkFn of checks) {
    const passed = await checkFn();
    if (!passed) {
      allPassed = false;
    }
  }

  report.status = allPassed ? 'healthy' : 'unhealthy';

  if (OUTPUT_FORMAT === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    // Pretty output
    console.log('\n──────────────────────────────────────────────────────────\n');

    for (const [name, result] of Object.entries(report.checks)) {
      const icon = result.status === 'pass' ? '✓' : '✗';
      const label = name.replace(/_/g, ' ').toUpperCase();
      console.log(`${icon} ${label}`);

      if (result.message) {
        console.log(`  ${result.message}`);
      }

      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }

      console.log();
    }

    console.log('──────────────────────────────────────────────────────────\n');

    if (allPassed) {
      console.log('✅ All checks passed! Demo is ready.\n');
    } else {
      console.log(`❌ ${report.errors.length} check(s) failed.\n`);
      console.log('Run "npm run setup" to provision the demo.\n');
    }
  }

  process.exit(allPassed ? 0 : 1);
}

runVerification().catch((error) => {
  if (OUTPUT_FORMAT === 'json') {
    console.error(JSON.stringify({
      status: 'error',
      error: error.message,
      stack: error.stack,
    }));
  } else {
    console.error('\n❌ Verification failed:', error.message);
  }
  process.exit(1);
});

