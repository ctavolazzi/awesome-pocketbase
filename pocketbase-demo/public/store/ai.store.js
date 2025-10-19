// store/ai.store.js - AI generation state management
import { Store } from './store.js';

export const aiStore = new Store('ai', {
  isGenerating: false,
  currentPersona: null,
  lastGeneration: null,
  queue: [],  // Pending generation requests
  history: [],  // Recent generations (last 100)
  stats: {
    totalGenerated: 0,
    totalCost: 0,
    totalTokens: 0,
    averageLatency: 0,
    successRate: 0,
    lastUpdated: null
  },
  error: null,
  provider: {
    current: 'openai',
    fallbackUsed: false,
    lastSwitch: null
  }
});

// Store events for AI operations
export const AI_EVENTS = {
  POST_REQUEST: 'ai/post/request',
  POST_PROGRESS: 'ai/post/progress',
  POST_SUCCESS: 'ai/post/success',
  POST_ERROR: 'ai/post/error',
  PROVIDER_SWITCH: 'ai/provider/switch',
  STATS_UPDATE: 'ai/stats/update'
};

// Helper functions for common AI store operations

export function setGenerating(persona) {
  aiStore.batchUpdate({
    isGenerating: true,
    currentPersona: persona,
    error: null
  });
}

export function setGenerationComplete(result) {
  const { persona, content, post, provider, cost, latency, usage } = result;

  // Update stats
  const stats = aiStore.getState('stats');
  const oldTotal = stats.totalGenerated;
  const newTotal = oldTotal + 1;

  // Calculate new success rate: (old successes + 1) / new total
  const oldSuccesses = (stats.successRate / 100) * oldTotal;
  const newSuccessRate = ((oldSuccesses + 1) / newTotal) * 100;

  const newStats = {
    totalGenerated: newTotal,
    totalCost: stats.totalCost + (cost || 0),
    totalTokens: stats.totalTokens + (usage?.total_tokens || 0),
    averageLatency: ((stats.averageLatency * oldTotal) + latency) / newTotal,
    successRate: newSuccessRate,
    lastUpdated: Date.now()
  };

  // Add to history (keep last 100)
  const history = aiStore.getState('history');
  const newHistory = [
    {
      id: post?.id || Date.now(),
      persona,
      content,
      timestamp: Date.now(),
      provider,
      cost,
      latency,
      usage
    },
    ...history.slice(0, 99)
  ];

  aiStore.batchUpdate({
    isGenerating: false,
    currentPersona: null,
    lastGeneration: {
      persona,
      content,
      post,
      timestamp: Date.now()
    },
    history: newHistory,
    stats: newStats
  });
}

export function setGenerationError(error) {
  const stats = aiStore.getState('stats');
  // Error doesn't increment totalGenerated (only successes count)
  // But we still need to update success rate
  // If we have stats, recalculate based on one more attempt that failed
  let newSuccessRate = stats.successRate;

  if (stats.totalGenerated > 0) {
    // Current successes = all previous (all were successful so far)
    const currentSuccesses = stats.totalGenerated;
    const totalAttempts = currentSuccesses + 1; // +1 for this failure
    newSuccessRate = (currentSuccesses / totalAttempts) * 100;
  }

  const newStats = {
    ...stats,
    successRate: newSuccessRate,
    lastUpdated: Date.now()
  };

  aiStore.batchUpdate({
    isGenerating: false,
    currentPersona: null,
    error: error.message || String(error),
    stats: newStats
  });
}

export function setProviderSwitch(newProvider) {
  aiStore.batchUpdate({
    'provider.current': newProvider,
    'provider.fallbackUsed': newProvider !== 'openai',
    'provider.lastSwitch': Date.now()
  });
}

export function addToQueue(request) {
  const queue = aiStore.getState('queue');
  aiStore.setState('queue', [...queue, request]);
}

export function removeFromQueue(requestId) {
  const queue = aiStore.getState('queue');
  aiStore.setState('queue', queue.filter(r => r.id !== requestId));
}

export function getAIStats() {
  return aiStore.getState('stats');
}

export function getAIHistory(limit = 10) {
  return aiStore.getState('history').slice(0, limit);
}

export function resetAIStore() {
  aiStore.batchUpdate({
    isGenerating: false,
    currentPersona: null,
    lastGeneration: null,
    queue: [],
    history: [],
    stats: {
      totalGenerated: 0,
      totalCost: 0,
      totalTokens: 0,
      averageLatency: 0,
      successRate: 0,
      lastUpdated: null
    },
    error: null,
    provider: {
      current: 'openai',
      fallbackUsed: false,
      lastSwitch: null
    }
  });
}

export default aiStore;
