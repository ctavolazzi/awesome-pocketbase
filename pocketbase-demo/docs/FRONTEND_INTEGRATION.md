# Frontend-Backend Integration Strategy

**Date:** 2025-10-18
**Status:** Planning
**Related:** [Gap Analysis](./GAP_ANALYSIS.md) | [Express Server](../../work_efforts/00-09_project_management/01_work_efforts/00.06_express_api_server.md)

## Overview

This document outlines the strategy for integrating the Express API server with the existing frontend while maintaining the optimistic UI experience and realtime capabilities.

## Current Architecture

### Request Flow (Current)
```
┌──────────┐
│ Frontend │
│ (4173)   │
└─────┬────┘
      │
      │ All Operations (CRUD + Realtime)
      ↓
┌─────────────┐
│ PocketBase  │
│   SDK       │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ PocketBase  │
│   (8090)    │
└─────────────┘
```

**Characteristics:**
- ✅ Simple, direct connection
- ✅ Realtime subscriptions work seamlessly
- ❌ No backend validation
- ❌ No centralized business logic
- ❌ No request logging
- ❌ Limited error handling

## Target Architecture (Hybrid)

### Request Flow (Target)
```
┌──────────────┐
│   Frontend   │
│   (4173)     │
└──┬────────┬──┘
   │        │
   │        │ Realtime Subscriptions
   │        ↓
   │    ┌─────────────┐
   │    │ PocketBase  │
   │    │    SDK      │
   │    └──────┬──────┘
   │           │
   │           ↓
   │    ┌─────────────┐
   │    │ PocketBase  │
   │    │   (8090)    │
   │    └─────────────┘
   │
   │ Mutations (Create/Update/Delete)
   ↓
┌──────────────┐
│  Express API │
│   (3030)     │
└──────┬───────┘
       │
       │ PocketBase Client
       ↓
┌─────────────┐
│ PocketBase  │
│   (8090)    │
└─────────────┘
```

**Characteristics:**
- ✅ Backend validation on mutations
- ✅ Centralized business logic
- ✅ Request logging and monitoring
- ✅ Better error handling
- ✅ Realtime still works directly
- ✅ Optimistic UI maintained
- ⚠️ Additional network hop for mutations

## Why Hybrid Architecture?

### Mutations Through Express API
**Benefits:**
- Server-side validation prevents bad data
- Business logic (slug generation, defaults) centralized
- Easier to add authorization rules
- Request/response logging
- Rate limiting protection

**Trade-offs:**
- Extra network hop adds ~10-50ms latency
- More complex error handling
- Requires CORS configuration

### Realtime Through PocketBase SDK
**Benefits:**
- Direct WebSocket connection (fastest)
- No additional latency
- Battle-tested realtime implementation
- Automatic reconnection

**Trade-offs:**
- Dual client architecture
- Need to keep PocketBase SDK in frontend

### Decision Rationale
The hybrid approach optimizes for:
1. **Fast reads/realtime** - Direct PocketBase connection
2. **Validated writes** - Express API with business logic
3. **Developer experience** - Optimistic UI still works
4. **Future flexibility** - Easy to add auth, caching, etc.

## Implementation Plan

### Phase 1: Foundation (P0 - Blocking)

#### 1.1 Add CORS to Express Server
```javascript
// pocketbase-demo/server/index.mjs
import cors from 'cors';

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:4173',
    'http://127.0.0.1:4173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

export function createApp() {
  const app = express();

  app.use(cors(corsOptions));  // Add CORS FIRST
  app.use(express.json({ limit: '1mb' }));

  // ... rest of setup
}
```

**Dependencies:**
```bash
cd pocketbase-demo
npm install cors
```

**Testing:**
```bash
# Start Express server
npm run server

# Test CORS headers
curl -H "Origin: http://localhost:4173" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://127.0.0.1:3030/api/posts -v
```

**Estimate:** 30 minutes

---

