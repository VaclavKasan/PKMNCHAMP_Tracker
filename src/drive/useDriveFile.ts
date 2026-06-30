import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import * as api from './api'
import type { DriveFileState } from '../types'

export function useDriveFile<T>(filename: string, defaultValue: T) {
  const { getValidToken } = useAuth()
  const [state, setState] = useState<DriveFileState<T>>({
    data: null, loading: true, saving: false, error: null,
  })
  const fileIdRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const token = await getValidToken()
        if (!token || cancelled) return

        const files = await api.listAppFiles(token)
        const match = files.find(f => f.name === filename)

        if (!match) {
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
