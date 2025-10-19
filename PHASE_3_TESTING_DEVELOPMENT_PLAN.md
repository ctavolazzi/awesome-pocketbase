# Phase 3: Testing & Development Plan

**Date:** October 19, 2025
**Current Status:** ✅ All tests passing (143/143)
**Phase:** Store Integration & Wiring

---

## 🎯 Current State

### ✅ Complete
- Core action system (350 lines)
- 5 middleware implementations (375 lines)
- Action type registry (40+ types)
- Critical bug fixes applied
- **143/143 tests passing** ✅

### 🚧 In Progress
- Store integration with dispatcher
- Reducer implementation
- Component migration

---

## 📊 Testing Strategy

### 1. Unit Tests (Current: 143 tests)

**Store Layer (38 tests)** ✅
- Base Store functionality
- AI Store state management
- All passing

**Components (35 tests)** ✅
- AuthPanel (21 tests)
- PostCard (14 tests)
- All passing

**Utils (28 tests)** ✅
- Avatar utilities (11 tests)
- Formatting utilities (17 tests)
- All passing

**Action System (28 tests)** ✅
- Dispatcher core (24 tests)
- Action utilities (4 tests)
- All passing

**AI Store (14 tests)** ✅
- State mutations
- Statistics tracking
- All passing

### 2. Integration Tests (To Add: 30+ tests)

**Store + Dispatcher Integration**
- [ ] Action → Reducer → Store flow
- [ ] Middleware chain with stores
- [ ] State synchronization
- [ ] History and time-travel with real stores
- [ ] Multiple store coordination

**Component + Action Integration**
- [ ] Component dispatch actions
- [ ] Store updates trigger UI
- [ ] Optimistic updates + actions
- [ ] Error handling flow

**Realtime + Action Integration**
- [ ] PocketBase events → Actions
- [ ] Conflict resolution
- [ ] State reconciliation

### 3. E2E Tests (To Add: 10+ tests)

- [ ] User login flow (auth actions)
- [ ] Create post (post actions + optimistic)
- [ ] Vote on post (vote actions)
- [ ] Comment thread (comment actions)
- [ ] Real-time update reception

### 4. System Tests (To Add: 5+ tests)

- [ ] Full page load with action history
- [ ] Action replay from saved state
- [ ] DevTools integration
- [ ] Performance benchmarks

---

## 🔧 Development Plan - Phase 3 Continuation

### Task 2.1: Create Reducers for Each Store (Day 2)

**Auth Store Reducer** (`public/store/reducers/auth.reducer.js`)
```javascript
// Handle: AUTH_LOGIN, AUTH_LOGOUT, AUTH_REGISTER, AUTH_UPDATE
function authReducer(state = initialAuthState, action) {
  switch (action.type) {
    case AUTH_LOGIN:
      return { ...state, user: action.payload.user, isAuthenticated: true };
    case AUTH_LOGOUT:
      return { ...state, user: null, isAuthenticated: false };
    // ... etc
  }
}
```

**Post/Feed Store Reducer** (`public/store/reducers/feed.reducer.js`)
```javascript
// Handle: POST_CREATE, POST_UPDATE, POST_DELETE, POST_VOTE, POST_LOAD_*
```

**Comment Store Reducer** (`public/store/reducers/comments.reducer.js`)
```javascript
// Handle: COMMENT_CREATE, COMMENT_UPDATE, COMMENT_DELETE, COMMENT_VOTE
```

**UI Store Reducer** (`public/store/reducers/ui.reducer.js`)
```javascript
// Handle: UI_TOAST_*, UI_MENU_*, UI_LOADING_*, UI_ERROR_*
```

**AI Store Reducer** (`public/store/reducers/ai.reducer.js`)
```javascript
// Handle: AI_GENERATE_*, AI_PROVIDER_SWITCH
```

**Tests:** 25+ reducer tests (5 per store)

---

### Task 2.2: Wire Dispatcher to Stores (Day 2-3)

