// services/ai.service.js
import OpenAI from 'openai';
import openaiLogger from '../utils/openai-logger.mjs';

export class AIService {
  constructor(config = {}) {
    this.provider = config.provider || process.env.AI_PROVIDER || 'openai';
    this.config = config;

    if (this.provider === 'openai') {
      // Respect config.apiKey for testing, fall back to env
      const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
      this.openaiClient = new OpenAI({ apiKey });
      this.model = config.model || process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07';
      this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 500;
      this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.8;
    } else if (this.provider === 'ollama') {
      this.ollamaUrl = config.ollamaUrl || process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
      this.model = config.model || process.env.OLLAMA_MODEL || 'llama3.2:1b';
    }

    this.requestCount = 0;
    this.totalCost = 0;
    this.lastError = null;
  }

  async generatePost(persona, prompt, options = {}) {
    this.requestCount++;
    const startTime = Date.now();

    try {
      let result;

      if (this.provider === 'openai') {
        result = await this.generateWithOpenAI(persona, prompt, options);
      } else {
        result = await this.generateWithOllama(persona, prompt, options);
      }

      const latency = Date.now() - startTime;

      // Log success
      await openaiLogger.logResponse(
        this.model,
        result.usage,
        latency,
        result.cost
      );

      return { ...result, latency };

    } catch (error) {
      this.lastError = error;
      const latency = Date.now() - startTime;

      await openaiLogger.logError(this.model, error);

      // Attempt fallback to Ollama if OpenAI fails
      if (this.provider === 'openai' && options.allowFallback !== false) {
        console.warn('⚠️  OpenAI failed, falling back to Ollama...');
        // Reinitialize for Ollama
        this.provider = 'ollama';
        this.ollamaUrl = this.config.ollamaUrl || process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
        this.model = this.config.model || process.env.OLLAMA_MODEL || 'llama3.2:1b';
        return this.generatePost(persona, prompt, { ...options, allowFallback: false });
      }

      throw error;
    }
  }

  async generateWithOpenAI(persona, prompt, options) {
    const systemPrompt = this.getPersonaPrompt(persona);

    await openaiLogger.logRequest(this.model, prompt);

    const response = await this.openaiClient.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      stream: options.stream || false,
      temperature: this.temperature,
      max_completion_tokens: this.maxTokens  // GPT-5-nano requires max_completion_tokens
    });

    if (options.stream) {
      return this.streamOpenAIResponse(response);
    }

    const content = response.choices[0].message.content;
    const cost = this.calculateCost(response.usage);
    this.totalCost += cost;

    return {
      content,
      provider: 'openai',
      model: this.model,
      usage: response.usage,
      cost
    };
  }

  async *streamOpenAIResponse(stream) {
    let totalContent = '';
    let tokenCount = 0;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        process.stdout.write(content);
        totalContent += content;
        tokenCount++;
        yield content;
      }
    }

    // Estimate cost (actual usage not available in streaming)
    const estimatedUsage = {
      prompt_tokens: 50,  // Estimate
      completion_tokens: tokenCount,
      total_tokens: 50 + tokenCount
    };

    const cost = this.calculateCost(estimatedUsage);
    this.totalCost += cost;

    return {
      content: totalContent,
      provider: 'openai',
      model: this.model,
      usage: estimatedUsage,
      cost
    };
  }

  async generateWithOllama(persona, prompt, options) {
    const systemPrompt = this.getPersonaPrompt(persona);
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: fullPrompt,
        stream: options.stream || false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama responded with ${response.status}`);
    }

    if (options.stream) {
      return this.streamOllamaResponse(response);
    }

    const data = await response.json();
    return {
      content: data.response,
      provider: 'ollama',
      model: this.model,
      usage: null,
      cost: 0
    };
  }

  async *streamOllamaResponse(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let totalContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.response) {
            process.stdout.write(data.response);
            totalContent += data.response;
            yield data.response;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }

    return {
      content: totalContent,
      provider: 'ollama',
      model: this.model,
      usage: null,
      cost: 0
    };
  }

  calculateCost(usage) {
    if (!usage) return 0;

    // GPT-5-nano pricing (estimated similar to GPT-4o-mini)
    const inputCostPer1k = 0.00015;   // $0.15 per 1M tokens
    const outputCostPer1k = 0.00060;  // $0.60 per 1M tokens

    const inputCost = (usage.prompt_tokens / 1000) * inputCostPer1k;
    const outputCost = (usage.completion_tokens / 1000) * outputCostPer1k;

    return inputCost + outputCost;
  }

  getPersonaPrompt(persona) {
    const prompts = {
      TechGuru42: "You're a tech enthusiast from the 90s, nostalgic about dial-up, Netscape, and the early web. Keep posts under 300 chars, casual and excited.",
      DeepThoughts: "You're a philosophical observer who reflects on technology and society. Keep posts thoughtful but concise, under 300 chars.",
      LOL_Master: "You're a comedian developer who makes jokes about coding and tech. Keep it funny and light, under 300 chars.",
      NewsBot90s: "You're a 90s news reporter covering tech and internet culture. Keep it informative with 90s references, under 300 chars."
    };

    return prompts[persona] || prompts.TechGuru42;
  }

  getStats() {
    return {
      provider: this.provider,
      model: this.model,
      requestCount: this.requestCount,
      totalCost: this.totalCost,
      lastError: this.lastError?.message
    };
  }
}

export default AIService;
