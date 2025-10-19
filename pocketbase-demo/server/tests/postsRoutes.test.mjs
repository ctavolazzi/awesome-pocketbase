import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createPostsRouter } from '../routes/posts.mjs';

function buildServices(overrides = {}) {
  return {
    listPosts: mock.fn(async (query) => ({
      items: [{ id: 'p1', title: 'Test', content: 'Sample', status: 'draft' }],
      page: Number.parseInt(query.page || '1', 10),
      perPage: Number.parseInt(query.perPage || '20', 10),
      totalItems: 1,
      totalPages: 1,
    })),
    getPost: mock.fn(async (id) => ({ id, title: 'Single', status: 'draft' })),
    createPost: mock.fn(async (payload) => ({ id: 'created', ...payload })),
    updatePost: mock.fn(async (id, patch) => ({
      updated: { id, ...patch },
      normalized: { id, ...patch },
    })),
    ...overrides,
  };
}

function findRoute(router, method, path) {
  const layer = router.stack.find(
    (item) =>
      item.route &&
      item.route.path === path &&
      Boolean(item.route.methods[method])
  );

  if (!layer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  return layer.route.stack[0].handle;
}

async function invokeRoute(router, method, path, { body, query, params } = {}) {
  const handler = findRoute(router, method, path);

  const req = {
    body: body || {},
    query: query || {},
    params: params || {},
    method: method.toUpperCase(),
    path,
    originalUrl: path,
  };

  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  };

  await handler(req, res, (err) => {
    if (err) {
      throw err;
    }
  });

  return res;
}

test('GET /api/posts proxies to listPosts service', async () => {
  const services = buildServices();
  const router = createPostsRouter({ deps: services });

  const res = await invokeRoute(router, 'get', '/', {
    query: { page: '2', perPage: '5' },
  });

  assert.equal(res.statusCode, 200);
  assert.equal(services.listPosts.mock.calls.length, 1);
  assert.deepEqual(services.listPosts.mock.calls[0].arguments[0], {
    page: '2',
    perPage: '5',
  });
  assert.equal(res.payload.page, 2);
  assert.equal(res.payload.perPage, 5);
  assert.deepEqual(res.payload.items[0], {
    id: 'p1',
    title: 'Test',
    content: 'Sample',
    status: 'draft',
  });
});

test('GET /api/posts/:id returns single record', async () => {
  const services = buildServices();
  const router = createPostsRouter({ deps: services });

  const res = await invokeRoute(router, 'get', '/:id', {
    params: { id: 'post-123' },
  });

  assert.equal(res.statusCode, 200);
  assert.equal(services.getPost.mock.calls.length, 1);
  assert.equal(services.getPost.mock.calls[0].arguments[0], 'post-123');
  assert.equal(res.payload.id, 'post-123');
});

test('POST /api/posts sends body to createPost service', async () => {
  const services = buildServices();
  const router = createPostsRouter({ deps: services });

  const payload = {
    title: 'Created via API',
    content: 'Body',
    author: 'user1',
  };

  const res = await invokeRoute(router, 'post', '/', { body: payload });

  assert.equal(res.statusCode, 201);
  assert.equal(services.createPost.mock.calls.length, 1);
  assert.deepEqual(services.createPost.mock.calls[0].arguments[0], payload);
  assert.equal(res.payload.id, 'created');
});

test('PATCH /api/posts/:id forwards data to updatePost service', async () => {
  const services = buildServices();
  const router = createPostsRouter({ deps: services });

  const patch = { title: 'Updated Title' };
  const res = await invokeRoute(router, 'patch', '/:id', {
    params: { id: 'post-99' },
    body: patch,
  });

  assert.equal(res.statusCode, 200);
  assert.equal(services.updatePost.mock.calls.length, 1);
  const call = services.updatePost.mock.calls[0];
  assert.equal(call.arguments[0], 'post-99');
  assert.deepEqual(call.arguments[1], patch);
  assert.equal(res.payload.updated.id, 'post-99');
});
