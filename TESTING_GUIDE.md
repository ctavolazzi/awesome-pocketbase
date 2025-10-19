# Testing Guide - 90s Social Media UI

## Overview
This guide provides systematic testing procedures for all new features implemented in the modern social media UI transformation.

## Prerequisites
- PocketBase server running: `./pocketbase serve`
- Web server running: `npx live-server --port=4173 --entry-file=public/index.html`
- Browser open to: `http://localhost:4173`

## Phase 1: Initial Setup Verification ✅

### 1.1 Check Application Load
- [ ] Page loads without errors
- [ ] Starfield animation is visible
- [ ] Construction banner displays at top
- [ ] Navbar is fixed at top
- [ ] Hit counter increments on load
- [ ] ✅ **PASSED**: Console shows no errors except previously resolved favicon

### 1.2 Verify 90s Aesthetic
- [ ] Comic Sans MS font visible in posts
- [ ] Courier New font visible in metadata
- [ ] Neon colors (cyan, magenta, yellow) present
- [ ] Beveled borders on cards
- [ ] Blinking animations on special elements
- [ ] Browser badges visible (800x600, 56K, MIDI)

## Phase 2: Authentication Testing

### 2.1 Sign In
1. Click hamburger menu (☰) in navbar
2. Verify menu slides in from left with overlay
3. Fill in demo credentials (pre-filled):
   - Email: `demo@pocketbase.dev`
   - Password: `PocketBaseDemo42`
4. Click "SIGN IN"
5. **Expected Results**:
   - [ ] Menu closes automatically
   - [ ] User avatar changes from 👤 to emoji (e.g., 💾)
   - [ ] Menu profile shows "Demo Presenter"
   - [ ] Composer becomes enabled (not grayed out)

### 2.2 Create New Account
1. Open menu again
2. Scroll to "or" section
3. Fill in registration form:
   - Email: `test@example.com`
   - Password: `TestPassword123`
   - Display name: `Test User`
4. Click "REGISTER"
5. **Expected Results**:
   - [ ] Account created successfully
   - [ ] Automatically signed in
   - [ ] Unique emoji avatar assigned
   - [ ] Avatar appears in navbar and menu

### 2.3 Sign Out
1. Open menu
2. Scroll to bottom
3. Click "SIGN OUT" button
4. **Expected Results**:
   - [ ] Avatar resets to 👤
   - [ ] Menu shows "Not signed in"
   - [ ] Composer becomes disabled
   - [ ] Menu closes

## Phase 3: Voting System Testing

### 3.1 Upvote Testing
1. Sign in as demo user
2. Find any post in the feed
3. Click the ⬆️ upvote button
4. **Expected Results**:
   - [ ] Button turns green with glow effect
   - [ ] Vote count increases by 1
   - [ ] Activity log shows "✅ Voted up on post"

### 3.2 Toggle Upvote
1. Click ⬆️ again on the same post
2. **Expected Results**:
   - [ ] Green glow disappears
   - [ ] Vote count decreases by 1
   - [ ] Button returns to normal state

### 3.3 Downvote Testing
1. Click ⬇️ downvote button
2. **Expected Results**:
   - [ ] Button turns red with glow effect
   - [ ] Vote count decreases by 1

### 3.4 Mutual Exclusivity
1. With downvote active (red), click ⬆️
2. **Expected Results**:
   - [ ] Downvote red glow disappears
   - [ ] Upvote turns green
   - [ ] Vote count reflects the change (+2 total: removing -1 and adding +1)

### 3.5 Auth-Gated
1. Sign out
2. Try clicking vote buttons
3. **Expected Results**:
   - [ ] Activity log shows "⚠️ Sign in to vote"
   - [ ] No vote is registered

## Phase 4: Comment System Testing

### 4.1 Expand Comments
1. Sign in
2. Click "💬 Comments" button on any post
3. **Expected Results**:
   - [ ] Comment section expands below post
   - [ ] Comment composer appears at bottom
   - [ ] Any existing comments are visible

### 4.2 Add Top-Level Comment
1. Type comment in textarea: "This is a test comment"
2. Click "POST COMMENT"
3. **Expected Results**:
   - [ ] Comment appears immediately
   - [ ] Your emoji avatar displays
   - [ ] Your display name shows
   - [ ] Timestamp shows "just now"
   - [ ] Reply button is visible
   - [ ] Vote buttons (⬆️⬇️) are visible

### 4.3 Reply to Comment (Level 1)
1. Click "Reply" on your comment
2. Inline reply form appears
3. Type: "This is a reply"
4. Click "POST REPLY"
5. **Expected Results**:
   - [ ] Reply appears indented 20px
   - [ ] Still has reply button
   - [ ] Can vote on reply

