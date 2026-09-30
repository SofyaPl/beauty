import { emptyData, isAppData, normalizeData, type AppData } from './types'
import {
  canWrite,
  diskSupported,
  forgetDiskHandle,
  pickExistingDiskFile,
  pickNewDiskFile,
  readDiskFile,
  restoreDiskHandle,
  writeDiskFile,
  type DiskHandle,
} from './disk'

/**
 * Хранилище подключаемое: приложение работает через этот интерфейс
 * и не знает, где именно лежат данные.
 *
 * Не публичная ссылка Яндекс.Диска: такую ссылку, вшитую в сайт, любой
 * прочитает в исходниках GitHub. Публичный доступ по ссылке к тому же
 * только на чтение — полку с сайта обратно на Диск не сохранить.
 *
 * Рабочая схема: JSON лежит в папке проекта на Диске. Браузер открывает
 * его через выбор файла (Chrome/Edge) и пишет туда же. Диск сам развозит
 * файл по компьютерам, где он установлен.
 */
export interface StorageAdapter {
  id: string
  title: string
  description: string
  isReady(): boolean
  load(): Promise<AppData | null>
  save(data: AppData): Promise<void>
}

const LS_KEY = 'beauty.data.v1'

export const localAdapter: StorageAdapter = {
  id: 'local',
  title: 'Память браузера',
  description:
    'Данные хранятся в этом браузере. При очистке сайта пропадают — поэтому есть файл на Диске.',
  isReady: () => typeof localStorage !== 'undefined',
  async load() {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      return isAppData(parsed) ? normalizeData(parsed) : null
    } catch {
      return null
    }
  },
  async save(data) {
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  },
}

let diskHandle: DiskHandle | null = null

export function isDiskConnected(): boolean {
  return diskHandle !== null
}

export function isDiskSupported(): boolean {
  return diskSupported()
}

export async function initStorage(): Promise<AppData> {
  if (diskSupported()) {
    diskHandle = await restoreDiskHandle()
    if (diskHandle && (await canWrite(diskHandle, false))) {
      try {
        const fromDisk = await readDiskFile(diskHandle)
        await localAdapter.save(fromDisk)
        return fromDisk
      } catch {
        // файл недоступен — ниже память браузера
      }
    }
  }
  const local = await localAdapter.load()
  return local ?? emptyData()
}

export async function saveData(data: AppData): Promise<void> {
  const stamped = { ...data, updatedAt: new Date().toISOString() }
  await localAdapter.save(stamped)
  if (diskHandle && (await canWrite(diskHandle, false))) {
    await writeDiskFile(diskHandle, stamped)
  }
}

export async function connectExistingFile(): Promise<AppData> {
  diskHandle = await pickExistingDiskFile()
  const data = await readDiskFile(diskHandle)
  await localAdapter.save(data)
  return data
}

export async function connectNewFile(current: AppData): Promise<AppData> {
  const stamped = { ...current, updatedAt: new Date().toISOString() }
  diskHandle = await pickNewDiskFile(stamped)
  await localAdapter.save(stamped)
  return stamped
}

export async function disconnectDisk(): Promise<void> {
  diskHandle = null
  await forgetDiskHandle()
}

export function exportFile(data: AppData): void {
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `полка-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importFile(file: File): Promise<AppData> {
  const parsed: unknown = JSON.parse(await file.text())
  if (!isAppData(parsed)) {
    throw new Error('Файл не похож на выгрузку «Полки»: нет version, profile или products.')
  }
  return normalizeData(parsed)
}
