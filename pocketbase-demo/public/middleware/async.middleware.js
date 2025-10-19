/**
 * Async Middleware - Handles thunk actions (functions)
 * Allows dispatching async operations and action creators that return functions
 */

/**
 * Async middleware (thunk pattern)
 * If action is a function, call it with dispatch and getState
 * Otherwise, pass it through
 */
export const asyncMiddleware = ({ dispatch, getState }) => next => action => {
  // If action is a function, it's a thunk - call it
  if (typeof action === 'function') {
    return action(dispatch, getState);
  }

  // If action is a promise, handle it
  if (action && typeof action.then === 'function') {
    return action.then(dispatch);
  }

  // Otherwise, it's a normal action - pass through
  return next(action);
};

/**
 * Create an async action wrapper with loading/success/failure states
 */
export function createAsyncActionHandler(
  actionType,
  asyncFn,
  { onStart, onSuccess, onFailure } = {}
) {
  return async (dispatch, getState) => {
    // Dispatch loading action
    if (onStart) {
      dispatch(onStart());
    } else {
      dispatch({
        type: `${actionType}_START`,
        meta: { timestamp: Date.now() }
      });
    }

    try {
      // Execute async operation
      const result = await asyncFn(dispatch, getState);

      // Dispatch success action
      if (onSuccess) {
        dispatch(onSuccess(result));
      } else {
        dispatch({
          type: `${actionType}_SUCCESS`,
          payload: result,
          meta: { timestamp: Date.now() }
        });
      }

      return result;
    } catch (error) {
      // Dispatch failure action
      if (onFailure) {
        dispatch(onFailure(error));
      } else {
        dispatch({
          type: `${actionType}_FAILURE`,
          payload: { error: error.message },
          error: true,
          meta: { timestamp: Date.now() }
        });
      }

      throw error;
    }
  };
}

