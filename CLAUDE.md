# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server (also runs build-data first)
npm run build        # tsc type-check + vite build (also runs build-data first)
npm run build-data   # regenerate src/data/*.json from vendor/pokemon-showdown
npm run preview      # serve the dist/ folder locally
```

There are no tests. Type-checking is the only automated correctness check (`tsc -b` runs as part of `build`).

## Architecture

### Data pipeline
Game data (Pokémon, moves, abilities, items, natures) lives in `vendor/pokemon-showdown/` as a git submodule. `scripts/build-data.ts` extracts and flattens the raw TypeScript exports into compact JSON files in `src/data/`. These JSON files are imported directly into the app bundle. `src/data/megaIds.json` is manually maintained and maps base slugs (and `slug-x`/`slug-y` for dual-form megas) to PokéAPI pokemon IDs.

**Important**: If `vendor/pokemon-showdown` is missing locally, run `git submodule update --init`. The CI workflow uses sparse-checkout to pull only `data/` from that repo.

### Auth & storage
All user data is stored in the user's private **Google Drive `appDataFolder`** (invisible to them, app-scoped). Auth uses **Google Identity Services (GIS) token client** — no OAuth redirect, no backend.

- `src/auth/AuthContext.tsx` — manages GIS token client lifecycle. Caches `{ user, accessToken, tokenExpiry }` in `localStorage` under key `pkmnchamp_auth_v1` so returning users start with `loading: false` (no login flash). Background silent refresh runs on every page load.
- `src/drive/api.ts` — raw Drive REST calls (list, read, create, update).
- `src/drive/useDriveFile.ts` — React hook that wraps a single JSON file in Drive. On mount it lists app files, finds by name, reads it. The `save(newData)` function either creates or patches the file. This is the **only persistence layer**.

The Drive files are:
- `box.json` — `BoxPokemon[]` (the user's Pokémon roster)
- `matches.json` — `Match[]` (match history)
- `widgets.json` — `WidgetConfig { visibleIds: WidgetId[] }` (stats dashboard layout)

### Domain hooks
`src/hooks/useBox.ts` and `src/hooks/useMatches.ts` wrap `useDriveFile` with domain operations. All state lives in Drive; there is no local state beyond what's in these hooks and component-local UI state.

### Routing
HashRouter (`/#/path`) with four routes: `/box`, `/log`, `/stats`, `/history`. The edit-match flow uses `/log/edit/:matchId` — `LogPage` reads `useParams` to detect edit mode and pre-fills state from the existing match via a `useEffect` with a `useRef` init-guard.

### Custom stat system
This app uses a simplified EV system called **training points** (not standard EVs):
- 1 training point = 8 EVs = +1 to the final Lv50 stat
- Max 32 per stat, max 66 total
- `src/utils/statCalc.ts` implements `calcStat()` with Level 50, max IVs (31)
- Showdown import converts standard EVs → training points (`÷ 8`); `# Champions stat points:` lines are direct training points

### Sprite URLs
`src/utils/sprites.ts`:
- Non-form base Pokémon: PokéAPI official artwork (`/official-artwork/{national}.png`)
- Form/mega Pokémon (isForm=true): `megaSlugUrl()` detects `mega`/`megax`/`megay`/`megaz` slug suffixes and looks up the PokéAPI ID in `megaIds.json`. Falls back to Showdown CDN, then (via `PokemonImage`) to the base national artwork, then a letter placeholder.
- `src/data/megaIds.json` covers all XY/ORAS megas and all Legends Z-A megas (IDs 10278–10326). Manually maintained.
- `PokemonImage`: cached images fire `load` synchronously before React attaches `onLoad`; a `useEffect` checks `img.complete` after mount to catch this (fixes sprites going blank after SPA navigation).

### Regulations and seasons
`src/utils/regulations.ts` is the single source of truth for both. Add new regulation objects to the `REGULATIONS` array (last entry = new default). Add new seasons to the `SEASONS` array (last entry = `DEFAULT_SEASON`). Currently: Reg M-B, seasons M-1 through M-4.

`Match.season` is optional — old matches may have no season set. `useMatches` exposes `bulkSetSeason(season)` to overwrite all matches at once (used by the mass-edit panel on HistoryPage). HistoryPage has a season filter row and the mass-edit panel. StatsPage has a separate season filter row (purple chips) below the regulation filter.

### Pokémon Showdown import
`src/utils/showdownImport.ts` parses Showdown export text. Recognises both `EVs:` (÷8 conversion) and `# Champions stat points:` (direct). Capped at 20 Pokémon per import. `batchAddPokemon` in `useBox` saves the whole array in one Drive write.

### Stats dashboard
`src/pages/StatsPage.tsx` renders a customizable widget grid. `src/hooks/useWidgetConfig.ts` persists the visible widget list and order to `widgets.json` in Drive. The `WIDGET_REGISTRY` (13 widgets) defines available widgets; stored order is preserved (enables drag-free reordering via ▲/▼ buttons in edit mode). In edit mode a pencil/check toggle reveals per-widget remove (×) and reorder (▲▼) buttons plus an "Add Widget" panel.

### Log page behaviour
- After saving a **new** match the form clears in place (ready for the next game in a series). Saving an **edit** navigates to history.
- Enemy strategy field supports arrow-key navigation and Enter to select from the dropdown.
- Enemy Pokémon slots: selecting a Pokémon shows its known abilities as one-click chips (auto-fills if only one ability); item field uses type-to-search Autocomplete across all 583 items.

### PWA
`vite-plugin-pwa` with `registerType: 'autoUpdate'` — the service worker auto-activates on new deploys. Sprites from PokéAPI, Showdown CDN, and PokémonDB are cached via Workbox `CacheFirst` runtime rules (30-day TTL) with `cacheableResponse: { statuses: [0, 200] }` to handle cross-origin responses correctly on mobile.

### Deployment
GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages. The build requires `VITE_GOOGLE_CLIENT_ID` set as a **repository secret** (not an environment secret — build jobs can't access environment secrets). Pages source must be set to "GitHub Actions" in repo settings.
