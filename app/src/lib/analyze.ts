import { GROUPS, groupWeight, type Form, type Group, type Zone } from '../data/dictionary'
import { parseInci, type Ingredient, type ParseResult } from './inci'
import type { Product, Profile, StopRule } from './types'

export interface GroupHit {
  group: Group
  items: Ingredient[]
  relevantToZone: boolean
  relevantToForm: boolean
  stopRule?: StopRule
}

export type FlagMark = 'exclude' | 'strong' | 'mid' | 'soft' | 'plus' | 'fact'

export const FLAG_LABEL: Record<FlagMark, string> = {
  exclude: 'Исключает',
  strong: 'Сильно мешает',
  mid: 'Мешает',
  soft: 'Слабо',
  plus: 'В плюс',
  fact: 'Факт',
}

const MARK_RANK: Record<FlagMark, number> = {
  exclude: 0,
  strong: 1,
  mid: 2,
  soft: 3,
  plus: 4,
  fact: 5,
}

export interface Flag {
  mark: FlagMark
  title: string
  groupId?: string
  items: Ingredient[]
  note?: string
}

export type VerdictLevel = 'ok' | 'caution' | 'avoid' | 'unclear'
export type CmpKind = 'better' | 'worse' | 'same'

export interface Comparison {
  kind: CmpKind
  headline: string
  against: string
  gained: string[]
  lost: string[]
  plusGained: string[]
}

export interface Analysis {
  parse: ParseResult
  hits: GroupHit[]
  flags: Flag[]
  watchHits: { item: Ingredient; reason: string }[]
  unmatched: Ingredient[]
  level: VerdictLevel
  headline: string
  comparison?: Comparison
}

const EXACT = new Map<string, Set<string>>(
  GROUPS.map((g) => [g.id, new Set(g.exact ?? [])]),
)

function matches(group: Group, key: string): boolean {
  return EXACT.get(group.id)!.has(key) || (group.test?.(key) ?? false)
}

export function isTrace(ing: Ingredient, parse: ParseResult): boolean {
  return parse.subOnePercentFrom !== null && ing.position > parse.subOnePercentFrom
}

export interface AnalyzeOpts {
  zone: Zone
  form: Form
  profile: Profile
  baseline?: Product
}

export function analyze(input: string, opts: AnalyzeOpts): Analysis {
  const { zone, form, profile, baseline } = opts
  const parse = parseInci(input)
  const hits: GroupHit[] = []
  const matchedKeys = new Set<string>()

  for (const group of GROUPS) {
    const items = parse.ingredients.filter((ing) => matches(group, ing.key))
    if (items.length === 0) continue

    items.forEach((i) => matchedKeys.add(i.key))
    const relevantToZone = !group.zones || group.zones.includes(zone)
    const weight = effectiveWeight(group, form, items, parse)
    const relevantToForm = weight > 0
    const stopRule = profile.stopList.find(
      (r) => r.groupId === group.id && r.zones.includes(zone),
    )
    hits.push({ group, items, relevantToZone, relevantToForm, stopRule })
  }

  const watchHits = profile.watch
    .filter((w) => !w.zones?.length || w.zones.includes(zone))
    .flatMap((w) =>
      parse.ingredients
        .filter((ing) => ing.key === w.key)
        .map((item) => ({ item, reason: w.reason })),
    )

  const unmatched = parse.ingredients.filter((ing) => !matchedKeys.has(ing.key))
  const flags = collectFlags(hits, watchHits, form, parse)
  const summary = verdict(parse, flags)

  let comparison: Comparison | undefined
  if (baseline?.inci && summary.level !== 'unclear') {
    const base = analyze(baseline.inci, { zone, form, profile })
    if (base.level !== 'unclear') {
      comparison = compareFlags(flags, base.flags, baseline.name)
    }
  }

  return {
    parse,
    hits,
    flags: summary.level === 'unclear' ? [] : flags,
    watchHits,
    unmatched,
    comparison,
    ...summary,
    headline: comparison ? comparison.headline : summary.headline,
  }
}

