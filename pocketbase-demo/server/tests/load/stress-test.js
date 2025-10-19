/**
 * K6 Stress Test for Express API
 * Tests API behavior under extreme load
 *
 * Run: k6 run server/tests/load/stress-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users (stress)
    { duration: '3m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // Relaxed threshold for stress test
    http_req_failed: ['rate<0.1'],     // Allow 10% error rate under stress
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3030';

export default function () {
  const res = http.get(`${BASE_URL}/api/posts?page=1&perPage=20`);

  const success = check(res, {
    'status is 200 or 429 or 503': (r) => [200, 429, 503].includes(r.status),
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  if (!success) {
    errorRate.add(1);
  }

  sleep(0.5); // Shorter sleep for stress test
}

