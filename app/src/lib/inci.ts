import { SUB_ONE_PERCENT_MARKERS } from '../data/dictionary'
import { MARKETING_MARKERS, RU_TO_INCI } from '../data/synonyms'

export interface Ingredient {
  /** как было написано в исходном списке */
  raw: string
  /** что показываем пользователю */
  display: string
  /** нормализованный ключ для поиска по словарю */
  key: string
  /** 1-based позиция в списке */
  position: number
  /** название было на русском и переведено по таблице */
  translated: boolean
}

export interface ParseResult {
  ingredients: Ingredient[]
  /** индекс первого ингредиента, который почти наверняка ниже 1% */
  subOnePercentFrom: number | null
  /** сомнения в том, что это вообще INCI */
  listWarnings: string[]
}

const CYRILLIC = /[а-яё]/i

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'`*†‡•]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]+$/, '')
    .trim()
}

const stripParens = (s: string) => s.replace(/\([^)]*\)/g, ' ')

/** Русские пояснения в скобках: Urea (мочевина) → Urea */
const stripCyrillicParens = (s: string) =>
  s.replace(/\([^)]*\)/g, (m) => (CYRILLIC.test(m) ? ' ' : m))

function toKey(display: string): { key: string; translated: boolean } {
  const base = normalize(display)
  const noParens = normalize(stripParens(base))

  for (const candidate of [base, noParens]) {
    const mapped = RU_TO_INCI[candidate]
    if (mapped) return { key: mapped, translated: true }
  }
  // если скобки мешают попасть в словарь — пробуем без них
  return { key: noParens || base, translated: false }
}

export function parseInci(input: string): ParseResult {
  const cleaned = input
    // "Water (and) Sodium Trideceth Sulfate (and) ..." — (and) это разделитель
    .replace(/\(\s*and\s*\)/gi, ',')
    .replace(/^\s*(состав продукта)?\s*\(?inci\)?\s*[:：]/i, '')
    .replace(/^\s*(состав|ингредиенты|ingredients)\s*[:：]/i, '')

  const parts = cleaned
    .split(/[,;\n•·]+/)
    .map((p) => stripCyrillicParens(p).trim())
    .filter((p) => p.length > 1)

  const ingredients: Ingredient[] = parts.map((raw, i) => {
    const display = raw.replace(/\s+/g, ' ').replace(/[.,;:]+$/, '').trim()
    const { key, translated } = toKey(display)
    return { raw, display, key, position: i + 1, translated }
  })

  return {
    ingredients,
    subOnePercentFrom: findSubOnePercent(ingredients),
    listWarnings: assessList(input, ingredients),
  }
}

function findSubOnePercent(list: Ingredient[]): number | null {
  const idx = list.findIndex((ing) => SUB_ONE_PERCENT_MARKERS.has(ing.key))
  return idx === -1 ? null : idx
}

/**
 * Проверка на рекламный список. Настоящий INCI начинается с воды,
 * написан латиницей, содержит 15–40 позиций и не содержит процентов.
 */
function assessList(input: string, list: Ingredient[]): string[] {
  const warnings: string[] = []
  if (list.length === 0) return warnings

  const first = list[0].key
  if (first !== 'aqua' && first !== 'water' && first !== 'deionized aqua') {
    warnings.push(
      `Список начинается не с воды, а с «${list[0].display}». У настоящего INCI водного средства первой почти всегда стоит Aqua.`,
    )
  }

  if (list.length < 8) {
    warnings.push(
      `В списке всего ${list.length} позиций. У настоящего состава обычно 15–40 — короткий список почти всегда рекламный.`,
    )
  }

  if (/\d\s*%/.test(input)) {
    warnings.push('В списке есть проценты. В INCI их не пишут, кроме отдельных случаев вроде мочевины.')
  }

  const lower = input.toLowerCase()
  const marker = MARKETING_MARKERS.find((m) => lower.includes(m))
  if (marker) {
    warnings.push(`Встретилось «${marker}» — это не ингредиент. За такой формулировкой прячут эмульгаторы, консерванты и отдушку.`)
  }

  // Русский сам по себе не беда: если всё нашлось в таблице соответствий,
  // список разобран не хуже латинского. Проблема — только неопознанные слова.
  const unknownRu = list.filter((i) => CYRILLIC.test(i.display) && !i.translated)
  if (unknownRu.length > 0) {
    warnings.push(
      `Русские названия, которых нет в таблице соответствий: ${unknownRu.map((i) => i.display).join(', ')}. По ним проверка ничего не скажет.`,
    )
  }

  return warnings
}
