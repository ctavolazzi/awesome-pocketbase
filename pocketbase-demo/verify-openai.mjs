// verify-openai.mjs
import 'dotenv/config';
import OpenAI from 'openai';
import fs from 'fs/promises';

async function verifyOpenAI() {
  console.log('🔍 Verifying OpenAI configuration...\n');

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07';

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    console.error('   Please set OPENAI_API_KEY in your .env file');
    process.exit(1);
  }

  if (apiKey === 'sk-proj-your-api-key-here') {
    console.error('❌ OPENAI_API_KEY is still set to placeholder value');
    console.error('   Please update OPENAI_API_KEY in your .env file with your actual API key');
    process.exit(1);
  }

  console.log(`✅ API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`✅ Model: ${model}\n`);

  const client = new OpenAI({ apiKey });

  try {
    console.log('⏳ Testing OpenAI API connection...');
    const startTime = Date.now();

    const response = await client.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: 'Say "Hello from GPT-5-nano!"' }],
      max_completion_tokens: 20  // GPT-5-nano requires this parameter
    });

    const latency = Date.now() - startTime;
    const content = response.choices[0].message.content;
    const usage = response.usage;

    console.log(`✅ Response: "${content}"`);
    console.log(`⏱️  Latency: ${latency}ms`);
    console.log(`📊 Token Usage:`);
    console.log(`   - Prompt: ${usage.prompt_tokens}`);
    console.log(`   - Completion: ${usage.completion_tokens}`);
    console.log(`   - Total: ${usage.total_tokens}`);
    console.log(`\n✅ OpenAI verification successful!`);

    // Log to file
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        model,
        latency,
        usage,
        status: 'success'
      };
      await fs.appendFile(
        'logs/openai.log',
        JSON.stringify(logEntry) + '\n'
      );
      console.log(`📝 Logged to logs/openai.log`);
    } catch (logError) {
      console.warn(`⚠️  Could not write to log file: ${logError.message}`);
    }

  } catch (error) {
    console.error(`\n❌ OpenAI verification failed:`);
    console.error(`   Error: ${error.message}`);

    if (error.status === 401) {
      console.error(`   → Invalid API key. Check your OPENAI_API_KEY in .env`);
    } else if (error.status === 404) {
      console.error(`   → Model not found. Model "${model}" may not be available.`);
      console.error(`   → Try using "gpt-4o-mini" or "gpt-4" instead.`);
    } else if (error.code === 'ENOTFOUND') {
      console.error(`   → Network error. Check your internet connection.`);
    }

    process.exit(1);
  }
}

verifyOpenAI();