### 4.4 Reply to Reply (Level 2)
1. Click "Reply" on the level 1 reply
2. Type: "This is a nested reply"
3. Click "POST REPLY"
4. **Expected Results**:
   - [ ] Appears indented 40px
   - [ ] Still has reply button

### 4.5 Maximum Depth Test (Level 3)
1. Click "Reply" on level 2 reply
2. Type: "Maximum depth reply"
3. Click "POST REPLY"
4. **Expected Results**:
   - [ ] Appears indented 60px
   - [ ] **NO** reply button visible (max depth reached)

### 4.6 Comment Voting
1. Click ⬆️ on any comment
2. **Expected Results**:
   - [ ] Vote count increases
   - [ ] Activity log shows success

### 4.7 Delete Comment
1. Click "Delete" on your own comment
2. Confirm deletion
3. **Expected Results**:
   - [ ] Confirmation dialog appears
   - [ ] Comment is removed
   - [ ] Activity log shows "✅ Comment deleted"

### 4.8 Collapse Comments
1. Click "💬 Comments" again
2. **Expected Results**:
   - [ ] Comment section collapses
   - [ ] Button still shows comment count

## Phase 5: Menu System Testing

### 5.1 Open Menu
1. Click hamburger (☰)
2. **Expected Results**:
   - [ ] Menu slides in from left (smooth animation)
   - [ ] Semi-transparent overlay appears
   - [ ] Body scroll is locked
   - [ ] Menu width: 320px on desktop

### 5.2 Close Menu - Overlay
1. Click on dark overlay (outside menu)
2. **Expected Results**:
   - [ ] Menu slides out to left
   - [ ] Overlay fades away
   - [ ] Body scroll unlocked

### 5.3 Close Menu - X Button
1. Open menu
2. Click X button in menu header
3. **Expected Results**:
   - [ ] Same smooth close animation

### 5.4 Profile Display
1. Sign in
2. Open menu
3. **Expected Results**:
   - [ ] Large emoji avatar (64px)
   - [ ] Display name shows
   - [ ] Bio text shows (if available)

### 5.5 Stats Display
1. Check stats section in menu
2. **Expected Results**:
   - [ ] Total posts count
   - [ ] AI generated count
   - [ ] People online (shows 1+)

### 5.6 Activity Log
1. Scroll to activity log in menu
2. **Expected Results**:
   - [ ] Recent activities visible
   - [ ] Timestamped entries
   - [ ] Max 80 entries shown
   - [ ] Scrollable if many entries

## Phase 6: Post Creation Testing

### 6.1 Create Post
1. Sign in
2. Focus on composer textarea
3. Type: "This is a test post with voting and comments!"
4. Select categories (optional)
5. Click "PUBLISH"
6. **Expected Results**:
   - [ ] Character counter updates (0/420)
   - [ ] Post appears at top of feed
   - [ ] Your emoji avatar shows
   - [ ] Vote buttons are present
   - [ ] Comment button is present
   - [ ] Activity log shows "✨ Post published!"

### 6.2 Character Counter
1. Type in composer
2. **Expected Results**:
   - [ ] Counter updates in real-time
   - [ ] Turns red at 380+ characters
   - [ ] Bold text at 380+ characters

### 6.3 Delete Own Post
1. Find your post
2. Click "Delete" button
3. Confirm
4. **Expected Results**:
   - [ ] Confirmation dialog appears
   - [ ] Post slides out (animation)
   - [ ] Removed from feed
   - [ ] Activity log confirms deletion

## Phase 7: Responsive Design Testing

### 7.1 Tablet Size (768px)
1. Resize browser to 768px width
2. **Expected Results**:
   - [ ] Single column layout maintained
   - [ ] Menu width adjusts
   - [ ] Post cards remain readable
   - [ ] Buttons still accessible

### 7.2 Mobile Size (375px)
1. Resize to 375px width
2. **Expected Results**:
   - [ ] Menu becomes 280px wide
   - [ ] Navbar adjusts properly
   - [ ] Brand logo scales down
   - [ ] Post cards stack properly
   - [ ] Avatars scale appropriately
   - [ ] All buttons remain tappable

### 7.3 Mobile Actions
1. At 375px width
2. Test voting buttons
3. **Expected Results**:
   - [ ] Vote buttons stack vertically or wrap
   - [ ] All actions remain accessible
   - [ ] No horizontal scrolling

## Phase 8: Avatar System Testing

