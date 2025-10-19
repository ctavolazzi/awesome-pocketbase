import { Router } from 'express';
import * as postService from '../services/postService.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { sanitizePost } from '../utils/sanitize.mjs';

function asyncHandler(fn) {
  return function handler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function createPostsRouter(options = {}) {
  const deps = options.deps || postService;
  const { createLimiter } = options;
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const result = await deps.listPosts(req.query);
      res.json({
        items: result.items,
        page: result.page,
        perPage: result.perPage,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
      });
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const record = await deps.getPost(req.params.id);
      res.json(record);
    })
  );

  const postHandlers = [
    requireAuth,
    asyncHandler(async (req, res) => {
      // Sanitize input
      const sanitized = sanitizePost(req.body || {});

      // Use authenticated user as author
      const postData = {
        ...sanitized,
        author: req.user.id
      };

      const created = await deps.createPost(postData);
      res.status(201).json(created);
    })
  ];

  // Apply create rate limiter if provided
  if (createLimiter) {
    postHandlers.unshift(createLimiter);
  }

  router.post('/', ...postHandlers);

  router.patch(
    '/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      // Sanitize input
      const sanitized = sanitizePost(req.body || {});

      const result = await deps.updatePost(req.params.id, sanitized);
      res.json(result);
    })
  );

  return router;
}
