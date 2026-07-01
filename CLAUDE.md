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

The two Drive files are:
- `box.json` — `BoxPokemon[]` (the user's Pokémon roster)
- `matches.json` — `Match[]` (match history)

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
- Form Pokémon (isForm=true): Pokémon Showdown dex CDN (`/sprites/dex/{slug}.png`)
- Mega Pokémon: PokéAPI official artwork via `megaIds.json` lookup (`slug`, `slug-x`, or `slug-y` depending on item name). Falls back to Showdown for non-canonical custom megas. `PokemonImage` chains PokéAPI → base sprite → letter placeholder on error.

### Regulations
`src/utils/regulations.ts` is the single source of truth. Add new regulation objects to the `REGULATIONS` array; the last entry becomes the new default. Currently only Reg M-B exists.

### Pokémon Showdown import
`src/utils/showdownImport.ts` parses Showdown export text. Recognises both `EVs:` (÷8 conversion) and `# Champions stat points:` (direct). Capped at 20 Pokémon per import. `batchAddPokemon` in `useBox` saves the whole array in one Drive write.

### PWA
`vite-plugin-pwa` with `registerType: 'autoUpdate'` — the service worker auto-activates on new deploys. Sprites from PokéAPI and Showdown CDN are cached via Workbox `CacheFirst` runtime rules (30-day TTL, up to 500 entries).

### Deployment
GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages. The build requires `VITE_GOOGLE_CLIENT_ID` set as a **repository secret** (not an environment secret — build jobs can't access environment secrets). Pages source must be set to "GitHub Actions" in repo settings.