### 8.1 Consistency Check
1. Note your emoji avatar in navbar
2. Open menu - check avatar
3. Create a post - check avatar
4. Add a comment - check avatar
5. **Expected Results**:
   - [ ] Same emoji in all locations
   - [ ] Appropriate sizes (24px, 48px, 64px)
   - [ ] Gradient background with border

### 8.2 Different Users
1. Sign out and register new account
2. Check assigned avatar
3. **Expected Results**:
   - [ ] Different emoji than first account
   - [ ] Consistent for that user
   - [ ] One of the 12 preset emojis

## Phase 9: Infinite Scroll Testing

### 9.1 Load More Posts
1. Scroll to bottom of feed
2. **Expected Results**:
   - [ ] Loading indicator appears (⏳)
   - [ ] Next page loads automatically
   - [ ] 20 more posts appear
   - [ ] Smooth transition

### 9.2 End of Feed
1. Keep scrolling until no more posts
2. **Expected Results**:
   - [ ] "🎉 You've reached the beginning! 🎉" message
   - [ ] Loading indicator stops appearing
   - [ ] No more auto-loading

## Phase 10: Realtime Updates Testing

### 10.1 New Post Appears
1. Keep browser open
2. Open another terminal
3. Post something via another browser/account
4. **Expected Results**:
   - [ ] New post appears at top automatically
   - [ ] Activity log shows "✨ New post: [title]"
   - [ ] Highlight animation plays

### 10.2 AI Posts (Optional)
1. Run `npm run ollama` in terminal
2. Wait for AI to post
3. **Expected Results**:
   - [ ] AI post appears with glowing border
   - [ ] "🤖 AI BOT 🤖" badge visible
   - [ ] Activity log shows "🤖 AI Bot posted: [title]"

## Phase 11: Edge Cases & Error Handling

### 11.1 Empty States
1. Sign out
2. Try to post
3. **Expected Results**:
   - [ ] Composer is disabled (grayed out)
   - [ ] Clicking doesn't do anything

### 11.2 Network Errors
1. Stop PocketBase server
2. Try to vote or comment
3. **Expected Results**:
   - [ ] Error message in activity log
   - [ ] Helpful error text

### 11.3 Long Content
1. Type 420 characters in composer
2. Try to type more
3. **Expected Results**:
   - [ ] Cannot exceed 420 chars
   - [ ] Counter shows warning color

## Phase 12: Performance Testing

### 12.1 Starfield Animation
1. Open browser performance tools
2. Watch CPU usage
3. **Expected Results**:
   - [ ] Smooth 60fps animation
   - [ ] Reasonable CPU usage (<20%)

### 12.2 Memory Usage
1. Use multiple features for 5 minutes
2. Check memory in DevTools
3. **Expected Results**:
   - [ ] No memory leaks
   - [ ] Memory stabilizes

### 12.3 Network Efficiency
1. Open Network tab
2. Perform actions
3. **Expected Results**:
   - [ ] Realtime WebSocket connected
   - [ ] Efficient API calls
   - [ ] No unnecessary requests

## Success Criteria Summary

### Critical Features (Must Pass)
- ✅ Application loads without errors
- ✅ Voting system works with toggle
- ✅ Comments nest to 3 levels
- ✅ Menu animates smoothly
- ✅ Avatars display consistently
- ✅ Responsive design works on mobile
- ✅ Infinite scroll loads more posts
- ✅ 90s aesthetic fully preserved

### Nice to Have (Should Pass)
- Realtime updates work
- AI posts integrate correctly
- Performance is smooth
- All error states handled gracefully

## Reporting Issues

If you find any issues during testing:

1. **Console Errors**: Check browser console for errors
2. **Network Tab**: Check for failed requests
3. **Screenshots**: Take screenshots of visual issues
4. **Steps to Reproduce**: Document exact steps
5. **Expected vs Actual**: Note what should happen vs what does

## Test Results Template

```markdown
## Test Session: [Date/Time]
**Tester**: [Name]
**Browser**: [Chrome/Firefox/Safari] [Version]
**Screen Size**: [Desktop/Tablet/Mobile] [Resolution]

### Passed Tests
- [x] Feature 1
- [x] Feature 2

### Failed Tests
- [ ] Feature X - Issue description

### Notes
- Any observations or suggestions
```

## Next Steps After Testing

1. Fix any critical bugs found
2. Document any improvements needed
3. Update README with usage instructions
4. Consider additional features based on feedback
5. Prepare for production deployment

---

**Happy Testing!** 🚀

Remember: The 90s aesthetic is intentional - Comic Sans, neon colors, and beveled borders are features, not bugs! 😄

