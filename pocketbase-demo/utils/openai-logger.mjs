// utils/openai-logger.mjs
import fs from 'fs/promises';
import path from 'path';

export class OpenAILogger {
  constructor(logPath = 'logs/openai.log') {
    this.logPath = logPath;
  }

  async log(event) {
    try {
      const entry = {
        timestamp: new Date().toISOString(),
        ...event
      };

      await fs.appendFile(this.logPath, JSON.stringify(entry) + '\n');
    } catch (error) {
      console.error('Failed to write to log:', error.message);
    }
  }

  async logRequest(model, prompt) {
    await this.log({
      type: 'request',
      model,
      promptLength: prompt.length
    });
  }

  async logResponse(model, usage, latency, cost) {
    await this.log({
      type: 'response',
      model,
      usage,
      latency,
      cost
    });
  }

  async logError(model, error) {
    await this.log({
      type: 'error',
      model,
      error: error.message,
      stack: error.stack
    });
  }
}

export default new OpenAILogger();
