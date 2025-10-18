import PocketBase from 'pocketbase';

const BASE_URL = process.env.PB_BASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'porchroot@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'AdminPassword69!';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const INTERVAL_MS = parseInt(process.env.OLLAMA_INTERVAL_MS || '45000', 10);
const ONCE = process.argv.includes('--once');

const pb = new PocketBase(BASE_URL);

const prompts = [
  'Share a concise dev log update about building a PocketBase social feed. Keep it playful.',
  'Write a short microblog post about realtime data updates landing in a dashboard.',
  'Post a tip about using PocketBase with local AI tooling. Stay under 400 characters.',
  'Announce a freshly shipped feature that makes auth or CRUD easier for teammates.',
  'Describe a behind-the-scenes moment from pairing with an AI model on a project.',
];

function pickPrompt() {
  return prompts[Math.floor(Math.random() * prompts.length)];
}

async function authenticateAdmin() {
  if (pb.authStore.isValid && pb.authStore.model?.email === ADMIN_EMAIL) {
    return;
  }

  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
}

async function getOllamaUserId() {
  const record = await pb.collection('users').getFirstListItem('email = "ollama@pocketbase.dev"');
  return record.id;
}

function createTitleFromBody(body) {
  const plain = body.replace(/\s+/g, ' ').trim();
  if (!plain) {
    return 'Ollama Post';
  }

  const sentenceMatch = plain.match(/[^.!?]+[.!?]/);
  const sentence = sentenceMatch ? sentenceMatch[0] : plain;
  const clipped = sentence.length > 60 ? `${sentence.slice(0, 57)}…` : sentence;
  return clipped;
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}

async function generateWithOllama() {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: pickPrompt(),
      stream: false,
      options: {
        temperature: 0.8,
        top_k: 30,
        top_p: 0.9,
        repeat_penalty: 1.2,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const data = await response.json();
  const text = data.response?.trim();
  if (!text) {
    throw new Error('Ollama returned an empty response');
  }

  return text;
}

function randomCategories(categoryIds) {
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    return [];
  }

  const shuffled = [...categoryIds].sort(() => Math.random() - 0.5);
  const count = Math.min(2, Math.max(1, Math.floor(Math.random() * categoryIds.length)));
  return shuffled.slice(0, count);
}

async function getCategoryIds() {
  const list = await pb.collection('categories').getList(1, 50, { sort: 'label' });
  return list.items.map((item) => item.id);
}

async function postUpdate({ body, authorId, categories }) {
  const title = createTitleFromBody(body);
  const slugBase = slugify(title || `ollama-post-${Date.now()}`);
  const slug = `${slugBase}-${Date.now().toString(36)}`;

  const record = await pb.collection('posts').create(
    {
      title,
      slug,
      content: body,
      status: 'published',
      categories,
      author: authorId,
      featured: false,
      aiGenerated: true,
    },
    { requestKey: null },
  );

  return record;
}

async function runOnce() {
  try {
    await authenticateAdmin();
    const [authorId, categoryIds] = await Promise.all([
      getOllamaUserId(),
      getCategoryIds(),
    ]);

    const body = await generateWithOllama();
    const record = await postUpdate({
      body,
      authorId,
      categories: randomCategories(categoryIds),
    });

    console.log(`✨ Posted Ollama update (${record.id}): ${record.title}`);
  } catch (error) {
    console.error('❌ Failed to publish Ollama post');
    console.error(error.message || error);
  } finally {
    pb.authStore.clear();
  }
}

async function runLoop() {
  console.log('🤖 Starting Ollama social feed loop');
  console.log(`   Model: ${OLLAMA_MODEL}`);
  console.log(`   Interval: ${INTERVAL_MS}ms`);

  await authenticateAdmin();
  const [authorId, categoryIds] = await Promise.all([
    getOllamaUserId(),
    getCategoryIds(),
  ]);
  pb.authStore.clear();

  while (true) {
    try {
      await authenticateAdmin();
      const body = await generateWithOllama();
      const record = await postUpdate({
        body,
        authorId,
        categories: randomCategories(categoryIds),
      });
      console.log(`📝 New Ollama post (${record.id}) at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('⚠️  Ollama posting failed:', error.message || error);
    } finally {
      pb.authStore.clear();
    }

    const jitter = Math.floor(Math.random() * 15000);
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS + jitter));
  }
}

if (ONCE) {
  runOnce();
} else {
  runLoop();
}
