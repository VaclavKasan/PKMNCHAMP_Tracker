// ── Game data (from pokemondb JSON) ──────────────────────────────────────────

export interface BaseStats {
  hp: number; atk: number; def: number; spa: number; spd: number; spe: number
}

export interface PokemonEntry {
  slug:       string
  name:       string
  national:   number | undefined
  isForm:     boolean
  types?:     string[]
  baseStats?: BaseStats
  abilities?: string[]
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

export interface StatSpread {
  hp: number; atk: number; def: number; spa: number; spd: number; spe: number
}

export interface BoxPokemon {
  id:          string
  slug:        string
  name:        string
  national:    number | null
  isForm:      boolean
  types?:      string[]
  moves:       string[]
  ability:     string
  item:        string
  nature?:     string      // nature slug (e.g. "timid")
  evTraining?: StatSpread  // training pts per stat (0-32 each, total ≤66)
  addedAt:     string
}

export interface MatchTeamSlot {
  boxId:     string
  slug:      string
  name:      string
  national:  number | null
  isForm:    boolean
  movesUsed: string[]
  survived?: boolean
  isMega?:   boolean
  kills?:    number
}

export interface EnemySlot {
  slug:      string
  name:      string
  national:  number | null
  isForm:    boolean
  movesUsed: string[]
  survived?: boolean
  ability?:  string
  item?:     string
  kills?:    number
}

export interface Match {
  id:            string
  date:          string    // auto-generated ISO timestamp (ordering)
  matchDate?:    string    // user-selected YYYY-MM-DD
  matchTime?:    string    // user-selected HH:MM
  starred?:      boolean
  myTeam:        MatchTeamSlot[]
  enemyTeam:     EnemySlot[]
  enemyStrategy: string
  regulation?:   string
  season?:       string
  rank?:         string
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

// ── Widget dashboard ──────────────────────────────────────────────────────────

export type WidgetId =
  | 'overall'
  | 'vs_strategies'
  | 'strategy_highlights'
  | 'my_performance'
  | 'my_survived'
  | 'enemy_survived'
  | 'enemy_frequency'
  | 'kill_leaders_my'
  | 'kill_leaders_enemy'
  | 'streak'
  | 'stats_by_rank'
  | 'move_usage'
  | 'enemy_items'

export interface WidgetConfig {
  visibleIds: WidgetId[]
}
