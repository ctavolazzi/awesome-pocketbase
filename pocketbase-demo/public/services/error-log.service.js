/**
 * Error Log Service
 * Manages persistent error logs in PocketBase with automatic cleanup
 *
 * Features:
 * - Store logs in database
 * - Automatic cleanup (max 100k entries)
 * - Manual export/dump
 * - Query and filter logs
 * - Batch operations
 */

class ErrorLogService {
  constructor() {
    this.pb = null;
    this.maxLogs = 100000;
    this.cleanupThreshold = 0.9; // Cleanup when 90% full
    this.isInitialized = false;
  }

  /**
   * Initialize service with PocketBase instance
   */
  init(pbInstance) {
    this.pb = pbInstance;
    this.isInitialized = true;

    // Check if cleanup needed on init
    this.checkAndCleanup().catch(err => {
      console.error('[ErrorLogService] Cleanup check failed:', err);
    });
  }

  /**
   * Create a log entry
   */
  async createLog(logEntry) {
    if (!this.isInitialized) {
      throw new Error('ErrorLogService not initialized');
    }

    try {
      const record = await this.pb.collection('error_logs').create({
        level: logEntry.level,
        message: logEntry.message,
        context: JSON.stringify(logEntry.context),
        stack: logEntry.stack,
        error_details: logEntry.error ? JSON.stringify(logEntry.error) : null,
        user_id: this.pb.authStore.model?.id || null,
        session_id: this.getSessionId(),
        timestamp: logEntry.timestamp,
      }, { requestKey: null });

      // Periodic cleanup check (1% chance per log)
      if (Math.random() < 0.01) {
        this.checkAndCleanup().catch(() => {});
      }

      return record;
    } catch (error) {
      // Don't throw - logging errors shouldn't break the app
      console.error('[ErrorLogService] Failed to create log:', error);
      return null;
    }
  }

  /**
   * Get logs with filters
   */
  async getLogs(page = 1, perPage = 50, filters = {}) {
    if (!this.isInitialized) {
      throw new Error('ErrorLogService not initialized');
    }

    try {
      const filterParts = [];

      if (filters.level) {
        filterParts.push(`level = "${filters.level}"`);
      }

      if (filters.startDate) {
        filterParts.push(`timestamp >= "${filters.startDate}"`);
      }

      if (filters.endDate) {
        filterParts.push(`timestamp <= "${filters.endDate}"`);
      }

      if (filters.userId) {
        filterParts.push(`user_id = "${filters.userId}"`);
      }

      if (filters.search) {
        filterParts.push(`message ~ "${filters.search}"`);
      }

      const filter = filterParts.length > 0 ? filterParts.join(' && ') : '';

      return await this.pb.collection('error_logs').getList(page, perPage, {
        filter,
        sort: '-timestamp',
      });
    } catch (error) {
      throw new Error(`Failed to get logs: ${error.message}`);
    }
  }

  /**
   * Get total log count
   */
  async getLogCount() {
    if (!this.isInitialized) {
      throw new Error('ErrorLogService not initialized');
    }

    try {
      const result = await this.pb.collection('error_logs').getList(1, 1);
      return result.totalItems;
    } catch (error) {
      console.error('[ErrorLogService] Failed to get log count:', error);
      return 0;
    }
  }

  /**
   * Check if cleanup is needed and perform it
   */
  async checkAndCleanup() {
    if (!this.isInitialized) return;

    try {
      const count = await this.getLogCount();
      const threshold = Math.floor(this.maxLogs * this.cleanupThreshold);

      if (count >= threshold) {
        console.log(`[ErrorLogService] Cleanup triggered: ${count} logs (threshold: ${threshold})`);
        await this.cleanup();
      }
    } catch (error) {
      console.error('[ErrorLogService] Cleanup check failed:', error);
    }
  }

