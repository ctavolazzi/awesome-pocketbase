// store/store.js - Lightweight observable state management
// No dependencies, pure vanilla JavaScript

export class Store {
  constructor(name, initialState = {}) {
    this.name = name;
    this.initialState = this._deepClone(initialState); // Preserve original initial state
    this.state = initialState;
    this.listeners = new Map(); // path -> Set of callbacks
    this.history = []; // State history for debugging
    this.maxHistory = 50;

    // Record initial state
    this._recordHistory('INIT', null, initialState);
  }

  /**
   * Get the current state or a value at a path
   * @param {string} path - Dot-notation path (e.g. 'user.name')
   * @returns {*} The value at the path, or entire state if no path
   */
  getState(path = null) {
    if (!path) return this.state;

    return this._getValueAtPath(this.state, path);
  }

  /**
   * Set a value at a path and notify listeners
   * @param {string} path - Dot-notation path
   * @param {*} value - New value
   * @returns {Store} this (for chaining)
   */
  setState(path, value) {
    const oldValue = this._getValueAtPath(this.state, path);

    // Set the value
    this._setValueAtPath(this.state, path, value);

    // Record in history
    this._recordHistory('SET', path, value, oldValue);

    // Notify listeners
    this._notifyListeners(path, value, oldValue);

    return this;
  }

  /**
   * Subscribe to changes at a path
   * @param {string} path - Path to watch
   * @param {Function} callback - Called with (newValue, oldValue, path)
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }

    this.listeners.get(path).add(callback);

    // Return unsubscribe function
    return () => {
      const pathListeners = this.listeners.get(path);
      if (pathListeners) {
        pathListeners.delete(callback);
        if (pathListeners.size === 0) {
          this.listeners.delete(path);
        }
      }
    };
  }

  /**
   * Update multiple paths at once (batched notifications)
   * @param {Object} updates - { path: value } pairs
   */
  batchUpdate(updates) {
    const changes = [];

    // Apply all changes
    for (const [path, value] of Object.entries(updates)) {
      const oldValue = this._getValueAtPath(this.state, path);
      this._setValueAtPath(this.state, path, value);
      changes.push({ path, value, oldValue });
    }

    // Record in history
    this._recordHistory('BATCH', null, updates);

    // Notify all affected listeners
    for (const { path, value, oldValue } of changes) {
      this._notifyListeners(path, value, oldValue);
    }

    return this;
  }

  /**
   * Reset store to initial state
   */
  reset() {
    const oldState = { ...this.state };
    this.state = this._deepClone(this.initialState);
    this._recordHistory('RESET', null, this.state, oldState);
    this._notifyAll();
    return this;
  }

  /**
   * Replace entire state (used by action system)
   * @param {Object} newState - New state object
   * @returns {Store} this (for chaining)
   */
  replaceState(newState) {
    const oldState = { ...this.state };
    this.state = newState;
    this._recordHistory('REPLACE', null, newState, oldState);
    this._notifyAll();
    return this;
  }

  /**
   * Get state change history
   * @param {number} limit - Max number of entries to return
   */
  getHistory(limit = 10) {
    return this.history.slice(-limit);
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
    return this;
  }

  // Private methods

  _getValueAtPath(obj, path) {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  _setValueAtPath(obj, path, value) {
    const parts = path.split('.');
    const lastPart = parts.pop();
    let current = obj;

    // Create nested objects if needed
    for (const part of parts) {
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }

    current[lastPart] = value;
  }

  _notifyListeners(path, newValue, oldValue) {
    // Notify exact path listeners
    const pathListeners = this.listeners.get(path);
    if (pathListeners) {
      pathListeners.forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.error(`Error in store listener for ${this.name}.${path}:`, error);
        }
      });
    }

    // Notify wildcard listeners (listening to parent paths)
    const pathParts = path.split('.');
    for (let i = 0; i < pathParts.length; i++) {
      const parentPath = pathParts.slice(0, i + 1).join('.');
      const parentListeners = this.listeners.get(parentPath + '.*');
      if (parentListeners) {
        parentListeners.forEach(callback => {
          try {
            callback(this._getValueAtPath(this.state, parentPath), oldValue, parentPath);
          } catch (error) {
            console.error(`Error in store wildcard listener for ${this.name}.${parentPath}.*:`, error);
          }
        });
      }
    }
  }

  _notifyAll() {
    // Notify all listeners
    for (const [path, listeners] of this.listeners.entries()) {
      const value = this._getValueAtPath(this.state, path);
      listeners.forEach(callback => {
        try {
          callback(value, undefined, path);
        } catch (error) {
          console.error(`Error in store listener for ${this.name}.${path}:`, error);
        }
      });
    }
  }

  _recordHistory(action, path, value, oldValue) {
    this.history.push({
      timestamp: Date.now(),
      action,
      path,
      value: this._cloneValue(value),
      oldValue: this._cloneValue(oldValue)
    });

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  _cloneValue(value) {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return '[Unserializable]';
    }
  }

  /**
   * Deep clone an object (for preserving initial state)
   * More robust than JSON.parse/stringify for special types
   * @private
   */
  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this._deepClone(item));
    if (obj instanceof Set) return new Set([...obj].map(item => this._deepClone(item)));
    if (obj instanceof Map) {
      const cloned = new Map();
      obj.forEach((value, key) => cloned.set(key, this._deepClone(value)));
      return cloned;
    }
    
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = this._deepClone(obj[key]);
    });
    return cloned;
  }
}

export default Store;
