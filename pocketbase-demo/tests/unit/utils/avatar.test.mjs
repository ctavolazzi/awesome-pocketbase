/**
 * Avatar Utilities Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getUserAvatar,
  getAvatarEmojis,
  getRandomAvatar,
  isValidAvatar
} from '../../../public/utils/avatar.js';

describe('Avatar Utilities', () => {
  describe('getUserAvatar', () => {
    it('returns default avatar for null/undefined', () => {
      assert.strictEqual(getUserAvatar(null), '👤');
      assert.strictEqual(getUserAvatar(undefined), '👤');
      assert.strictEqual(getUserAvatar(''), '👤');
    });

    it('returns consistent avatar for same userId', () => {
      const avatar1 = getUserAvatar('user-123');
      const avatar2 = getUserAvatar('user-123');
      assert.strictEqual(avatar1, avatar2);
    });

    it('returns different avatars for different userIds', () => {
      const avatar1 = getUserAvatar('user-1');
      const avatar2 = getUserAvatar('user-2');
      assert.notStrictEqual(avatar1, avatar2);
    });

    it('returns an emoji from the valid set', () => {
      const avatar = getUserAvatar('test-user');
      const validEmojis = getAvatarEmojis();
      assert.ok(validEmojis.includes(avatar));
    });

    it('handles long user IDs', () => {
      const longId = 'a'.repeat(1000);
      const avatar = getUserAvatar(longId);
      assert.ok(avatar);
      assert.notStrictEqual(avatar, '👤');
    });
  });

  describe('getAvatarEmojis', () => {
    it('returns an array of emojis', () => {
      const emojis = getAvatarEmojis();
      assert.ok(Array.isArray(emojis));
      assert.ok(emojis.length > 0);
    });

    it('returns a copy (not the original array)', () => {
      const emojis1 = getAvatarEmojis();
      const emojis2 = getAvatarEmojis();
      assert.notStrictEqual(emojis1, emojis2);
      assert.deepStrictEqual(emojis1, emojis2);
    });

    it('contains valid emojis', () => {
      const emojis = getAvatarEmojis();
      emojis.forEach(emoji => {
        assert.strictEqual(typeof emoji, 'string');
        assert.ok(emoji.length > 0);
      });
    });
  });

  describe('getRandomAvatar', () => {
    it('returns a valid emoji', () => {
      const avatar = getRandomAvatar();
      const validEmojis = getAvatarEmojis();
      assert.ok(validEmojis.includes(avatar));
    });

    it('returns different results (probabilistic)', () => {
      const avatars = new Set();
      for (let i = 0; i < 50; i++) {
        avatars.add(getRandomAvatar());
      }
      // With 12 emojis and 50 tries, we should get at least 2 different ones
      assert.ok(avatars.size > 1);
    });
  });

  describe('isValidAvatar', () => {
    it('returns true for valid avatars', () => {
      const emojis = getAvatarEmojis();
      emojis.forEach(emoji => {
        assert.strictEqual(isValidAvatar(emoji), true);
      });
    });

    it('returns false for invalid avatars', () => {
      assert.strictEqual(isValidAvatar('😀'), false);
      assert.strictEqual(isValidAvatar('invalid'), false);
      assert.strictEqual(isValidAvatar(''), false);
      assert.strictEqual(isValidAvatar(null), false);
    });

    it('returns false for default avatar', () => {
      assert.strictEqual(isValidAvatar('👤'), false);
    });
  });
});

