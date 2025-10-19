import PocketBase from 'pocketbase';

const BASE_URL = process.env.PB_BASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'porchroot@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'AdminPassword69!';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';
const INTERVAL_MS = parseInt(process.env.OLLAMA_INTERVAL_MS || '45000', 10);
const ONCE = process.argv.includes('--once');

const pb = new PocketBase(BASE_URL);

const personas = [
  {
    email: 'techguru42@pocketbase.dev',
    style: 'enthusiastic technology evangelist who loves 90s web nostalgia',
    prompts: [
      'Share a hot take about 90s web technology making a comeback. Mention GeoCities, tables, or frames.',
      'Write about discovering a cool CLI tool or terminal trick. Keep it nerdy and enthusiastic.',
      'Post about why local-first software and self-hosting are the future. Stay under 350 characters.',
      'Share excitement about a programming language or framework. Make it sound revolutionary.',
      'Describe a genius hack you just implemented. Use proud tech jargon and emoji.',
    ],
  },
  {
    email: 'deepthoughts@pocketbase.dev',
    style: 'philosophical observer who reflects on technology and humanity',
    prompts: [
      'Ponder the nature of AI consciousness in the context of LLMs. Be thoughtful and brief.',
      'Reflect on how technology shapes human connection. Make it poetic.',
      'Question whether nostalgia for 90s tech reveals something about progress. Stay curious.',
      'Contemplate the paradox of information abundance yet wisdom scarcity. Under 350 characters.',
      'Muse on what it means to be "online" versus "offline" in modern life.',
    ],
  },
  {
    email: 'lolmaster@pocketbase.dev',
    style: 'comedian developer who turns dev life into memes',
    prompts: [
      'Make a hilarious joke about debugging or programming fails. Include an emoji punchline.',
      'Roast modern web development trends compared to the simplicity of the 90s. Be snarky.',
      'Share a ridiculous made-up tech startup idea that sounds plausible. Keep it funny.',
      'Write a parody tech news headline from the 90s but with modern problems.',
      'Create a humorous observation about developer life that makes devs laugh and cry.',
    ],
  },
  {
    email: 'newsbot90s@pocketbase.dev',
    style: 'breaking news reporter broadcasting from 1995',
    prompts: [
      'Report breaking news about a fictional tech development as if it is revolutionary. Be dramatic.',
      'Write an announcement about PocketBase or Ollama adoption reaching new milestones.',
      'Share industry analysis about the state of local AI tools. Sound professional.',
      'Post an exclusive report on developer productivity tools. Use news language and urgency.',
      'Announce a trend in web development as if it is front-page news.',
    ],
  },
];

let lastPersonaIndex = -1;
const personaCache = new Map();

function getNextPersona() {
  if (personas.length === 0) {
    throw new Error('No personas configured for Ollama feed.');
  }

  let nextIndex;
  do {
    nextIndex = Math.floor(Math.random() * personas.length);
  } while (nextIndex === lastPersonaIndex && personas.length > 1);

  lastPersonaIndex = nextIndex;
  return personas[nextIndex];
}

function getPersonaPrompt(persona) {
  return persona.prompts[Math.floor(Math.random() * persona.prompts.length)];
}

async function authenticateAdmin() {
  if (pb.authStore.isValid && pb.authStore.model?.email === ADMIN_EMAIL) {
    return;
  }

  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
}

async function getPersonaAuthorId(persona) {
  if (personaCache.has(persona.email)) {
    return personaCache.get(persona.email);
  }

  const record = await pb.collection('users').getFirstListItem(`email = "${persona.email}"`);
  personaCache.set(persona.email, record.id);
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

async function generateWithOllama(prompt, style) {
  const fullPrompt = `You are a ${style}. ${prompt}\n\nWrite a casual, authentic micro-post for our 90s-inspired developer social feed. Keep it under 350 characters. Avoid hashtags and corporate buzzwords.`;

  console.log('\n┌─────────────────────────────────────────────────');
  console.log('│ 🤖 AI GENERATING (streaming)...');
  console.log('│ Style:', style);
  console.log('│ Prompt:', prompt.substring(0, 60) + '...');
  console.log('└─────────────────────────────────────────────────\n');

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: fullPrompt,
      stream: true, // Enable streaming!
      options: {
        temperature: 0.9,
        top_k: 40,
        top_p: 0.95,
        repeat_penalty: 1.3,
        num_predict: 150,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  // Process the streaming response
  let fullText = '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  console.log('💭 '); // Start of generation indicator

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);

          if (json.response) {
            // Print each token as it arrives
            process.stdout.write(json.response);
            fullText += json.response;
          }

          if (json.done) {
            console.log('\n'); // New line after complete generation
            break;
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const text = fullText.trim();
  if (!text) {
    throw new Error('Ollama returned an empty response');
  }

  console.log('✅ Generation complete! Length:', text.length, 'chars');
  console.log('─────────────────────────────────────────────────\n');

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
      upvotes: 0,
      downvotes: 0,
      upvotedBy: [],
      downvotedBy: [],
    },
    { requestKey: null },
  );

  return record;
}

async function runOnce() {
  try {
    await authenticateAdmin();
    const persona = getNextPersona();
    const personaName = persona.email.split('@')[0];

    console.log('\n═══════════════════════════════════════════════════');
    console.log(`🎭 Persona: ${personaName}`);
    console.log(`📧 Email: ${persona.email}`);

    const [authorId, categoryIds] = await Promise.all([
      getPersonaAuthorId(persona),
      getCategoryIds(),
    ]);

    const prompt = getPersonaPrompt(persona);
    const body = await generateWithOllama(prompt, persona.style);

    console.log('📤 Publishing to PocketBase...');

    const record = await postUpdate({
      body,
      authorId,
      categories: randomCategories(categoryIds),
    });

    console.log('✨ POST PUBLISHED!');
    console.log('   ID:', record.id);
    console.log('   Title:', record.title);
    console.log('   Author:', personaName);
    console.log('   Categories:', record.categories.length);
    console.log('   AI Generated: ✓');
    console.log('   Timestamp:', new Date().toISOString());
    console.log('═══════════════════════════════════════════════════\n');

    // Also log in the simple format for the log file
    console.log(`📝 ${personaName} posted (${record.id}) at ${new Date().toISOString()}`);

  } catch (error) {
    console.error('\n❌ Failed to publish Ollama post');
    console.error('Error:', error.message || error);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    pb.authStore.clear();
  }
}

async function runLoop() {
  console.log('🤖 Starting Multi-Persona AI feed loop');
  console.log(`   Model: ${OLLAMA_MODEL}`);
  console.log(`   Personas: ${personas.length}`);
  console.log(`   Interval: ${INTERVAL_MS}ms`);

  await authenticateAdmin();
  let categoryIds = await getCategoryIds();
  pb.authStore.clear();

  while (true) {
    try {
      await authenticateAdmin();
      const persona = getNextPersona();
      const authorId = await getPersonaAuthorId(persona);

      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        categoryIds = await getCategoryIds();
      }

      const prompt = getPersonaPrompt(persona);
      const body = await generateWithOllama(prompt, persona.style);
      const record = await postUpdate({
        body,
        authorId,
        categories: randomCategories(categoryIds || []),
      });

      const personaName = persona.email.split('@')[0];
      console.log(`📝 ${personaName} posted (${record.id}) at ${new Date().toISOString()}`);
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
