# Pokémon Champions Tracker — Claude Code Build Instructions

## Project overview

A web app for tracking competitive Pokémon Champions match history.
- Hosted on **GitHub Pages** (static, no server)
- Data stored in the user's own **Google Drive** (App Data folder)
- Auth via **Google OAuth 2.0** (Google Identity Services)
- Installable on phone homescreen as a **PWA**
- Pokemon/move data from the **pokemondb/database** git submodule
- Pokemon sprites from **PokeAPI GitHub CDN** (no API key needed)
- Zero backend servers, zero paid services

---

## Tech stack — no deviations

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 + `vite-plugin-pwa` |
| Styling | Tailwind CSS v3 |
| Auth | Google Identity Services (GIS) — browser OAuth 2.0 |
| Storage | Google Drive REST API — App Data folder |
| Routing | React Router v6 — **HashRouter** (required for GitHub Pages) |
| Pokemon data | `pokemondb/database` git submodule → build-time JSON |
| Pokemon sprites | PokeAPI sprites CDN — URL computed from national dex number |
| Deployment | GitHub Actions → `gh-pages` branch |

**No Firebase. No backend. No database subscription fees.**

---

## Step 1 — Google Cloud Console setup (user does this manually)

Tell the user to complete these steps before you write any code. You cannot do this for them.

1. Go to https://console.cloud.google.com and create a new project named `pokemon-tracker`.

2. In the left menu go to **APIs & Services → Library**. Search for and enable:
   - **Google Drive API**

3. Go to **APIs & Services → OAuth consent screen**:
   - User Type: **External**
   - App name: `Pokémon Champions Tracker`
   - Support email: their email
   - Add scopes: `../auth/drive.appdata`, `email`, `profile`, `openid`
   - Add their own Google account as a test user
   - Save and continue through all steps

4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**:
   - Application type: **Web application**
   - Name: `pokemon-tracker-web`
   - Under **Authorised JavaScript origins** add both:
     - `http://localhost:5173`
     - `https://{their-github-username}.github.io`
   - Leave **Authorised redirect URIs** empty (not needed for implicit token flow)
   - Click Create → copy the **Client ID**

5. Create `.env.local` in the project root:
   ```
   VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   ```

6. Add `.env.local` to `.gitignore`.

7. Add `VITE_GOOGLE_CLIENT_ID` as a GitHub Actions secret:
   - Repo → Settings → Secrets and variables → Actions → New repository secret

---

## Step 2 — Project initialisation

```bash
npm create vite@latest pokemon-tracker -- --template react-ts
cd pokemon-tracker
npm install
npm install react-router-dom
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa js-yaml tsx @types/js-yaml workbox-window
npx tailwindcss init -p
```

In `tailwind.config.js`:
```js
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

Replace `src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## Step 3 — pokemondb/database submodule

**The user has already added this submodule.** Do not run `git submodule add` again. Instead run the following to confirm the path and initialise it:

```bash
git submodule status          # shows the folder name and commit hash
git submodule update --init   # safe to run even if already initialised
```

The output of `git submodule status` will show the exact folder the user chose (e.g. `pokemondb`, `vendor/pokemondb`, `database`). **Use that exact path in `scripts/build-data.ts`** — set `VENDOR` to `path.resolve('{actual-folder}/data')`.

The submodule's `data/` directory contains these files used by the app:

| File | Content | Used for |
|---|---|---|
| `pokemon.yaml` | `slug → { name, national, gen }` | **Pokemon name autocomplete** + sprite URLs |
| `pokemon-forms.yaml` | `slug → { name, base_pokemon }` | Form variants (Calyrex-Ice, Urshifu, etc.) |
| `moves.yaml` | `slug → { name, type, category, power, accuracy, pp }` | **Move name autocomplete** + type colour badges |
| `types.yaml` | `slug → { name }` | Type colour map |
| `abilities.yaml` | `slug → { name, description }` | Ability field in Box |

**Do not read:** `items.yaml`, `games.yaml`, `locations.yaml`, `releases.yaml`, `egg-groups.yaml`.

---

## Step 3a — YAML structure and autocomplete mapping

This section documents the exact structure of the two most important files and maps each to the UI fields it powers. **All autocomplete in the app comes exclusively from these YAML files — never hardcode Pokemon or move names anywhere.**

### `pokemon.yaml` — source for all Pokemon name autocomplete

YAML map keyed by URL slug. Each entry has three fields:

```yaml
bulbasaur:
  national: 1
  name: Bulbasaur
  gen: 1
flutter-mane:
  national: 987
  name: Flutter Mane
  gen: 9
iron-bundle:
  national: 991
  name: Iron Bundle
  gen: 9
pelipper:
  national: 279
  name: Pelipper
  gen: 3
calyrex:
  national: 898
  name: Calyrex
  gen: 8
```

`national` is the national Pokédex number. This constructs the PokeAPI sprite URL with zero runtime API calls:
`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{national}.png`

**Where `pokemon.yaml` powers autocomplete:**

| UI location | Field | On selection |
|---|---|---|
| BoxPage → Add/Edit Pokemon | Name input | Set `name`, `slug`, `national`, `isForm`; sprite renders immediately |
| LogPage → Add enemy slot | Name input | Same; resolves sprite inline |

When the user selects a suggestion, store the full `PokemonEntry` fields — not just the display name. The sprite URL is computed at render time from `slug` + `national`; it is never fetched or stored separately.

### `moves.yaml` — source for all move name autocomplete

YAML map keyed by URL slug. Each entry has the move stats:

```yaml
mimic:
    name: Mimic
    type: normal
    category: status
    power:
    accuracy:
    pp: 10
    priority: 0
mind-blown:
    name: Mind Blown
    type: fire
    category: special
    power: 150
    accuracy: 100
    pp: 5
    priority: 0
mind-reader:
    name: Mind Reader
    type: normal
    category: status
    power:
    accuracy:
    pp: 5
    priority: 0
```

`type` is always lowercase. `category` is always `physical`, `special`, or `status`. `power` and `accuracy` are `null` for status moves, priority can be positive zero or negative. 

**Where `moves.yaml` powers autocomplete:**

