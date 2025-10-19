/**
 * Action System Tests
 * Tests for ActionDispatcher, middleware pipeline, and action utilities
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ActionDispatcher, createAction, createAsyncAction, combineReducers } from '../../../public/store/action-system.js';
import { AUTH_LOGIN, POST_CREATE, UI_TOAST_SHOW } from '../../../public/store/action-types.js';

describe('ActionDispatcher', () => {
  let dispatcher;

  beforeEach(() => {
    dispatcher = new ActionDispatcher({
      enableLogging: false,
      enableValidation: true
    });
  });

  describe('Constructor & Configuration', () => {
    it('creates dispatcher with default options', () => {
      const d = new ActionDispatcher();
      assert.strictEqual(d.historyLimit, 100);
      assert.strictEqual(d.enableHistory, true);
      assert.strictEqual(d.enableValidation, true);
    });

    it('accepts custom options', () => {
      const d = new ActionDispatcher({
        historyLimit: 50,
        enableHistory: false,
        enableValidation: false,
        enableLogging: true
      });
      assert.strictEqual(d.historyLimit, 50);
      assert.strictEqual(d.enableHistory, false);
      assert.strictEqual(d.enableValidation, false);
      assert.strictEqual(d.enableLogging, true);
    });
  });

  describe('Middleware', () => {
    it('registers middleware', () => {
      const middleware = () => next => action => next(action);
      dispatcher.use(middleware);
      assert.strictEqual(dispatcher.middleware.length, 1);
    });

    it('throws error for invalid middleware', () => {
      assert.throws(() => {
        dispatcher.use('not a function');
      }, /Middleware must be a function/);
    });

    it('executes middleware in order', () => {
      const calls = [];

      const middleware1 = () => next => action => {
        calls.push('middleware1-before');
        const result = next(action);
        calls.push('middleware1-after');
        return result;
      };

      const middleware2 = () => next => action => {
        calls.push('middleware2-before');
        const result = next(action);
        calls.push('middleware2-after');
        return result;
      };

      dispatcher.use(middleware1);
      dispatcher.use(middleware2);

      // Need a reducer for dispatch to work
      dispatcher.registerReducer('test', (state = {}, action) => state);

      dispatcher.dispatch(createAction(AUTH_LOGIN));

      assert.deepStrictEqual(calls, [
        'middleware1-before',
        'middleware2-before',
        'middleware2-after',
        'middleware1-after'
      ]);
    });

    it('middleware can access dispatch and getState', () => {
      let capturedDispatch, capturedGetState;

      const middleware = ({ dispatch, getState }) => next => action => {
        capturedDispatch = dispatch;
        capturedGetState = getState;
        return next(action);
      };

      dispatcher.use(middleware);
      dispatcher.registerReducer('test', (state = {}, action) => state);
      dispatcher.dispatch(createAction(AUTH_LOGIN));

      assert.strictEqual(typeof capturedDispatch, 'function');
      assert.strictEqual(typeof capturedGetState, 'function');
    });
  });

  describe('Reducers', () => {
    it('registers reducers', () => {
      const reducer = (state = {}, action) => state;
      dispatcher.registerReducer('test', reducer);
      assert.ok(dispatcher.reducers.has('test'));
    });

    it('throws error for invalid reducer', () => {
      assert.throws(() => {
        dispatcher.registerReducer('test', 'not a function');
      }, /Reducer must be a function/);
    });

    it('applies reducer to update state', () => {
      const initialState = { count: 0 };
      const reducer = (state = initialState, action) => {
        if (action.type === 'INCREMENT') {
          return { ...state, count: state.count + 1 };
        }
        return state;
      };

      // Create a mock store
      let currentState = initialState;
      const mockStore = {
        getState: () => currentState,
        setState: (newState) => { currentState = newState; }
      };

      dispatcher.registerReducer('counter', reducer);
      dispatcher.registerStore('counter', mockStore);

      dispatcher.dispatch({ type: 'INCREMENT' });

      assert.strictEqual(currentState.count, 1);
    });
  });

  describe('Action Dispatch', () => {
    it('dispatches valid action', () => {
      dispatcher.registerReducer('test', (state = {}, action) => state);

      const action = createAction(AUTH_LOGIN, { email: 'test@example.com' });
      const result = dispatcher.dispatch(action);

      assert.strictEqual(result.type, AUTH_LOGIN);
      assert.strictEqual(result.payload.email, 'test@example.com');
    });

    it('validates action structure', () => {
      assert.throws(() => {
        dispatcher.dispatch(null);
      }, /Action must be an object/);

      assert.throws(() => {
        dispatcher.dispatch({});
      }, /Action must have a string type property/);
    });

    it('warns for unknown action types', () => {
      const warnings = [];
      const originalWarn = console.warn;
      console.warn = (msg) => warnings.push(msg);

      try {
        dispatcher.dispatch({ type: 'UNKNOWN_ACTION_TYPE' });
        assert.ok(warnings.some(w => w.includes('Unknown action type')));
      } finally {
        console.warn = originalWarn;
      }
    });
  });

  describe('Action History', () => {
    beforeEach(() => {
      dispatcher.registerReducer('test', (state = {}, action) => state);
    });

    it('records actions in history', () => {
      dispatcher.dispatch(createAction(AUTH_LOGIN));
      dispatcher.dispatch(createAction(POST_CREATE));

      const history = dispatcher.getHistory();
      assert.strictEqual(history.length, 2);
      assert.strictEqual(history[0].action.type, AUTH_LOGIN);
      assert.strictEqual(history[1].action.type, POST_CREATE);
    });

    it('limits history size', () => {
      const smallDispatcher = new ActionDispatcher({
        historyLimit: 5,
        enableLogging: false
      });
      smallDispatcher.registerReducer('test', (state = {}, action) => state);

      for (let i = 0; i < 10; i++) {
        smallDispatcher.dispatch(createAction(AUTH_LOGIN));
      }

      const history = smallDispatcher.getHistory();
      assert.strictEqual(history.length, 5);
    });

    it('filters history by type', () => {
      dispatcher.dispatch(createAction(AUTH_LOGIN));
      dispatcher.dispatch(createAction(POST_CREATE));
      dispatcher.dispatch(createAction(AUTH_LOGIN));

      const filtered = dispatcher.getHistory({ type: AUTH_LOGIN });
      assert.strictEqual(filtered.length, 2);
      assert.ok(filtered.every(h => h.action.type === AUTH_LOGIN));
    });

    it('filters history by group', () => {
      dispatcher.dispatch(createAction(AUTH_LOGIN));
      dispatcher.dispatch(createAction(POST_CREATE));
      dispatcher.dispatch(createAction(UI_TOAST_SHOW));

      const authActions = dispatcher.getHistory({ group: 'AUTH' });
      assert.strictEqual(authActions.length, 1);
      assert.strictEqual(authActions[0].action.type, AUTH_LOGIN);
    });

    it('filters history by timestamp', () => {
      const timestamp = Date.now();
      dispatcher.dispatch(createAction(AUTH_LOGIN));

      const filtered = dispatcher.getHistory({ since: timestamp });
      assert.ok(filtered.length > 0);
    });

    it('clears history', () => {
      dispatcher.dispatch(createAction(AUTH_LOGIN));
      dispatcher.clearHistory();
      assert.strictEqual(dispatcher.getHistory().length, 0);
    });
  });

  describe('Time-Travel Debugging', () => {
    beforeEach(() => {
      let count = 0;
      const reducer = (state = { count: 0 }, action) => {
        if (action.type === 'INCREMENT') {
          return { count: state.count + 1 };
        }
        return state;
      };

      const mockStore = {
        getState: () => ({ count }),
        setState: (newState) => { count = newState.count; },
        reset: () => { count = 0; }
      };

      dispatcher.registerReducer('counter', reducer);
      dispatcher.registerStore('counter', mockStore);
    });

    it('replays actions', () => {
      dispatcher.dispatch({ type: 'INCREMENT' });
      dispatcher.dispatch({ type: 'INCREMENT' });

      const state1 = dispatcher.getState();
      assert.strictEqual(state1.counter.count, 2);

      // Replay the same actions
      const actions = dispatcher.getHistory().map(h => h.action);
      dispatcher.clearHistory();
      dispatcher.replayActions(actions);

      const state2 = dispatcher.getState();
      assert.strictEqual(state2.counter.count, 4); // 2 + 2 replayed
    });

    it('rewinds to specific history index', () => {
      dispatcher.dispatch({ type: 'INCREMENT' });
      dispatcher.dispatch({ type: 'INCREMENT' });
      dispatcher.dispatch({ type: 'INCREMENT' });

      assert.strictEqual(dispatcher.getState().counter.count, 3);

      dispatcher.rewindTo(1);
      assert.strictEqual(dispatcher.getState().counter.count, 2);
    });

    it('moves forward in history', () => {
      dispatcher.dispatch({ type: 'INCREMENT' });
      dispatcher.dispatch({ type: 'INCREMENT' });

      dispatcher.rewindTo(0);
      assert.strictEqual(dispatcher.getState().counter.count, 1);

      dispatcher.forward();
      assert.strictEqual(dispatcher.getState().counter.count, 2);
    });

    it('moves backward in history', () => {
      dispatcher.dispatch({ type: 'INCREMENT' });
      dispatcher.dispatch({ type: 'INCREMENT' });

      assert.strictEqual(dispatcher.getState().counter.count, 2);

      dispatcher.backward();
      assert.strictEqual(dispatcher.getState().counter.count, 1);
    });
  });

  describe('State Export/Import', () => {
    it('exports current state and history', () => {
      dispatcher.registerReducer('test', (state = { value: 1 }, action) => state);
      const mockStore = {
        getState: () => ({ value: 1 }),
        setState: () => {},
        reset: () => {}
      };
      dispatcher.registerStore('test', mockStore);

      dispatcher.dispatch(createAction(AUTH_LOGIN));

      const exported = dispatcher.exportState();

      assert.ok(exported.state);
      assert.ok(exported.history);
      assert.ok(exported.timestamp);
      assert.strictEqual(typeof exported.currentIndex, 'number');
    });

    it('imports state and history', () => {
      const exported = {
        state: { test: { value: 1 } },
        history: [
          { action: createAction(AUTH_LOGIN), timestamp: Date.now(), state: {} }
        ],
        currentIndex: 0
      };

      dispatcher.registerReducer('test', (state = {}, action) => state);
      const mockStore = {
        getState: () => ({}),
        setState: () => {},
        reset: () => {}
      };
      dispatcher.registerStore('test', mockStore);

      // Clear history before import to ensure clean state
      dispatcher.clearHistory();
      dispatcher.importState(exported);

      // After import, actions are replayed and recorded in history
      assert.ok(dispatcher.getHistory().length >= 1);
    });
  });
});

describe('Action Utilities', () => {
  describe('createAction', () => {
    it('creates action with type and payload', () => {
      const action = createAction(AUTH_LOGIN, { email: 'test@example.com' });

      assert.strictEqual(action.type, AUTH_LOGIN);
      assert.strictEqual(action.payload.email, 'test@example.com');
      assert.ok(action.meta.timestamp);
    });

    it('creates action with custom meta', () => {
      const action = createAction(AUTH_LOGIN, {}, { userId: '123' });

      assert.strictEqual(action.meta.userId, '123');
      assert.ok(action.meta.timestamp);
    });
  });

  describe('createAsyncAction', () => {
    it('creates async action (thunk)', () => {
      const asyncFn = (dispatch, getState) => {
        return Promise.resolve('result');
      };

      const thunk = createAsyncAction(asyncFn);
      assert.strictEqual(typeof thunk, 'function');
    });
  });

  describe('combineReducers', () => {
    it('combines multiple reducers', () => {
      const counterReducer = (state = { count: 0 }, action) => {
        if (action.type === 'INCREMENT') {
          return { count: state.count + 1 };
        }
        return state;
      };

      const userReducer = (state = { name: '' }, action) => {
        if (action.type === 'SET_NAME') {
          return { name: action.payload };
        }
        return state;
      };

      const rootReducer = combineReducers({
        counter: counterReducer,
        user: userReducer
      });

      const state1 = rootReducer({}, { type: 'INCREMENT' });
      assert.strictEqual(state1.counter.count, 1);

      const state2 = rootReducer(state1, { type: 'SET_NAME', payload: 'John' });
      assert.strictEqual(state2.user.name, 'John');
      assert.strictEqual(state2.counter.count, 1);
    });
  });
});

