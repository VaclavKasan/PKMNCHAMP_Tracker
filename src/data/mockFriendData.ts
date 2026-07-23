import type { BoxPokemon, Match, MatchTeamSlot, EnemySlot, FriendProfile } from '../types'

// Local-only preview data for the Friends UI — never written to Supabase.
// See useBox/useMatches: requests for MOCK_FRIEND_ID are served from here
// instead of hitting the network, so this "friend" costs nothing to try out
// and leaves no trace once you stop viewing them.

export const MOCK_FRIEND_ID = 'mock-friend-preview'

export const MOCK_FRIEND_PROFILE: FriendProfile = {
  id:          MOCK_FRIEND_ID,
  displayName: 'Ash Ketchum (test friend)',
  avatarUrl:   null,
}

// Deterministic PRNG so the mock dataset looks the same on every visit
// instead of reshuffling every time you open the Friends page.
function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260723)
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
const pickN = <T,>(arr: T[], n: number): T[] => {
  const pool = [...arr]
  const out: T[] = []
  for (let i = 0; i < n && pool.length > 0; i++) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0])
  }
  return out
}

const BOX_SPECIES: Omit<BoxPokemon, 'id' | 'addedAt'>[] = [
  { slug: 'sinistcha', name: 'Sinistcha', national: 1013, isForm: false, types: ['Grass', 'Ghost'], moves: ['Matcha Gotcha', 'Protect', 'Life Dew', 'Rage Powder'], ability: 'Hospitality', item: 'Kasib Berry', nature: 'bold', evTraining: { hp: 32, atk: 0, def: 2, spa: 0, spd: 32, spe: 0 } },
  { slug: 'whimsicott', name: 'Whimsicott', national: 547, isForm: false, types: ['Grass', 'Fairy'], moves: ['Moonblast', 'Encore', 'Protect', 'Tailwind'], ability: 'Prankster', item: 'Focus Sash', nature: 'timid', evTraining: { hp: 2, atk: 0, def: 0, spa: 32, spd: 0, spe: 32 } },
  { slug: 'garchomp', name: 'Garchomp', national: 445, isForm: false, types: ['Dragon', 'Ground'], moves: ['Dragon Claw', 'Protect', 'Earthquake', 'Rock Slide'], ability: 'Rough Skin', item: 'Life Orb', nature: 'adamant', evTraining: { hp: 32, atk: 14, def: 9, spa: 0, spd: 0, spe: 11 } },
  { slug: 'charizard', name: 'Charizard', national: 6, isForm: false, types: ['Fire', 'Flying'], moves: ['Flare Blitz', 'Dragon Claw', 'Dragon Dance', 'Protect'], ability: 'Blaze', item: 'Charizardite X', nature: 'adamant', evTraining: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 } },
  { slug: 'azumarill', name: 'Azumarill', national: 184, isForm: false, types: ['Water', 'Fairy'], moves: ['Play Rough', 'Aqua Jet', 'Protect', 'Belly Drum'], ability: 'Huge Power', item: 'Sitrus Berry', nature: 'adamant', evTraining: { hp: 31, atk: 21, def: 14, spa: 0, spd: 0, spe: 0 } },
  { slug: 'gengar', name: 'Gengar', national: 94, isForm: false, types: ['Ghost', 'Poison'], moves: ['Shadow Ball', 'Sludge Bomb', 'Protect', 'Destiny Bond'], ability: 'Cursed Body', item: 'Gengarite', nature: 'timid', evTraining: { hp: 2, atk: 0, def: 0, spa: 32, spd: 0, spe: 32 } },
]

export const MOCK_FRIEND_BOX: BoxPokemon[] = BOX_SPECIES.map((p, i) => ({
  ...p,
  id:      `${MOCK_FRIEND_ID}-box-${i}`,
  addedAt: new Date(Date.now() - (60 - i) * 86_400_000).toISOString(),
}))