| UI location | Field | Behaviour |
|---|---|---|
| BoxPage → Pokemon moves slots 1–4 | Each move input | Dropdown of matching moves as user types |
| LogPage → Enemy slot → Moves used 1–4 | Each move input | Same move autocomplete |
| LogPage → My team → Moves used checklist | Checkboxes | No autocomplete; shows stored moves from Box |

**Each autocomplete suggestion row for moves must display:**
```
Surf          [Water]   Special   90
Earthquake    [Ground]  Physical  100
Swords Dance  [Normal]  Status    —
Fake Out      [Normal]  Physical  40
```
Name + coloured type badge + category label + power (or `—` for status). This lets the user confirm the right move at a glance without memorising every move's type.

### Data flow summary

```
{submodule}/data/pokemon.yaml ──build-data.ts──▶ src/data/pokemon.json ──▶ gameData.ts ──▶ searchPokemon()
{submodule}/data/moves.yaml   ──build-data.ts──▶ src/data/moves.json   ──▶ gameData.ts ──▶ searchMoves()
```

Both JSON files are bundled at build time. Autocomplete is instant and works offline — zero network requests.

---

## Step 4 — Build-time data extraction script

### Install deps
```bash
npm install -D js-yaml tsx @types/js-yaml
```

### Create `scripts/build-data.ts`

> **Before writing this file:** run `git submodule status` in the terminal to find the exact folder name the user chose for the pokemondb submodule. Update the `VENDOR` constant below to match that path. Common locations: `pokemondb/data`, `vendor/pokemondb/data`, `database/data`.

```ts
import fs   from 'fs'
import path from 'path'
import yaml from 'js-yaml'

const VENDOR = path.resolve('vendor/pokemondb/data')
const OUT    = path.resolve('src/data')

fs.mkdirSync(OUT, { recursive: true })

function read(file: string): Record<string, any> {
  const raw = fs.readFileSync(path.join(VENDOR, file), 'utf8')
  return yaml.load(raw) as Record<string, any>
}

// ── Pokemon (base + forms merged) ────────────────────────────────────────────
const rawPoke  = read('pokemon.yaml')
const rawForms = read('pokemon-forms.yaml')

const pokemon = [
  ...Object.entries(rawPoke).map(([slug, d]: [string, any]) => ({
    slug,
    name:     d.name     as string,
    national: d.national as number,
    gen:      d.gen      as number,
    isForm:   false,
  })),
  ...Object.entries(rawForms).map(([slug, d]: [string, any]) => {
    const base = rawPoke[d.pokemon] ?? {}
    return {
      slug,
      name:     d.name         as string,
      national: base.national  as number | undefined,
      gen:      base.gen       as number | undefined,
      isForm:   true,
    }
  }),
]

fs.writeFileSync(path.join(OUT, 'pokemon.json'), JSON.stringify(pokemon))
console.log(`✓ pokemon.json (${pokemon.length} entries)`)

// ── Moves ─────────────────────────────────────────────────────────────────────
const rawMoves = read('moves.yaml')
const moves = Object.entries(rawMoves).map(([slug, d]: [string, any]) => ({
  slug,
  name:     d.name     as string,
  type:     (d.type     ?? null) as string | null,
  category: (d.category ?? null) as string | null,
  power:    (d.power    ?? null) as number | null,
  accuracy: (d.accuracy ?? null) as number | null,
  pp:       (d.pp       ?? null) as number | null,
}))

fs.writeFileSync(path.join(OUT, 'moves.json'), JSON.stringify(moves))
console.log(`✓ moves.json (${moves.length} entries)`)

// ── Types ─────────────────────────────────────────────────────────────────────
const rawTypes = read('types.yaml')
const types = Object.entries(rawTypes).map(([slug, d]: [string, any]) => ({
  slug, name: d.name as string,
}))

fs.writeFileSync(path.join(OUT, 'types.json'), JSON.stringify(types))
console.log(`✓ types.json (${types.length} entries)`)

// ── Abilities ─────────────────────────────────────────────────────────────────
const rawAbilities = read('abilities.yaml')
const abilities = Object.entries(rawAbilities).map(([slug, d]: [string, any]) => ({
  slug, name: d.name as string,
  description: (d.description ?? null) as string | null,
}))

fs.writeFileSync(path.join(OUT, 'abilities.json'), JSON.stringify(abilities))
console.log(`✓ abilities.json (${abilities.length} entries)`)
```

### Wire into `package.json`

```json
{
  "scripts": {
    "build-data": "tsx scripts/build-data.ts",
    "predev":     "npm run build-data",
    "prebuild":   "npm run build-data",
    "dev":        "vite",
    "build":      "tsc && vite build",
    "preview":    "vite preview"
  }
}
```

Add to `.gitignore` (generated files, do not commit):
```
src/data/pokemon.json
src/data/moves.json
src/data/types.json
src/data/abilities.json
```

---

## Step 5 — Sprite URLs (no API calls, pure computation)

```ts
// src/utils/sprites.ts

// PokeAPI sprites repo — no auth, no rate limits, served via GitHub CDN
export function spriteUrl(national: number | undefined, slug: string, isForm: boolean): string {
  if (!isForm && national) {
    // Official artwork for base Pokemon
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${national}.png`
  }
  // pokemondb.net hosts sprites for all forms by slug — slug format matches their database exactly
  return `https://img.pokemondb.net/sprites/home/normal/${slug}.png`
}
```

**Sprites are never downloaded or stored anywhere.** The URL is computed at render time from the Pokemon entry (slug + national dex number). Both sources are publicly accessible CDNs. Images load like any `<img src>`.

---

## Step 6 — PWA setup

### `vite.config.ts`

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/pokemon-tracker/',  // must match the GitHub repo name exactly
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Pokémon Champions Tracker',
        short_name: 'PokéTracker',
        description: 'Track your competitive Pokémon Champions matches',
        theme_color: '#1d4ed8',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/pokemon-tracker/',
        start_url: '/pokemon-tracker/',
        icons: [
          { src: 'icons/icon-192.png',       sizes: '192x192',   type: 'image/png' },
          { src: 'icons/icon-512.png',       sizes: '512x512',   type: 'image/png' },
          { src: 'icons/icon-512-mask.png',  sizes: '512x512',   type: 'image/png', purpose: 'maskable' },
          { src: 'icons/apple-touch.png',    sizes: '180x180',   type: 'image/png' },
        ],
      },
      workbox: {
        // Cache the app shell and all static assets
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,json}'],
        // Exclude Drive API calls from caching
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Cache PokeAPI sprites
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pokeapi-sprites',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Cache pokemondb.net form sprites
            urlPattern: /^https:\/\/img\.pokemondb\.net\/sprites\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pokemondb-sprites',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
})
```

