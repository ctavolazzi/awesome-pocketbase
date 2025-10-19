# Load Testing Guide

This document describes how to perform load testing on the Express API server using k6.

## Prerequisites

1. **Install k6**
   - macOS: `brew install k6`
   - Linux: See [k6 installation guide](https://k6.io/docs/getting-started/installation/)
   - Windows: `choco install k6`

2. **Ensure API is running**
   ```bash
   npm run server
   ```

3. **PocketBase must be running**
   ```bash
   npm run serve
   ```

## Load Test Scripts

### Basic Load Test

Tests normal usage patterns with gradual ramp-up.

```bash
k6 run server/tests/load/basic-load.js
```

**Test Profile:**
- 30s: Ramp up to 20 concurrent users
- 1m: Maintain 20 users
- 30s: Spike to 50 users
- 1m: Maintain 50 users
- 30s: Ramp down to 0

**Performance Thresholds:**
- 95th percentile response time < 500ms
- Error rate < 5%

### Stress Test

Tests API behavior under extreme load.

```bash
k6 run server/tests/load/stress-test.js
```

**Test Profile:**
- 1m: Ramp up to 50 users
- 2m: Ramp up to 100 users
- 2m: Ramp up to 200 users (stress level)
- 3m: Maintain 200 users
- 2m: Ramp down to 0

**Performance Thresholds:**
- 95th percentile response time < 2000ms
- Error rate < 10% (relaxed for stress testing)

## Custom Test Runs

### With Custom URL

```bash
k6 run --env API_URL=http://localhost:3030 server/tests/load/basic-load.js
```

### With Custom VUs and Duration

```bash
k6 run --vus 50 --duration 2m server/tests/load/basic-load.js
```

### With Authentication Token

```bash
k6 run --env AUTH_TOKEN=your-token-here server/tests/load/basic-load.js
```

### Output Results to File

```bash
k6 run --out json=results.json server/tests/load/basic-load.js
```

## Interpreting Results

### Key Metrics

1. **http_req_duration**
   - Average response time
   - p(95) = 95th percentile (95% of requests faster than this)
   - p(99) = 99th percentile

2. **http_req_failed**
   - Percentage of failed HTTP requests
   - Should be < 1% under normal load
   - May increase under stress testing

3. **http_reqs**
   - Total number of HTTP requests made
   - Requests per second (RPS)

4. **vus (Virtual Users)**
   - Number of concurrent simulated users
   - Max VUs reached during test

### Sample Output

```
scenarios: (100.00%) 1 scenario, 50 max VUs
iterations: 1234
http_reqs: 4936
http_req_duration: avg=245.32ms
  p(95)=432.12ms
http_req_failed: 0.02%
```

## Baseline Performance

Established on 2025-10-19 with:
- Hardware: MacBook Pro M1, 16GB RAM
- PocketBase: v0.26.2
- Node.js: v20.x
- Database: SQLite with ~1000 posts

### Results

| Metric | Basic Load | Stress Test |
|--------|-----------|-------------|
| Max VUs | 50 | 200 |
| Avg Response | ~250ms | ~800ms |
| p(95) Response | ~450ms | ~1600ms |
| Error Rate | <1% | <5% |
| Total Requests | ~5000 | ~25000 |

## Rate Limiting Behavior

The API has rate limiting configured:
- General API: 100 requests per 15 minutes per IP
- Post creation: 10 posts per minute per IP

When rate limits are hit:
- Status: 429 Too Many Requests
- Response: Error message with retry guidance

Load tests should expect 429 responses when exceeding limits.

## Best Practices

1. **Test Against Non-Production**
   - Never run load tests against production
   - Use staging or local environments

2. **Monitor System Resources**
   - Watch CPU, memory, and disk I/O during tests
   - Use tools like `htop` or Activity Monitor

3. **Gradual Ramp-Up**
   - Always ramp up load gradually
   - Sudden spikes can cause false failures

4. **Clean Up Test Data**
   - Load tests may create database records
   - Clean up after tests complete

5. **Realistic Scenarios**
   - Model actual user behavior
   - Include appropriate think time (sleep)

## Troubleshooting

### High Error Rates

If you see high error rates:
1. Check if PocketBase is running
2. Verify API server logs for errors
3. Check system resources (CPU, memory)
4. Reduce load and gradually increase

### Slow Response Times

If response times are high:
1. Check database size and indexes
2. Monitor PocketBase performance
3. Review server logs for bottlenecks
4. Consider query optimization

### Connection Errors

If you see connection errors:
1. Verify API_URL is correct
2. Check firewall settings
3. Ensure server is accepting connections
4. Check system file descriptor limits

## Advanced Testing

### Cloud Load Testing

For higher loads, consider:
- k6 Cloud (k6.io/cloud)
- AWS Load Testing
- Google Cloud Load Testing

### Distributed Testing

Run k6 on multiple machines:
```bash
# Machine 1
k6 run --out statsd server/tests/load/basic-load.js

# Machine 2
k6 run --out statsd server/tests/load/basic-load.js
```

### Custom Metrics

Add custom metrics in k6 scripts:
```javascript
import { Counter, Trend } from 'k6/metrics';

const customMetric = new Trend('custom_metric');
customMetric.add(value);
```

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Performance Testing Guide](https://k6.io/docs/testing-guides/api-load-testing/)

