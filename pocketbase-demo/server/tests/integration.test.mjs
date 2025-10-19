import test from 'node:test';
import assert from 'node:assert';
import { start } from '../index.mjs';
import { pb } from '../services/pocketbaseClient.mjs';

/**
 * Integration Tests
 * Tests the Express API with real PocketBase instance
 *
 * Prerequisites:
 * - PocketBase must be running on localhost:8090
 * - Admin credentials must be configured in .env
 * - A test user account should exist for authentication tests
 */

const API_BASE = 'http://localhost:3030';
let server;
let authToken;
let testUserId;

// Helper to make authenticated requests
async function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authToken ? `Bearer ${authToken}` : '',
      ...options.headers
    }
  });
}

test('Integration Tests', async (t) => {
  // Setup: Start server
  await t.test('setup: start server', async () => {
    server = await start();
    assert.ok(server, 'Server should start successfully');
  });

  // Health check
  await t.test('GET /healthz returns 200 and checks dependencies', async () => {
    const response = await fetch(`${API_BASE}/healthz`);
    assert.strictEqual(response.status, 200);

    const data = await response.json();
    assert.strictEqual(data.server, 'ok');
    assert.strictEqual(data.pocketbase, 'ok');
    assert.ok(data.timestamp);
  });

  // Authentication setup
  await t.test('setup: authenticate test user', async () => {
    try {
      // Try to authenticate with test user
      const authData = await pb.collection('users').authWithPassword(
        'test@example.com',
        'testpassword123'
      );
      authToken = pb.authStore.token;
      testUserId = authData.record.id;
      assert.ok(authToken, 'Should have auth token');
    } catch (error) {
      // If test user doesn't exist, create one
      if (error.status === 400) {
        const newUser = await pb.collection('users').create({
          email: 'test@example.com',
          password: 'testpassword123',
          passwordConfirm: 'testpassword123',
          displayName: 'Test User'
        });

        const authData = await pb.collection('users').authWithPassword(
          'test@example.com',
          'testpassword123'
        );
        authToken = pb.authStore.token;
        testUserId = authData.record.id;
        assert.ok(authToken, 'Should have auth token after creating user');
      } else {
        throw error;
      }
    }
  });

  // POST /api/posts - Create
  let createdPostId;
  await t.test('POST /api/posts creates a new post', async () => {
    const postData = {
      title: 'Integration Test Post',
      slug: 'integration-test-post',
      content: '<p>This is an integration test</p>',
      status: 'published',
      categories: [],
      featured: false,
      aiGenerated: false,
      upvotes: 0,
      downvotes: 0,
      upvotedBy: [],
      downvotedBy: []
    };

    const response = await authFetch(`${API_BASE}/api/posts`, {
      method: 'POST',
      body: JSON.stringify(postData)
    });

    assert.strictEqual(response.status, 201);

    const data = await response.json();
    assert.ok(data.id, 'Should have post ID');
    assert.strictEqual(data.title, postData.title);
    assert.strictEqual(data.author, testUserId, 'Author should be authenticated user');

    createdPostId = data.id;
  });

  await t.test('POST /api/posts without auth returns 401', async () => {
    const postData = {
      title: 'Unauthorized Post',
      content: '<p>Should not be created</p>'
    };

    const response = await fetch(`${API_BASE}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData)
    });

    assert.strictEqual(response.status, 401);
  });

  await t.test('POST /api/posts sanitizes HTML input', async () => {
    const postData = {
      title: 'Sanitization Test <script>alert("xss")</script>',
      content: '<p>Safe content</p><script>alert("xss")</script>',
      status: 'published'
    };

    const response = await authFetch(`${API_BASE}/api/posts`, {
      method: 'POST',
      body: JSON.stringify(postData)
    });

    assert.strictEqual(response.status, 201);

    const data = await response.json();
    assert.ok(!data.title.includes('<script>'), 'Script tags should be removed from title');
    assert.ok(!data.content.includes('<script>'), 'Script tags should be removed from content');
  });

  // GET /api/posts/:id - Read
  await t.test('GET /api/posts/:id retrieves a post', async () => {
    const response = await fetch(`${API_BASE}/api/posts/${createdPostId}`);

    assert.strictEqual(response.status, 200);

    const data = await response.json();
    assert.strictEqual(data.id, createdPostId);
    assert.ok(data.title);
  });

  await t.test('GET /api/posts/:id with invalid ID returns 404', async () => {
    const response = await fetch(`${API_BASE}/api/posts/invalid-id-12345`);
    assert.strictEqual(response.status, 404);
  });

  // GET /api/posts - List
  await t.test('GET /api/posts lists posts with pagination', async () => {
    const response = await fetch(`${API_BASE}/api/posts?page=1&perPage=10`);

    assert.strictEqual(response.status, 200);

    const data = await response.json();
    assert.ok(Array.isArray(data.items), 'Should have items array');
    assert.ok(data.totalItems >= 0, 'Should have totalItems');
    assert.ok(data.totalPages >= 0, 'Should have totalPages');
  });

  // PATCH /api/posts/:id - Update
  await t.test('PATCH /api/posts/:id updates a post', async () => {
    const updateData = {
      title: 'Updated Integration Test Post',
      content: '<p>Updated content</p>'
    };

    const response = await authFetch(`${API_BASE}/api/posts/${createdPostId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });

    assert.strictEqual(response.status, 200);

    const data = await response.json();
    assert.strictEqual(data.updated.title, updateData.title);
  });

  await t.test('PATCH /api/posts/:id without auth returns 401', async () => {
    const updateData = { title: 'Unauthorized Update' };

    const response = await fetch(`${API_BASE}/api/posts/${createdPostId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    assert.strictEqual(response.status, 401);
  });

  // Cleanup: Delete test post
  await t.test('cleanup: delete test posts', async () => {
    if (createdPostId) {
      await pb.collection('posts').delete(createdPostId);
    }

    // Clean up any other test posts
    const testPosts = await pb.collection('posts').getList(1, 50, {
      filter: 'title ~ "Integration Test" || title ~ "Sanitization Test"'
    });

    for (const post of testPosts.items) {
      await pb.collection('posts').delete(post.id);
    }
  });

  // Teardown: Stop server
  await t.test('teardown: stop server', () => {
    return new Promise((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  });
});

