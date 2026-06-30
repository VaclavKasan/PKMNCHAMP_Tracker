export interface Regulation {
  id:    string
  label: string
}

// ── Add future regulations here. The last entry is the new default. ────────────
export const REGULATIONS: Regulation[] = [
  { id: 'M-B', label: 'Reg M-B' },
  // { id: 'M-C', label: 'Reg M-C' },
]

export const DEFAULT_REGULATION = REGULATIONS[REGULATIONS.length - 1].id
