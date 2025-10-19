# Phase 2: Component Extraction Plan

**Date:** October 20, 2025
**Status:** 🔄 IN PROGRESS
**Goal:** Extract app.js (942 lines) into discrete components
**Target:** Reduce to <200 lines, achieve 70% test coverage

---

## 📊 Current State Analysis

### app.js Statistics
- **Total Lines:** 942
- **Functions:** 30+
- **Already Extracted:** ComposerComponent (349 lines in separate file)
- **Target Reduction:** ≥60% (from 942 to <200 lines)

### Major Sections Identified

#### 1. **Authentication & User Management** (~150 lines)
Functions:
- `setAuthStatus()` - Update UI based on auth state
- `handleLogin()` / `handleRegister()` / `handleLogout()`
- Auth form handlers

**Extraction Target:** `AuthPanel` component
**Stores Used:** `authStore`
**Priority:** HIGH (core functionality)

#### 2. **Feed & Post Rendering** (~250 lines)
Functions:
- `renderFeedItem()` - Render individual post cards
- `loadPosts()` - Fetch and display posts
- `handleScroll()` - Infinite scroll
- `handleDeletePost()`
- `handleVote()`
- `updateVoteUI()`

**Extraction Target:** `PostCard` + `FeedManager` components
**Stores Used:** `feedStore`, `authStore`
**Priority:** HIGH (largest section)

#### 3. **Comments System** (~200 lines)
Functions:
- `loadComments()` - Fetch comments for post
- `toggleComments()` - Expand/collapse
- `renderCommentTree()` - Recursive comment rendering
- `createCommentElement()` - Single comment HTML
- `createCommentComposer()` - Reply form
- `showReplyForm()`
- `handleCommentVote()`
- `handleDeleteComment()`

**Extraction Target:** `CommentThread` component
**Stores Used:** `commentsStore`, `authStore`
**Priority:** HIGH (complex logic)

#### 4. **UI Controls & Menus** (~100 lines)
Functions:
- `openMenu()` / `closeMenu()` - Slide menu
- `setComposerEnabled()` - Toggle composer
- Menu event handlers
- New posts indicator

**Extraction Target:** `SlideMenu` + `UIControls` components
**Stores Used:** `uiStore`, `authStore`
**Priority:** MEDIUM

#### 5. **Statistics & Utilities** (~80 lines)
Functions:
- `updateStats()` - Stats display
- `updateHitCounter()` - Visitor counter
- `displayCounter()` - Counter animation
- `appendLog()` - Debug logging
- `getUserAvatar()` - Avatar emoji
- `formatRelativeTime()` - Time formatting
- `stripHtml()` - HTML sanitization

**Extraction Target:** `StatsWidget` + `utils/` modules
**Stores Used:** `feedStore`, `aiStore`
**Priority:** LOW (utility functions)

#### 6. **Realtime Subscriptions** (~50 lines)
Functions:
- `subscribeToRealtime()` - WebSocket setup
- Realtime event handlers

**Extraction Target:** `RealtimeService` (not a component, a service)
**Stores Used:** `feedStore`, `commentsStore`
**Priority:** MEDIUM

#### 7. **Category Management** (~30 lines)
Functions:
- `loadCategories()` - Fetch categories
- Category dropdown population

**Extraction Target:** Integrate into `Composer` or create `CategorySelect`
**Stores Used:** None (can add to feedStore)
**Priority:** LOW

---

## 🎯 Extraction Strategy

### Phase 2.1: Foundation Components (Days 1-3)
**Target: ~300 lines extracted**

1. ✅ **Composer** (already extracted - 349 lines)
   - Wire to `uiStore` for open/close state
   - Add tests

2. **Toast Notifications** (already exists in `/components/toast.js`)
   - Wire to `uiStore`
   - Add tests

3. **AuthPanel Component** (~150 lines)
   - Extract auth forms and handlers
   - Wire to `authStore`
   - Handle login/register/logout
   - Update UI on auth changes
   - Add tests (10+ tests)

### Phase 2.2: Core Feed Components (Days 4-6)
**Target: ~350 lines extracted**

4. **PostCard Component** (~150 lines)
   - Render single post
   - Handle votes
   - Handle delete
   - Show/hide comments button
   - Wire to `feedStore` + `authStore`
   - Add tests (15+ tests)

5. **FeedManager Component** (~200 lines)
   - Load posts (pagination)
   - Infinite scroll
   - New posts indicator
   - Wire to `feedStore`
   - Add tests (12+ tests)

### Phase 2.3: Comments & UI (Days 7-9)
**Target: ~250 lines extracted**

6. **CommentThread Component** (~200 lines)
   - Load comments
   - Render comment tree (recursive)
   - Reply forms
   - Vote/delete comments
   - Wire to `commentsStore` + `authStore`
   - Add tests (18+ tests)

