// tests/unit/store/store.test.mjs
import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../../../public/store/store.js';

describe('Store - Base Store System', () => {
  let store;

  beforeEach(() => {
    store = new Store('test', {
      user: { name: 'Alice', age: 30 },
      count: 0
    });
  });

  describe('Constructor & Initialization', () => {
    test('creates store with name and initial state', () => {
      assert.equal(store.name, 'test');
      assert.deepEqual(store.getState(), {
        user: { name: 'Alice', age: 30 },
        count: 0
      });
    });

    test('creates empty store if no initial state', () => {
      const emptyStore = new Store('empty');
      assert.deepEqual(emptyStore.getState(), {});
    });

    test('records initial state in history', () => {
      const history = store.getHistory(1);
      assert.equal(history.length, 1);
      assert.equal(history[0].action, 'INIT');
    });
  });

  describe('getState', () => {
    test('returns entire state when no path provided', () => {
      const state = store.getState();
      assert.deepEqual(state, {
        user: { name: 'Alice', age: 30 },
        count: 0
      });
    });

    test('returns value at path', () => {
      assert.equal(store.getState('user.name'), 'Alice');
      assert.equal(store.getState('count'), 0);
    });

    test('returns undefined for non-existent path', () => {
      assert.equal(store.getState('missing'), undefined);
      assert.equal(store.getState('user.missing'), undefined);
    });
  });

  describe('setState', () => {
    test('sets value at path', () => {
      store.setState('user.name', 'Bob');
      assert.equal(store.getState('user.name'), 'Bob');
    });

    test('creates nested objects if needed', () => {
      store.setState('new.nested.value', 42);
      assert.equal(store.getState('new.nested.value'), 42);
    });

    test('returns store for chaining', () => {
      const result = store.setState('count', 1);
      assert.equal(result, store);
    });

    test('records change in history', () => {
      store.setState('count', 5);
      const history = store.getHistory(1);
      assert.equal(history[0].action, 'SET');
      assert.equal(history[0].path, 'count');
      assert.equal(history[0].value, 5);
    });
  });

  describe('subscribe', () => {
    test('calls callback on state change', () => {
      let called = false;
      let newValue = null;

      store.subscribe('count', (value) => {
        called = true;
        newValue = value;
      });

      store.setState('count', 10);

      assert.equal(called, true);
      assert.equal(newValue, 10);
    });

    test('returns unsubscribe function', () => {
      let callCount = 0;

      const unsubscribe = store.subscribe('count', () => {
        callCount++;
      });

      store.setState('count', 1);
      assert.equal(callCount, 1);

      unsubscribe();
      store.setState('count', 2);
      assert.equal(callCount, 1); // Not called after unsubscribe
    });

    test('wildcard subscription on parent path', () => {
      let userChanged = false;

      store.subscribe('user.*', (user) => {
        userChanged = true;
      });

      store.setState('user.name', 'Charlie');
      assert.equal(userChanged, true);
    });

    test('handles multiple subscribers', () => {
      let count1 = 0, count2 = 0;

      store.subscribe('count', () => count1++);
      store.subscribe('count', () => count2++);

      store.setState('count', 1);

      assert.equal(count1, 1);
      assert.equal(count2, 1);
    });
  });

  describe('batchUpdate', () => {
    test('updates multiple paths at once', () => {
      store.batchUpdate({
        'user.name': 'David',
        'count': 100
      });

      assert.equal(store.getState('user.name'), 'David');
      assert.equal(store.getState('count'), 100);
    });

    test('only notifies listeners once per path', () => {
      let nameChangeCount = 0;

      store.subscribe('user.name', () => nameChangeCount++);

      store.batchUpdate({
        'user.name': 'Eve',
        'user.age': 25
      });

      assert.equal(nameChangeCount, 1);
    });

    test('records batch in history', () => {
      store.batchUpdate({
        'user.name': 'Frank',
        'count': 50
      });

      const history = store.getHistory(1);
      assert.equal(history[0].action, 'BATCH');
    });
  });

  describe('reset', () => {
    test('clears all state', () => {
      store.setState('count', 100);
      store.reset();
      assert.deepEqual(store.getState(), {});
    });

    test('notifies all listeners', () => {
      let notified = false;
      store.subscribe('count', () => notified = true);
      store.reset();
      assert.equal(notified, true);
    });
  });

  describe('history', () => {
    test('tracks state changes', () => {
      store.setState('count', 1);
      store.setState('count', 2);
      store.setState('count', 3);

      const history = store.getHistory(3);
      assert.equal(history.length, 3);
      // History is returned newest-last
      assert.equal(history[2].value, 3);
      assert.equal(history[1].value, 2);
      assert.equal(history[0].value, 1);
    });

    test('limits history size', () => {
      // Store has maxHistory of 50
      for (let i = 0; i < 60; i++) {
        store.setState('count', i);
      }

      const history = store.getHistory(100);
      assert.ok(history.length <= 51); // 50 + 1 INIT
    });

    test('clearHistory removes all entries', () => {
      store.setState('count', 1);
      store.clearHistory();
      assert.equal(store.getHistory().length, 0);
    });
  });

  describe('Error Handling', () => {
    test('handles errors in listeners gracefully', () => {
      store.subscribe('count', () => {
        throw new Error('Listener error');
      });

      // Should not throw
      assert.doesNotThrow(() => {
        store.setState('count', 1);
      });
    });

    test('continues notifying other listeners after error', () => {
      let called = false;

      store.subscribe('count', () => {
        throw new Error('First listener error');
      });

      store.subscribe('count', () => {
        called = true;
      });

      store.setState('count', 1);
      assert.equal(called, true);
    });
  });
});

