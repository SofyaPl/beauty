import { GROUPS, type Group, type Zone } from '../data/dictionary'
import { parseInci, type Ingredient, type ParseResult } from './inci'
import type { Profile, StopRule } from './types'

export interface GroupHit {
  group: Group
  items: Ingredient[]
  /** группа существенна для выбранной зоны */
  relevantToZone: boolean
  /** попадает в личный стоп-лист для этой зоны */
  stopRule?: StopRule
}

/** Метка флага. Короткий вердикт собирается из худшей из них. */
export type FlagMark = 'exclude' | 'poor' | 'plus' | 'fact'

export const FLAG_LABEL: Record<FlagMark, string> = {
  exclude: 'Исключает',
  poor: 'Мало подходит',
  plus: 'В плюс',
  fact: 'Факт',
}

const MARK_RANK: Record<FlagMark, number> = {
  exclude: 0,
  poor: 1,
  plus: 2,
  fact: 3,
}

export interface Flag {
  mark: FlagMark
  title: string
  items: Ingredient[]
  note?: string
}

export type VerdictLevel = 'ok' | 'caution' | 'avoid' | 'unclear'

export interface Analysis {
  parse: ParseResult
  hits: GroupHit[]
  flags: Flag[]
  watchHits: { item: Ingredient; reason: string }[]
  unmatched: Ingredient[]
  level: VerdictLevel
  headline: string
}

const EXACT = new Map<string, Set<string>>(
  GROUPS.map((g) => [g.id, new Set(g.exact ?? [])]),
)

function matches(group: Group, key: string): boolean {
  return EXACT.get(group.id)!.has(key) || (group.test?.(key) ?? false)
}

/** Ингредиент стоит ниже границы 1% — то есть в следовых количествах. */
export function isTrace(ing: Ingredient, parse: ParseResult): boolean {
  return parse.subOnePercentFrom !== null && ing.position > parse.subOnePercentFrom
}

export function analyze(input: string, zone: Zone, profile: Profile): Analysis {
  const parse = parseInci(input)
  const hits: GroupHit[] = []
  const matchedKeys = new Set<string>()

  for (const group of GROUPS) {
    const items = parse.ingredients.filter((ing) => matches(group, ing.key))
    if (items.length === 0) continue

    items.forEach((i) => matchedKeys.add(i.key))
    const relevantToZone = !group.zones || group.zones.includes(zone)
    const stopRule = profile.stopList.find(
      (r) => r.groupId === group.id && r.zones.includes(zone),
    )
    hits.push({ group, items, relevantToZone, stopRule })
  }

  const watchHits = profile.watch
    .filter((w) => !w.zones?.length || w.zones.includes(zone))
    .flatMap((w) =>
      parse.ingredients
        .filter((ing) => ing.key === w.key)
        .map((item) => ({ item, reason: w.reason })),
    )

  const unmatched = parse.ingredients.filter((ing) => !matchedKeys.has(ing.key))
  const flags = collectFlags(hits, watchHits)
  const summary = verdict(parse, flags)
  return {
    parse,
    hits,
    flags: summary.level === 'unclear' ? [] : flags,
    watchHits,
    unmatched,
    ...summary,
  }
}

function markFor(hit: GroupHit): FlagMark | null {
  if (hit.stopRule) return 'exclude'
  if (!hit.relevantToZone) return null
  if (hit.group.kind === 'watch') return 'poor'
  if (hit.group.kind === 'good') return 'plus'
  return 'fact'
}

function collectFlags(
  hits: GroupHit[],
  watchHits: Analysis['watchHits'],
): Flag[] {
  const fromGroups: Flag[] = []
  for (const hit of hits) {
    const mark = markFor(hit)
    if (!mark) continue
    fromGroups.push({
      mark,
      title: hit.group.title,
      items: hit.items,
      note: hit.stopRule?.reason ?? hit.group.note,
    })
  }

  const fromWatch: Flag[] = watchHits.map((w) => ({
    mark: 'exclude' as const,
    title: w.item.display,
    items: [w.item],
    note: w.reason,
  }))

  return [...fromWatch, ...fromGroups].sort(
    (a, b) => MARK_RANK[a.mark] - MARK_RANK[b.mark],
  )
}

function verdict(
  parse: ParseResult,
  flags: Flag[],
): Pick<Analysis, 'level' | 'headline'> {
  if (parse.ingredients.length === 0) {
    return { level: 'unclear', headline: 'Состав не распознан' }
  }

  // Рекламный список проверять бессмысленно — сначала нужен настоящий INCI.
  if (parse.listWarnings.length >= 2) {
    return { level: 'unclear', headline: 'Это не INCI' }
  }

  if (flags.some((f) => f.mark === 'exclude')) {
    return { level: 'avoid', headline: 'Не подходит' }
  }
  if (flags.some((f) => f.mark === 'poor')) {
    return { level: 'caution', headline: 'Мало подходит' }
  }
  return { level: 'ok', headline: 'Подходит' }
}