**Create Global Dispatcher Instance** (`public/store/dispatcher.js`)
```javascript
import { ActionDispatcher } from './action-system.js';
import { loggerMiddleware } from '../middleware/logger.middleware.js';
import { asyncMiddleware } from '../middleware/async.middleware.js';
import { validationMiddleware } from '../middleware/validation.middleware.js';
import { errorMiddleware } from '../middleware/error.middleware.js';

// Import stores
import { authStore } from './auth.store.js';
import { feedStore } from './feed.store.js';
import { commentsStore } from './comments.store.js';
import { uiStore } from './ui.store.js';
import { aiStore } from './ai.store.js';

// Import reducers
import { authReducer } from './reducers/auth.reducer.js';
import { feedReducer } from './reducers/feed.reducer.js';
import { commentsReducer } from './reducers/comments.reducer.js';
import { uiReducer } from './reducers/ui.reducer.js';
import { aiReducer } from './reducers/ai.reducer.js';

// Create and configure dispatcher
export const dispatcher = new ActionDispatcher({
  enableLogging: import.meta.env.DEV,
  enableValidation: true,
  historyLimit: 100
});

// Register middleware
dispatcher
  .use(loggerMiddleware)
  .use(asyncMiddleware)
  .use(validationMiddleware)
  .use(errorMiddleware);

// Register stores and reducers
dispatcher.registerStore('auth', authStore);
dispatcher.registerReducer('auth', authReducer);

dispatcher.registerStore('feed', feedStore);
dispatcher.registerReducer('feed', feedReducer);

dispatcher.registerStore('comments', commentsStore);
dispatcher.registerReducer('comments', commentsReducer);

dispatcher.registerStore('ui', uiStore);
dispatcher.registerReducer('ui', uiReducer);

dispatcher.registerStore('ai', aiStore);
dispatcher.registerReducer('ai', aiReducer);
```

**Tests:** 15+ integration tests

---

### Task 2.3: Create Action Creators (Day 3)

**Auth Actions** (`public/store/actions/auth.actions.js`)
```javascript
import { createAction, createAsyncAction } from '../action-system.js';
import * as types from '../action-types.js';

export const login = (email, password) => createAsyncAction(
  async (dispatch, getState) => {
    dispatch(createAction(types.AUTH_LOGIN, { email }));

    try {
      const user = await dataService.authWithPassword(email, password);
      dispatch(createAction(types.AUTH_LOGIN, { user }));
      return user;
    } catch (error) {
      dispatch(createAction(types.AUTH_ERROR, { error: error.message }));
      throw error;
    }
  }
);

export const logout = () => createAction(types.AUTH_LOGOUT);
```

**Post Actions** (`public/store/actions/post.actions.js`)
```javascript
export const createPost = (post) => createAsyncAction(async (dispatch) => {
  const tempId = `temp_${Date.now()}`;

  // Optimistic
  dispatch(createAction(types.POST_CREATE_OPTIMISTIC, { post: { ...post, id: tempId } }));

  try {
    const savedPost = await dataService.createPost(post);
    dispatch(createAction(types.POST_CREATE_SUCCESS, { tempId, post: savedPost }));
    return savedPost;
  } catch (error) {
    dispatch(createAction(types.POST_CREATE_FAILURE, { tempId, error: error.message }));
    throw error;
  }
});
```

**Tests:** 20+ action creator tests

---

### Task 2.4: Realtime Adapter (Day 4)

**Create Realtime Adapter** (`public/services/realtime-adapter.js`)
```javascript
import { dispatcher } from '../store/dispatcher.js';
import * as types from '../store/action-types.js';
import { createAction } from '../store/action-system.js';

export class RealtimeAdapter {
  constructor(dataService) {
    this.dataService = dataService;
  }

  init() {
    // Subscribe to PocketBase realtime events
    this.dataService.subscribeToCollection('posts', '*', (event) => {
      this.handlePostEvent(event);
    });

    this.dataService.subscribeToCollection('comments', '*', (event) => {
      this.handleCommentEvent(event);
    });

    // Dispatch connection status
    dispatcher.dispatch(createAction(types.REALTIME_CONNECTED));
  }

  handlePostEvent(event) {
    const { action, record } = event;

    switch (action) {
      case 'create':
        dispatcher.dispatch(createAction(types.REALTIME_POST_CREATED, { post: record }));
        break;
      case 'update':
        dispatcher.dispatch(createAction(types.REALTIME_POST_UPDATED, { post: record }));
        break;
      case 'delete':
        dispatcher.dispatch(createAction(types.REALTIME_POST_DELETED, { postId: record.id }));
        break;
    }
  }

  handleCommentEvent(event) {
    // Similar pattern
  }
}
```