#### 1.2 Create API Client Service
```javascript
// pocketbase-demo/public/services/api.service.js

/**
 * API Service for Express backend communication
 * Handles all mutations (create, update, delete)
 */
class ApiService {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || window.API_BASE_URL || 'http://127.0.0.1:3030';
  }

  /**
   * Make authenticated request to Express API
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    // Add auth token if available
    if (window.pb?.authStore?.token) {
      config.headers['Authorization'] = `Bearer ${window.pb.authStore.token}`;
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: response.statusText
        }));
        throw new ApiError(
          error.error || 'Request failed',
          response.status,
          error.details
        );
      }

      return await response.json();
    } catch (error) {
      // Network errors
      if (error.name === 'TypeError' && !navigator.onLine) {
        throw new NetworkError('No internet connection');
      }

      // Re-throw API errors
      if (error instanceof ApiError) {
        throw error;
      }

      // Unknown errors
      throw new ApiError('An unexpected error occurred', 500);
    }
  }

  /**
   * Posts API
   */
  async listPosts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/posts${query ? '?' + query : ''}`);
  }

  async getPost(id) {
    return this.request(`/api/posts/${id}`);
  }

  async createPost(data) {
    return this.request('/api/posts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updatePost(id, data) {
    return this.request(`/api/posts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deletePost(id) {
    return this.request(`/api/posts/${id}`, {
      method: 'DELETE'
    });
  }
}

/**
 * Custom error types
 */
class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  isValidationError() {
    return this.status === 422;
  }

  isAuthError() {
    return this.status === 401 || this.status === 403;
  }

  isNotFound() {
    return this.status === 404;
  }

  isServerError() {
    return this.status >= 500;
  }
}

class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Export singleton instance
export const apiService = new ApiService();
export { ApiError, NetworkError };
```

**Usage Example:**
```javascript
import { apiService } from './services/api.service.js';

try {
  const post = await apiService.createPost({
    title: 'My Post',
    content: 'Post content',
    author: userId
  });
  console.log('Created:', post);
} catch (error) {
  if (error.isValidationError?.()) {
    console.error('Validation failed:', error.details);
  } else {
    console.error('Failed:', error.message);
  }
}
```

**Estimate:** 2 hours

---

#### 1.3 Update Composer Component
```javascript
// pocketbase-demo/public/components/composer.js
import { apiService, ApiError } from '../services/api.service.js';

export class ComposerComponent {
  // ... existing code ...

  async handleSubmit(data) {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.updateSubmitButton(true);

    // Generate optimistic ID
    const optimisticId = `temp_${Date.now()}_${Math.random()}`;

    // Create optimistic post
    const optimisticPost = {
      id: optimisticId,
      ...data,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      _optimistic: true
    };

    // Show optimistically
    this.onOptimisticCreate?.(optimisticPost);

    try {
      // Use Express API instead of direct PocketBase
      const created = await apiService.createPost(data);

      // Replace optimistic with real
      this.onSuccess?.(created, optimisticId);

      this.showToast('success', 'Post created successfully!');
      this.reset();

    } catch (error) {
      // Remove optimistic post
      this.onError?.(optimisticId);

      // Handle different error types
      if (error instanceof ApiError) {
        if (error.isValidationError()) {
          this.showToast('error', 'Please check your input');
          this.showValidationErrors(error.details);
        } else if (error.isAuthError()) {
          this.showToast('error', 'Please log in to post');
        } else {
          this.showToast('error', error.message);
        }
      } else if (error.name === 'NetworkError') {
        this.showToast('error', 'No internet connection');
      } else {
        this.showToast('error', 'Failed to create post');
      }

      console.error('Post creation failed:', error);
    } finally {
      this.isSubmitting = false;
      this.updateSubmitButton(false);
    }
  }

  showValidationErrors(details) {
    if (!details?.issues) return;

    // Show field-level errors
    details.issues.forEach(issue => {
      const field = issue.path?.[0];
      const input = this.form.querySelector(`[name="${field}"]`);
      if (input) {
        input.classList.add('error');
        // Show error message near field
        const errorEl = document.createElement('span');
        errorEl.className = 'field-error';
        errorEl.textContent = issue.message;
        input.parentNode.appendChild(errorEl);
      }
    });
  }

  // ... rest of existing methods ...
}
```

**CSS for validation errors:**
```css
/* Add to public/style.css */
.field-error {
  color: #e74c3c;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}

input.error,
textarea.error {
  border-color: #e74c3c;
}
```

**Estimate:** 2 hours

---

#### 1.4 Update App.js Integration
```javascript
// pocketbase-demo/public/app.js

// Keep existing PocketBase realtime subscription
pb.collection('posts').subscribe('*', (e) => {
  handleRealtimeEvent(e);
});

// Initialize composer with callbacks
const composer = new ComposerComponent(composerForm, {
  onOptimisticCreate: (post) => {
    // Add to feedState with optimistic flag
    feedState.set(post.id, post);
    renderPost(post, true); // true = prepend
    updateStats();
  },

  onSuccess: (realPost, optimisticId) => {
    // Replace optimistic with real post
    if (optimisticId && feedState.has(optimisticId)) {
      feedState.delete(optimisticId);
      document.getElementById(`post-${optimisticId}`)?.remove();
    }

    // Real post will come via realtime subscription
    // But we can update immediately to remove loading state
    feedState.set(realPost.id, realPost);
    const existingEl = document.getElementById(`post-${optimisticId}`);
    if (existingEl) {
      existingEl.id = `post-${realPost.id}`;
      existingEl.classList.remove('optimistic');
    }
  },

  onError: (optimisticId) => {
    // Remove optimistic post
    if (optimisticId && feedState.has(optimisticId)) {
      feedState.delete(optimisticId);
      document.getElementById(`post-${optimisticId}`)?.remove();
      updateStats();
    }
  }
});
```

**Estimate:** 1 hour

---

### Phase 2: Enhanced Error Handling (P1)

#### 2.1 Error Display Component
```javascript
// pocketbase-demo/public/components/error-display.js

export class ErrorDisplay {
  static show(message, type = 'error', duration = 5000) {
    const container = document.getElementById('errorContainer') ||
                     this.createContainer();

    const errorEl = document.createElement('div');
    errorEl.className = `error-message error-${type}`;
    errorEl.innerHTML = `
      <span class="error-icon">${this.getIcon(type)}</span>
      <span class="error-text">${message}</span>
      <button class="error-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(errorEl);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => errorEl.remove(), duration);
    }

    return errorEl;
  }

  static createContainer() {
    const container = document.createElement('div');
    container.id = 'errorContainer';
    container.className = 'error-container';
    document.body.appendChild(container);
    return container;
  }

  static getIcon(type) {
    const icons = {
      error: '⚠️',
      warning: '⚡',
      info: 'ℹ️',
      success: '✅'
    };
    return icons[type] || icons.error;
  }
}
```

**Estimate:** 1 hour

---

### Phase 3: Testing (P1)

#### 3.1 Manual Testing Checklist

**Test Scenarios:**
- [ ] Create post successfully
- [ ] Create post with validation errors
- [ ] Create post while offline
- [ ] Create post with expired auth
- [ ] Update post successfully
- [ ] Update post with validation errors
- [ ] Realtime updates still work
- [ ] Optimistic UI shows immediately
- [ ] Failed posts are removed
- [ ] Success toasts appear
- [ ] Error toasts appear with details

**Test Script:**
```bash
# 1. Start all services
cd pocketbase-demo
npm run serve    # Terminal 1
npm run server   # Terminal 2
npx live-server --port=4173 --entry-file=public/index.html  # Terminal 3

