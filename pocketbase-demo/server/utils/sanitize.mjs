import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitization Utilities
 * Prevent XSS and ensure safe user input
 */

/**
 * Sanitize post data
 * @param {Object} data - Post data to sanitize
 * @returns {Object} Sanitized post data
 */
export function sanitizePost(data) {
  const sanitized = { ...data };

  // Title: no HTML allowed
  if (sanitized.title) {
    sanitized.title = DOMPurify.sanitize(sanitized.title, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  }

  // Content: allow limited safe HTML tags
  if (sanitized.content) {
    sanitized.content = DOMPurify.sanitize(sanitized.content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
      ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
      ALLOW_DATA_ATTR: false
    });

    // Ensure external links have safe attributes
    sanitized.content = sanitized.content.replace(
      /<a\s+href="https?:\/\//gi,
      '<a target="_blank" rel="noopener noreferrer" href="http'
    );
  }

  // Slug: alphanumeric and hyphens only
  if (sanitized.slug) {
    sanitized.slug = sanitized.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  return sanitized;
}

/**
 * Sanitize plain text (strip all HTML)
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}

/**
 * Sanitize HTML with custom config
 * @param {string} html - HTML to sanitize
 * @param {Object} config - DOMPurify configuration
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html, config = {}) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const defaultConfig = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false
  };

  return DOMPurify.sanitize(html, { ...defaultConfig, ...config });
}

export default {
  sanitizePost,
  sanitizeText,
  sanitizeHtml
};

