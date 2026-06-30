const DRIVE  = 'https://www.googleapis.com/drive/v3'
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