7. **SlideMenu Component** (~50 lines)
   - Open/close menu
   - User profile display
   - Wire to `uiStore` + `authStore`
   - Add tests (6+ tests)

### Phase 2.4: Utilities & Polish (Day 10)
**Target: ~100 lines extracted/refactored**

8. **Utils Modules**
   - `utils/formatting.js` - Time, HTML, text utils
   - `utils/avatar.js` - Avatar system
   - `utils/logger.js` - Debug logging (already exists)

9. **StatsWidget Component** (~50 lines)
   - Display post stats
   - Hit counter
   - Wire to `feedStore` + `aiStore`
   - Add tests (5+ tests)

10. **RealtimeService** (~50 lines)
    - Extract WebSocket logic
    - Wire to stores for updates
    - Add tests (4+ tests)

---

## 📁 Target File Structure

```
public/
├── app.js (target: <200 lines)
│   └── Main orchestrator only
├── components/
│   ├── composer.js (349 lines) ✅ EXISTS
│   ├── toast.js ✅ EXISTS
│   ├── auth-panel.js (NEW - ~150 lines)
│   ├── post-card.js (NEW - ~150 lines)
│   ├── feed-manager.js (NEW - ~200 lines)
│   ├── comment-thread.js (NEW - ~200 lines)
│   ├── slide-menu.js (NEW - ~50 lines)
│   └── stats-widget.js (NEW - ~50 lines)
├── services/
│   ├── api.service.js ✅ EXISTS
│   ├── data.service.js ✅ EXISTS
│   ├── error-log.service.js ✅ EXISTS
│   └── realtime.service.js (NEW - ~50 lines)
├── store/
│   └── [all stores] ✅ COMPLETE
└── utils/
    ├── logger.js ✅ EXISTS
    ├── validator.js ✅ EXISTS
    ├── formatting.js (NEW - ~60 lines)
    └── avatar.js (NEW - ~20 lines)
```

---

## 🧪 Testing Requirements

### Coverage Goals
- **Overall Target:** 70% test coverage
- **Per Component:** Minimum 60% coverage
- **Critical Paths:** 90% coverage (auth, post creation, voting)

### Test Distribution
- AuthPanel: 10+ tests
- PostCard: 15+ tests
- FeedManager: 12+ tests
- CommentThread: 18+ tests
- SlideMenu: 6+ tests
- StatsWidget: 5+ tests
- RealtimeService: 4+ tests
- Utils: 10+ tests

**Total New Tests:** 80+ tests

---

## 🎯 Success Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **app.js lines** | 942 | <200 | 🔄 |
| **Components** | 2 | 10 | 🔄 |
| **Test Coverage** | ~20% | 70% | 🔄 |
| **Tests** | 43 | 120+ | 🔄 |
| **Store Integration** | 0% | 100% | 🔄 |

---

## 🔄 Implementation Order

### Week 1 (Days 1-3): Foundation
1. Wire existing Composer to `uiStore`
2. Wire Toast to `uiStore`
3. Extract and test AuthPanel

**Deliverable:** Auth fully componentized and tested

### Week 2 (Days 4-6): Feed
4. Extract PostCard component
5. Extract FeedManager component
6. Wire both to stores

**Deliverable:** Feed fully componentized and tested

### Week 3 (Days 7-9): Comments & UI
7. Extract CommentThread component
8. Extract SlideMenu component
9. Create utility modules

**Deliverable:** All major features componentized

### Week 4 (Day 10): Polish
10. Extract remaining utils
11. Create StatsWidget and RealtimeService
12. Final testing and documentation

**Deliverable:** app.js reduced to <200 lines, 70% coverage achieved

---

## 💡 Component Design Principles

### 1. Store-Driven
- All components subscribe to stores
- No direct PocketBase calls from components
- Use helper functions from stores

### 2. Event-Driven
- Components emit events for actions
- Parent orchestrates component interactions
- Loose coupling between components

### 3. Testable
- Pure functions where possible
- Mock stores for testing
- Test user interactions

### 4. Maintainable
- Single responsibility
- Well-documented
- Clear APIs

---

## 🚀 Getting Started

### First Component: AuthPanel

**Why start here?**
- Self-contained functionality
- Clear store integration (`authStore`)
- Essential for app functionality
- Good size for first extraction (~150 lines)

**Steps:**
1. Create `components/auth-panel.js`
2. Extract auth form HTML to component
3. Wire to `authStore` for state
4. Move auth handlers from `app.js`
5. Emit events for auth state changes
6. Create `tests/unit/components/auth-panel.test.mjs`
7. Write 10+ tests
8. Update `app.js` to use new component

---

## 📝 Next Actions

1. ✅ Create extraction plan (this document)
2. Start with AuthPanel extraction
3. Create test file for AuthPanel
4. Wire to authStore
5. Verify no regressions
6. Move to next component

---

**Status:** Ready to begin extraction!
**First Target:** AuthPanel component
**Estimated Time:** 3-4 hours for first component (includes testing)