function effectiveWeight(
  group: Group,
  form: Form,
  items: Ingredient[],
  parse: ParseResult,
): number {
  const base = groupWeight(group, form)
  if (base === 0) return 0
  const allTrace = items.every((i) => isTrace(i, parse))
  return allTrace ? Math.max(0, base - 1) : base
}

function markFromWeight(weight: number, kind: Group['kind'], stop: boolean): FlagMark | null {
  if (stop) return 'exclude'
  if (weight === 0) return null
  if (kind === 'watch') {
    if (weight >= 3) return 'strong'
    if (weight === 2) return 'mid'
    return 'soft'
  }
  if (kind === 'good') return 'plus'
  return 'fact'
}

function collectFlags(
  hits: GroupHit[],
  watchHits: Analysis['watchHits'],
  form: Form,
  parse: ParseResult,
): Flag[] {
  const fromGroups: Flag[] = []
  for (const hit of hits) {
    if (!hit.relevantToZone) continue
    const weight = effectiveWeight(hit.group, form, hit.items, parse)
    const mark = markFromWeight(weight, hit.group.kind, !!hit.stopRule)
    if (!mark) continue
    fromGroups.push({
      mark,
      title: hit.group.title,
      groupId: hit.group.id,
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

function score(flags: Flag[]): number {
  let n = 0
  for (const f of flags) {
    if (f.mark === 'exclude') n -= 40
    else if (f.mark === 'strong') n -= 12
    else if (f.mark === 'mid') n -= 5
    else if (f.mark === 'soft') n -= 1
    else if (f.mark === 'plus') n += 4
  }
  return n
}

function flagKey(f: Flag): string {
  return f.groupId ?? f.title
}

function compareFlags(next: Flag[], prev: Flag[], against: string): Comparison {
  const nextKeys = new Set(next.filter((f) => f.mark !== 'plus' && f.mark !== 'fact').map(flagKey))
  const prevKeys = new Set(prev.filter((f) => f.mark !== 'plus' && f.mark !== 'fact').map(flagKey))
  const prevPlus = new Set(prev.filter((f) => f.mark === 'plus').map(flagKey))

  const lost = prev
    .filter((f) => f.mark !== 'plus' && f.mark !== 'fact' && !nextKeys.has(flagKey(f)))
    .map((f) => `${FLAG_LABEL[f.mark]}: ${f.title}`)
  const gained = next
    .filter((f) => f.mark !== 'plus' && f.mark !== 'fact' && !prevKeys.has(flagKey(f)))
    .map((f) => `${FLAG_LABEL[f.mark]}: ${f.title}`)
  const plusGained = next
    .filter((f) => f.mark === 'plus' && !prevPlus.has(flagKey(f)))
    .map((f) => f.title)

  const diff = score(next) - score(prev)
  let kind: CmpKind = 'same'
  if (diff >= 4) kind = 'better'
  else if (diff <= -4) kind = 'worse'

  const headline =
    kind === 'better'
      ? `Лучше, чем «${against}»`
      : kind === 'worse'
        ? `Хуже, чем «${against}»`
        : `Примерно как «${against}»`

  return { kind, headline, against, gained, lost, plusGained }
}

function verdict(
  parse: ParseResult,
  flags: Flag[],
): Pick<Analysis, 'level' | 'headline'> {
  if (parse.ingredients.length === 0) {
    return { level: 'unclear', headline: 'Состав не распознан' }
  }

  if (parse.listWarnings.length >= 2) {
    return { level: 'unclear', headline: 'Это не INCI' }
  }

  if (flags.some((f) => f.mark === 'exclude')) {
    return { level: 'avoid', headline: 'Не подходит' }
  }
  if (flags.some((f) => f.mark === 'strong')) {
    return { level: 'caution', headline: 'Есть серьёзные оговорки' }
  }
  if (flags.some((f) => f.mark === 'mid')) {
    return { level: 'caution', headline: 'С оговорками' }
  }
  if (flags.some((f) => f.mark === 'soft')) {
    return { level: 'ok', headline: 'Слабые оговорки' }
  }
  return { level: 'ok', headline: 'Подходит' }
}
