import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import AIService from '../../services/ai.service.js';

const isDryRun = process.env.AI_TEST_MODE === 'dry';
const skipLive = process.env.AI_TEST_MODE === 'dry' || process.env.AI_TEST_MODE === undefined;

describe('AI Smoke Tests', () => {
  test('Initialises OpenAI provider with defaults', () => {
    const service = new AIService({
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || 'sk-test-key-for-testing'
    });
    assert.equal(service.provider, 'openai');
    assert.ok(service.model.includes('gpt-5-nano'));
  });

  test('Supports Ollama provider configuration', () => {
    const service = new AIService({ provider: 'ollama', model: 'llama3.2:1b' });
    assert.equal(service.provider, 'ollama');
    assert.equal(service.model, 'llama3.2:1b');
  });

  test('Calculates OpenAI token cost', () => {
    const service = new AIService({
      provider: 'openai',
      apiKey: 'sk-test-key-for-testing'
    });
    const cost = service.calculateCost({
      prompt_tokens: 1000,
      completion_tokens: 1000,
      total_tokens: 2000,
    });
    assert.ok(cost > 0);
  });

  test('Dry-run generation returns mocked response', async (t) => {
    if (!isDryRun) {
      t.diagnostic('Skipping dry-run test (AI_TEST_MODE != dry)');
      return;
    }

    const service = new AIService({
      provider: 'openai',
      apiKey: 'sk-test-key-for-testing'
    });
    service.generateWithOpenAI = async () => ({
      content: 'Mocked dry run response',
      provider: 'openai',
      model: service.model,
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      cost: 0.0000075,
    });

    const result = await service.generatePost('TechGuru42', 'Test prompt');
    assert.equal(result.provider, 'openai');
    assert.equal(result.content, 'Mocked dry run response');
  });

  test('Live generation executes and returns content', async (t) => {
    if (skipLive) {
      t.diagnostic('Skipping live OpenAI call (AI_TEST_MODE != live)');
      return;
    }

    const service = new AIService({ provider: 'openai' });
    const result = await service.generatePost('TechGuru42', 'Say "Hello from GPT-5-nano!"', { allowFallback: false });
    assert.equal(result.provider, 'openai');
    assert.ok(result.content.includes('Hello'));
  });
});
