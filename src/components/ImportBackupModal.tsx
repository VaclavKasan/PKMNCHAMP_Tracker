import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { parseBackupFile, countExistingData, importBackup, type BackupFile, type ExistingCounts, type ImportResult } from '../utils/importBackup'
import { IconX, IconCheck, IconLoader, IconAlertTriangle, IconUpload } from '@tabler/icons-react'

type Step = 'pick' | 'confirm' | 'importing' | 'done' | 'error'

export function ImportBackupModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const [step, setStep]         = useState<Step>('pick')
  const [backup, setBackup]     = useState<BackupFile | null>(null)
  const [existing, setExisting] = useState<ExistingCounts | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [result, setResult]     = useState<ImportResult | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    try {
      const parsed = parseBackupFile(await file.text())
      const counts = await countExistingData(user.id)
      setBackup(parsed)
      setExisting(counts)
      setStep('confirm')
    } catch (err) {
      setError((err as Error).message)
      setStep('error')
    }
  }

  async function handleConfirm() {
    if (!user || !backup) return
    setStep('importing')
    try {
      setResult(await importBackup(user.id, backup))
      setStep('done')
    } catch (err) {
      setError((err as Error).message)
      setStep('error')
    }
  }

  const hasExisting = !!existing && (existing.box > 0 || existing.matches > 0)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Import backup</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <IconX size={18} />
          </button>
        </div>

        {step === 'pick' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Select a <code className="text-xs bg-gray-100 px-1 rounded">pkmnchamp-backup-*.json</code> file exported earlier.
            </p>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-6 text-sm text-gray-500 cursor-pointer hover:border-blue-300 hover:text-blue-600">
              <IconUpload size={18} />
              Choose file…
              <input type="file" accept=".json" className="hidden" onChange={handleFile} />
            </label>
          </div>
        )}

        {step === 'confirm' && backup && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Found <strong>{backup.box.length}</strong> Pokémon and <strong>{backup.matches.length}</strong> matches
              {backup.exportedAt && <> (exported {backup.exportedAt.split('T')[0]})</>}.
            </p>
            {hasExisting && (
              <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                <IconAlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <span>
                  You already have {existing!.box} Pokémon and {existing!.matches} matches in this account.
                  Importing again may create duplicates.
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Import
              </button>
              <button onClick={onClose} className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="flex flex-col items-center py-6 gap-2 text-gray-500 text-sm">
            <IconLoader size={24} className="animate-spin" />
            Importing…
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <IconCheck size={18} />
              Imported {result.boxCount} Pokémon and {result.matchCount} matches.
            </div>
            <button onClick={onClose} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Done
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-4">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={onClose} className="w-full border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
