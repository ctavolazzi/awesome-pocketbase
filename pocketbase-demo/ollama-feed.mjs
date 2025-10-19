import PocketBase from 'pocketbase';
import AIService from './services/ai.service.js';

const BASE_URL = process.env.PB_BASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'porchroot@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'AdminPassword69!';
const INTERVAL_MS = parseInt(process.env.AI_INTERVAL_MS || process.env.OLLAMA_INTERVAL_MS || '45000', 10);
const ONCE = process.argv.includes('--once');
const PRIMARY_PROVIDER = process.env.AI_PROVIDER || 'openai';

const pb = new PocketBase(BASE_URL);
const aiService = new AIService({ provider: PRIMARY_PROVIDER });

const personas = [
  {
    id: 'TechGuru42',
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
    id: 'DeepThoughts',
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
    id: 'LOL_Master',
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
    id: 'NewsBot90s',
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
    throw new Error('No personas configured for AI feed.');
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
    return 'AI Generated Post';
  }

  const sentenceMatch = plain.match(/[^.!?]+[.!?]/);
  const sentence = sentenceMatch ? sentenceMatch[0] : plain;
  return sentence.length > 60 ? `${sentence.slice(0, 57)}…` : sentence;
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}

async function generateWithAI(persona) {
  const basePrompt = getPersonaPrompt(persona);
  const personaLabel = persona.id || persona.email.split('@')[0];
  const prompt = `You are a ${persona.style}. ${basePrompt}\n\nWrite a casual, authentic micro-post for our 90s-inspired developer social feed. Keep it under 350 characters. Avoid hashtags and corporate buzzwords.`;

  console.log('\n┌─────────────────────────────────────────────────');
  console.log('│ 🤖 AI GENERATING ...');
  console.log('│ Persona:', personaLabel);
  console.log('│ Provider:', aiService.provider);
  console.log('│ Prompt:', basePrompt.substring(0, 60) + '...');
  console.log('└─────────────────────────────────────────────────\n');

  const result = await aiService.generatePost(personaLabel, prompt, { allowFallback: true });
  const content = result?.content?.trim() ?? '';
  if (!content) {
    throw new Error('AI generation returned empty content');
  }

  console.log('✅ Generation complete!');
  console.log(`   Provider: ${result.provider}`);
  if (result.latency != null) {
    console.log(`   Latency: ${result.latency}ms`);
  }
  if (result.cost != null) {
    console.log(`   Cost: $${result.cost.toFixed(6)}`);
  }
  console.log('─────────────────────────────────────────────────\n');

  return { content, result };
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

async function createPost({ body, authorId, categories }) {
  const title = createTitleFromBody(body);
  const slugBase = slugify(title || `ai-post-${Date.now()}`);
  const slug = `${slugBase}-${Date.now().toString(36)}`;

  return pb.collection('posts').create(
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

    const { content, result } = await generateWithAI(persona);

    console.log('📤 Publishing to PocketBase...');
    const record = await createPost({
      body: content,
      authorId,
      categories: randomCategories(categoryIds),
    });

    console.log('✨ POST PUBLISHED!');
    console.log('   ID:', record.id);
    console.log('   Title:', record.title);
    console.log('   Provider:', result.provider);
    if (result.cost != null) {
      console.log('   Cost:', `$${result.cost.toFixed(6)}`);
    }
    console.log('   Timestamp:', new Date().toISOString());
    console.log('═══════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Failed to publish AI post');
    console.error('Error:', error.message || error);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    pb.authStore.clear();
  }
}

async function runLoop() {
  console.log('🤖 Starting AI feed loop');
  console.log(`   Primary provider: ${PRIMARY_PROVIDER}`);
  console.log(`   Personas: ${personas.length}`);
  console.log(`   Interval: ${INTERVAL_MS}ms`);

  let categoryIds = [];

  while (true) {
    try {
      await authenticateAdmin();
      const persona = getNextPersona();
      const authorId = await getPersonaAuthorId(persona);

      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        categoryIds = await getCategoryIds();
      }

      const { content, result } = await generateWithAI(persona);
      const record = await createPost({
        body: content,
        authorId,
        categories: randomCategories(categoryIds),
      });

      const personaName = persona.email.split('@')[0];
      console.log(`📝 ${personaName} posted (${record.id}) via ${result.provider}`);
    } catch (error) {
      console.error('\n❌ Loop iteration failed');
      console.error('Error:', error.message || error);
      if (error.stack) {
        console.error(error.stack);
      }
    } finally {
      pb.authStore.clear();
      await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
    }
  }
}

if (ONCE) {
  runOnce().then(() => process.exit(0));
} else {
  runLoop();
}
