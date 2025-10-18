#!/usr/bin/env node
import PocketBase from 'pocketbase';

const BASE_URL = process.env.PB_BASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'porchroot@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'AdminPassword69!';

const pb = new PocketBase(BASE_URL);

let passed = 0;
let failed = 0;

const log = (message, emoji = '•') => console.log(`${emoji} ${message}`);
const pass = (message) => {
  passed++;
  log(message, '✓');
};
const fail = (message) => {
  failed++;
  log(message, '✗');
};
const section = (title) => console.log(`\n═══ ${title} ═══`);

async function testHealthCheck() {
  section('Health Check');
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (response.ok) {
      pass('Server is responding');
    } else {
      fail(`Server returned status ${response.status}`);
    }
  } catch (error) {
    fail(`Server unreachable: ${error.message}`);
  }
}

async function testAdminAuth() {
  section('Admin Authentication');
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    pass('Admin authentication successful');
    return true;
  } catch (error) {
    fail(`Admin auth failed: ${error.message}`);
    return false;
  }
}

async function testCollectionExists(name, expectedType = 'base') {
  try {
    const collection = await pb.collections.getOne(name);
    if (collection.type === expectedType) {
      pass(`Collection "${name}" exists with type "${expectedType}"`);
      return collection;
    } else {
      fail(`Collection "${name}" has type "${collection.type}", expected "${expectedType}"`);
      return null;
    }
  } catch (error) {
    fail(`Collection "${name}" not found`);
    return null;
  }
}

async function testCollectionSchema(name, expectedFields) {
  try {
    const collection = await pb.collections.getOne(name);
    // In PocketBase 0.30.4+, schema is renamed to 'fields'
    const schema = collection.fields || collection.schema;
    
    if (!schema || !Array.isArray(schema)) {
      fail(`Could not verify schema for ${name}: fields/schema not available`);
      return;
    }
    
    const fieldNames = schema.map((field) => field.name);

    for (const expectedField of expectedFields) {
      if (fieldNames.includes(expectedField)) {
        pass(`  Field "${expectedField}" exists in ${name}`);
      } else {
        fail(`  Field "${expectedField}" missing in ${name}`);
      }
    }
  } catch (error) {
    fail(`Could not verify schema for ${name}: ${error.message}`);
  }
}

async function testCollectionRules(name, expectedRules) {
  try {
    const collection = await pb.collections.getOne(name);

    for (const [rule, expectedValue] of Object.entries(expectedRules)) {
      const actualValue = collection[rule];
      if (actualValue === expectedValue || (expectedValue === 'defined' && actualValue !== null)) {
        pass(`  ${rule} correctly configured for ${name}`);
      } else {
        fail(`  ${rule} misconfigured for ${name} (expected: ${expectedValue}, got: ${actualValue})`);
      }
    }
  } catch (error) {
    fail(`Could not verify rules for ${name}: ${error.message}`);
  }
}

async function testCRUDOperations() {
  section('CRUD Operations');

  // Get a test user for the author field
  let testAuthor;
  try {
    const users = await pb.collection('users').getList(1, 1);
    if (users.items.length > 0) {
      testAuthor = users.items[0].id;
    } else {
      fail('CRUD test skipped: No users available for author field');
      return;
    }
  } catch (error) {
    fail(`CRUD test skipped: Could not fetch users - ${error.message}`);
    return;
  }

  // Create
  let testRecord;
  try {
    testRecord = await pb.collection('posts').create({
      title: 'Test Post',
      slug: 'test-post-' + Date.now(),
      content: '<p>This is a test post created by the test suite.</p>',
      status: 'draft',
      author: testAuthor,
    }, { requestKey: null });
    pass('Create: New post created');
  } catch (error) {
    fail(`Create failed: ${error.message}`);
    return;
  }

  // Read
  try {
    const fetched = await pb.collection('posts').getOne(testRecord.id);
    if (fetched.title === testRecord.title) {
      pass('Read: Post retrieved successfully');
    } else {
      fail('Read: Post data mismatch');
    }
  } catch (error) {
    fail(`Read failed: ${error.message}`);
  }

  // Update
  try {
    const updated = await pb.collection('posts').update(testRecord.id, {
      title: 'Updated Test Post',
    }, { requestKey: null });
    if (updated.title === 'Updated Test Post') {
      pass('Update: Post updated successfully');
    } else {
      fail('Update: Post not updated correctly');
    }
  } catch (error) {
    fail(`Update failed: ${error.message}`);
  }

  // Delete
  try {
    await pb.collection('posts').delete(testRecord.id, { requestKey: null });
    pass('Delete: Post deleted successfully');
  } catch (error) {
    fail(`Delete failed: ${error.message}`);
  }

  // Verify deletion
  try {
    await pb.collection('posts').getOne(testRecord.id);
    fail('Delete verification: Post still exists after deletion');
  } catch (error) {
    if (error.status === 404) {
      pass('Delete verification: Post confirmed deleted');
    } else {
      fail(`Delete verification failed: ${error.message}`);
    }
  }
}

