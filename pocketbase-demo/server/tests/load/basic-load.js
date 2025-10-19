/**
 * K6 Load Test for Express API
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 *
 * Run tests:
 *   k6 run server/tests/load/basic-load.js
 *
 * Run with custom VUs and duration:
 *   k6 run --vus 50 --duration 30s server/tests/load/basic-load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users for 1 minute
    { duration: '30s', target: 50 },  // Spike to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.05'],   // Error rate should be below 5%
    errors: ['rate<0.05'],            // Custom error rate below 5%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3030';

// Test authentication token (replace with real token for authenticated tests)
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export function setup() {
  // Setup code - runs once before tests
  console.log('Starting load test against:', BASE_URL);

  // Health check
  const healthRes = http.get(`${BASE_URL}/healthz`);
  if (healthRes.status !== 200) {
    console.error('Health check failed!');
    throw new Error('API is not healthy');
  }

  console.log('API health check passed');
  return { authToken: AUTH_TOKEN };
}

export default function (data) {
  // Test 1: Health check endpoint
  {
    const res = http.get(`${BASE_URL}/healthz`);

    const success = check(res, {
      'health check status is 200': (r) => r.status === 200,
      'health check has server status': (r) => r.json('server') === 'ok',
      'health check response time < 200ms': (r) => r.timings.duration < 200,
    });

    if (!success) {
      errorRate.add(1);
    }
  }

  sleep(1);

  // Test 2: List posts
  {
    const res = http.get(`${BASE_URL}/api/posts?page=1&perPage=20`);

    const success = check(res, {
      'list posts status is 200': (r) => r.status === 200,
      'list posts has items array': (r) => Array.isArray(r.json('items')),
      'list posts response time < 500ms': (r) => r.timings.duration < 500,
    });

    if (!success) {
      errorRate.add(1);
    }
  }

  sleep(1);

  // Test 3: Create post (if authenticated)
  if (data.authToken) {
    const payload = JSON.stringify({
      title: `Load Test Post ${Date.now()}`,
      content: '<p>Generated during load test</p>',
      status: 'draft',
      categories: [],
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.authToken}`,
      },
    };

    const res = http.post(`${BASE_URL}/api/posts`, payload, params);

    const success = check(res, {
      'create post status is 201 or 401': (r) => r.status === 201 || r.status === 401,
      'create post response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    if (!success) {
      errorRate.add(1);
    }
  }

  sleep(2);
}

export function teardown(data) {
  // Teardown code - runs once after all tests
  console.log('Load test complete');
}

// Export a summary handler
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n';
  summary += `${indent}scenarios: (100.00%) 1 scenario, ${data.metrics.vus_max.values.max} max VUs\n`;
  summary += `${indent}iterations: ${data.metrics.iterations.values.count}\n`;
  summary += `${indent}http_reqs: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}http_req_duration: avg=${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  p(95)=${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}http_req_failed: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;

  return summary;
}