### iOS-specific meta tags — add to `index.html` `<head>`

```html
<!-- Standard PWA -->
<meta name="theme-color" content="#1d4ed8" />
<link rel="manifest" href="/pokemon-tracker/manifest.webmanifest" />

<!-- iOS specific — required for "Add to Home Screen" to behave like an app -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="PokéTracker" />
<link rel="apple-touch-icon" href="/pokemon-tracker/icons/apple-touch.png" />

<!-- Google Identity Services script -->
<script src="https://accounts.google.com/gsi/client" async></script>
```

### Generate app icons

Create `scripts/generate-icons.ts`:

```ts
import fs from 'fs'
import path from 'path'

// Simple SVG Pokéball icon
const svg = (size: number) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#1d4ed8"/>
  <rect x="0" y="${size/2 - size*0.04}" width="${size}" height="${size*0.08}" fill="white"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.15}" fill="white" stroke="#1d4ed8" stroke-width="${size*0.04}"/>
  <path d="M ${size*0.05} ${size/2} A ${size*0.45} ${size*0.45} 0 0 1 ${size*0.95} ${size/2}" fill="#e11d48"/>
</svg>`.trim()

const ICONS = path.resolve('public/icons')
fs.mkdirSync(ICONS, { recursive: true })

fs.writeFileSync(path.join(ICONS, 'icon.svg'),        svg(512))
fs.writeFileSync(path.join(ICONS, 'icon-192.svg'),    svg(192))
fs.writeFileSync(path.join(ICONS, 'icon-512.svg'),    svg(512))
fs.writeFileSync(path.join(ICONS, 'icon-512-mask.svg'), svg(512))
fs.writeFileSync(path.join(ICONS, 'apple-touch.svg'), svg(180))

console.log('✓ SVG icons generated in public/icons/')
console.log('NOTE: vite-plugin-pwa will serve SVG icons. For better iOS support,')
console.log('replace the SVGs with PNGs. You can convert at https://cloudconvert.com/svg-to-png')
```

Add to scripts:
```json
"generate-icons": "tsx scripts/generate-icons.ts"
```

Run once: `npm run generate-icons`

**Note for Claude Code:** Run this script once during setup. The user can replace these with custom icons later. If `vite-plugin-pwa` requires PNG format specifically, install `sharp` (`npm install -D sharp`) and update the icon script to produce PNGs using `sharp(Buffer.from(svgString)).png().resize(n).toFile(...)`.

---

## Step 7 — TypeScript types (`src/types.ts`)

```ts
// ── Game data (from pokemondb JSON) ──────────────────────────────────────────

export interface PokemonEntry {
  slug:     string
  name:     string
  national: number | undefined
  gen:      number | undefined
  isForm:   boolean
}

export interface MoveEntry {
  slug:     string
  name:     string
  type:     string | null
  category: 'physical' | 'special' | 'status' | null
  power:    number | null
  accuracy: number | null
  pp:       number | null
}

// ── App data (stored in Google Drive JSON files) ──────────────────────────────

export interface BoxPokemon {
  id:       string        // local UUID
  slug:     string        // PokemonEntry.slug — used to compute sprite URL
  name:     string        // display name, denormalised from PokemonEntry
  national: number | null // for sprite URL computation
  isForm:   boolean
  moves:    string[]      // up to 4 move names
  ability:  string        // optional
  addedAt:  string        // ISO timestamp
}

export interface MatchTeamSlot {
  boxId:     string   // references BoxPokemon.id
  slug:      string   // denormalised for display without loading box
  name:      string
  national:  number | null
  isForm:    boolean
  movesUsed: string[] // subset of BoxPokemon.moves actually used
}

export interface EnemySlot {
  slug:      string   // normalised from user input; used for sprite URL
  name:      string   // display name as typed
  national:  number | null  // resolved from pokemon.json if found
  isForm:    boolean
  movesUsed: string[] // free-text moves enemy used
}

export interface Match {
  id:            string
  date:          string   // ISO timestamp
  myTeam:        MatchTeamSlot[]  // exactly 4
  enemyTeam:     EnemySlot[]      // 1–4
  enemyStrategy: string
  result:        'win' | 'loss'
  notes:         string
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface GoogleUser {
  id:      string
  name:    string
  email:   string
  picture: string
}

export interface AuthState {
  user:         GoogleUser | null
  accessToken:  string | null
  tokenExpiry:  number | null   // Unix timestamp ms
  loading:      boolean
  error:        string | null
}

// ── Drive storage state ───────────────────────────────────────────────────────

export interface DriveFileState<T> {
  data:    T | null
  loading: boolean
  saving:  boolean
  error:   string | null
}
```

---

## Step 8 — Google auth (`src/auth/`)

### TypeScript declarations for Google Identity Services

Create `src/auth/gis.d.ts`:

```ts
declare namespace google.accounts.oauth2 {
  interface TokenClient {
    requestAccessToken(options?: { prompt?: string; hint?: string }): void
  }
  interface TokenResponse {
    access_token: string
    expires_in:   number
    scope:        string
    token_type:   string
    error?:       string
  }
  function initTokenClient(config: {
    client_id:  string
    scope:      string
    callback:   (resp: TokenResponse) => void
    error_callback?: (err: { type: string }) => void
  }): TokenClient
}

declare namespace google.accounts.id {
  function disableAutoSelect(): void
}

declare const google: typeof google
```

### Auth context (`src/auth/AuthContext.tsx`)

```tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { AuthState, GoogleUser } from '../types'

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.appdata',
].join(' ')