# 2. Open browser to http://localhost:4173

# 3. Open DevTools Network tab

# 4. Create a post
#    - Should see POST to http://127.0.0.1:3030/api/posts
#    - Should see 201 response
#    - Should see post appear immediately (optimistic)
#    - Should see post update with real ID

# 5. Create invalid post (empty title)
#    - Should see 422 response
#    - Should see error message
#    - Optimistic post should disappear

# 6. Disconnect internet
#    - Try to create post
#    - Should see network error
#    - Optimistic post should disappear

# 7. Create post in another browser tab
#    - Should see realtime update in first tab
#    - Proves realtime still works
```

**Estimate:** 2 hours

---

#### 3.2 Automated E2E Tests
```javascript
// pocketbase-demo/server/tests/e2e.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { start } from '../index.mjs';

test('End-to-end post creation flow', async () => {
  const server = await start();

  const postData = {
    title: 'E2E Test Post',
    content: 'Testing full flow',
    author: 'test-user-123'
  };

  // Create via API
  const createRes = await fetch('http://127.0.0.1:3030/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postData)
  });

  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.ok(created.id);
  assert.equal(created.title, postData.title);
  assert.ok(created.slug); // Should be auto-generated

  // Verify in PocketBase
  const pb = new PocketBase('http://127.0.0.1:8090');
  await pb.admins.authWithPassword('admin@test.com', 'password');
  const pbPost = await pb.collection('posts').getOne(created.id);
  assert.equal(pbPost.title, postData.title);

  // Cleanup
  await pb.collection('posts').delete(created.id);
  server.close();
});
```

**Estimate:** 3 hours

---

### Phase 4: Configuration & Documentation (P1)

#### 4.1 Environment Configuration
```bash
# pocketbase-demo/.env.example
# PocketBase Configuration
PB_BASE_URL=http://127.0.0.1:8090
PB_ADMIN_EMAIL=admin@example.com
PB_ADMIN_PASSWORD=changeme123

# Express API Configuration
APP_PORT=3030
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:4173,http://127.0.0.1:4173

