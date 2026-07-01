import { useEffect, useRef, useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconCalendar } from '@tabler/icons-react'

interface Props {
  value: string        // YYYY-MM-DD
  onChange: (v: string) => void
}

const DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December']

function isoToDisplay(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function displayToIso(text: string): string | null {
  const match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!match) return null
  const [, d, m, y] = match
  const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  const date = new Date(iso + 'T12:00:00')
  if (isNaN(date.getTime())) return null
  return iso
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export function DatePicker({ value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [inputText, setInputText] = useState(isoToDisplay(value))

  const base = value ? new Date(value + 'T12:00:00') : new Date()
  const [viewYear, setViewYear]   = useState(base.getFullYear())
  const [viewMonth, setViewMonth] = useState(base.getMonth())

  // Sync display text when value changes externally
  useEffect(() => {
    setInputText(isoToDisplay(value))
  }, [value])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const t = e.target.value
    setInputText(t)
    const iso = displayToIso(t)
    if (iso) {
      onChange(iso)
      const d = new Date(iso + 'T12:00:00')
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }

  function handleTextBlur() {
    // Snap back to canonical display if text is invalid
    const iso = displayToIso(inputText)
    if (!iso) setInputText(isoToDisplay(value))
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function buildCells() {
    const first = new Date(viewYear, viewMonth, 1)
    let offset = (first.getDay() + 6) % 7
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells: (number | null)[] = Array(offset).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }

  function selectDay(d: number) {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    onChange(`${viewYear}-${mm}-${dd}`)
    setOpen(false)
  }

  const todayStr = today()
  const cells = buildCells()

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <input
          type="text"
          value={inputText}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          placeholder="DD.MM.YYYY"
          inputMode="numeric"
          className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none min-w-0"
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="px-2 text-gray-400 hover:text-blue-500 flex-shrink-0"
          tabIndex={-1}
        >
          <IconCalendar size={16} />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-72">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 text-gray-600">
              <IconChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-gray-900">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 text-gray-600">
              <IconChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />
              const mm = String(viewMonth + 1).padStart(2, '0')
              const dd = String(d).padStart(2, '0')
              const iso = `${viewYear}-${mm}-${dd}`
              const isSelected = iso === value
              const isToday = iso === todayStr
              return (
                <button
                  key={i}
                  onClick={() => selectDay(d)}
                  className={`text-xs py-1.5 rounded-lg font-medium transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : isToday
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => { onChange(todayStr); setOpen(false) }}
            className="mt-2 w-full text-xs text-blue-600 hover:text-blue-800 py-1"
          >
            Today
          </button>
        </div>
      )}
    </div>
  )
}