interface AuthContextValue extends AuthState {
  signIn:        () => void
  signOut:       () => void
  getValidToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, accessToken: null, tokenExpiry: null, loading: true, error: null,
  })
  const tokenClientRef = useRef<google.accounts.oauth2.TokenClient | null>(null)
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null)

  // Called when GIS returns a token
  function handleTokenResponse(resp: google.accounts.oauth2.TokenResponse) {
    if (resp.error) {
      setState(s => ({ ...s, loading: false, error: resp.error ?? 'Auth error' }))
      return
    }
    const expiry = Date.now() + (resp.expires_in - 60) * 1000  // refresh 1 min early
    fetchUserInfo(resp.access_token).then(user => {
      setState({ user, accessToken: resp.access_token, tokenExpiry: expiry, loading: false, error: null })
    })
    refreshPromiseRef.current = null
  }

  useEffect(() => {
    // Wait for GIS script to load
    function initClient() {
      tokenClientRef.current = google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: handleTokenResponse,
        error_callback: (err) => {
          setState(s => ({ ...s, loading: false, error: `Sign-in failed: ${err.type}` }))
          refreshPromiseRef.current = null
        },
      })
      // Attempt silent sign-in on startup
      tokenClientRef.current.requestAccessToken({ prompt: '' })
    }

    if (typeof google !== 'undefined') {
      initClient()
    } else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
      script?.addEventListener('load', initClient)
    }
  }, [])

  function signIn() {
    setState(s => ({ ...s, loading: true, error: null }))
    tokenClientRef.current?.requestAccessToken({ prompt: 'select_account' })
  }

  function signOut() {
    if (state.user) google.accounts.id.disableAutoSelect()
    setState({ user: null, accessToken: null, tokenExpiry: null, loading: false, error: null })
  }

  // Returns a valid access token, refreshing if expired
  async function getValidToken(): Promise<string | null> {
    if (state.accessToken && state.tokenExpiry && Date.now() < state.tokenExpiry) {
      return state.accessToken
    }
    // Token expired — refresh silently
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = new Promise<string | null>((resolve) => {
        const orig = tokenClientRef.current
        if (!orig) { resolve(null); return }
        // Temporarily override callback
        tokenClientRef.current = google.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: (resp) => {
            handleTokenResponse(resp)
            resolve(resp.error ? null : resp.access_token)
            tokenClientRef.current = orig
          },
        })
        tokenClientRef.current.requestAccessToken({ prompt: '' })
      })
    }
    return refreshPromiseRef.current
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, getValidToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

async function fetchUserInfo(token: string): Promise<GoogleUser> {
  const res  = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  return { id: data.sub, name: data.name, email: data.email, picture: data.picture }
}
```

### Auth gate component (`src/auth/AuthGate.tsx`)

```tsx
import { useAuth } from './AuthContext'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, error, signIn } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Signing in…</p>
      </div>
    </div>
  )

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm px-6">
        <div className="text-6xl mb-4">⚔️</div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Champions Tracker</h1>
        <p className="text-gray-500 text-sm mb-8">
          Your match data is saved privately in your Google Drive. Nothing is shared.
        </p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" />
          Sign in with Google
        </button>
        <p className="text-xs text-gray-400 mt-4">
          Requests access to a private app folder in your Google Drive.
        </p>
      </div>
    </div>
  )

  return <>{children}</>
}
```

---

## Step 9 — Google Drive storage layer (`src/drive/`)

### Drive API helper (`src/drive/api.ts`)

All calls go to the Drive REST API using `fetch` + Bearer token. No `gapi` library needed.

```ts
const DRIVE = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

export async function listAppFiles(token: string): Promise<{ id: string; name: string }[]> {
  const res = await fetch(
    `${DRIVE}/files?spaces=appDataFolder&fields=files(id,name)&pageSize=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`)
  const { files } = await res.json()
  return files ?? []
}

export async function readFile<T>(token: string, fileId: string): Promise<T> {
  const res = await fetch(`${DRIVE}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Drive read failed: ${res.status}`)
  return res.json()
}

export async function createFile(token: string, name: string, data: unknown): Promise<string> {
  const metadata = { name, parents: ['appDataFolder'], mimeType: 'application/json' }
  const body = new FormData()
  body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  body.append('file',     new Blob([JSON.stringify(data)],    { type: 'application/json' }))

  const res = await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })
  if (!res.ok) throw new Error(`Drive create failed: ${res.status}`)
  const { id } = await res.json()
  return id as string
}

export async function updateFile(token: string, fileId: string, data: unknown): Promise<void> {
  const res = await fetch(`${UPLOAD}/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Drive update failed: ${res.status}`)
}
```

### Drive data hook (`src/drive/useDriveFile.ts`)

Generic hook for a single JSON file stored in Drive. Box and Matches both use this.

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import * as api from './api'
import type { DriveFileState } from '../types'

export function useDriveFile<T>(filename: string, defaultValue: T) {
  const { getValidToken } = useAuth()
  const [state, setState] = useState<DriveFileState<T>>({
    data: null, loading: true, saving: false, error: null,
  })
  const fileIdRef = useRef<string | null>(null) // cached Drive file ID

  // Load on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const token = await getValidToken()
        if (!token || cancelled) return

        const files = await api.listAppFiles(token)
        const match = files.find(f => f.name === filename)

        if (!match) {
          // File doesn't exist yet — use defaultValue
          setState({ data: defaultValue, loading: false, saving: false, error: null })
          return
        }

        fileIdRef.current = match.id
        const data = await api.readFile<T>(token, match.id)
        if (!cancelled) setState({ data, loading: false, saving: false, error: null })
      } catch (err) {
        if (!cancelled) setState(s => ({
          ...s, loading: false, error: (err as Error).message,
        }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [filename]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(async (newData: T) => {
    setState(s => ({ ...s, saving: true, error: null }))
    try {
      const token = await getValidToken()
      if (!token) throw new Error('Not authenticated')

      if (fileIdRef.current) {
        await api.updateFile(token, fileIdRef.current, newData)
      } else {
        fileIdRef.current = await api.createFile(token, filename, newData)
      }
      setState(s => ({ ...s, data: newData, saving: false }))
    } catch (err) {
      setState(s => ({ ...s, saving: false, error: (err as Error).message }))
      throw err
    }
  }, [filename, getValidToken])

  return { ...state, save }
}
```

### Box hook (`src/hooks/useBox.ts`)

