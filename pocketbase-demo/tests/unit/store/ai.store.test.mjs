// tests/unit/store/ai.store.test.mjs
import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  aiStore,
  setGenerating,
  setGenerationComplete,
  setGenerationError,
  setProviderSwitch,
  addToQueue,
  removeFromQueue,
  getAIStats,
  getAIHistory,
  resetAIStore
} from '../../../public/store/ai.store.js';

describe('AI Store', () => {
  beforeEach(() => {
    resetAIStore();
  });

  describe('Initial State', () => {
    test('has correct initial state', () => {
      const state = aiStore.getState();
      assert.equal(state.isGenerating, false);
      assert.equal(state.currentPersona, null);
      assert.equal(state.lastGeneration, null);
      assert.deepEqual(state.queue, []);
      assert.deepEqual(state.history, []);
      assert.equal(state.stats.totalGenerated, 0);
      assert.equal(state.stats.totalCost, 0);
      assert.equal(state.provider.current, 'openai');
    });
  });

  describe('setGenerating', () => {
    test('sets generation state and persona', () => {
      setGenerating('TechGuru42');

      assert.equal(aiStore.getState('isGenerating'), true);
      assert.equal(aiStore.getState('currentPersona'), 'TechGuru42');
      assert.equal(aiStore.getState('error'), null);
    });
  });

  describe('setGenerationComplete', () => {
    test('updates state with generation result', () => {
      const result = {
        persona: 'TechGuru42',
        content: 'Test post content',
        post: { id: '123', content: 'Test post content' },
        provider: 'openai',
        cost: 0.00001,
        latency: 500,
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
      };

      setGenerationComplete(result);

      assert.equal(aiStore.getState('isGenerating'), false);
      assert.equal(aiStore.getState('currentPersona'), null);

      const lastGen = aiStore.getState('lastGeneration');
      assert.equal(lastGen.persona, 'TechGuru42');
      assert.equal(lastGen.content, 'Test post content');
    });

    test('updates statistics correctly', () => {
      const result = {
        persona: 'TechGuru42',
        content: 'Test',
        post: { id: '123' },
        provider: 'openai',
        cost: 0.00001,
        latency: 500,
        usage: { total_tokens: 30 }
      };

      setGenerationComplete(result);

      const stats = getAIStats();
      assert.equal(stats.totalGenerated, 1);
      assert.equal(stats.totalCost, 0.00001);
      assert.equal(stats.totalTokens, 30);
      assert.equal(stats.averageLatency, 500);
      assert.equal(stats.successRate, 100);
    });

    test('adds to history (last 100)', () => {
      for (let i = 0; i < 105; i++) {
        setGenerationComplete({
          persona: 'TechGuru42',
          content: `Post ${i}`,
          post: { id: `${i}` },
          provider: 'openai',
          cost: 0.00001,
          latency: 500,
          usage: { total_tokens: 30 }
        });
      }

      const history = getAIHistory(200);
      assert.equal(history.length, 100); // Only keeps last 100
    });
  });

  describe('setGenerationError', () => {
    test('sets error state', () => {
      const error = new Error('API failed');
      setGenerationError(error);

      assert.equal(aiStore.getState('isGenerating'), false);
      assert.equal(aiStore.getState('currentPersona'), null);
      assert.equal(aiStore.getState('error'), 'API failed');
    });

    test('updates success rate on error', () => {
      // Generate 2 successful
      setGenerationComplete({
        persona: 'TechGuru42',
        content: 'Test',
        post: { id: '1' },
        provider: 'openai',
        cost: 0,
        latency: 500,
        usage: { total_tokens: 30 }
      });
      setGenerationComplete({
        persona: 'TechGuru42',
        content: 'Test',
        post: { id: '2' },
        provider: 'openai',
        cost: 0,
        latency: 500,
        usage: { total_tokens: 30 }
      });

      // Then 1 error
      setGenerationError(new Error('Failed'));

      const stats = getAIStats();
      assert.equal(stats.successRate, 66.66666666666666); // 2/3
    });
  });

  describe('setProviderSwitch', () => {
    test('updates provider state', () => {
      setProviderSwitch('ollama');

      const provider = aiStore.getState('provider');
      assert.equal(provider.current, 'ollama');
      assert.equal(provider.fallbackUsed, true);
      assert.ok(provider.lastSwitch > 0);
    });
  });

  describe('Queue Management', () => {
    test('addToQueue adds request', () => {
      addToQueue({ id: 'req1', persona: 'TechGuru42' });
      addToQueue({ id: 'req2', persona: 'DeepThoughts' });

      const queue = aiStore.getState('queue');
      assert.equal(queue.length, 2);
      assert.equal(queue[0].id, 'req1');
    });

    test('removeFromQueue removes specific request', () => {
      addToQueue({ id: 'req1', persona: 'TechGuru42' });
      addToQueue({ id: 'req2', persona: 'DeepThoughts' });
      addToQueue({ id: 'req3', persona: 'LOL_Master' });

      removeFromQueue('req2');

      const queue = aiStore.getState('queue');
      assert.equal(queue.length, 2);
      assert.equal(queue[0].id, 'req1');
      assert.equal(queue[1].id, 'req3');
    });
  });

  describe('Helper Functions', () => {
    test('getAIStats returns current statistics', () => {
      const stats = getAIStats();
      assert.ok('totalGenerated' in stats);
      assert.ok('totalCost' in stats);
      assert.ok('totalTokens' in stats);
    });

    test('getAIHistory returns limited entries', () => {
      for (let i = 0; i < 20; i++) {
        setGenerationComplete({
          persona: 'TechGuru42',
          content: `Post ${i}`,
          post: { id: `${i}` },
          provider: 'openai',
          cost: 0,
          latency: 500,
          usage: { total_tokens: 30 }
        });
      }

      const history = getAIHistory(5);
      assert.equal(history.length, 5);
    });
  });

  describe('Store Subscriptions', () => {
    test('notifies on generation start', () => {
      let notified = false;
      aiStore.subscribe('isGenerating', (value) => {
        notified = value;
      });

      setGenerating('TechGuru42');
      assert.equal(notified, true);
    });

    test('notifies on generation complete', () => {
      let lastGen = null;
      aiStore.subscribe('lastGeneration', (value) => {
        lastGen = value;
      });

      setGenerationComplete({
        persona: 'TechGuru42',
        content: 'Test',
        post: { id: '123' },
        provider: 'openai',
        cost: 0,
        latency: 500,
        usage: { total_tokens: 30 }
      });

      assert.ok(lastGen !== null);
      assert.equal(lastGen.persona, 'TechGuru42');
    });
  });
});

