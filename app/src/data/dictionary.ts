/**
 * Общий словарь групп ингредиентов.
 *
 * Здесь только то, что одинаково для всех. Личные правила — что именно
 * считать стоп-листом и для каких зон — живут в данных профиля, а не тут.
 * Публичный репозиторий из-за этого ничего личного не раскрывает.
 */

export type Zone = 'body' | 'feet' | 'hair' | 'face'

export const ZONE_ORDER: Zone[] = ['body', 'feet', 'hair', 'face']

export const ZONES: Record<Zone, string> = {
  body: 'Тело',
  feet: 'Ступни',
  hair: 'Волосы',
  face: 'Лицо',
}

/** Смываемое и несмываемое — разные задачи, даже на одной зоне. */
export type Form = 'rinse' | 'leave'

export const FORM_ORDER: Form[] = ['rinse', 'leave']

export const FORMS: Record<Form, string> = {
  rinse: 'Смываемое',
  leave: 'Несмываемое',
}

/**
 * Насколько группа важна для формы. 0 — не считается (мыло не оцениваем
 * как крем). 1 слабо, 2 средне, 3 сильно.
 */
export type Weight = 0 | 1 | 2 | 3

/** watch — присмотреться, good — искать специально, neutral — просто факт */
export type GroupKind = 'watch' | 'good' | 'neutral'

export interface Group {
  id: string
  title: string
  kind: GroupKind
  /** Для каких зон группа осмысленна. Пусто — для всех. */
  zones?: Zone[]
  weight?: Partial<Record<Form, Weight>>
  note?: string
  /** Точные нормализованные названия. */
  exact?: string[]
  /** Дополнительное правило по форме названия. */
  test?: (key: string) => boolean
}

export function groupWeight(group: Group, form: Form): Weight {
  const set = group.weight?.[form]
  if (set !== undefined) return set
  if (group.kind === 'watch') return 2
  if (group.kind === 'good') return form === 'leave' ? 2 : 0
  return 0
}

const endsWithSilicone = (k: string) => /(cone|conol|siloxane|silanol)$/.test(k)

/** Водорастворимым силикон делает приставка PEG-/PPG- в начале названия. */
const isSolubleSilicone = (k: string) =>
  /^(peg|ppg|bis-peg|bis-ppg|lauryl peg|cetyl peg)/.test(k) || k.includes('copolyol')

const ESSENTIAL_OIL_GENERA = [
  'lavandula', 'melissa', 'mentha', 'melaleuca', 'eucalyptus', 'citrus',
  'cananga', 'rosmarinus', 'cinnamomum', 'pelargonium', 'pogostemon',
  'origanum', 'thymus', 'salvia', 'juniperus', 'pinus', 'syzygium',
]

