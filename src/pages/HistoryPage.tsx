import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMatches } from '../hooks/useMatches'
import { useViewing } from '../context/ViewingContext'
import { PokemonImage } from '../components/PokemonImage'
import { ArchetypeBadge } from '../components/ArchetypeBadge'
import { DatePicker } from '../components/DatePicker'
import { IconChevronDown, IconChevronUp, IconTrash, IconCheck, IconX, IconShield, IconSkull, IconFilter, IconStar, IconStarFilled, IconEdit, IconEye } from '@tabler/icons-react'
import type { Match } from '../types'
import { RANKS, rankBallUrl, SEASONS } from '../utils/regulations'

type ResultFilter = 'all' | 'win' | 'loss'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function matchDisplayDate(m: Match) {
  // Use user-selected date if available, else fall back to auto-timestamp
  return m.matchDate ?? m.date.split('T')[0]
}

function toDisplay(iso: string) {
  if (!iso) return ''
  const [y, mo, d] = iso.split('-')
  return `${d}.${mo}.${y}`
}

export function HistoryPage() {
  const navigate = useNavigate()
  const { viewedUserId, viewedProfile, viewSelf } = useViewing()
  const { matches, loading, saving, readOnly, deleteMatch, toggleStar, bulkSetSeason } = useMatches({ userId: viewedUserId ?? undefined })
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')
  const [starredOnly, setStarredOnly] = useState(false)
  const [archFilter, setArchFilter] = useState<string | null>(null)
  const [seasonFilter, setSeasonFilter] = useState<string | null>(null)
  const [monthFilter, setMonthFilter] = useState<string | null>(null)  // 'YYYY-MM'
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDateFilters, setShowDateFilters] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [massSeasonTarget, setMassSeasonTarget] = useState<string>(SEASONS[SEASONS.length - 1].id)
  const [showMassEdit, setShowMassEdit] = useState(false)
  const [massSaving, setMassSaving] = useState(false)

  // Available months derived from match data
  const availableMonths = useMemo(() => {
    const set = new Set<string>()
    for (const m of matches) {
      const d = matchDisplayDate(m)
      if (d) set.add(d.slice(0, 7))  // 'YYYY-MM'
    }
    return [...set].sort().reverse()
  }, [matches])

  const archetypes = [...new Set(matches.map(m => m.enemyStrategy).filter(Boolean))]

  const filtered = useMemo(() => matches.filter(m => {
    if (resultFilter !== 'all' && m.result !== resultFilter) return false
    if (starredOnly && !m.starred) return false
    if (archFilter && m.enemyStrategy !== archFilter) return false
    if (seasonFilter && (m.season ?? null) !== seasonFilter) return false
    const d = matchDisplayDate(m)
    if (monthFilter && !d.startsWith(monthFilter)) return false
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    return true
  }), [matches, resultFilter, archFilter, seasonFilter, monthFilter, dateFrom, dateTo])

  function clearDateFilters() {
    setMonthFilter(null)
    setDateFrom('')
    setDateTo('')
  }

  const hasDateFilter = !!monthFilter || !!dateFrom || !!dateTo

  async function handleMassSeason() {
    setMassSaving(true)
    try { await bulkSetSeason(massSeasonTarget) } finally { setMassSaving(false); setShowMassEdit(false) }
  }

  async function handleDelete(id: string) {
    await deleteMatch(id)
    setDeleteConfirmId(null)
    if (expandedId === id) setExpandedId(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">Match History</h2>

      {viewedProfile && (
        <div className="flex items-center justify-between gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
          <span className="flex items-center gap-1.5 text-xs text-blue-700">
            <IconEye size={14} />
            Viewing <strong>{viewedProfile.displayName || 'Trainer'}</strong>'s history — read-only
          </span>
          <button onClick={viewSelf} className="text-xs font-medium text-blue-700 underline flex-shrink-0">
            Back to my data
          </button>
        </div>
      )}

      {/* Result filter */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {(['all', 'win', 'loss'] as ResultFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setResultFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              resultFilter === f
                ? f === 'win' ? 'bg-green-100 border-green-300 text-green-800'
                  : f === 'loss' ? 'bg-red-100 border-red-300 text-red-800'
                  : 'bg-blue-100 border-blue-300 text-blue-800'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}

        {/* Starred filter */}
        <button
          onClick={() => setStarredOnly(s => !s)}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            starredOnly
              ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
              : 'border-gray-200 text-gray-600 hover:border-yellow-300'
          }`}
        >
          {starredOnly ? <IconStarFilled size={12} /> : <IconStar size={12} />}
          Starred
        </button>

        {/* Date filter toggle */}
        <button
          onClick={() => setShowDateFilters(s => !s)}
          className={`ml-auto flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            hasDateFilter
              ? 'bg-purple-100 border-purple-300 text-purple-800'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <IconFilter size={12} />
          Date{hasDateFilter ? ' ✓' : ''}
        </button>
      </div>

      {/* Date filter panel */}
      {showDateFilters && (
        <div className="mb-3 bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3">
          {/* Month chips */}
          {availableMonths.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Filter by month</p>
              <div className="flex gap-1.5 flex-wrap">
                {availableMonths.map(ym => {
                  const [y, mo] = ym.split('-')
                  return (
                    <button
                      key={ym}
                      onClick={() => { setMonthFilter(monthFilter === ym ? null : ym); setDateFrom(''); setDateTo('') }}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        monthFilter === ym
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'
                      }`}
                    >
                      {MONTH_NAMES[parseInt(mo, 10) - 1]} {y}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Date range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">From</p>
              <DatePicker value={dateFrom} onChange={v => { setDateFrom(v); setMonthFilter(null) }} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">To</p>
              <DatePicker value={dateTo} onChange={v => { setDateTo(v); setMonthFilter(null) }} />
            </div>
          </div>

          {hasDateFilter && (
            <button onClick={clearDateFilters} className="text-xs text-red-500 hover:text-red-700">
              Clear date filters
            </button>
          )}
        </div>
      )}

      {/* Season filter + mass-edit */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs text-gray-400">Season:</span>
        <button
          onClick={() => setSeasonFilter(null)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            !seasonFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
          }`}
        >
          All
        </button>
        {SEASONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSeasonFilter(seasonFilter === s.id ? null : s.id)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              seasonFilter === s.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
            }`}
          >
            {s.label}
          </button>
        ))}
        {!readOnly && (
          <button
            onClick={() => setShowMassEdit(s => !s)}
            className={`ml-auto text-xs px-2.5 py-1 rounded-full border transition-all ${
              showMassEdit ? 'bg-orange-100 border-orange-300 text-orange-700' : 'border-gray-200 text-gray-500 hover:border-orange-300'
            }`}
          >
            Set all seasons
          </button>
        )}
      </div>

      {/* Mass-edit season panel */}
      {!readOnly && showMassEdit && (
        <div className="mb-3 bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-orange-700">Set ALL {matches.length} matches to one season</p>
          <div className="flex gap-1.5 flex-wrap">
            {SEASONS.map(s => (
              <button
                key={s.id}
                onClick={() => setMassSeasonTarget(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  massSeasonTarget === s.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleMassSeason}
              disabled={massSaving}
              className="flex items-center gap-1 text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {massSaving ? 'Saving…' : `Set all to ${SEASONS.find(s => s.id === massSeasonTarget)?.label}`}
            </button>
            <button
              onClick={() => setShowMassEdit(false)}
              className="text-xs text-gray-500 hover:text-gray-700 px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Archetype chips */}
      {archetypes.length > 0 && (
        <div className="flex gap-1 mb-4 flex-wrap">
          {archetypes.map(arch => (
            <button
              key={arch}
              onClick={() => setArchFilter(archFilter === arch ? null : arch)}
              className={`text-xs transition-opacity ${archFilter && archFilter !== arch ? 'opacity-40' : 'opacity-100'}`}
            >
              <ArchetypeBadge arch={arch} />
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-gray-500 mb-1">No matches found</p>
          <p className="text-sm text-gray-400">
            {matches.length > 0 ? 'Try adjusting filters' : 'Log your first match using the Log tab'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              isExpanded={expandedId === match.id}
              onToggleExpand={() => setExpandedId(expandedId === match.id ? null : match.id)}
              isDeleteConfirm={deleteConfirmId === match.id}
              onDeleteRequest={() => setDeleteConfirmId(match.id)}
              onDeleteConfirm={() => handleDelete(match.id)}
              onDeleteCancel={() => setDeleteConfirmId(null)}
              onToggleStar={() => toggleStar(match.id)}
              onEdit={() => navigate(`/log/edit/${match.id}`)}
              saving={saving}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface MatchCardProps {
  match: Match
  isExpanded: boolean
  onToggleExpand: () => void
  isDeleteConfirm: boolean
  onDeleteRequest: () => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
  onToggleStar: () => void
  onEdit: () => void
  saving: boolean
  readOnly: boolean
}

function MatchCard({ match, isExpanded, onToggleExpand, isDeleteConfirm, onDeleteRequest, onDeleteConfirm, onDeleteCancel, onToggleStar, onEdit, saving, readOnly }: MatchCardProps) {
  const displayDate = toDisplay(matchDisplayDate(match))

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              match.result === 'win' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {match.result === 'win' ? 'WIN' : 'LOSS'}
            </span>
            {match.regulation && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {match.regulation}
              </span>
            )}
            {match.season && (() => {
              const s = SEASONS.find(x => x.id === match.season)
              return s ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {s.label}
                </span>
              ) : null
            })()}
            {match.rank && (() => {
              const r = RANKS.find(x => x.id === match.rank)
              return r ? (
                <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                  <img src={rankBallUrl(r.ballSlug)} className="w-4 h-4 object-contain" alt="" />
                  {r.label}
                </span>
              ) : null
            })()}
            {match.enemyStrategy && <ArchetypeBadge arch={match.enemyStrategy} />}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400">
              {displayDate}{match.matchTime ? ` · ${match.matchTime}` : ''}
            </span>
            {readOnly ? (
              match.starred && <IconStarFilled size={16} className="text-yellow-400" />
            ) : (
              <button
                onClick={onToggleStar}
                className={`transition-colors ${match.starred ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
                title={match.starred ? 'Unstar' : 'Star'}
              >
                {match.starred ? <IconStarFilled size={16} /> : <IconStar size={16} />}
              </button>
            )}
          </div>
        </div>

        {/* My team row */}
        <div className="flex gap-1 mb-2 flex-wrap">
          {match.myTeam.map(slot => (
            <div key={slot.boxId} className="relative">
              <PokemonImage national={slot.national} slug={slot.slug} isForm={slot.isForm} name={slot.name} size="sm" isMega={!!(slot as { isMega?: boolean }).isMega} />
              {slot.isMega && (
                <span className="absolute -top-1 -right-1 text-[8px] bg-yellow-400 rounded-full w-3.5 h-3.5 flex items-center justify-center">⚡</span>
              )}
              {slot.survived !== undefined && (
                <span className={`absolute -bottom-1 -right-1 rounded-full w-3.5 h-3.5 flex items-center justify-center ${
                  slot.survived ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {slot.survived
                    ? <IconShield size={8} className="text-green-600" />
                    : <IconSkull size={8} className="text-red-600" />
                  }
                </span>
              )}
              {!!slot.kills && slot.kills > 0 && (
                <span className="absolute -top-1 -left-1 text-[8px] bg-orange-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold leading-none">
                  {slot.kills}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Enemy team row */}
        {match.enemyTeam.length > 0 && (
          <div className="flex gap-1 mb-2 flex-wrap">
            {match.enemyTeam.filter(s => s.name).map((slot, i) => (
              <div key={i} className="relative">
                <PokemonImage national={slot.national} slug={slot.slug} isForm={slot.isForm} name={slot.name} size="sm" isMega={!!(slot as { isMega?: boolean }).isMega} />
                {slot.survived !== undefined && (
                  <span className={`absolute -bottom-1 -right-1 rounded-full w-3.5 h-3.5 flex items-center justify-center ${
                    slot.survived ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {slot.survived
                      ? <IconShield size={8} className="text-green-600" />
                      : <IconSkull size={8} className="text-red-600" />
                    }
                  </span>
                )}
                {!!slot.kills && slot.kills > 0 && (
                  <span className="absolute -top-1 -left-1 text-[8px] bg-orange-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold leading-none">
                    {slot.kills}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Notes preview */}
        {match.notes && !isExpanded && (
          <p className="text-xs text-gray-500 truncate">{match.notes}</p>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between mt-2">
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600"
          >
            {isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            {isExpanded ? 'Less' : 'Details'}
          </button>

          {readOnly ? null : isDeleteConfirm ? (
            <div className="flex gap-1">
              <button
                onClick={onDeleteConfirm}
                disabled={saving}
                className="flex items-center gap-1 text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 disabled:opacity-50"
              >
                <IconCheck size={12} />Delete
              </button>
              <button
                onClick={onDeleteCancel}
                className="flex items-center gap-1 text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded hover:bg-gray-50"
              >
                <IconX size={12} />Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={onEdit} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-600">
                <IconEdit size={14} />Edit
              </button>
              <button onClick={onDeleteRequest} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600">
                <IconTrash size={14} />Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-3 bg-gray-50 space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">My team:</p>
            <div className="space-y-2">
              {match.myTeam.map(slot => (
                <div key={slot.boxId} className="flex items-start gap-2">
                  <PokemonImage national={slot.national} slug={slot.slug} isForm={slot.isForm} name={slot.name} size="sm" isMega={!!(slot as { isMega?: boolean }).isMega} />
                  <div className="flex-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      <p className="text-xs font-medium text-gray-700">{slot.name}</p>
                      {slot.isMega && <span className="text-xs text-yellow-700 bg-yellow-100 px-1 rounded">⚡ Mega</span>}
                      {slot.survived !== undefined && (
                        <span className={`text-xs px-1 rounded flex items-center gap-0.5 ${slot.survived ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                          {slot.survived ? <><IconShield size={9} />Survived</> : <><IconSkull size={9} />Died</>}
                        </span>
                      )}
                      {!!slot.kills && slot.kills > 0 && (
                        <span className="text-xs text-orange-700 bg-orange-100 px-1 rounded font-semibold">
                          ☠ {slot.kills}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {slot.movesUsed.length > 0
                        ? slot.movesUsed.map(m => (
                            <span key={m} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{m}</span>
                          ))
                        : <span className="text-xs text-gray-400">No moves recorded</span>
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {match.enemyTeam.some(s => s.name) && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Enemy team:</p>
              <div className="space-y-2">
                {match.enemyTeam.filter(s => s.name).map((slot, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <PokemonImage national={slot.national} slug={slot.slug} isForm={slot.isForm} name={slot.name} size="sm" isMega={!!(slot as { isMega?: boolean }).isMega} />
                    <div className="flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <p className="text-xs font-medium text-gray-700">{slot.name}</p>
                        {slot.survived !== undefined && (
                          <span className={`text-xs px-1 rounded flex items-center gap-0.5 ${slot.survived ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                            {slot.survived ? <><IconShield size={9} />Survived</> : <><IconSkull size={9} />Died</>}
                          </span>
                        )}
                        {!!slot.kills && slot.kills > 0 && (
                          <span className="text-xs text-orange-700 bg-orange-100 px-1 rounded font-semibold">
                            ☠ {slot.kills}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {slot.movesUsed.length > 0
                          ? slot.movesUsed.map(m => (
                              <span key={m} className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">{m}</span>
                            ))
                          : <span className="text-xs text-gray-400">No moves recorded</span>
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {match.notes && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Notes:</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{match.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
