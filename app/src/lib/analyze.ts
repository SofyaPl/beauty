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

export type VerdictLevel = 'ok' | 'caution' | 'avoid' | 'unclear'

export interface Analysis {
  parse: ParseResult
  hits: GroupHit[]
  watchHits: { item: Ingredient; reason: string }[]
  unmatched: Ingredient[]
  level: VerdictLevel
  headline: string
  reasons: string[]
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

  const watchHits = profile.watch.flatMap((w) =>
    parse.ingredients
      .filter((ing) => ing.key === w.key)
      .map((item) => ({ item, reason: w.reason })),
  )

  const unmatched = parse.ingredients.filter((ing) => !matchedKeys.has(ing.key))

  return { parse, hits, watchHits, unmatched, ...verdict(parse, hits, watchHits) }
}

function verdict(
  parse: ParseResult,
  hits: GroupHit[],
  watchHits: Analysis['watchHits'],
): Pick<Analysis, 'level' | 'headline' | 'reasons'> {
  const reasons: string[] = []

  if (parse.ingredients.length === 0) {
    return { level: 'unclear', headline: 'Состав не распознан', reasons: [] }
  }

  // Рекламный список проверять бессмысленно — сначала нужен настоящий INCI.
  if (parse.listWarnings.length >= 2) {
    return {
      level: 'unclear',
      headline: 'Похоже, это не INCI',
      reasons: parse.listWarnings,
    }
  }

  const stopped = hits.filter((h) => h.stopRule)
  const watchedGroups = hits.filter(
    (h) => !h.stopRule && h.relevantToZone && h.group.kind === 'watch',
  )

  for (const h of stopped) {
    reasons.push(
      `${h.group.title}: ${h.items.map((i) => i.display).join(', ')} — в стоп-листе${h.stopRule?.reason ? `, ${h.stopRule.reason}` : ''}.`,
    )
  }
  for (const w of watchHits) {
    reasons.push(`${w.item.display} — ${w.reason}.`)
  }

  if (stopped.length > 0 || watchHits.length > 0) {
    return { level: 'avoid', headline: 'Скорее мимо', reasons }
  }

  if (watchedGroups.length > 0) {
    for (const h of watchedGroups) {
      const notTrace = h.items.filter((i) => !isTrace(i, parse))
      const shown = (notTrace.length ? notTrace : h.items).map((i) => i.display)
      reasons.push(`${h.group.title}: ${shown.join(', ')}.`)
    }
    return { level: 'caution', headline: 'Посмотреть внимательно', reasons }
  }

  const good = hits.filter((h) => h.group.kind === 'good' && h.relevantToZone)
  for (const h of good) {
    reasons.push(`${h.group.title}: ${h.items.map((i) => i.display).join(', ')}.`)
  }
  return { level: 'ok', headline: 'Ничего настораживающего', reasons }
}