export const GROUPS: Group[] = [
  {
    id: 'silicone-insoluble',
    title: 'Силиконы нерастворимые',
    kind: 'watch',
    zones: ['hair'],
    weight: { rinse: 3, leave: 2 },
    note: 'Для кудрявого метода исключены: образуют плёнку, которая не смывается водой и накапливается. Циклические (cyclo-) и амодиметикон считаются более спорными, чем остальные.',
    exact: ['polysilicone-11', 'polysilicone-15', 'trimethylsiloxysilicate'],
    test: (k) => endsWithSilicone(k) && !isSolubleSilicone(k),
  },
  {
    id: 'silicone-soluble',
    title: 'Силиконы водорастворимые',
    kind: 'neutral',
    zones: ['hair'],
    note: 'Приставка PEG- или PPG- означает, что силикон смывается водой. В рамках кудрявого метода допустим.',
    test: (k) => endsWithSilicone(k) && isSolubleSilicone(k),
  },

  {
    id: 'sulfate',
    title: 'Сульфатные ПАВ',
    kind: 'watch',
    weight: { rinse: 3, leave: 1 },
    note: 'Sodium Trideceth Sulfate по названию не похож на привычные SLS и SLES, но это сульфат.',
    exact: [
      'sodium lauryl sulfate', 'sodium laureth sulfate',
      'ammonium lauryl sulfate', 'ammonium laureth sulfate',
      'sodium trideceth sulfate', 'sodium myreth sulfate',
      'sodium coco-sulfate', 'sodium cocosulfate',
      'tea-lauryl sulfate', 'mea-lauryl sulfate',
      'sodium c12-15 pareth sulfate', 'sodium cetearyl sulfate',
    ],
    test: (k) => /\bsulfate$/.test(k),
  },
  {
    id: 'olefin-sulfonate',
    title: 'Сульфонаты',
    kind: 'watch',
    weight: { rinse: 3, leave: 1 },
    note: 'Не сульфат, но по жёсткости близок.',
    exact: ['sodium c14-16 olefin sulfonate', 'sodium olefin sulfonate'],
  },
  {
    id: 'mild-surfactant',
    title: 'Мягкие моющие основы',
    kind: 'good',
    weight: { rinse: 3, leave: 0 },
    note: 'Сульфосукцинаты, изетионаты и глюкозиды содержат в названии «sulf» или похожи на ПАВ, но к сульфатам не относятся.',
    exact: [
      'sodium cocoyl isethionate', 'sodium lauroyl methyl isethionate',
      'coco-glucoside', 'decyl glucoside', 'lauryl glucoside', 'caprylyl glucoside',
      'cocamidopropyl betaine', 'cocamidopropyl hydroxysultaine',
      'disodium cocoamphodiacetate', 'sodium lauroamphoacetate',
      'sodium lauroyl sarcosinate', 'sodium cocoyl glutamate',
      'disodium laureth sulfosuccinate', 'disodium lauryl sulfosuccinate',
      'sodium lauryl sulfoacetate', 'sodium methyl cocoyl taurate',
      'sodium laureth-5 carboxylate', 'potassium laureth-4 carboxylate',
      'sodium cocoyl apple amino acids',
    ],
  },

  {
    id: 'pore-clogging-high',
    title: 'Забивают устья фолликулов — высокий приоритет',
    kind: 'watch',
    zones: ['body', 'face'],
    weight: { rinse: 1, leave: 3 },
    note: 'Рейтинги комедогенности получены на кроличьем ухе и не учитывают ни концентрацию, ни остальную формулу. Это повод присмотреться, особенно в первых позициях, а не приговор.',
    exact: [
      'cocos nucifera oil', 'cocos nucifera seed butter', 'coconut oil',
      'isopropyl myristate', 'isopropyl palmitate', 'isopropyl isostearate',
      'myristyl myristate', 'isocetyl stearate', 'laureth-4',
      'octyl stearate', 'butyl stearate', 'decyl oleate',
    ],
  },
  {
    id: 'pore-clogging-mid',
    title: 'Забивают устья фолликулов — средний приоритет',
    kind: 'watch',
    zones: ['body', 'face'],
    weight: { rinse: 0, leave: 2 },
    exact: [
      'theobroma cacao seed butter', 'ethylhexyl palmitate', 'oleic acid',
      'triticum vulgare germ oil', 'lanolin', 'lanolin alcohol', 'acetylated lanolin',
      'linum usitatissimum seed oil', 'algae extract', 'laminaria extract',
    ],
  },

  {
    id: 'drying-alcohol',
    title: 'Спирты-растворители',
    kind: 'watch',
    weight: { rinse: 1, leave: 2 },
    note: 'Имеют значение только в первых позициях. В хвосте списка это следовые количества.',
    exact: [
      'alcohol', 'alcohol denat', 'denatured alcohol', 'ethanol',
      'sd alcohol 40', 'sd alcohol 40-b', 'sd alcohol 39-c',
      'isopropyl alcohol', 'isopropanol', 'methanol',
    ],
  },
  {
    id: 'fatty-alcohol',
    title: 'Жирные спирты',
    kind: 'neutral',
    note: 'Вопреки названию не сушат: это эмоленты и загустители.',
    exact: [
      'cetyl alcohol', 'cetearyl alcohol', 'stearyl alcohol',
      'behenyl alcohol', 'myristyl alcohol', 'lauryl alcohol', 'arachidyl alcohol',
    ],
  },

  {
    id: 'fragrance',
    title: 'Отдушка',
    kind: 'watch',
    weight: { rinse: 1, leave: 2 },
    exact: ['parfum', 'fragrance', 'aroma', 'perfume'],
  },
  {
    id: 'fragrance-allergen',
    title: 'Маркируемые аллергены отдушки',
    kind: 'watch',
    weight: { rinse: 1, leave: 2 },
    note: 'В ЕС их обязаны указывать отдельной строкой. Если такой ингредиент есть — отдушка в средстве есть, даже когда слова Parfum нет.',
    exact: [
      'limonene', 'linalool', 'citronellol', 'geraniol', 'hexyl cinnamal',
      'citral', 'coumarin', 'eugenol', 'isoeugenol', 'benzyl salicylate',
      'benzyl benzoate', 'benzyl cinnamate', 'amyl cinnamal', 'cinnamal',
      'cinnamyl alcohol', 'farnesol', 'hydroxycitronellal', 'anise alcohol',
      'alpha-isomethyl ionone', 'methyl 2-octynoate', 'evernia prunastri',
      'evernia furfuracea', 'amylcinnamyl alcohol',
    ],
  },
  {
    id: 'banned-eu',
    title: 'Запрещено в ЕС',
    kind: 'watch',
    weight: { rinse: 3, leave: 3 },
    note: 'Butylphenyl Methylpropional (Lilial) запрещён с 2022 года. Если встретился — средство старое или несертифицированное.',
    exact: ['butylphenyl methylpropional', 'lilial'],
  },
  {
    id: 'essential-oil',
    title: 'Эфирные масла',
    kind: 'watch',
    weight: { rinse: 1, leave: 3 },
    note: 'Частые источники контактной аллергии. Для зон с высокой реактивностью — повод насторожиться.',
    test: (k) =>
      /\boil$/.test(k) && ESSENTIAL_OIL_GENERA.some((g) => k.startsWith(g)),
  },

  {
    id: 'isothiazolinone',
    title: 'Изотиазолиноны',
    kind: 'watch',
    weight: { rinse: 2, leave: 3 },
    note: 'Заметные контактные аллергены. В ЕС запрещены в несмываемой косметике, в смываемой разрешены с ограничением. Имеет смысл считать, во скольких средствах сразу они встречаются.',
    test: (k) => k.includes('isothiazolinone'),
  },
  {
    id: 'formaldehyde-releaser',
    title: 'Доноры формальдегида',
    kind: 'watch',
    weight: { rinse: 2, leave: 3 },
    exact: [
      'dmdm hydantoin', 'imidazolidinyl urea', 'diazolidinyl urea',
      'quaternium-15', 'sodium hydroxymethylglycinate', 'bronopol',
      'methenamine', '2-bromo-2-nitropropane-1,3-diol',
    ],
  },
  {
    id: 'preservative-calm',
    title: 'Спокойные консерванты',
    kind: 'neutral',
    exact: [
      'phenoxyethanol', 'ethylhexylglycerin', 'sodium benzoate',
      'potassium sorbate', 'benzyl alcohol', 'caprylyl glycol', 'chlorphenesin',
      'methylparaben', 'ethylparaben', 'propylparaben', 'butylparaben',
      'sodium dehydroacetate', 'dehydroacetic acid',
    ],
  },

  {
    id: 'protein',
    title: 'Протеины',
    kind: 'watch',
    zones: ['hair'],
    weight: { rinse: 3, leave: 2 },
    note: 'При ежедневном мытье накапливаются и делают волос жёстче, а жёсткий волос хуже складывается в завиток. Для кожи значения не имеют.',
    exact: ['keratin amino acids', 'keratin', 'silk amino acids'],
    test: (k) => k.startsWith('hydrolyzed') || /белк|протеин/.test(k),
  },

  {
    id: 'moisturizing',
    title: 'Увлажняющее направление',
    kind: 'good',
    weight: { rinse: 0, leave: 3 },
    note: 'Удерживают воду и смягчают роговой слой.',
    exact: [
      'urea', 'glycerin', 'panthenol', 'sodium pca', 'betaine', 'sorbitol',
      'squalane', 'petrolatum', 'allantoin', 'sodium hyaluronate',
      'hyaluronic acid', 'hydroxyethyl urea', 'isopentyldiol',
    ],
    test: (k) => k.startsWith('ceramide'),
  },
  {
    id: 'keratolytic',
    title: 'Кератолитическое направление',
    kind: 'good',
    weight: { rinse: 1, leave: 3 },
    note: 'Снимают уже образовавшиеся роговые пробки. При гиперкератозе обычно обсуждают связку с увлажняющим направлением, а не что-то одно.',
    exact: [
      'lactic acid', 'ammonium lactate', 'glycolic acid', 'salicylic acid',
      'mandelic acid', 'urea', 'gluconolactone', 'protease', 'lipase',
    ],
  },
  {
    id: 'soothing',
    title: 'Против красноты и раздражения',
    kind: 'good',
    zones: ['face'],
    weight: { rinse: 1, leave: 3 },
    exact: [
      'azelaic acid', 'niacinamide', 'panthenol', 'bisabolol', 'allantoin',
      'madecassoside', 'centella asiatica extract', 'centella asiatica leaf extract',
      'glycyrrhiza glabra root extract', 'zinc pca',
    ],
  },
  {
    id: 'uv-filter',
    title: 'Солнцезащитные фильтры',
    kind: 'neutral',
    weight: { rinse: 0, leave: 1 },
    exact: [
      'ethylhexyl methoxycinnamate', 'octocrylene', 'octyl triazone',
      'ethylhexyl triazone', 'bis-ethylhexyloxyphenol methoxyphenyl triazine',
      'diethylamino hydroxybenzoyl hexyl benzoate', 'titanium dioxide',
      'zinc oxide', 'butyl methoxydibenzoylmethane', 'homosalate',
      'ethylhexyl salicylate', 'tris-biphenyl triazine',
    ],
  },
]

/**
 * Ингредиенты, которые обычно вводят в долях процента. Первый такой
 * в списке — приблизительная граница 1%: всё после него в следовых
 * количествах, потому что порядок в INCI обязателен только до 1%.
 */
export const SUB_ONE_PERCENT_MARKERS = new Set([
  'phenoxyethanol', 'disodium edta', 'tetrasodium edta', 'edta',
  'xanthan gum', 'carbomer', 'tocopherol', 'parfum', 'fragrance',
  'sodium benzoate', 'potassium sorbate', 'citric acid',
  'ethylhexylglycerin', 'sodium hydroxide', 'triethanolamine',
  'methylisothiazolinone', 'methylchloroisothiazolinone', 'bht',
  'sodium metabisulfite', 'chlorphenesin', 'caprylyl glycol',
])
