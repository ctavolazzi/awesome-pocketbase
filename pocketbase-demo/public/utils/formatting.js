/**
 * Formatting Utilities
 * Shared formatting functions for the application
 */

/**
 * Strip HTML tags from content
 * @param {string} input - HTML string to strip
 * @returns {string} - Plain text content
 */
export function stripHtml(input) {
  if (!input) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = input;
  return tmp.textContent || tmp.innerText || '';
}

/**
 * Format timestamp as relative time (e.g., "2m ago", "5h ago")
 * @param {string} isoString - ISO 8601 timestamp
 * @returns {string} - Relative time string
 */
export function formatRelativeTime(isoString) {
  const date = new Date(isoString);
  const now = Date.now();
  const diff = Math.floor((now - date.getTime()) / 1000);

  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w`;
  return `${Math.floor(diff / 2592000)}mo`;
}

/**
 * Format a number with proper pluralization
 * @param {number} count - Number to format
 * @param {string} singular - Singular form
 * @param {string} plural - Plural form (optional, defaults to singular + 's')
 * @returns {string} - Formatted string
 */
export function pluralize(count, singular, plural = null) {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural || singular + 's'}`;
}

/**
 * Truncate text to a maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add if truncated (default: '...')
 * @returns {string} - Truncated text
 */
export function truncate(text, maxLength, suffix = '...') {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Sanitize user input for display
 * @param {string} input - User input
 * @returns {string} - Sanitized text
 */
export function sanitizeInput(input) {
  if (!input) return '';
  return stripHtml(input).trim();
}

