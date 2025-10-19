/**
 * Avatar Utilities
 * Consistent avatar generation system
 */

// Standard avatar emoji set
const AVATAR_EMOJIS = [
  '💾', '🤖', '👾', '🌟', '💿',
  '📀', '🎮', '🕹️', '💻', '📱',
  '🖥️', '⌨️'
];

/**
 * Get a consistent emoji avatar for a user ID
 * Uses a simple hash to ensure the same ID always gets the same emoji
 * @param {string} userId - User ID
 * @returns {string} - Emoji avatar
 */
export function getUserAvatar(userId) {
  if (!userId) return '👤';

  // Simple hash function
  const hash = userId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  return AVATAR_EMOJIS[hash % AVATAR_EMOJIS.length];
}

/**
 * Get avatar emojis list
 * @returns {string[]} - Array of avatar emojis
 */
export function getAvatarEmojis() {
  return [...AVATAR_EMOJIS];
}

/**
 * Get a random avatar emoji
 * @returns {string} - Random emoji
 */
export function getRandomAvatar() {
  const index = Math.floor(Math.random() * AVATAR_EMOJIS.length);
  return AVATAR_EMOJIS[index];
}

/**
 * Check if a string is a valid avatar emoji
 * @param {string} emoji - Emoji to check
 * @returns {boolean} - True if valid
 */
export function isValidAvatar(emoji) {
  return AVATAR_EMOJIS.includes(emoji);
}