```ts
import { useCallback } from 'react'
import { useDriveFile } from '../drive/useDriveFile'
import type { BoxPokemon } from '../types'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

export function useBox() {
  const { data, loading, saving, error, save } = useDriveFile<BoxPokemon[]>('box.json', [])
  const box = data ?? []

  const addPokemon = useCallback(async (pokemon: Omit<BoxPokemon, 'id' | 'addedAt'>) => {
    const entry: BoxPokemon = { ...pokemon, id: uid(), addedAt: new Date().toISOString() }
    await save([...box, entry])
  }, [box, save])

  const updatePokemon = useCallback(async (id: string, updates: Partial<BoxPokemon>) => {
    await save(box.map(p => p.id === id ? { ...p, ...updates } : p))
  }, [box, save])

  const deletePokemon = useCallback(async (id: string) => {
    await save(box.filter(p => p.id !== id))
  }, [box, save])

  return { box, loading, saving, error, addPokemon, updatePokemon, deletePokemon }
}
```

### Matches hook (`src/hooks/useMatches.ts`)

```ts
import { useCallback } from 'react'
import { useDriveFile } from '../drive/useDriveFile'
import type { Match } from '../types'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

export function useMatches() {
  const { data, loading, saving, error, save } = useDriveFile<Match[]>('matches.json', [])
  const matches = data ?? []

  // Sorted newest first
  const sorted = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const addMatch = useCallback(async (match: Omit<Match, 'id' | 'date'>) => {
    const entry: Match = { ...match, id: uid(), date: new Date().toISOString() }
    await save([...matches, entry])
  }, [matches, save])

  const deleteMatch = useCallback(async (id: string) => {
    await save(matches.filter(m => m.id !== id))
  }, [matches, save])

  return { matches: sorted, loading, saving, error, addMatch, deleteMatch }
}
```

---

## Step 10 — Game data utilities (`src/utils/`)

### Data loader (`src/utils/gameData.ts`)

```ts
import type { PokemonEntry, MoveEntry } from '../types'
import pokemonJson  from '../data/pokemon.json'
import movesJson    from '../data/moves.json'

export const allPokemon  = pokemonJson  as PokemonEntry[]
export const allMoves    = movesJson    as MoveEntry[]

export function searchPokemon(q: string, limit = 8): PokemonEntry[] {
  if (!q) return []
  const lower = q.toLowerCase()
  return allPokemon
    .filter(p => p.name.toLowerCase().includes(lower) || p.slug.includes(lower))
    .slice(0, limit)
}

export function searchMoves(q: string, limit = 8): MoveEntry[] {
  if (!q) return []
  const lower = q.toLowerCase()
  return allMoves
    .filter(m => m.name.toLowerCase().includes(lower) || m.slug.includes(lower))
    .slice(0, limit)
}

export function findPokemonByName(name: string): PokemonEntry | undefined {
  const lower = name.toLowerCase()
  return allPokemon.find(p => p.name.toLowerCase() === lower || p.slug === lower)
}
```

### Sprite URLs (`src/utils/sprites.ts`)

```ts
export function spriteUrl(national: number | null | undefined, slug: string, isForm: boolean): string {
  if (!isForm && national) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${national}.png`
  }
  return `https://img.pokemondb.net/sprites/home/normal/${slug}.png`
}
```

### Move colours (`src/utils/moveColors.ts`)

```ts
export const TYPE_COLORS: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-700', fire: 'bg-orange-100 text-orange-800',
  water: 'bg-blue-100 text-blue-800', electric: 'bg-yellow-100 text-yellow-800',
  grass: 'bg-green-100 text-green-800', ice: 'bg-sky-100 text-sky-800',
  fighting: 'bg-red-100 text-red-800', poison: 'bg-purple-100 text-purple-800',
  ground: 'bg-amber-100 text-amber-800', flying: 'bg-indigo-100 text-indigo-700',
  psychic: 'bg-pink-100 text-pink-800', bug: 'bg-lime-100 text-lime-800',
  rock: 'bg-stone-100 text-stone-700', ghost: 'bg-violet-100 text-violet-800',
  dragon: 'bg-indigo-200 text-indigo-900', dark: 'bg-zinc-200 text-zinc-800',
  steel: 'bg-slate-100 text-slate-700', fairy: 'bg-rose-100 text-rose-800',
}

export const CATEGORY_COLORS: Record<string, string> = {
  physical: 'bg-orange-50 text-orange-700',
  special:  'bg-blue-50 text-blue-700',
  status:   'bg-gray-50 text-gray-600',
}

export function typeClass(type: string | null)     { return TYPE_COLORS[type?.toLowerCase() ?? '']     ?? 'bg-gray-100 text-gray-600' }
export function categoryClass(cat: string | null)  { return CATEGORY_COLORS[cat?.toLowerCase() ?? ''] ?? 'bg-gray-50 text-gray-600' }
```

### Archetype styles (`src/utils/archetypes.ts`)

```ts
export const PRESET_ARCHETYPES = [
  'Rain (Pelipper)', 'Rain (Sableye)', 'Rain (Politoed)',
  'Sun (Charizard)', 'Sun (Incineroar)', 'Sun (Groudon)',
  'Sand (Tyranitar)', 'Sand (Hippowdon)',
  'Snow (Abomasnow)', 'Snow (Cetitan)', 'Snow (Ninetales-A)',
  'Trick Room', 'Trick Room (Hatterene)', 'Trick Room (Dusclops)',
  'Balance', 'Hyper Offense', 'Stall',
  'Miraidon Box', 'Koraidon Box', 'Calyrex-Ice Box', 'Calyrex-Shadow Box',
  'Yveltal Box', 'Xerneas Box', 'Kyogre Box',
]

interface StratStyle { badge: string; icon: string }

