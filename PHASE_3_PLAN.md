# Phase 3: Event Loop Refactor & Action System

**Status:** 🚧 In Progress
**Start Date:** October 19, 2025
**Duration:** 7 days (estimated)
**Dependencies:** Phase 2 Complete ✅

## 🎯 Objectives

Transform ad-hoc event handling into a **predictable, debuggable action/reducer system** with middleware support.

### Success Criteria
- ✅ Centralized action dispatch system
- ✅ Reducer pattern for state mutations
- ✅ Middleware for logging, analytics, async operations
- ✅ Enhanced realtime integration with store
- ✅ Event flow documentation with diagrams
- ✅ 80%+ test coverage for action system

## 📋 Current State (Post-Phase 2)

### What We Have
- ✅ Modular component architecture (7 components)
- ✅ Store pattern for state management (5 stores)
- ✅ Event-driven component communication
- ✅ 115 passing tests

### What Needs Improvement
- ❌ Event handlers are scattered across components
- ❌ State mutations happen in multiple places
- ❌ No centralized action history/replay
- ❌ Limited debugging for state changes
- ❌ Realtime updates bypass action system
- ❌ No middleware for cross-cutting concerns

## 🏗️ Architecture Design

### Action System

```javascript
// Actions are plain objects
const action = {
  type: 'POST_CREATE',
  payload: { post },
  meta: { timestamp, userId, source: 'composer' }
};

// Dispatch actions through central system
store.dispatch(action);
```

### Reducer Pattern

```javascript
// Reducers are pure functions: (state, action) => newState
function postReducer(state, action) {
  switch (action.type) {
    case 'POST_CREATE':
      return { ...state, posts: [...state.posts, action.payload.post] };
    case 'POST_UPDATE':
      return { ...state, posts: state.posts.map(p =>
        p.id === action.payload.id ? action.payload.post : p
      )};
    default:
      return state;
  }
}
```

### Middleware Pipeline

```javascript
// Middleware: ({ dispatch, getState }) => next => action => next(action)
const loggerMiddleware = ({ dispatch, getState }) => next => action => {
  console.log('Dispatching:', action);
  const result = next(action);
  console.log('New state:', getState());
  return result;
};

const analyticsMiddleware = ({ dispatch }) => next => action => {
  trackEvent(action.type, action.payload);
  return next(action);
};

const asyncMiddleware = ({ dispatch, getState }) => next => action => {
  // Handle async actions
  if (typeof action === 'function') {
    return action(dispatch, getState);
  }
  return next(action);
};
```

## 📦 Implementation Tasks

### Task 1: Core Action System (Day 1-2)
**Files:** `public/store/action-system.js`

- [ ] Create `ActionDispatcher` class
- [ ] Implement action queue
- [ ] Add action validation
- [ ] Build reducer registry
- [ ] Add middleware pipeline
- [ ] Create action creators
- [ ] Write unit tests (20+ tests)

**Action Types to Support:**
```javascript
// Auth actions
AUTH_LOGIN
AUTH_LOGOUT
AUTH_REGISTER
AUTH_UPDATE

// Post actions
POST_CREATE
POST_UPDATE
POST_DELETE
POST_VOTE
POST_LOAD_PAGE

// Comment actions
COMMENT_CREATE
COMMENT_UPDATE
COMMENT_DELETE
COMMENT_VOTE
COMMENT_LOAD

// UI actions
UI_TOAST_SHOW
UI_TOAST_HIDE
UI_MENU_TOGGLE
UI_LOADING_SET

// Realtime actions
REALTIME_CONNECTED
REALTIME_DISCONNECTED
REALTIME_POST_CREATED
REALTIME_POST_UPDATED
REALTIME_POST_DELETED
```

### Task 2: Store Integration (Day 2-3)
**Files:** `public/store/store.js`, `public/store/*.store.js`

- [ ] Enhance `Store` class with `dispatch()` method
- [ ] Add `reducer` support to stores
- [ ] Implement `combineReducers()` utility
- [ ] Add action history tracking
- [ ] Create `getActions()` for debugging
- [ ] Add `replayActions()` for time-travel debugging
- [ ] Update existing stores to use reducers
- [ ] Write integration tests (15+ tests)

### Task 3: Middleware Implementation (Day 3-4)
**Files:** `public/middleware/*.js`

- [ ] Create `logger.middleware.js` - logs all actions
- [ ] Create `analytics.middleware.js` - tracks user actions
- [ ] Create `async.middleware.js` - handles thunks
- [ ] Create `validation.middleware.js` - validates actions
- [ ] Create `persistence.middleware.js` - localStorage sync
- [ ] Create `error.middleware.js` - error boundaries
- [ ] Add middleware configuration
- [ ] Write middleware tests (20+ tests)

### Task 4: Realtime Integration (Day 4-5)
**Files:** `public/services/realtime-adapter.js`

