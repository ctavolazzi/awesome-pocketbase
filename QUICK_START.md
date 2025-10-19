# 🚀 Quick Start Guide

## Start in 3 Steps

### 1. Start PocketBase
```bash
cd pocketbase-demo
./pocketbase serve
```

### 2. Start Web Server
```bash
npx live-server --port=4173 --entry-file=public/index.html
```

### 3. Open Browser
```
http://localhost:4173
```

---

## First Time Setup

If this is your first time, run the setup:
```bash
cd pocketbase-demo
node setup.mjs
```

---

## Demo Login
- **Email**: demo@pocketbase.dev
- **Password**: PocketBaseDemo42

---

## Key Features

### 🎨 90s Aesthetic
- Comic Sans MS fonts
- Neon colors (cyan, magenta, yellow)
- Beveled borders
- Starfield background
- Construction banner

### 👍 Voting System
- Click ⬆️ to upvote
- Click ⬇️ to downvote
- Click again to toggle off

### 💬 Comments
- Click "💬 Comments" to expand
- Reply up to 3 levels deep
- Vote on comments
- Delete your own comments

### 👾 Emoji Avatars
- Unique emoji per user
- 12 variations
- Shows everywhere

### 📱 Mobile Friendly
- Works on phones & tablets
- Responsive design
- Touch-friendly

---

## Optional: AI Posts

Start the AI bot for automatic posts:
```bash
npm run ollama
```

Requires Ollama installed: https://ollama.ai

---

## Need Help?

- **Testing**: See `TESTING_GUIDE.md`
- **Technical**: See `IMPLEMENTATION_SUMMARY.md`
- **Deployment**: See `DEPLOYMENT_READY.md`

---

## Quick Troubleshoots

### Port Already in Use
```bash
# Kill process on port 4173
lsof -ti:4173 | xargs kill -9

# Or use different port
npx live-server --port=8080 --entry-file=public/index.html
```

### PocketBase Won't Start
```bash
# Check if already running
lsof -ti:8090 | xargs kill -9

# Restart
./pocketbase serve
```

### Can't Vote/Comment
- Make sure you're signed in
- Check console for errors
- Refresh the page

---

## Browser Console

Open DevTools (F12) to see:
- Activity log messages
- Realtime connection status
- Any errors

Expected output:
```
[DEBUG] Hit counter updated
[DEBUG] Subscribing to realtime updates
✅ Loaded X posts
🎉 Welcome to the PocketBase Cyber Plaza!
```

---

**Happy Hacking!** 🌟

