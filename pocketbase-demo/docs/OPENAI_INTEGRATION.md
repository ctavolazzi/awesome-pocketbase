# OpenAI GPT-5-Nano Integration Guide

## Overview
This system uses OpenAI's GPT-5-Nano model as the primary AI provider for generating social media posts, with Ollama as a fallback option.

## Configuration

### Environment Variables
```bash
AI_PROVIDER=openai                      # Primary provider
OPENAI_API_KEY=sk-proj-...             # From OpenAI dashboard
OPENAI_MODEL=gpt-5-nano-2025-08-07    # Model identifier
OPENAI_MAX_TOKENS=500                  # Max completion length
OPENAI_TEMPERATURE=0.8                 # Creativity (0.0-2.0)
```

### Docker Setup
Environment variables are passed through docker-compose.yml and can be overridden via .env file.

**Security:** API key is also loaded from Docker secret: `./secrets/openai_key.txt`

## Health Checks

### Manual Verification
```bash
npm run verify:openai
```

Expected output:
```
✅ API Key: sk-proj-ab...
✅ Model: gpt-5-nano-2025-08-07
⏳ Testing OpenAI API connection...
✅ Response: "Hello from GPT-5-nano!"
⏱️  Latency: 245ms
📊 Token Usage:
   - Prompt: 12
   - Completion: 8
   - Total: 20
✅ OpenAI verification successful!
```

### Automated Checks
Health check runs on:
- Container startup
- Every 5 minutes (Docker healthcheck)
- Before each AI generation batch

## Logging

### Log Location
All OpenAI requests/responses logged to: `logs/openai.log`

### Log Format
```json
{
  "timestamp": "2025-10-20T08:30:15.123Z",
  "type": "response",
  "model": "gpt-5-nano-2025-08-07",
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 120,
    "total_tokens": 165
  },
  "latency": 487,
  "cost": 0.000025
}
```

### Viewing Logs
```bash
# Tail logs
tail -f logs/openai.log

# View today's stats
cat logs/openai.log | jq 'select(.timestamp | startswith("2025-10-20"))'

# Calculate daily cost
cat logs/openai.log | jq -s 'map(select(.type=="response")) | map(.cost) | add'
```

## Cost Tracking

### Pricing (as of Oct 2025)
- GPT-5-nano: $0.15 per 1M input tokens, $0.60 per 1M output tokens
- Average post: ~45 input tokens, ~120 output tokens
- Cost per post: ~$0.000079 (less than 1 cent per 100 posts)

### Daily Budget Example
100 posts/day = $0.0079/day = $0.24/month

## Fallback to Ollama

If OpenAI fails, system automatically falls back to Ollama:

```bash
# Switch to Ollama
AI_PROVIDER=ollama npm run ollama
```

Fallback triggers:
- OpenAI API down
- Rate limit exceeded
- Invalid API key
- Network timeout (>5s)

## Monitoring

### Prometheus Metrics
- `openai_requests_total` - Total requests
- `openai_request_duration_seconds` - Latency histogram
- `openai_tokens_used_total` - Token consumption
- `openai_cost_dollars_total` - Cumulative cost
- `openai_errors_total` - Error count

### Grafana Dashboard
Import dashboard template: `monitoring/openai-dashboard.json`

## Troubleshooting

### Common Issues

**"Invalid API key"**
- Check OPENAI_API_KEY in .env
- Verify key hasn't expired in OpenAI dashboard
- Ensure no extra whitespace in key

**"Model not found"**
- Verify model name: `gpt-5-nano-2025-08-07`
- Check if model is available in your OpenAI organization
- Try fallback: `gpt-4o-mini`

**"Rate limit exceeded"**
- Wait 60 seconds and retry
- Reduce AI_INTERVAL_MS (slower posting)
- Upgrade OpenAI tier

**High latency (>2s)**
- Check network connectivity
- Verify OpenAI service status
- Consider switching to Ollama for development

## Testing

### Unit Tests
```bash
npm run test:ai
```

### Integration Tests
```bash
npm run test:ai -- --provider=openai --mode=live
```

### Dry Run (No actual API calls)
```bash
npm run test:ai:dry
```

## Quick Start

1. **Get API Key**
   - Visit https://platform.openai.com/api-keys
   - Create new API key
   - Copy key (starts with `sk-proj-...`)

2. **Configure Environment**
   ```bash
   cd pocketbase-demo
   cp env.template .env
   # Edit .env and set OPENAI_API_KEY=your_key_here
   ```

3. **Verify Setup**
   ```bash
   npm run verify:openai
   ```

4. **Generate AI Post**
   ```bash
   npm run ollama -- --once
   ```

## Security Best Practices

1. **Never commit API keys** - Keep .env file out of git
2. **Use environment variables** - Don't hardcode keys
3. **Rotate keys regularly** - Every 90 days minimum
4. **Monitor usage** - Set up alerts for unusual activity
5. **Use secrets in Docker** - Store keys in `./secrets/openai_key.txt`

## Next Steps

See `docs/AI_CONTENT_PROVIDERS.md` for:
- Comparison with other providers (Ollama, Claude, etc.)
- Provider selection logic
- Cost optimization strategies
- Performance benchmarks