const ENEMY_POOL: Omit<EnemySlot, 'movesUsed' | 'survived' | 'ability' | 'item' | 'kills'>[] = [
  { slug: 'sylveon', name: 'Sylveon', national: 700, isForm: false },
  { slug: 'charizardmegay', name: 'Charizard-Mega-Y', national: 6, isForm: true },
  { slug: 'gengar', name: 'Gengar', national: 94, isForm: false },
  { slug: 'raichu', name: 'Raichu', national: 26, isForm: false },
  { slug: 'incineroar', name: 'Incineroar', national: 727, isForm: false },
  { slug: 'tyranitar', name: 'Tyranitar', national: 248, isForm: false },
  { slug: 'excadrill', name: 'Excadrill', national: 530, isForm: false },
  { slug: 'dragonite', name: 'Dragonite', national: 149, isForm: false },
  { slug: 'kingambit', name: 'Kingambit', national: 983, isForm: false },
  { slug: 'metagross', name: 'Metagross', national: 376, isForm: false },
  { slug: 'grimmsnarl', name: 'Grimmsnarl', national: 861, isForm: false },
  { slug: 'pelipper', name: 'Pelipper', national: 279, isForm: false },
  { slug: 'dragonitemega', name: 'Mega Dragonite', national: 149, isForm: true },
  { slug: 'mudsdale', name: 'Mudsdale', national: 750, isForm: false },
  { slug: 'glaceon', name: 'Glaceon', national: 471, isForm: false },
  { slug: 'raichumegay', name: 'Mega Raichu Y', national: 26, isForm: true },
  { slug: 'archaludon', name: 'Archaludon', national: 1018, isForm: false },
  { slug: 'sableye', name: 'Sableye', national: 302, isForm: false },
  { slug: 'diggersby', name: 'Diggersby', national: 660, isForm: false },
  { slug: 'ninetalesalola', name: 'Ninetales-Alola', national: 38, isForm: true },
  { slug: 'roserade', name: 'Roserade', national: 407, isForm: false },
  { slug: 'blaziken', name: 'Blaziken', national: 257, isForm: false },
  { slug: 'staraptormega', name: 'Mega Staraptor', national: 398, isForm: true },
  { slug: 'basculegion', name: 'Basculegion', national: 902, isForm: false },
  { slug: 'volcarona', name: 'Volcarona', national: 637, isForm: false },
  { slug: 'greninja', name: 'Greninja', national: 658, isForm: false },
  { slug: 'primarina', name: 'Primarina', national: 730, isForm: false },
  { slug: 'sneasler', name: 'Sneasler', national: 903, isForm: false },
  { slug: 'milotic', name: 'Milotic', national: 350, isForm: false },
  { slug: 'venusaur', name: 'Venusaur', national: 3, isForm: false },
]

const STRATEGIES = ['No clear strategy', 'No clear strategy', 'No clear strategy', 'Sun (Charizard)', 'Rain (Pelipper)', 'Trick Room', 'Hyper Voice (Sylveon)', 'Snow (Abomasnow)']
const RANK_IDS = ['pokeball', 'greatball', 'ultraball']
const SEASON_IDS = ['m3', 'm4']
const ENEMY_ITEMS = ['Not known', 'Not known', 'Not known', 'Focus Sash', 'Leftovers', 'Sitrus Berry', 'Life Orb', 'Choice Scarf']
const ENEMY_ABILITIES = ['Not known', 'Not known', 'Intimidate', 'Drought', 'Drizzle', 'Protean', 'Contrary', 'Prankster', 'Multiscale']

function buildMatch(index: number): Match {
  const myTeam: MatchTeamSlot[] = pickN(MOCK_FRIEND_BOX, 4).map(mon => ({
    boxId:     mon.id,
    slug:      mon.slug,
    name:      mon.name,
    national:  mon.national,
    isForm:    mon.isForm,
    movesUsed: pickN(mon.moves, Math.floor(rand() * 3) + 1),
    survived:  rand() > 0.5,
    isMega:    /^(Gengarite|Charizardite)/.test(mon.item) && rand() > 0.5,
    kills:     rand() > 0.6 ? Math.floor(rand() * 4) : 0,
  }))

  const enemyTeam: EnemySlot[] = pickN(ENEMY_POOL, 3 + Math.floor(rand() * 2)).map(mon => ({
    ...mon,
    movesUsed: rand() > 0.4 ? pickN(['Protect', 'Tailwind', 'Rock Slide', 'Ice Beam', 'Fake Out', 'Earthquake'], Math.floor(rand() * 2) + 1) : [],
    survived:  rand() > 0.6,
    ability:   pick(ENEMY_ABILITIES),
    item:      pick(ENEMY_ITEMS),
    kills:     rand() > 0.7 ? Math.floor(rand() * 3) : 0,
  }))

  const daysAgo = 45 - index * 2
  const date = new Date(Date.now() - daysAgo * 86_400_000 - Math.floor(rand() * 43_200_000))
  const hh = String(9 + Math.floor(rand() * 9)).padStart(2, '0')
  const mm = String(Math.floor(rand() * 60)).padStart(2, '0')

  return {
    id:            `${MOCK_FRIEND_ID}-match-${index}`,
    date:          date.toISOString(),
    matchDate:     date.toISOString().slice(0, 10),
    matchTime:     `${hh}:${mm}`,
    starred:       rand() > 0.9,
    myTeam,
    enemyTeam,
    enemyStrategy: pick(STRATEGIES),
    regulation:    'M-B',
    season:        pick(SEASON_IDS),
    rank:          pick(RANK_IDS),
    result:        rand() > 0.45 ? 'win' : 'loss',
    notes:         rand() > 0.85 ? 'ff' : '',
  }
}

export const MOCK_FRIEND_MATCHES: Match[] = Array.from({ length: 24 }, (_, i) => buildMatch(i))
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
