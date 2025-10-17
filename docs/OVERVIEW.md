# Repository Overview

This repository curates community and official resources for the PocketBase backend.

## Key Files

- `README.md` — the main Awesome list organized by framework/language categories.
- `contributing.md` — contribution guidelines that mirror the upstream Awesome project, including entry formatting rules.
- `.github/workflows/lint.yml` — GitHub Actions workflow running awesome-lint checks.
- `cspell.json` — spelling dictionary configuration used by linting tooling.
- `docs/viewer.html` — an interactive walkthrough that renders the README, tests connectivity to pocketbase.io, and previews
  other project docs. The viewer now caches README markup and document snippets to `localStorage` for instant offline reloads,
  highlights live metrics (category/entry/domain counts plus last-updated timestamp), builds a live table of contents for README
  categories, auto-runs the connectivity probe when no history exists, respects reduced-motion preferences, supports arrow/home/end
  keyboard navigation across the walkthrough steps, surfaces live document preview status messages (including cached fallback
  detail) while guarding against race conditions when switching files quickly, sanitizes generated link/image attributes so the
  rendered README badges remain safe to embed, and exposes refresh/clear controls that rerun the probe while wiping cached state on demand.
- `docs/MVP.md` — specification for the demo hub’s minimum viable product, including target audience, scope, and next steps.

## Tooling

- awesome-lint is expected to be run before PRs.
- cspell provides spell checking for resource descriptions.

## Observations

- The project is documentation-focused, with no runtime code.
- Resources are grouped by technology categories such as React, Svelte, Vue, and hosting options.
- Entries follow the `[Title](URL) - description` pattern outlined in the guidelines.

## Local Tooling Troubleshooting

Running the documentation linters (`awesome-lint`, `markdownlint-cli2`, and `lychee`) requires downloading the corresponding npm
packages.
In this environment the default npm proxy is set to `http://proxy:8080`, which rejects outbound requests to the public registry
with `403 Forbidden` responses.
Attempts to bypass the proxy by clearing the related environment variables leave the commands hanging because direct connections
to `registry.npmjs.org` are also blocked.
As a result the tooling cannot be executed here without credentials for the configured proxy or an alternative offline cache.
