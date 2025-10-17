# Demo Hub MVP Specification

## Purpose
Deliver an immediately-usable demo hub that **shows** the value of the Awesome PocketBase list through interactive, offline-friendly experiences without depending on the npm tooling that is blocked in the current environment.

## Target Audience
- New PocketBase adopters evaluating ecosystem resources.
- Contributors who need a quick visual inspection of curated links before submitting PRs.
- Maintainers demonstrating the list during talks or workshops without guaranteed network access.

## Core Outcomes
1. Communicate the breadth and quality of curated resources.
2. Validate external availability (e.g., pocketbase.io) at a glance.
3. Provide maintainers with actionable insight into repository health.

## Minimum Viable Product Scope
### 1. Showcase the Awesome List
- Render the README content with category navigation.
- Highlight aggregate stats (total entries, unique domains, last updated timestamp).
- Support instant refresh so the view reflects local file edits.

### 2. Connectivity Probe
- Execute a fetch to the official pocketbase.io site and report reachability, latency, and status code.
- Persist a short local history of probe results for the current browser session.

### 3. Repository Insight Panels
- Surface snippets from `contributing.md` and other key docs to reinforce contributor guidelines.
- Display spelling/linting guidance even when the npm-based linters are offline.

## Technical Requirements
- Single HTML file (`docs/viewer.html`) with vanilla JavaScript so the demo remains self-contained and serverless.
- Use the Fetch API and AbortController to measure connectivity without third-party dependencies.
- Derive README metrics client-side by parsing Markdown headings and list items (no build step).
- Store probe history and derived metrics in `localStorage` to preserve context between refreshes.
- Expose a manual refresh button that reprocesses README content and reruns probes on demand.
- Keep styling fully inlined (CSS variables + utility classes) to avoid asset pipelines.

### Implementation Snapshot
- README metrics now include category, entry, domain counts, and a formatted `Last-Modified` timestamp surfaced from the fetch
  response, all persisted to `localStorage`.
- README markup is cached locally so the viewer can fall back to the last successful render if fresh fetches fail, keeping the
  demo usable offline.
- Inline Markdown rendering now decodes and re-escapes link/image attributes so README badges and external references remain
  safe to embed without introducing inline HTML risks.
- The Markdown renderer emits stable heading anchors so the viewer can build an in-page navigation list for every level-2
  category.
- Connectivity probes use `AbortController` with a 6-second timeout, auto-run on first load when no history exists, log the HTTP
  result/latency, and store the rolling history in `localStorage` for later review.
- Document previews now cache recent fetches to avoid redundant requests and continue working offline while still refreshing on demand.
- Repository document previews now display live status messages (including cached timestamps and refresh failures) and ignore stale fetches when switching files rapidly so the interface always reflects the active selection.
- The global refresh control reloads README content, rebuilds navigation/metrics, restores the default document preview, and
  immediately re-runs the connectivity probe.
- A dedicated “Clear saved data” control flushes cached README/doc previews and probe history, resets UI state, and immediately
  repopulates the walkthrough so presenters can start from a clean slate.
- Walkthrough tabs support arrow/home/end keyboard navigation so the experience is operable without a pointer, and the viewer
  respects reduced-motion preferences while exposing ARIA busy/status cues for assistive tech.

## Non-Goals for the MVP
- Browser routing, frameworks, or SPA infrastructure.
- Automated link validation (requires the blocked npm tooling).
- PocketBase server emulation—focus remains on showcasing resources, not running PocketBase itself.

## Expert Assessment & Next Steps
The current prototype already delivers the MVP mechanics but can be hardened to feel production-ready:
1. **Stabilize Markdown Parsing** – replace the custom regex parser with a small, vetted Markdown library vendored into the repo to avoid edge-case rendering bugs while keeping the tool offline-capable.
2. **Telemetry Persistence** – convert probe history storage from `localStorage` to an append-only JSON file that contributors can commit for auditing when demoing in version control contexts.
3. **Accessibility Pass** – finish focus management and add additional ARIA affordances beyond the new tab keyboard shortcuts to improve usability in workshops.
4. **Offline Resource Bundling** – ship a pre-generated JSON manifest of README metadata so the viewer loads instantly without re-parsing on every refresh.
5. **Documentation Sync** – add CI guidance explaining how to regenerate the manifest and how the viewer fits into the contribution checklist once npm access is restored.

By executing these steps sequentially, we keep the scope focused while moving the demo hub from "clever prototype" to a reliable showcase aligned with the MVP definition above.
