import { executeWithAuth } from './pocketbaseClient.mjs';
import { validate } from '../../public/utils/validator.js';
import { postCreateSchema, postUpdateSchema } from '../../public/schemas/post.schema.js';
import { ValidationError, HttpError } from '../utils/errors.mjs';
import { info, debug } from '../utils/logger.mjs';

const UPDATE_FIELDS = Object.keys(postUpdateSchema);

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}

function ensureDefaults(data) {
  const normalized = { ...data };

  if (!normalized.status) {
    normalized.status = 'draft';
  }

  if ((!normalized.slug || normalized.slug.trim() === '') && normalized.title) {
    normalized.slug = slugify(normalized.title);
  }

  return normalized;
}

function validateForCreate(data) {
  const normalized = ensureDefaults(data);
  const result = validate(normalized, postCreateSchema);
  if (!result.valid) {
    throw new ValidationError('Post payload failed validation', result.errors);
  }
  return normalized;
}

function buildUpdatePayload(existingRecord, patch) {
  if (!existingRecord) {
    throw new HttpError(404, 'Post not found');
  }

  const merged = ensureDefaults({ ...existingRecord, ...patch });
  const result = validate(merged, postCreateSchema);

  if (!result.valid) {
    throw new ValidationError('Post update failed validation', result.errors);
  }

  const payload = {};

  for (const field of UPDATE_FIELDS) {
    if (patch[field] !== undefined) {
      payload[field] = patch[field];
    }
  }

  // If slug was missing previously but now generated via defaults, ensure it is persisted.
  if (!existingRecord.slug && merged.slug && payload.slug === undefined) {
    payload.slug = merged.slug;
  }

  return { payload, merged };
}

export async function listPosts(params = {}) {
  const page = Number.parseInt(params.page || '1', 10);
  const perPage = Number.parseInt(params.perPage || '20', 10);

  return executeWithAuth(
    (pb) => pb.collection('posts').getList(page, perPage, {
      expand: 'author,categories',
      // Sort by id descending (newest first) since created/updated fields don't exist
      sort: '-id',
    }),
    { reason: 'listPosts', page, perPage }
  );
}

export async function createPost(data) {
  const payload = validateForCreate(data);

  info('Creating post', { title: payload.title, slug: payload.slug });

  return executeWithAuth(
    (pb) => pb.collection('posts').create(payload, { requestKey: null }),
    { reason: 'createPost', payload }
  );
}

export async function updatePost(id, patch) {
  if (!patch || Object.keys(patch).length === 0) {
    throw new ValidationError('Post update requires at least one field');
  }

  return executeWithAuth(async (pb) => {
    const existing = await pb.collection('posts').getOne(id);
    const { payload, merged } = buildUpdatePayload(existing, patch);

    info('Updating post', { id, payloadKeys: Object.keys(payload) });

    const updated = await pb.collection('posts').update(id, payload, { requestKey: null });
    debug('Post updated successfully', { id });

    return { updated, normalized: merged };
  }, { reason: 'updatePost', id, patch });
}

export async function getPost(id) {
  return executeWithAuth(
    (pb) => pb.collection('posts').getOne(id, { expand: 'author,categories' }),
    { reason: 'getPost', id }
  );
}

export { buildUpdatePayload, validateForCreate, slugify, ensureDefaults };
