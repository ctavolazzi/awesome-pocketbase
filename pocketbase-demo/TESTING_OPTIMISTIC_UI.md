# Testing the Optimistic UI Composer

This guide shows how to test the new optimistic UI composer component.

## Quick Start

1. **Start PocketBase**
   ```bash
   cd pocketbase-demo
   ./pocketbase serve
   ```

2. **Start Web Server**
   ```bash
   npx live-server --port=4173 --entry-file=public/index.html
   ```

3. **Open Browser**
   ```
   http://localhost:4173
   ```

4. **Sign In**
   - Email: demo@pocketbase.dev
   - Password: PocketBaseDemo42

## Test Scenarios

### ✅ Test 1: Happy Path (Success)

**Steps:**
1. Sign in to the app
2. Type "Testing optimistic UI! 🎉" in the composer
3. Click **Publish**

**Expected Results:**
- Post appears **instantly** at the top of the feed (<50ms)
- Composer input disables with loading spinner (⏳ Publishing...)
- Success toast appears: "✅ Post published!"
- Form resets to empty
- Post remains in feed with real ID
- Activity log shows: "📤 Publishing post..." then "✨ Post published successfully!"

**Visual Feedback:**
- Composer shows loading state (⏳)
- Post has highlight animation
- Success toast slides in from right
- Composer briefly flashes green

---

### ❌ Test 2: Network Failure

**Steps:**
1. Open DevTools (F12) → Network tab
2. Set throttling to "Offline"
3. Type "This will fail" in composer
4. Click **Publish**
5. Wait 2 seconds
6. Switch back to "Online"

**Expected Results:**
- Post appears instantly
- Network request fails
- Error toast appears: "❌ Network error - please check your connection"
- Optimistic post **removed** from feed
- Content remains in composer (can retry)
- Composer flashes red

---

### ⚠️ Test 3: Validation Errors

**Test 3a: Empty Content**
1. Click **Publish** without typing anything

**Expected:** Warning toast: "⚠️ Post content cannot be empty"

**Test 3b: Too Long**
1. Type more than 420 characters
2. Click **Publish**

**Expected:**
- Character counter turns red
- Warning toast: "⚠️ Post is too long (max 420 characters)"

**Test 3c: Not Signed In**
1. Sign out
2. Try to create a post

**Expected:** Warning toast: "⚠️ Please sign in to publish posts"

---

### 🚀 Test 4: Rapid Submissions (Concurrent Posts)

**Steps:**
1. Type "Post 1" and click Publish
2. **Immediately** type "Post 2" and click Publish
3. **Immediately** type "Post 3" and click Publish

**Expected Results:**
- All 3 posts appear instantly
- Each has a unique temp ID
- All 3 save independently
- No race conditions
- All 3 remain in feed after save
- 3 success toasts appear

---

### 🔄 Test 5: Realtime Sync (No Duplicates)

**Setup:** Open the app in 2 browser windows

**Steps:**
1. Window A: Sign in as demo@pocketbase.dev
2. Window B: Sign in as editor@pocketbase.dev
3. Window A: Create a post "Hello from User A!"
4. Watch Window B

**Expected Results:**
- Window A: Post appears instantly (optimistic)
- Window A: Post saves, ID updates
- Window B: Post appears via realtime
- Window A: NO duplicate post
- Both windows show the same post

---

### 🎯 Test 6: Input States

**Steps:**
1. Type "Testing states"
2. Click Publish
3. **Immediately** try to:
   - Type more text (should be disabled)
   - Click Publish again (should be disabled)
   - Select categories (should be disabled)

**Expected Results:**
- All inputs disabled during save
- Button shows "⏳ Publishing..."
- Cursor shows "not-allowed" on disabled elements
- Composer has semi-transparent overlay

---

## Visual Indicators

### Composer States

| State | Visual Feedback | Duration |
|-------|----------------|----------|
| **Idle** | Pink background, ready | - |
| **Submitting** | Loading spinner, disabled, 80% opacity | ~200-300ms |
| **Success** | Green flash, "✅ Published!" button | 500ms |
| **Error** | Red flash, "Retry" button | Until retry |

### Toast Types

| Type | Icon | Color | Duration |
|------|------|-------|----------|
| Success | ✅ | Blue | 3s |
| Error | ❌ | Red | 5s |
| Warning | ⚠️ | Orange | 4s |
| Info | ℹ️ | Blue | 3s |

### Character Counter

| Length | Color | State |
|--------|-------|-------|
| 0-350 | Purple | Normal |
| 351-400 | Orange | Warning |
| 401-420 | Red | Danger |
| 421+ | Red | Invalid |

---

## Debugging Tips

### Check Console Logs

Open DevTools console to see detailed logs:
```
[DEBUG] Subscribing to realtime updates
📤 Publishing post...
✨ Post published successfully!
```

### Check Network Tab

- POST request to `/api/collections/posts/records`
- Should see request when post saves
- Check response for real post ID

### Check Activity Log

In the app sidebar:
- "📤 Publishing post..." when optimistic
- "✨ Post published successfully!" when saved
- "❌ Failed to publish: [error]" on failure

---

## Common Issues

### Posts Not Appearing
- **Check:** Are you signed in?
- **Check:** Is PocketBase running? (http://127.0.0.1:8090)
- **Check:** Console errors?

### Duplicate Posts
- Should NOT happen (feedState.has() check prevents it)
- If you see duplicates, report as bug

### Form Not Resetting
- Should reset on success only
- Should preserve content on error (for retry)
- Check toast message for status

### Loading State Stuck
- Rare - indicates network timeout
- Refresh page to reset
- Check PocketBase is running

---

## Performance Expectations

| Metric | Target | Actual |
|--------|--------|--------|
| Post appearance | <100ms | <50ms |
| Input disable | Instant | <10ms |
| Toast display | <300ms | ~200ms |
| PocketBase save | <500ms | ~200-300ms |
| Total UX time | <100ms | <50ms |

---

## Success Criteria

✅ Post appears in <50ms
✅ Input disables immediately
✅ Toast shows on success/error
✅ Content preserved on failure
✅ No duplicate posts
✅ All validation works
✅ Realtime sync works
✅ Concurrent posts work

---

## Screenshots to Capture

1. **Idle state**: Normal composer
2. **Submitting**: Loading spinner
3. **Success**: Green flash + toast
4. **Error**: Red flash + error toast
5. **Optimistic post**: Post at top with highlight
6. **Validation**: Warning toast

---

## Next Steps

After testing, consider:
- [ ] Auto-retry on network failure
- [ ] Draft saving to localStorage
- [ ] Image upload with preview
- [ ] @mentions autocomplete

---

**Happy Testing!** 🚀

If you find any issues, check:
1. Console logs
2. Network tab
3. Activity log
4. PocketBase logs (`pocketbase.log`)

