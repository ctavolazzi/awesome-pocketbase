/**
 * Comments Reducer Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { commentsReducer, initialCommentsState } from '../../../public/store/reducers/comments.reducer.js';
import * as types from '../../../public/store/action-types.js';

function toPlainState(state) {
  return {
    ...state,
    expandedThreads: [...state.expandedThreads]
  };
}

describe('Comments Reducer', () => {
  describe('Initial State', () => {
    it('returns initial state when undefined', () => {
      const state = commentsReducer(undefined, { type: '@@INIT' });
      assert.strictEqual(state, initialCommentsState);
      assert.deepStrictEqual(toPlainState(state), toPlainState(initialCommentsState));
    });

    it('returns same state for unknown action', () => {
      const currentState = commentsReducer(undefined, { type: '@@INIT' });
      const result = commentsReducer(currentState, { type: 'UNKNOWN_ACTION' });
      assert.strictEqual(result, currentState);
    });
  });

  describe('Loading Comments', () => {
    it('sets loading state on COMMENT_LOAD', () => {
      const action = { type: types.COMMENT_LOAD, payload: { postId: 'post1' } };
      const state = commentsReducer(initialCommentsState, action);

      assert.strictEqual(state.loadingByPost.post1, true);
      assert.strictEqual(state.errorByPost.post1, null);
    });

    it('stores comments on COMMENT_LOAD_SUCCESS', () => {
      const comments = [
        { id: 'c1', content: 'First comment' },
        { id: 'c2', content: 'Second comment' }
      ];

      const action = {
        type: types.COMMENT_LOAD_SUCCESS,
        payload: { postId: 'post1', comments },
        meta: { timestamp: 1700000000000 }
      };

      const state = commentsReducer(initialCommentsState, action);

      assert.deepStrictEqual(state.commentsByPost.post1, comments);
      assert.strictEqual(state.loadingByPost.post1, false);
      assert.strictEqual(state.errorByPost.post1, null);
      assert.strictEqual(state.newCommentsCountByPost.post1, 0);
      assert.strictEqual(state.lastFetchedAtByPost.post1, 1700000000000);
    });

    it('handles COMMENT_LOAD_FAILURE', () => {
      const loadingState = commentsReducer(initialCommentsState, {
        type: types.COMMENT_LOAD,
        payload: { postId: 'post1' }
      });

      const action = {
        type: types.COMMENT_LOAD_FAILURE,
        payload: { postId: 'post1', error: 'Network error' }
      };

      const state = commentsReducer(loadingState, action);

      assert.strictEqual(state.loadingByPost.post1, false);
      assert.strictEqual(state.errorByPost.post1, 'Network error');
    });
  });

  describe('Comment Creation', () => {
    it('prepends new comment on COMMENT_CREATE', () => {
      const comment = { id: 'c1', content: 'Hello' };
      const state = commentsReducer(initialCommentsState, {
        type: types.COMMENT_CREATE,
        payload: { postId: 'post1', comment }
      });

      assert.strictEqual(state.commentsByPost.post1[0], comment);
      assert.strictEqual(state.errorByPost.post1, null);
      assert.strictEqual(state.commentsByPost.post1.length, 1);
    });

    it('does not duplicate existing comment', () => {
      const comment = { id: 'c1', content: 'Hello' };
      const existingState = commentsReducer(initialCommentsState, {
        type: types.COMMENT_CREATE,
        payload: { postId: 'post1', comment }
      });

      const state = commentsReducer(existingState, {
        type: types.COMMENT_CREATE,
        payload: { postId: 'post1', comment }
      });

      assert.strictEqual(state, existingState);
    });
  });

  describe('Comment Updates', () => {
    it('updates comment on COMMENT_UPDATE', () => {
      const baseState = commentsReducer(initialCommentsState, {
        type: types.COMMENT_CREATE,
        payload: { postId: 'post1', comment: { id: 'c1', content: 'Original', upvotes: 0 } }
      });

      const state = commentsReducer(baseState, {
        type: types.COMMENT_UPDATE,
        payload: { postId: 'post1', commentId: 'c1', updates: { content: 'Updated' } }
      });

      assert.strictEqual(state.commentsByPost.post1[0].content, 'Updated');
    });

    it('ignores COMMENT_UPDATE when comment missing', () => {
      const state = commentsReducer(initialCommentsState, {
        type: types.COMMENT_UPDATE,
        payload: { postId: 'post1', commentId: 'missing', updates: { content: 'Updated' } }
      });

      assert.strictEqual(state, initialCommentsState);
    });
  });

  describe('Comment Deletion', () => {
    it('removes comment on COMMENT_DELETE', () => {
      const baseState = commentsReducer(initialCommentsState, {
        type: types.COMMENT_CREATE,
        payload: { postId: 'post1', comment: { id: 'c1', content: 'Hello' } }
      });

      const state = commentsReducer(baseState, {
        type: types.COMMENT_DELETE,
        payload: { postId: 'post1', commentId: 'c1' }
      });

      assert.deepStrictEqual(state.commentsByPost.post1, []);
    });

    it('ignores COMMENT_DELETE when post has no comments', () => {
      const state = commentsReducer(initialCommentsState, {
        type: types.COMMENT_DELETE,
        payload: { postId: 'post1', commentId: 'c1' }
      });

      assert.strictEqual(state, initialCommentsState);
    });
  });

  describe('Voting', () => {
    it('updates vote counts on COMMENT_VOTE', () => {
      const baseState = commentsReducer(initialCommentsState, {
        type: types.COMMENT_CREATE,
        payload: { postId: 'post1', comment: { id: 'c1', upvotes: 0, downvotes: 0 } }
      });

      const state = commentsReducer(baseState, {
        type: types.COMMENT_VOTE,
        payload: {
          postId: 'post1',
          commentId: 'c1',
          upvotes: 3,
          downvotes: 1,
          userVote: 'up'
        }
      });

      const updated = state.commentsByPost.post1[0];
      assert.strictEqual(updated.upvotes, 3);
      assert.strictEqual(updated.downvotes, 1);
      assert.strictEqual(updated.userVote, 'up');
    });
  });

  describe('Thread Expansion & Replies', () => {
    it('toggles expandedThreads on COMMENT_TOGGLE', () => {
      const state1 = commentsReducer(initialCommentsState, {
        type: types.COMMENT_TOGGLE,
        payload: { commentId: 'c1' }
      });

      assert.ok(state1.expandedThreads.has('c1'));

      const state2 = commentsReducer(state1, {
        type: types.COMMENT_TOGGLE,
        payload: { commentId: 'c1' }
      });

      assert.ok(!state2.expandedThreads.has('c1'));
    });

    it('sets reply target on COMMENT_REPLY_SET', () => {
      const state = commentsReducer(initialCommentsState, {
        type: types.COMMENT_REPLY_SET,
        payload: { commentId: 'c1' }
      });

      assert.strictEqual(state.replyToCommentId, 'c1');
    });

    it('clears reply target on COMMENT_REPLY_CLEAR', () => {
      const stateWithReply = commentsReducer(initialCommentsState, {
        type: types.COMMENT_REPLY_SET,
        payload: { commentId: 'c1' }
      });

      const state = commentsReducer(stateWithReply, {
        type: types.COMMENT_REPLY_CLEAR
      });

      assert.strictEqual(state.replyToCommentId, null);
    });
  });

  describe('Realtime Updates', () => {
    it('prepends comment and increments counter on REALTIME_COMMENT_CREATED', () => {
      const comment = { id: 'c1', content: 'Realtime comment' };

      const state = commentsReducer(initialCommentsState, {
        type: types.REALTIME_COMMENT_CREATED,
        payload: { postId: 'post1', comment }
      });

      assert.strictEqual(state.commentsByPost.post1[0], comment);
      assert.strictEqual(state.newCommentsCountByPost.post1, 1);
    });

    it('does not increment counter for duplicate realtime comment', () => {
      const baseState = commentsReducer(initialCommentsState, {
        type: types.REALTIME_COMMENT_CREATED,
        payload: { postId: 'post1', comment: { id: 'c1', content: 'First' } }
      });

      const state = commentsReducer(baseState, {
        type: types.REALTIME_COMMENT_CREATED,
        payload: { postId: 'post1', comment: { id: 'c1', content: 'First' } }
      });

      assert.strictEqual(state, baseState);
    });

    it('updates comment on REALTIME_COMMENT_UPDATED', () => {
      const baseState = commentsReducer(initialCommentsState, {
        type: types.COMMENT_CREATE,
        payload: { postId: 'post1', comment: { id: 'c1', content: 'Old' } }
      });

      const state = commentsReducer(baseState, {
        type: types.REALTIME_COMMENT_UPDATED,
        payload: { postId: 'post1', comment: { id: 'c1', content: 'New' } }
      });

      assert.strictEqual(state.commentsByPost.post1[0].content, 'New');
    });

    it('removes comment on REALTIME_COMMENT_DELETED', () => {
      const baseState = commentsReducer(initialCommentsState, {
        type: types.COMMENT_CREATE,
        payload: { postId: 'post1', comment: { id: 'c1', content: 'Delete me' } }
      });

      const state = commentsReducer(baseState, {
        type: types.REALTIME_COMMENT_DELETED,
        payload: { postId: 'post1', commentId: 'c1' }
      });

      assert.deepStrictEqual(state.commentsByPost.post1, []);
    });
  });

  describe('Immutability', () => {
    it('does not mutate original arrays', () => {
      const baseState = commentsReducer(initialCommentsState, {
        type: types.COMMENT_CREATE,
        payload: { postId: 'post1', comment: { id: 'c1', content: 'Immutable' } }
      });

      const originalComments = baseState.commentsByPost.post1;
      const nextState = commentsReducer(baseState, {
        type: types.COMMENT_UPDATE,
        payload: { postId: 'post1', commentId: 'c1', updates: { content: 'Changed' } }
      });

      assert.notStrictEqual(nextState.commentsByPost.post1, originalComments);
    });

    it('returns original state reference when nothing changes', () => {
      const state = commentsReducer(initialCommentsState, {
        type: types.REALTIME_COMMENT_UPDATED,
        payload: { postId: 'missing', comment: { id: 'c1', content: 'Test' } }
      });

      assert.strictEqual(state, initialCommentsState);
    });
  });
});