**Tests:** 15+ realtime adapter tests

---

### Task 2.5: Component Migration (Day 5-6)

**Migrate AuthPanel to use Actions**
```javascript
// Before:
this.emit('auth:login');

// After:
dispatcher.dispatch(login(email, password));
```

**Migrate PostCard to use Actions**
```javascript
// Before:
const updatedPost = await dataService.votePost(postId, voteType);

// After:
dispatcher.dispatch(votePost(postId, voteType));
```

**Update app.js to use Dispatcher**
```javascript
import { dispatcher } from './store/dispatcher.js';

// Subscribe to store changes instead of component events
authStore.subscribe('user', (user) => {
  updateAuthUI(user);
});

// Actions flow through dispatcher automatically
```

**Tests:** 25+ component integration tests

---

## 📈 Test Coverage Goals

### Current Coverage
```
Unit Tests:       143/143 ✅ (100%)
Integration Tests:  0/30  ⬜ (0%)
E2E Tests:          0/10  ⬜ (0%)
System Tests:       0/5   ⬜ (0%)
-----------------------------------
Total:            143/188 (76%)
```

### Target Coverage (End of Phase 3)
```
Unit Tests:       170/170 ✅ (100%)
Integration Tests:  30/30 ✅ (100%)
E2E Tests:          10/10 ✅ (100%)
System Tests:        5/5  ✅ (100%)
-----------------------------------
Total:            215/215 ✅ (100%)
Target: 80%+ code coverage
```

---

## 🧪 Testing Commands

### Run All Tests
```bash
npm run test:unit          # All unit tests (143 tests)
npm run test:store         # Store tests only (38 tests)
npm run test:components    # Component tests (35 tests)
npm test                   # Full suite
```

### Run Specific Tests
```bash
node --test tests/unit/store/action-system.test.mjs
node --test tests/unit/store/store.test.mjs
node --test tests/unit/components/auth-panel.test.mjs
```

### Watch Mode (for development)
```bash
node --test --watch tests/unit/**/*.test.mjs
```

### Coverage
```bash
npm run test:coverage      # Generate coverage report
```

---

## 🎯 Development Workflow

### 1. Red-Green-Refactor
```
1. Write failing test
2. Write minimum code to pass
3. Refactor for quality
4. Run full test suite
5. Commit
```

### 2. Feature Branches
```bash
# Create branch for each task
git checkout -b phase3/task-2-1-auth-reducer
# ... implement ...
git commit -m "feat: add auth reducer with tests"
git checkout main
git merge phase3/task-2-1-auth-reducer
```

### 3. Continuous Integration
```
On each commit:
1. Run linter
2. Run unit tests
3. Run integration tests
4. Check coverage
5. Generate report
```

---

## 📊 Success Metrics

### Code Quality
- ✅ All tests passing
- ✅ 80%+ code coverage
- ✅ Zero linter errors
- ✅ All actions typed
- ✅ All reducers pure functions

### Performance
- ✅ Action dispatch <5ms
- ✅ Reducer execution <2ms
- ✅ Test suite <3 seconds
- ✅ No memory leaks

### Architecture
- ✅ Single source of truth (dispatcher)
- ✅ Predictable state changes
- ✅ Time-travel debugging works
- ✅ All state changes via actions

---

## 🚀 Next Immediate Steps

1. **Create reducer directory structure**
   ```bash
   mkdir -p public/store/reducers
   mkdir -p public/store/actions
   ```

2. **Implement auth reducer + tests**
   - Write reducer function
   - Write 5+ unit tests
   - Verify all tests pass

3. **Wire auth store to dispatcher**
   - Create dispatcher instance
   - Register auth store + reducer
   - Write integration tests

4. **Repeat for remaining stores**
   - Feed store
   - Comments store
   - UI store
   - AI store

5. **Create realtime adapter**

6. **Migrate components**

---

**Current:** All tests green, ready to wire stores
**Next:** Implement reducers and integrate with dispatcher
**Goal:** Complete Phase 3 with 215+ passing tests