  /**
   * Clean up old logs
   * Keeps the most recent logs, deletes oldest
   */
  async cleanup(keepCount = null) {
    if (!this.isInitialized) {
      throw new Error('ErrorLogService not initialized');
    }

    const logsToKeep = keepCount || Math.floor(this.maxLogs * 0.5); // Keep 50% by default

    try {
      const count = await this.getLogCount();
      const toDelete = count - logsToKeep;

      if (toDelete <= 0) {
        console.log('[ErrorLogService] No cleanup needed');
        return { deleted: 0, kept: count };
      }

      console.log(`[ErrorLogService] Cleaning up ${toDelete} old logs (keeping ${logsToKeep})`);

      // Get oldest logs
      const oldLogs = await this.pb.collection('error_logs').getList(1, toDelete, {
        sort: 'timestamp', // Oldest first
      });

      // Delete in batches to avoid timeouts
      const batchSize = 100;
      let deleted = 0;

      for (let i = 0; i < oldLogs.items.length; i += batchSize) {
        const batch = oldLogs.items.slice(i, i + batchSize);
        await Promise.all(
          batch.map(log =>
            this.pb.collection('error_logs').delete(log.id, { requestKey: null })
              .catch(err => console.error(`Failed to delete log ${log.id}:`, err))
          )
        );
        deleted += batch.length;
      }

      console.log(`[ErrorLogService] Cleanup complete: deleted ${deleted} logs`);
      return { deleted, kept: count - deleted };
    } catch (error) {
      throw new Error(`Failed to cleanup logs: ${error.message}`);
    }
  }

  /**
   * Export logs to JSON
   */
  async exportLogs(filters = {}) {
    if (!this.isInitialized) {
      throw new Error('ErrorLogService not initialized');
    }

    try {
      const allLogs = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const result = await this.getLogs(page, 500, filters);
        allLogs.push(...result.items);
        hasMore = page < result.totalPages;
        page++;
      }

      return allLogs.map(log => ({
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        context: JSON.parse(log.context || '{}'),
        error: log.error_details ? JSON.parse(log.error_details) : null,
        stack: log.stack,
        userId: log.user_id,
        sessionId: log.session_id,
      }));
    } catch (error) {
      throw new Error(`Failed to export logs: ${error.message}`);
    }
  }

  /**
   * Download logs as JSON file
   */
  async downloadLogs(filename = null, filters = {}) {
    const logs = await this.exportLogs(filters);
    const json = JSON.stringify(logs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `error-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Clear all logs (use with caution)
   */
  async clearAllLogs() {
    if (!this.isInitialized) {
      throw new Error('ErrorLogService not initialized');
    }

    const count = await this.getLogCount();
    const result = await this.cleanup(0);

    console.log(`[ErrorLogService] Cleared all ${count} logs`);
    return result;
  }

  /**
   * Get log statistics
   */
  async getStats() {
    if (!this.isInitialized) {
      throw new Error('ErrorLogService not initialized');
    }

    try {
      const [total, errors, warnings, fatals] = await Promise.all([
        this.getLogCount(),
        this.pb.collection('error_logs').getList(1, 1, { filter: 'level = "error"' })
          .then(r => r.totalItems),
        this.pb.collection('error_logs').getList(1, 1, { filter: 'level = "warn"' })
          .then(r => r.totalItems),
        this.pb.collection('error_logs').getList(1, 1, { filter: 'level = "fatal"' })
          .then(r => r.totalItems),
      ]);

      return {
        total,
        byLevel: {
          error: errors,
          warn: warnings,
          fatal: fatals,
          info: total - errors - warnings - fatals,
        },
        percentFull: (total / this.maxLogs) * 100,
        needsCleanup: total >= Math.floor(this.maxLogs * this.cleanupThreshold),
      };
    } catch (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }
  }

  /**
   * Get or create session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('error_log_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('error_log_session_id', sessionId);
    }
    return sessionId;
  }
}

// Export singleton instance
export const errorLogService = new ErrorLogService();

