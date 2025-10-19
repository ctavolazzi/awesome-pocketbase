/**
 * Formatting Utilities Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

// Setup DOM for stripHtml
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
global.document = dom.window.document;

import {
  stripHtml,
  formatRelativeTime,
  pluralize,
  truncate,
  sanitizeInput
} from '../../../public/utils/formatting.js';

describe('Formatting Utilities', () => {
  describe('stripHtml', () => {
    it('removes HTML tags', () => {
      const html = 'Hello <b>World</b><span>!</span>';
      const result = stripHtml(html);
      assert.strictEqual(result, 'Hello World!');
    });

    it('handles nested tags', () => {
      const html = '<div><p>Hello <span><b>World</b></span></p></div>';
      const result = stripHtml(html);
      assert.strictEqual(result, 'Hello World');
    });

    it('returns empty string for null/undefined', () => {
      assert.strictEqual(stripHtml(null), '');
      assert.strictEqual(stripHtml(undefined), '');
      assert.strictEqual(stripHtml(''), '');
    });

    it('preserves text content', () => {
      const html = 'Plain text';
      const result = stripHtml(html);
      assert.strictEqual(result, 'Plain text');
    });
  });

  describe('formatRelativeTime', () => {
    it('formats seconds', () => {
      const now = new Date();
      const thirtySecsAgo = new Date(now.getTime() - 30000).toISOString();
      const result = formatRelativeTime(thirtySecsAgo);
      assert.ok(result.endsWith('s'), `Expected seconds, got: ${result}`);
    });

    it('formats minutes', () => {
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 120000).toISOString();
      const result = formatRelativeTime(twoMinutesAgo);
      assert.ok(result.endsWith('m'), `Expected minutes, got: ${result}`);
    });

    it('formats hours', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 10800000).toISOString();
      const result = formatRelativeTime(threeHoursAgo);
      assert.ok(result.endsWith('h'), `Expected hours, got: ${result}`);
    });

    it('formats days', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 172800000).toISOString();
      const result = formatRelativeTime(twoDaysAgo);
      assert.ok(result.endsWith('d'), `Expected days, got: ${result}`);
    });

    it('formats weeks', () => {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 1209600000).toISOString();
      const result = formatRelativeTime(twoWeeksAgo);
      assert.ok(result.endsWith('w'), `Expected weeks, got: ${result}`);
    });

    it('formats months', () => {
      const now = new Date();
      const twoMonthsAgo = new Date(now.getTime() - 5184000000).toISOString();
      const result = formatRelativeTime(twoMonthsAgo);
      assert.ok(result.endsWith('mo'), `Expected months, got: ${result}`);
    });
  });

  describe('pluralize', () => {
    it('uses singular for count of 1', () => {
      assert.strictEqual(pluralize(1, 'post'), '1 post');
      assert.strictEqual(pluralize(1, 'comment'), '1 comment');
    });

    it('uses plural for count of 0', () => {
      assert.strictEqual(pluralize(0, 'post'), '0 posts');
    });

    it('uses plural for count > 1', () => {
      assert.strictEqual(pluralize(5, 'post'), '5 posts');
      assert.strictEqual(pluralize(100, 'comment'), '100 comments');
    });

    it('accepts custom plural form', () => {
      assert.strictEqual(pluralize(2, 'person', 'people'), '2 people');
      assert.strictEqual(pluralize(3, 'child', 'children'), '3 children');
    });
  });

  describe('truncate', () => {
    it('truncates long text', () => {
      const text = 'This is a very long text that needs truncation';
      const result = truncate(text, 20);
      assert.strictEqual(result.length, 20);
      assert.ok(result.endsWith('...'));
    });

    it('does not truncate short text', () => {
      const text = 'Short text';
      const result = truncate(text, 20);
      assert.strictEqual(result, text);
    });

    it('accepts custom suffix', () => {
      const text = 'This is a long text';
      const result = truncate(text, 10, '…');
      assert.ok(result.endsWith('…'));
    });

    it('handles null/undefined', () => {
      assert.strictEqual(truncate(null, 10), null);
      assert.strictEqual(truncate(undefined, 10), undefined);
    });

    it('respects exact max length', () => {
      const text = 'This is a very long text';
      const result = truncate(text, 15);
      assert.strictEqual(result.length, 15);
    });
  });

  describe('sanitizeInput', () => {
    it('strips HTML and trims whitespace', () => {
      const input = '  <b>Hello</b> World  ';
      const result = sanitizeInput(input);
      assert.strictEqual(result, 'Hello World');
    });

    it('handles empty input', () => {
      assert.strictEqual(sanitizeInput(''), '');
      assert.strictEqual(sanitizeInput(null), '');
      assert.strictEqual(sanitizeInput(undefined), '');
    });

    it('removes dangerous scripts', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = sanitizeInput(input);
      assert.ok(!result.includes('script'));
    });
  });
});

