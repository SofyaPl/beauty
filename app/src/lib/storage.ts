import { emptyData, isAppData, type AppData } from './types'

/**
 * Хранилище подключаемое: приложение работает через этот интерфейс
 * и не знает, где именно лежат данные. Добавить Яндекс.Диск или
 * приватный репозиторий — значит дописать один файл с этими методами,
 * не трогая всё остальное.
 */
export interface StorageAdapter {
  id: string
  title: string
  description: string
  /** готов к работе: настроен и доступен */
  isReady(): boolean
  load(): Promise<AppData | null>
  save(data: AppData): Promise<void>
}

const LS_KEY = 'beauty.data.v1'

/**
 * Память браузера. Работает сразу и без настройки, данные не покидают
 * компьютер. Минус — только этот браузер и потеря при очистке данных
 * сайта, поэтому экспорт лучше делать регулярно.
 */
export const localAdapter: StorageAdapter = {
  id: 'local',
  title: 'Память браузера',
  description:
    'Данные хранятся в этом браузере и никуда не уходят. Настройки не требует. При очистке данных сайта пропадают — поэтому есть выгрузка в файл.',
  isReady: () => typeof localStorage !== 'undefined',
  async load() {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      return isAppData(parsed) ? parsed : null
    } catch {
      return null
    }
  },
  async save(data) {
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  },
}

/**
 * Зарегистрированные хранилища.
 *
 * Следующие на очереди:
 *  - Файл на диске через File System Access API (Chrome/Edge). Источник
 *    правды — JSON в этой же папке на Яндекс.Диске, без сервера.
 *  - Приватный репозиторий на GitHub через Contents API. Даёт историю
 *    изменений профиля, но для ежедневной работы тяжелее файла.
 *
 * Оба реализуются как ещё один объект с теми же методами.
 */
export const ADAPTERS: StorageAdapter[] = [localAdapter]

export async function loadData(adapter: StorageAdapter = localAdapter): Promise<AppData> {
  const loaded = await adapter.load()
  return loaded ?? emptyData()
}

export async function saveData(
  data: AppData,
  adapter: StorageAdapter = localAdapter,
): Promise<void> {
  await adapter.save({ ...data, updatedAt: new Date().toISOString() })
}

/** Выгрузка всех данных одним файлом — для бэкапа и переноса. */
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

/** Чтение файла, выгруженного ранее или отредактированного вручную. */
export async function importFile(file: File): Promise<AppData> {
  const text = await file.text()
  const parsed: unknown = JSON.parse(text)
  if (!isAppData(parsed)) {
    throw new Error('Файл не похож на выгрузку «Полки»: нет version, profile или products.')
  }
  return parsed
}
