import type { Zone } from '../data/dictionary'

/** Личное правило: какую группу считать стоп-листом и для каких зон. */
export interface StopRule {
  groupId: string
  zones: Zone[]
  reason?: string
}

/** Отдельный ингредиент под личным наблюдением. */
export interface WatchItem {
  key: string
  reason: string
}

export interface Profile {
  zoneNotes: Partial<Record<Zone, string>>
  stopList: StopRule[]
  watch: WatchItem[]
  notes: string
}

export type ProductStatus =
  | 'works'
  | 'neutral'
  | 'doubt'
  | 'replace'
  | 'finished'
  | 'reacted'

export const STATUS_LABEL: Record<ProductStatus, string> = {
  works: 'Работает',
  neutral: 'Нейтрально',
  doubt: 'Под вопросом',
  replace: 'Пора заменить',
  finished: 'Закончилось',
  reacted: 'Была реакция',
}

export interface Product {
  id: string
  name: string
  brand?: string
  zone: Zone
  status: ProductStatus
  inci: string
  verdict?: string
  notes?: string
  openedAt?: string
  updatedAt: string
}

export interface Check {
  id: string
  createdAt: string
  name?: string
  zone: Zone
  inci: string
  verdict: string
}

/**
 * Единый формат данных. Это же — формат файла для экспорта и импорта,
 * так что его можно править руками на компьютере в любом редакторе.
 */
export interface AppData {
  version: 1
  updatedAt: string
  profile: Profile
  products: Product[]
  checks: Check[]
}

/** Пустые данные. Ничего личного — репозиторий публичный. */
export function emptyData(): AppData {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    profile: { zoneNotes: {}, stopList: [], watch: [], notes: '' },
    products: [],
    checks: [],
  }
}

export function isAppData(value: unknown): value is AppData {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<AppData>
  return v.version === 1 && Array.isArray(v.products) && !!v.profile
}
