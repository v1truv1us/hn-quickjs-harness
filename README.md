# QuickJS Headless Browser Test Harness

A Node.js test harness that validates the thesis: **"Can QuickJS survive Hacker News?"**

## The Question

Can a minimal QuickJS embedding plus a flat DOM shim reach an interactable state on modern web pages without needing a full browser engine?

## Quick Start

```bash
npm install
node index.js
```

## What This Does

1. Fetches HTML from `https://news.ycombinator.com`
2. Extracts all `<script>` tags (inline and external)
3. Executes scripts in a sandboxed QuickJS WASM environment
4. Logs every DOM property accessed via JavaScript Proxy traps

## Results

**Hacker News uses only 5 unique DOM property accesses:**
- `document.addEventListener`
- `document.addEventListener(click)`
- `document.getElementsByClassName`
- `document.getElementsByClassName(rank)`
- `HTMLCollection[0]`

**Thesis validated**: A minimal DOM shim IS sufficient for content-focused sites.

## Files

| File | Purpose |
|------|---------|
| `index.js` | Single-site test harness |
| `spec-analysis.js` | Multi-site batch tester |
| `DOM_API_SPEC.md` | DOM API requirements specification |
| `LOC_REALITY_CHECK.md` | Honest LOC estimates for implementation |
| `report.json` | Raw test results |
| `spec-report.json` | Processed analysis |

## Key Findings

### DOM APIs Required (Evidence-Based)

Only ~22 unique properties accessed across 8 test sites.

**High Priority** (used by 2+ sites):
- `document.addEventListener`

**Medium Priority** (used by 1 site):
- `document.getElementsByClassName`
- `document.documentElement`
- `document.cookie`
- `document.location`
- `window.localStorage`

### LOC Estimates

The spec claims ~200 LOC for MVP. Reality:

| Phase | Spec | Realistic |
|-------|------|-----------|
| Phase 1 (MVP) | 200 LOC | **1,000-1,500 LOC** |
| Phase 2 | 800 LOC | 3,000-4,000 LOC |
| Phase 3 | 2,000 LOC | 8,000-12,000 LOC |
| Phase 4 | 5,000 LOC | 20,000-30,000 LOC |

See `LOC_REALITY_CHECK.md` for detailed analysis.

## Architecture

```
┌─────────────────┐
│  Hacker News    │
│  (fetch HTML)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  JSDOM         │
│  (parse HTML)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  QuickJS WASM  │
│  (execute JS)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Proxy Globals  │
│  (log access)  │
└─────────────────┘
```

## Dependencies

- `quickjs-emscripten` - QuickJS compiled to WebAssembly
- `jsdom` - HTML parsing only

## License

MIT