- [ ] Create `RealtimeAdapter` class
- [ ] Convert realtime events to actions
- [ ] Integrate with action dispatcher
- [ ] Add conflict resolution for optimistic updates
- [ ] Add reconnection handling
- [ ] Add subscription management via actions
- [ ] Create action creators for realtime events
- [ ] Write realtime integration tests (15+ tests)

**Realtime Event Flow:**
```
PocketBase Event → RealtimeAdapter → Action → Reducer → Store → UI Update
```

### Task 5: Component Migration (Day 5-6)
**Files:** `public/components/*.js`, `public/app.js`

- [ ] Update `AuthPanel` to dispatch actions
- [ ] Update `PostCard` to dispatch actions
- [ ] Update `FeedManager` to dispatch actions
- [ ] Update `CommentThread` to dispatch actions
- [ ] Update `Composer` to dispatch actions
- [ ] Migrate `app.js` event handlers to actions
- [ ] Remove direct state mutations
- [ ] Test each component migration (25+ tests)

### Task 6: Developer Tools & Documentation (Day 6-7)
**Files:** `docs/ACTION_SYSTEM.md`, `public/utils/devtools.js`

- [ ] Create action system documentation
- [ ] Build event flow diagrams
- [ ] Add action type reference
- [ ] Create debugging utilities
- [ ] Add Redux DevTools integration
- [ ] Build action replay tool
- [ ] Create migration guide
- [ ] Write usage examples

## 📊 Testing Strategy

### Unit Tests (70+ tests)
- Action dispatcher core functionality
- Reducer pure functions
- Middleware pipeline
- Action creators
- Store dispatch integration

### Integration Tests (30+ tests)
- Component → Action → Reducer → Store flow
- Middleware chain execution
- Realtime → Action → UI flow
- Optimistic update + realtime reconciliation
- Error handling across the pipeline

### E2E Tests (10+ tests)
- User interactions trigger correct actions
- State updates reflect in UI
- Realtime updates work end-to-end
- Action replay functionality
- DevTools integration

**Target: 110+ new tests, 80%+ coverage**

## 🔍 Debugging Features

### Action History
```javascript
store.getActions(); // Get all dispatched actions
store.getActions({ type: 'POST_CREATE' }); // Filter by type
store.getActions({ since: timestamp }); // Filter by time
```

### Time-Travel Debugging
```javascript
store.replayActions(actions); // Replay action sequence
store.rewindTo(timestamp); // Rewind to specific time
store.forward(); // Move forward one action
store.backward(); // Move back one action
```

### Action Logging
```javascript
// Automatically logged to console in dev mode:
[Action] POST_CREATE @ 12:34:56.789
  Payload: { post: {...} }
  Prev State: { posts: [...] }
  Next State: { posts: [...] }
  Duration: 2.3ms
```

## 📈 Success Metrics

### Code Quality
- All actions flow through dispatcher
- All state changes via reducers
- Middleware handles cross-cutting concerns
- Components are pure/declarative
- No direct state mutations

### Testing
- 110+ new tests added
- 225+ total tests passing
- 80%+ code coverage
- All action types tested
- All middleware tested

### Developer Experience
- Clear action type constants
- Type-safe action creators
- Helpful error messages
- DevTools integration
- Comprehensive documentation

### Performance
- Action dispatch < 5ms
- Middleware overhead < 2ms
- No memory leaks in action history
- Efficient realtime reconciliation

## 🚀 Migration Path

### Phase 1: Foundation (Day 1-2)
Build core action system without breaking existing functionality.

### Phase 2: Integration (Day 2-4)
Integrate with stores and add middleware support.

### Phase 3: Migration (Day 4-6)
Gradually migrate components to use action system.

### Phase 4: Polish (Day 6-7)
Add developer tools, documentation, and final testing.

## 📚 Documentation Deliverables

1. **ACTION_SYSTEM.md** - Architecture and usage guide
2. **ACTION_TYPES.md** - Complete action type reference
3. **MIDDLEWARE_GUIDE.md** - Creating custom middleware
4. **DEBUGGING_GUIDE.md** - Using devtools and action replay
5. **MIGRATION_GUIDE.md** - Migrating from events to actions
6. **Event Flow Diagrams** - Visual documentation with Mermaid

## 🔗 Dependencies

### Internal
- ✅ Phase 2 component architecture
- ✅ Store pattern established
- ✅ Service layer abstraction

### External
- None (pure vanilla JS)
- Optional: Redux DevTools Extension for browser debugging

## 🎯 Next Phase Preview

**Phase 4:** Integrations & Experience
- Enhanced monitoring/observability
- Analytics tracking
- Improved error handling
- UX polish

---

**Phase 3 Kickoff!** 🚀
Let's build a predictable, debuggable action system.

