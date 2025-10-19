# AI Content Providers Guide

## Overview
PocketBase Cyber Plaza can generate posts using multiple AI backends. This guide explains provider capabilities, configuration, and monitoring expectations.

## Supported Providers

### 1. OpenAI GPT-5-Nano (Primary)
- **Status:** Production
- **Model:** `gpt-5-nano-2025-08-07`
- **Average cost:** ~$0.000079 per post
- **Latency:** 200 – 500 ms (p95)
- **Configuration:** See `docs/OPENAI_INTEGRATION.md`

### 2. Ollama (Fallback / Development)
- **Status:** Development & fallback
- **Model:** `llama3.2:1b` (configurable)
- **Cost:** Free (local inference)
- **Latency:** 1 – 3 s (p95)
- **Setup:** Local Ollama server with model pulled in advance

### 3. Future Providers
The service abstraction supports additional providers (e.g., Anthropic Claude, Google Gemini, Azure OpenAI). Additions should extend `services/ai.service.js` with new setup methods and feature flags.

## Provider Selection Logic
1. Read `AI_PROVIDER` environment variable.
2. Run provider-specific health check (OpenAI verification & quota, Ollama HTTP ping).
3. Attempt generation with selected provider.
4. On failure, automatically fallback to the next configured provider (OpenAI → Ollama).
5. Log provider switch in `logs/openai.log`.

## Cost Comparison
| Provider | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) | Avg Post Cost |
|----------|---------------------------:|-----------------------------:|--------------:|
| GPT-5-nano | $0.15 | $0.60 | ~$0.000079 |
| Ollama | $0.00 | $0.00 | $0 |

## Monitoring & Metrics
All providers emit the following Prometheus metrics (added in Phase 4):
- `openai_requests_total{model,persona,status}`
- `openai_request_duration_seconds`
- `openai_tokens_used_total{model,type}`
- `openai_cost_dollars_total`
- `openai_errors_total`

Dashboards (Grafana) visualise:
- Request rate
- Token consumption
- Cost accumulation
- Latency percentiles
- Error & fallback rates

## Testing

### Smoke Tests
- `npm run test:ai:dry` – Offline validation with mocked responses.
- `npm run test:ai:live` – Live request (requires valid API key).

### Health Checks
- Manual: `npm run verify:openai`
- Automated: Docker healthcheck (Phase 0), nightly check (Phase 4+).

## Operational Guidelines
- **Budgeting:** Alert when daily cost exceeds 80 % of budget.
- **Fallback Policy:** If OpenAI latency > 2 s or failure rate > 2 %, switch to Ollama until resolved.
- **Logging:** Inspect `logs/openai.log` for audit trails; rotate weekly.
- **Security:** Store OpenAI keys in Docker secrets or deployment secrets manager.

## Next Steps
1. Finalise store integration and UI (Phases 1–2).
2. Implement retry/backoff middleware for rate limits (Phase 3).
3. Complete metrics wiring and CI smoke tests (Phase 4).
4. Schedule nightly health checks and publish Grafana dashboard templates (Phase 4+).