export function stratStyle(arch: string): StratStyle {
  const l = arch.toLowerCase()
  if (l.includes('rain'))                              return { badge: 'bg-blue-100 text-blue-800 border-blue-200',     icon: 'ti-cloud-rain' }
  if (l.includes('sun') || l.includes('groudon'))     return { badge: 'bg-orange-100 text-orange-800 border-orange-200', icon: 'ti-sun' }
  if (l.includes('sand') || l.includes('tyranitar'))  return { badge: 'bg-amber-100 text-amber-800 border-amber-200',   icon: 'ti-wind' }
  if (l.includes('snow') || l.includes('hail'))       return { badge: 'bg-sky-100 text-sky-800 border-sky-200',         icon: 'ti-snowflake' }
  if (l.includes('trick') || l.includes('hatterene')) return { badge: 'bg-purple-100 text-purple-800 border-purple-200', icon: 'ti-rotate' }
  if (l.includes('hyper') || l.includes('offense'))   return { badge: 'bg-red-100 text-red-800 border-red-200',         icon: 'ti-bolt' }
  if (l.includes('stall'))                            return { badge: 'bg-gray-100 text-gray-600 border-gray-200',      icon: 'ti-shield' }
  if (l.includes('yveltal') || l.includes('shadow'))  return { badge: 'bg-red-100 text-red-800 border-red-200',         icon: 'ti-skull' }
  if (l.includes('miraidon') || l.includes('koraidon')) return { badge: 'bg-purple-100 text-purple-800 border-purple-200', icon: 'ti-bolt' }
  if (l.includes('xerneas') || l.includes('calyrex-ice')) return { badge: 'bg-green-100 text-green-800 border-green-200', icon: 'ti-leaf' }
  return                                              { badge: 'bg-green-100 text-green-800 border-green-200',          icon: 'ti-sword' }
}
```

---

## Step 11 — Reusable components (`src/components/`)

### `Autocomplete.tsx` — the core of the YAML-powered search

This component is used in every field that searches pokemon.yaml or moves.yaml data. It has two display modes controlled by the `mode` prop.

```tsx
import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import type { PokemonEntry, MoveEntry } from '../types'
import { typeClass, categoryClass } from '../utils/moveColors'

// ── Pokemon mode ──────────────────────────────────────────────────────────────

interface PokemonAutocompleteProps {
  mode: 'pokemon'
  value: string
  onChange: (raw: string) => void
  onSelect: (entry: PokemonEntry) => void
  suggestions: PokemonEntry[]
  placeholder?: string
}

// ── Move mode ─────────────────────────────────────────────────────────────────

interface MoveAutocompleteProps {
  mode: 'move'
  value: string
  onChange: (raw: string) => void
  onSelect: (entry: MoveEntry) => void
  suggestions: MoveEntry[]
  placeholder?: string
}

type Props = PokemonAutocompleteProps | MoveAutocompleteProps