# Frontend Configuration
API_BASE_URL=http://127.0.0.1:3030
```

```html
<!-- pocketbase-demo/public/index.html -->
<script>
  // Configuration from environment
  window.API_BASE_URL = 'http://127.0.0.1:3030';
  window.POCKETBASE_URL = 'http://127.0.0.1:8090';
</script>
```

**Estimate:** 30 minutes

---

#### 4.2 Update README
```markdown
<!-- Add to pocketbase-demo/README.md -->

## Architecture

This project uses a hybrid frontend-backend architecture:

- **Mutations (Create/Update/Delete)** → Express API (port 3030)
- **Realtime Subscriptions** → PocketBase SDK (port 8090)

### Why Hybrid?

- ✅ Server-side validation on mutations
- ✅ Centralized business logic
- ✅ Fast realtime updates (direct WebSocket)
- ✅ Optimistic UI maintained

## Running the Full Stack

You need 3 services running:

```bash
# Terminal 1: PocketBase
npm run serve

# Terminal 2: Express API
npm run server

# Terminal 3: Frontend
npx live-server --port=4173 --entry-file=public/index.html
```

Access:
- Frontend: http://localhost:4173
- Express API: http://127.0.0.1:3030
- PocketBase: http://127.0.0.1:8090

## Configuration

1. Copy `.env.example` to `.env`
2. Update credentials as needed
3. Default values work for local development
```

**Estimate:** 30 minutes

---

## Migration Strategy

### Option A: Big Bang (Recommended for Small Project)
1. Implement all Phase 1 changes
2. Test thoroughly
3. Deploy all at once

**Pros:** Simple, clean cutover
**Cons:** Larger testing surface
**Timeline:** 1-2 days

### Option B: Feature Flag
1. Add feature flag in frontend
2. Route mutations conditionally
3. Gradually enable for users

**Pros:** Lower risk, gradual rollout
**Cons:** More complex code temporarily
**Timeline:** 3-5 days

### Option C: Shadow Mode
1. Send to both Express API and PocketBase
2. Compare results
3. Switch over when confident

**Pros:** Can verify behavior
**Cons:** Double writes, more complex
**Timeline:** 1 week

**Recommendation:** Use Option A for this project size.

## Rollback Plan

If issues arise after deployment:

1. **Immediate:** Change frontend to use PocketBase directly
```javascript
// Emergency rollback - change one line
const USE_API = false;  // Set to false

async createPost(data) {
  if (USE_API) {
    return apiService.createPost(data);
  } else {
    return pb.collection('posts').create(data);
  }
}
```

2. **Monitor:** Check logs for errors
3. **Fix:** Address issues in Express API
4. **Re-enable:** Set `USE_API = true` again

## Performance Considerations

### Latency Comparison

**Direct PocketBase:**
- Frontend → PocketBase: ~5-20ms (local)

**Through Express API:**
- Frontend → Express: ~5-10ms
- Express → PocketBase: ~5-10ms
- **Total:** ~10-20ms (local)

**Impact:** +5-10ms per mutation (negligible for users)

### Network Traffic

**Before:** 1 request to PocketBase
**After:** 1 request to Express + 1 request to PocketBase
**Increase:** 2x requests for mutations only

**Realtime traffic unchanged** (still direct to PocketBase)

## Security Considerations

### Current State (After Phase 1)
- ✅ CORS configured
- ✅ Input validation
- ❌ No per-user authentication
- ❌ No rate limiting

### Before Production
- Add request authentication
- Add rate limiting
- Add security headers
- See [Gap Analysis](./GAP_ANALYSIS.md) for full list

## Timeline Summary

| Phase | Tasks | Estimate | Priority |
|-------|-------|----------|----------|
| Phase 1 | CORS + API Client + Composer | 5.5 hours | P0 |
| Phase 2 | Error Handling | 1 hour | P1 |
| Phase 3 | Testing | 5 hours | P1 |
| Phase 4 | Config + Docs | 1 hour | P1 |

**Total Estimate:** ~12.5 hours (1.5-2 days)

## Success Criteria

- [ ] Posts created through Express API
- [ ] Optimistic UI still works (<50ms feedback)
- [ ] Realtime updates still work
- [ ] Validation errors shown to user
- [ ] Network errors handled gracefully
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Team trained on new architecture

## Related Documentation

- [Gap Analysis](./GAP_ANALYSIS.md) - Production readiness gaps
- [Express Server Work Effort](../../work_efforts/00-09_project_management/01_work_efforts/00.06_express_api_server.md)
- [Express Server DevLog](../../work_efforts/00-09_project_management/02_devlogs/00.07_2025-10-18_express_server.md)

## Last Updated
2025-10-18 20:53