async function testPaginationAndFiltering() {
  section('Pagination & Filtering');

  try {
    // Test pagination (PocketBase 0.30.4+ uses -id instead of -created for sorting)
    const list = await pb.collection('posts').getList(1, 10, {
      sort: '-id',
    });
    pass(`Pagination: Retrieved ${list.items.length} posts (page ${list.page}/${list.totalPages})`);

    // Test filtering if posts exist
    if (list.items.length > 0) {
      try {
        const filtered = await pb.collection('posts').getList(1, 10, {
          filter: 'status = "published"',
        });
        if (filtered.items.length > 0) {
          pass('Filter: Published posts found');
        } else {
          log('  Note: No published posts available for filter test', '⚠');
        }
      } catch (filterError) {
        log(`  Note: Filter test skipped: ${filterError.message}`, '⚠');
      }
    }
  } catch (error) {
    fail(`Pagination failed: ${error.message}`);
  }
}

async function testRelations() {
  section('Relations & Expand');

  try {
    const posts = await pb.collection('posts').getList(1, 5, {
      expand: 'author,categories',
    });

    if (posts.items.length > 0) {
      const firstPost = posts.items[0];

      if (firstPost.expand?.author) {
        pass('Relation expand: author field expanded');
      } else {
        log('  Note: No author relation found to expand', '⚠');
      }

      if (firstPost.expand?.categories) {
        pass('Relation expand: categories field expanded');
      } else {
        log('  Note: No categories relation found to expand', '⚠');
      }
    } else {
      log('  Note: No posts available for relation test', '⚠');
    }
  } catch (error) {
    fail(`Relation test failed: ${error.message}`);
  }
}

async function testUserAuthentication() {
  section('User Authentication');

  const testEmail = `test-${Date.now()}@test.com`;
  const testPassword = 'TestPassword123!';

  // Create user
  let userId;
  try {
    const user = await pb.collection('users').create({
      email: testEmail,
      password: testPassword,
      passwordConfirm: testPassword,
      displayName: 'Test User',
    }, { requestKey: null });
    userId = user.id;
    pass('User registration successful');
  } catch (error) {
    fail(`User registration failed: ${error.message}`);
    return;
  }

  // Login
  try {
    await pb.collection('users').authWithPassword(testEmail, testPassword);
    pass('User login successful');

    if (pb.authStore.isValid) {
      pass('Auth token valid');
    } else {
      fail('Auth token invalid');
    }
  } catch (error) {
    fail(`User login failed: ${error.message}`);
  }

  // Cleanup
  try {
    // Re-auth as admin to delete test user
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    await pb.collection('users').delete(userId, { requestKey: null });
    pass('Test user cleanup successful');
  } catch (error) {
    log(`  Note: Could not cleanup test user: ${error.message}`, '⚠');
  }
}

async function testSampleData() {
  section('Sample Data');

  const collections = ['users', 'categories', 'posts', 'comments'];

  for (const collectionName of collections) {
    try {
      const list = await pb.collection(collectionName).getList(1, 1);
      if (list.totalItems > 0) {
        pass(`Sample data exists in ${collectionName} (${list.totalItems} records)`);
      } else {
        fail(`No sample data in ${collectionName}`);
      }
    } catch (error) {
      fail(`Could not check sample data in ${collectionName}: ${error.message}`);
    }
  }
}

async function runTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║        PocketBase Demo - Automated Test Suite            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\nServer: ${BASE_URL}`);
  console.log(`Admin: ${ADMIN_EMAIL}\n`);

  await testHealthCheck();

  const adminAuthed = await testAdminAuth();
  if (!adminAuthed) {
    console.log('\n❌ Cannot proceed without admin authentication\n');
    process.exit(1);
  }

  // Test collections exist
  section('Collections');
  await testCollectionExists('users', 'auth');
  await testCollectionExists('categories', 'base');
  await testCollectionExists('posts', 'base');
  await testCollectionExists('comments', 'base');

  // Test schemas
  section('Collection Schemas');
  await testCollectionSchema('users', ['displayName', 'bio']);
  await testCollectionSchema('categories', ['label', 'slug']);
  await testCollectionSchema('posts', ['title', 'slug', 'content', 'status', 'author', 'categories']);
  await testCollectionSchema('comments', ['post', 'author', 'content']);

  // Test rules
  section('Access Rules');
  await testCollectionRules('posts', {
    listRule: '',
    viewRule: '',
    createRule: 'defined',
    updateRule: 'defined',
    deleteRule: 'defined',
  });

  // Test CRUD
  await testCRUDOperations();

  // Test advanced features
  await testPaginationAndFiltering();
  await testRelations();
  await testUserAuthentication();
  await testSampleData();

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                      Test Summary                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${passed + failed}\n`);

  if (failed === 0) {
    console.log('✅ All tests passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed.\n');
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('\n❌ Test suite crashed:', error.message);
  console.error(error.stack);
  process.exit(1);
});