export function Autocomplete(props: Props) {
  const { value, onChange, suggestions, placeholder } = props
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Reset cursor when suggestions change
  useEffect(() => setCursor(0), [suggestions])

  function handleKey(e: KeyboardEvent) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter')     { e.preventDefault(); selectItem(suggestions[cursor]) }
    if (e.key === 'Escape')    { setOpen(false) }
  }

  function selectItem(item: PokemonEntry | MoveEntry) {
    if (props.mode === 'pokemon') (props.onSelect as (e: PokemonEntry) => void)(item as PokemonEntry)
    else                          (props.onSelect as (e: MoveEntry) => void)(item as MoveEntry)
    setOpen(false)
  }

  const showDropdown = open && suggestions.length > 0

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => value && setOpen(true)}
        onKeyDown={handleKey}
      />

      {showDropdown && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((item, i) => (
            <li
              key={item.slug}
              onMouseDown={() => selectItem(item)}
              onMouseEnter={() => setCursor(i)}
              className={`px-3 py-2 cursor-pointer text-sm ${i === cursor ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              {props.mode === 'pokemon'
                ? <PokemonRow entry={item as PokemonEntry} />
                : <MoveRow   entry={item as MoveEntry} />
              }
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Pokemon row: name only (sprite shows separately after selection) ───────────

function PokemonRow({ entry }: { entry: PokemonEntry }) {
  return (
    <span className="font-medium text-gray-900">{entry.name}</span>
  )
}

// ── Move row: name + type badge + category + power ────────────────────────────
// Data comes from moves.yaml → moves.json via searchMoves()

function MoveRow({ entry }: { entry: MoveEntry }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium text-gray-900 flex-1 min-w-0 truncate">{entry.name}</span>
      {entry.type && (
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${typeClass(entry.type)}`}>
          {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
        </span>
      )}
      {entry.category && (
        <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${categoryClass(entry.category)}`}>
          {entry.category.charAt(0).toUpperCase() + entry.category.slice(1)}
        </span>
      )}
      <span className="text-xs text-gray-400 flex-shrink-0 w-6 text-right">
        {entry.power ?? '—'}
      </span>
    </div>
  )
}
```

**Usage pattern in pages:**

```tsx
// Pokemon autocomplete — Box and LogPage enemy slots
const [query, setQuery] = useState('')
const suggestions = searchPokemon(query)   // from gameData.ts, data from pokemon.yaml

<Autocomplete
  mode="pokemon"
  value={query}
  onChange={setQuery}
  onSelect={(entry) => {
    setQuery(entry.name)
    // Store entry.slug, entry.national, entry.isForm alongside the name
    onPokemonSelected(entry)
  }}
  suggestions={suggestions}
  placeholder="Search Pokémon…"
/>

// Move autocomplete — Box move slots and LogPage enemy move slots
const [moveQuery, setMoveQuery] = useState('')
const moveSuggestions = searchMoves(moveQuery)  // data from moves.yaml

<Autocomplete
  mode="move"
  value={moveQuery}
  onChange={setMoveQuery}
  onSelect={(entry) => {
    setMoveQuery(entry.name)
    onMoveSelected(entry.name)
  }}
  suggestions={moveSuggestions}
  placeholder="Search moves…"
/>
```



```tsx
import { useState } from 'react'
import { spriteUrl } from '../utils/sprites'

interface Props {
  national:  number | null | undefined
  slug:      string
  isForm:    boolean
  name:      string
  size?:     'sm' | 'md' | 'lg'  // 32 / 64 / 128px
  className?: string
}

const SIZES = { sm: 'w-8 h-8', md: 'w-16 h-16', lg: 'w-32 h-32' } as const

export function PokemonImage({ national, slug, isForm, name, size = 'md', className = '' }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const url = spriteUrl(national, slug, isForm)

  return (
    <div className={`relative ${SIZES[size]} flex-shrink-0 ${className}`}>
      {!loaded && !failed && (
        <div className="absolute inset-0 bg-gray-100 rounded-full animate-pulse" />
      )}
      {failed ? (
        <div className={`${SIZES[size]} rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs`}>
          {name[0]}
        </div>
      ) : (
        <img
          src={url}
          alt={name}
          loading="lazy"
          className={`object-contain ${SIZES[size]} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
```

### `ArchetypeBadge.tsx`

```tsx
import { stratStyle } from '../utils/archetypes'

export function ArchetypeBadge({ arch, size = 'sm' }: { arch: string; size?: 'sm' | 'md' }) {
  const s = stratStyle(arch)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${s.badge}`}>
      <i className={`ti ${s.icon}`} aria-hidden="true" />
      {arch}
    </span>
  )
}
```

### `WinRateBar.tsx`

```tsx
export function WinRateBar({ rate, height = 6 }: { rate: number; height?: number }) {
  const color = rate >= 60 ? 'bg-green-500' : rate >= 40 ? 'bg-yellow-400' : 'bg-red-500'
  const textColor = rate >= 60 ? 'text-green-700' : rate >= 40 ? 'text-yellow-700' : 'text-red-700'
  return (
    <div>
      <div className="w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200" style={{ height }}>
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${rate}%` }} />
      </div>
    </div>
  )
}
```

### `Layout.tsx`

Tab bar at bottom (mobile-first). Tabs: Box, Log, Stats, History. User avatar top-right with sign-out on tap.

```tsx
// Include user avatar (state.user.picture) in top bar
// Show saving indicator (spinning icon) when useDriveFile is saving
// Bottom tab bar with 4 tabs
// Active tab highlighted
// Use @tabler/icons-react for icons
```

Install Tabler icons: `npm install @tabler/icons-react`

Use: `IconBox`, `IconSword`, `IconChartBar`, `IconHistory` for the four tabs.

---

## Step 12 — Page specs

### `BoxPage.tsx`

**Purpose:** Prepare and manage your Pokemon box.

- Grid of BoxPokemon cards (2 cols mobile, 3–4 desktop)
- Each card shows: `PokemonImage`, name, up to 4 move badges, ability, Edit/Delete buttons
- "Add Pokémon" button opens an inline form:
  - **Name field:** autocomplete using `searchPokemon(query)` from `gameData.ts` — shows up to 8 matches. On selection, auto-populate `slug`, `national`, `isForm` from the `PokemonEntry`
  - **Image preview** appears immediately after a Pokemon is selected from autocomplete (computed URL, no fetch needed)
  - **4 move slots:** each is an autocomplete using `searchMoves(query)` — shows move name + type badge in the dropdown
  - **Ability field:** free text with autocomplete from `abilities.json`
  - Save calls `useBox().addPokemon(...)`
- Edit: pre-fill form with existing data, save calls `updatePokemon`
- Delete: requires confirmation (inline confirm buttons, not a modal)
- If Box is empty: friendly empty state with "Add your first Pokémon" button

### `LogPage.tsx`

Divided into three clearly labelled sections:

**Section 1 — My team (select 4 from Box)**
- Shows all Box Pokemon as small selectable cards (2-column grid, compact)
- User taps to select up to 4 (selected = highlighted border + checkmark)
- For each selected Pokemon, reveal a move checklist (their stored moves as checkboxes — which did you use this match?)
- If Box is empty, show a notice linking to BoxPage

**Section 2 — Enemy team (up to 4 slots)**
- "Add enemy Pokémon" button, up to 4 times
- Each slot:
  - Name autocomplete (same `searchPokemon`) — on selection, slug/national/isForm stored in slot
  - `PokemonImage` appears after selection
  - 4 free-text move inputs (what moves did the enemy use?)
  - Remove button (×)
- **Strategy field** below the slots:
  - Autocomplete using PRESET_ARCHETYPES + previously used archetypes from match history
  - Shows `ArchetypeBadge` preview after typing

**Section 3 — Result & save**
- Large Win / Loss toggle
- Notes textarea (optional)
- "Save match" button — disabled until: ≥1 my-team mon selected + result + strategy
- On save: calls `useMatches().addMatch(...)` with fully denormalised data, then navigate to HistoryPage

### `StatsPage.tsx`

All stats computed client-side from `useMatches().matches`. No Drive reads.

1. **Overall:** big win% number + `WinRateBar`, W–L counts, total matches
2. **vs. strategies:** per unique `enemyStrategy`, `ArchetypeBadge` + W–L + % + `WinRateBar`. Sorted by match count desc
3. **My Pokémon performance:** per unique `slug` in `myTeam` across all matches — `PokemonImage` (sm) + name + W–L + % + `WinRateBar`
4. **Enemy Pokémon frequency:** which enemy `slug`s you've faced most — image + name + count. No win rate (one enemy mon ≠ one match result)

Empty state if no matches.

### `HistoryPage.tsx`

- Filter row: All | Wins | Losses | per-archetype chips
- Match cards sorted newest first:
  - Win/Loss badge + `ArchetypeBadge` + date
  - Row of my team `PokemonImage` (sm)
  - Row of enemy `PokemonImage` (sm) + strategy
  - Notes preview (1 line truncated)
  - Expand button → shows full move details
  - Delete (with inline confirm)
- Empty state message

---

## Step 13 — Routing (`src/App.tsx`)

```tsx
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { AuthGate }    from './auth/AuthGate'
import { Layout }      from './components/Layout'
import { BoxPage }     from './pages/BoxPage'
import { LogPage }     from './pages/LogPage'
import { StatsPage }   from './pages/StatsPage'
import { HistoryPage } from './pages/HistoryPage'

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <HashRouter>
          <Layout>
            <Routes>
              <Route path="/"        element={<Navigate to="/box" replace />} />
              <Route path="/box"     element={<BoxPage />} />
              <Route path="/log"     element={<LogPage />} />
              <Route path="/stats"   element={<StatsPage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
          </Layout>
        </HashRouter>
      </AuthGate>
    </AuthProvider>
  )
}
```

---

## Step 14 — Project file structure

```
pokemon-tracker/
  public/
    icons/
      icon.svg
      icon-192.png        ← generated by generate-icons script
      icon-512.png
      icon-512-mask.png
      apple-touch.png
  scripts/
    build-data.ts
    generate-icons.ts
  src/
    auth/
      AuthContext.tsx
      AuthGate.tsx
      gis.d.ts
    components/
      ArchetypeBadge.tsx
      Layout.tsx
      PokemonImage.tsx
      WinRateBar.tsx
    data/                 ← gitignored, generated by build-data script
      pokemon.json
      moves.json
      types.json
      abilities.json
    drive/
      api.ts
      useDriveFile.ts
    hooks/
      useBox.ts
      useMatches.ts
    pages/
      BoxPage.tsx
      LogPage.tsx
      StatsPage.tsx
      HistoryPage.tsx
    utils/
      archetypes.ts
      gameData.ts
      moveColors.ts
      sprites.ts
    types.ts
    App.tsx
    main.tsx
    index.css
  vendor/
    pokemondb/            ← git submodule
  .env.local              ← gitignored
  .gitignore
  index.html
  package.json
  tailwind.config.js
  tsconfig.json
  vite.config.ts
