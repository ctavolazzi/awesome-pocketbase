import test from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify,
  ensureDefaults,
  validateForCreate,
  buildUpdatePayload,
} from '../services/postService.mjs';
import { ValidationError, HttpError } from '../utils/errors.mjs';

test('slugify produces lowercase kebab strings without special chars', () => {
  const result = slugify('Hello World! 90s Vibes');
  assert.equal(result, 'hello-world-90s-vibes');
});

test('ensureDefaults adds fallback status and slug', () => {
  const normalized = ensureDefaults({
    title: 'Brand New Post',
  });

  assert.equal(normalized.status, 'draft');
  assert.equal(normalized.slug, 'brand-new-post');
});

test('validateForCreate returns payload with derived slug', () => {
  const payload = validateForCreate({
    title: 'PocketBase Update',
    content: 'Testing payload builder',
    author: 'user123',
  });

  assert.equal(payload.slug, 'pocketbase-update');
  assert.equal(payload.status, 'draft');
});

test('validateForCreate throws ValidationError on missing required data', () => {
  assert.throws(
    () =>
      validateForCreate({
        content: 'Missing title',
        author: 'user123',
      }),
    (err) => {
      assert.ok(err instanceof ValidationError);
      assert.match(err.message, /Post payload failed validation/);
      return true;
    }
  );
});

test('buildUpdatePayload merges existing data and validates final result', () => {
  const existing = {
    id: 'post1',
    title: 'Old Title',
    content: 'Existing content',
    status: 'published',
    author: 'user123',
    slug: '',
  };

  const patch = {
    title: 'New Title',
  };

  const { payload, merged } = buildUpdatePayload(existing, patch);

  assert.deepEqual(payload, { title: 'New Title', slug: 'new-title' });
  assert.equal(merged.slug, 'new-title');
  assert.equal(merged.status, 'published');
});

test('buildUpdatePayload throws when post is missing', () => {
  assert.throws(
    () => buildUpdatePayload(null, {}),
    (err) => err instanceof HttpError && err.status === 404
  );
});

test('buildUpdatePayload surfaces validation failures', () => {
  const existing = {
    id: 'post1',
    title: 'Existing Title',
    content: 'Existing content',
    status: 'published',
    author: 'user123',
    slug: 'existing-title',
  };

  const patch = {
    title: '',
  };

  assert.throws(
    () => buildUpdatePayload(existing, patch),
    (err) => {
      assert.ok(err instanceof ValidationError);
      assert.match(err.message, /Post update failed validation/);
      return true;
    }
  );
});
