import type { Form, Zone } from '../data/dictionary'

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
  /** Зоны, где наблюдение действует. Пусто — значит везде. */
  zones?: Zone[]
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

export type ProductEra = 'now' | 'past'

export const ERA_LABEL: Record<ProductEra, string> = {
  now: 'Сейчас',
  past: 'Раньше',
}

export interface Product {
  id: string
  name: string
  brand?: string
  zone: Zone
  status: ProductStatus
  /** Сейчас на полке или уже нет. Как дробить внутри — решим отдельно. */
  era: ProductEra
  /** Смываемое или нет. Если нет в файле — угадываем по категории. */
  form?: Form
  category?: string
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

/** Старые выгрузки без поля era считаем текущей полкой. */
export function inferForm(product: Product): Form {
  const blob = `${product.category ?? ''} ${product.name}`.toLowerCase()
  // Сначала по роли средства: бальзам смывают, как шампунь.
  if (
    /мыл|шампун|умыв|очищен|пудр|гель для душа|синдет|бальзам|кондиционер|ополаскив|хна|окраш/.test(
      blob,
    )
  ) {
    return 'rinse'
  }
  if (product.form === 'rinse' || product.form === 'leave') return product.form
  return 'leave'
}

export function normalizeData(data: AppData): AppData {
  return {
    ...data,
    products: data.products.map((p) => ({
      ...p,
      era: p.era === 'past' ? 'past' : 'now',
      form: inferForm(p),
    })),
  }
}