```

---

## Step 15 — `.gitignore`

```
node_modules/
dist/
.env.local
src/data/pokemon.json
src/data/moves.json
src/data/types.json
src/data/abilities.json
```

---

## Step 16 — GitHub Actions (`/.github/workflows/deploy.yml`)

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive   # initialises the pokemondb submodule regardless of folder name

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Build
        run: npm run build       # runs prebuild → build-data → tsc + vite build
        env:
          VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

After the first deploy:
- Go to repo **Settings → Pages → Source** → select `gh-pages` branch → root → Save

---

## Step 17 — `index.html` full template

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Pokémon Champions Tracker</title>

    <!-- PWA -->
    <meta name="theme-color" content="#1d4ed8" />
    <link rel="manifest" href="/pokemon-tracker/manifest.webmanifest" />

    <!-- iOS PWA — required for "Add to Home Screen" to work like a native app -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="PokéTracker" />
    <link rel="apple-touch-icon" href="/pokemon-tracker/icons/apple-touch.png" />

    <!-- Tabler Icons (outline) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.x/dist/tabler-icons.min.css" />

    <!-- Google Identity Services — must load before the React app -->
    <script src="https://accounts.google.com/gsi/client" async defer></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Step 18 — Known issues and how to handle them

**Token expired during a session (after ~1 hour)**
The `getValidToken()` function in `AuthContext` detects expiry and silently refreshes before any Drive API call. If silent refresh fails (user revoked access), `AuthGate` shows the sign-in screen.

**iOS PWA + Google OAuth popup**
iOS Safari blocks popups in standalone PWA mode for apps added before iOS 16.4. If the user experiences sign-in failures on iOS:
- First try: the `prompt: ''` (silent) flow re-authenticates without a popup if the user was recently signed in to Google in Safari
- If still blocked: tell the user to open the app URL in Safari first, sign in, then use Add to Home Screen — subsequent silent refreshes will work without a popup

**Drive API quotas**
Google Drive API free tier allows 1 billion queries/day. For a personal app, this is irrelevant. No quota management needed.

**Submodule on CI**
The `actions/checkout@v4` step includes `submodules: recursive` — this fetches the pokemondb submodule. Without this, `build-data.ts` would fail because the YAML files would not be present.

**Offline behaviour**
The service worker (via `vite-plugin-pwa` / Workbox) caches the entire app shell. When offline:
- The app loads and displays cached data from the last session (React state is gone on reload, but you can extend to cache Drive data in sessionStorage)
- Drive reads/writes fail gracefully with an error banner
- Pokemon sprites are cached by Workbox after first load

**PWA install prompt (Android Chrome)**
Chrome shows a native "Add to Home Screen" prompt automatically after the user visits the app twice. You can also trigger it manually:
```tsx
// In Layout.tsx — show an install button if the prompt is available
useEffect(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    setInstallPrompt(e as BeforeInstallPromptEvent)
  })
}, [])
```

**iOS install instructions**
iOS has no programmatic install prompt. Add a small "Add to Home Screen" hint banner in the app UI that detects iOS Safari:
```ts
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
const showIOSHint = isIOS && !isStandalone
```

---

## Completion checklist

- [ ] `git submodule status` shows the pokemondb submodule at the correct path
- [ ] `git submodule update --init` completes without errors
- [ ] `scripts/build-data.ts` `VENDOR` constant points to the correct `{submodule-folder}/data` path
- [ ] `npm run build-data` generates all four JSON files; console shows entry counts (expect ~1000+ Pokemon, ~900+ moves)
- [ ] `src/data/pokemon.json` contains entries with `slug`, `name`, `national`, `gen`, `isForm`
- [ ] `src/data/moves.json` contains entries with `slug`, `name`, `type`, `category`, `power`, `accuracy`, `pp`
- [ ] Pokemon autocomplete in BoxPage returns results from `pokemon.yaml` (e.g. typing "peli" suggests Pelipper)
- [ ] Move autocomplete in BoxPage returns results from `moves.yaml` showing name + type badge + category + power
- [ ] Enemy name autocomplete in LogPage works the same as BoxPage Pokemon autocomplete
- [ ] Enemy move autocomplete in LogPage works the same as BoxPage move autocomplete
- [ ] Selecting a Pokemon from autocomplete immediately shows the correct sprite (no loading spinner beyond first paint)
- [ ] `npm run generate-icons` creates icons in `public/icons/`
- [ ] `npm run dev` starts without errors; GIS script loads in browser console
- [ ] Google sign-in popup opens, user can authenticate
- [ ] After sign-in, Drive API calls succeed (check Network tab for `googleapis.com/drive/v3`)
- [ ] Box: add Pokemon with image, 4 moves, ability; edit; delete; data persists after refresh (stored in Drive)
- [ ] Log: select 4 from box with move checkboxes; add enemy team with autocomplete + sprites; set strategy; save
- [ ] Stats: correct win rates, Pokemon performance, enemy frequency
- [ ] History: filter by archetype; expand/collapse; delete with confirm
- [ ] Lighthouse PWA score ≥ 90 in Chrome DevTools
- [ ] App installs on Android via Chrome "Add to Home Screen" prompt
- [ ] App installs on iOS via Safari Share → Add to Home Screen → behaves as standalone
- [ ] GitHub Actions workflow: `submodules: recursive` initialises pokemondb, build passes, deploys to `gh-pages`
- [ ] Deployed app on GitHub Pages: sign-in works (check JavaScript origins in Google Cloud Console)
- [ ] No Firebase dependencies anywhere in the codebase
- [ ] No hardcoded Pokemon or move name arrays anywhere — all come from YAML-sourced JSON