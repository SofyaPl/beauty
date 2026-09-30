import { isAppData, normalizeData, type AppData } from './types'

export type DiskHandle = FileSystemFileHandle & {
  queryPermission: (d: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission: (d: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
}

declare global {
  interface Window {
    showOpenFilePicker: (options?: {
      types?: { description?: string; accept: Record<string, string[]> }[]
      excludeAcceptAllOption?: boolean
    }) => Promise<DiskHandle[]>
    showSaveFilePicker: (options?: {
      suggestedName?: string
      types?: { description?: string; accept: Record<string, string[]> }[]
    }) => Promise<DiskHandle>
  }
}

const DB = 'beauty'
const STORE = 'handles'
const HANDLE_KEY = 'dataFile'

export function diskSupported(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function readStoredHandle(): Promise<DiskHandle | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(HANDLE_KEY)
    req.onsuccess = () => resolve((req.result as DiskHandle | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
}

async function writeStoredHandle(handle: DiskHandle | null): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = handle ? store.put(handle, HANDLE_KEY) : store.delete(HANDLE_KEY)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function canWrite(handle: DiskHandle, ask: boolean): Promise<boolean> {
  const opts = { mode: 'readwrite' as const }
  if ((await handle.queryPermission(opts)) === 'granted') return true
  if (!ask) return false
  return (await handle.requestPermission(opts)) === 'granted'
}

export async function readDiskFile(handle: DiskHandle): Promise<AppData> {
  const file = await handle.getFile()
  const parsed: unknown = JSON.parse(await file.text())
  if (!isAppData(parsed)) {
    throw new Error('Файл не похож на базу «Полки».')
  }
  return normalizeData(parsed)
}

export async function writeDiskFile(handle: DiskHandle, data: AppData): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()
}

const pickerTypes = [
  {
    description: 'База Полки',
    accept: { 'application/json': ['.json'] },
  },
]

export async function pickExistingDiskFile(): Promise<DiskHandle> {
  const [handle] = await window.showOpenFilePicker({
    types: pickerTypes,
    excludeAcceptAllOption: false,
  })
  if (!(await canWrite(handle, true))) {
    throw new Error('Нет права писать в этот файл.')
  }
  await writeStoredHandle(handle)
  return handle
}

export async function pickNewDiskFile(data: AppData): Promise<DiskHandle> {
  const handle = await window.showSaveFilePicker({
    suggestedName: 'полка-данные.json',
    types: pickerTypes,
  })
  if (!(await canWrite(handle, true))) {
    throw new Error('Нет права писать в этот файл.')
  }
  await writeDiskFile(handle, data)
  await writeStoredHandle(handle)
  return handle
}

export async function restoreDiskHandle(): Promise<DiskHandle | null> {
  const handle = await readStoredHandle()
  if (!handle) return null
  if (!(await canWrite(handle, false))) return null
  return handle
}

export async function forgetDiskHandle(): Promise<void> {
  await writeStoredHandle(null)
}

export { canWrite }
