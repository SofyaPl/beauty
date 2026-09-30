/**
 * Русские названия ингредиентов → нормализованные INCI-ключи.
 *
 * Российские производители часто печатают состав по-русски. Без этой
 * таблицы словарь такие составы просто не увидит.
 */
export const RU_TO_INCI: Record<string, string> = {
  // основа
  'вода': 'aqua',
  'вода очищенная': 'aqua',
  'очищенная вода': 'aqua',
  'деионизированная вода': 'aqua',

  // увлажнители
  'глицерин': 'glycerin',
  'пропиленгликоль': 'propylene glycol',
  'мочевина': 'urea',
  'пантенол': 'panthenol',
  'д-пантенол': 'panthenol',
  'бетаин': 'betaine',
  'сорбитол': 'sorbitol',
  'гиалуроновая кислота': 'hyaluronic acid',
  'гиалуронат натрия': 'sodium hyaluronate',
  'аллантоин': 'allantoin',
  'пкк натрия': 'sodium pca',

  // масла и жиры
  'масло кокосовое': 'cocos nucifera oil',
  'кокосовое масло': 'cocos nucifera oil',
  'масло ши': 'butyrospermum parkii butter',
  'масло какао': 'theobroma cacao seed butter',
  'масло виноградной косточки': 'vitis vinifera seed oil',
  'масло подсолнечника': 'helianthus annuus seed oil',
  'масло подсолнечное': 'helianthus annuus seed oil',
  'масло авокадо': 'persea gratissima oil',
  'минеральное масло': 'paraffinum liquidum',
  'вазелин': 'petrolatum',
  'ланолин': 'lanolin',
  'пчелиный воск': 'cera alba',
  'воск эмульсионный': 'emulsifying wax',
  'сквалан': 'squalane',

  // силиконы
  'диметикон': 'dimethicone',
  'циклопентасилоксан': 'cyclopentasiloxane',
  'амодиметикон': 'amodimethicone',

  // ПАВ
  'кокамидопропил бетаин': 'cocamidopropyl betaine',
  'кокамидопропил гидроксисултаин': 'cocamidopropyl hydroxysultaine',
  'динатрий кокоамфодиацетат': 'disodium cocoamphodiacetate',
  'лаурет-5 карбоксилат натрия': 'sodium laureth-5 carboxylate',
  'лаурет-4 карбоксилат калия': 'potassium laureth-4 carboxylate',
  'лаурилсульфат натрия': 'sodium lauryl sulfate',
  'лауретсульфат натрия': 'sodium laureth sulfate',
  'коко-глюкозид': 'coco-glucoside',

  // кислоты и активы
  'азелаиновая кислота': 'azelaic acid',
  'салициловая кислота': 'salicylic acid',
  'молочная кислота': 'lactic acid',
  'гликолевая кислота': 'glycolic acid',
  'лимонная кислота': 'citric acid',
  'стеариновая кислота': 'stearic acid',
  'олеиновая кислота': 'oleic acid',
  'ниацинамид': 'niacinamide',
  'бисаболол': 'bisabolol',
  'токоферол': 'tocopherol',
  'витамин е': 'tocopheryl acetate',
  'коллаген': 'collagen',

  // консерванты
  'метилпарабен': 'methylparaben',
  'этилпарабен': 'ethylparaben',
  'пропилпарабен': 'propylparaben',
  'бутилпарабен': 'butylparaben',
  'феноксиэтанол': 'phenoxyethanol',
  'хлорфенезин': 'chlorphenesin',
  'метилизотиазолинон': 'methylisothiazolinone',
  'метилхлоризотиазолинон': 'methylchloroisothiazolinone',
  'метилхлороизотиазолинон': 'methylchloroisothiazolinone',
  'бензиловый спирт': 'benzyl alcohol',

  // прочее
  'отдушка': 'parfum',
  'ароматизатор': 'parfum',
  'парфюмерная композиция': 'parfum',
  'краситель': 'colorant',
  'карбомер': 'carbomer',
  'поливинилпирролидон': 'pvp',
  'гидроксид калия': 'potassium hydroxide',
  'гидроксид натрия': 'sodium hydroxide',
  'триэтаноламин': 'triethanolamine',
  'ксантановая камедь': 'xanthan gum',
  'альгинат натрия': 'sodium alginate',
  'сок алоэ вера': 'aloe barbadensis leaf juice',
  'гель алоэ вера': 'aloe barbadensis leaf juice',
  'экстракт алоэ': 'aloe barbadensis leaf extract',
  'нафталан обессмоленный': 'naphtalane',
  'спирт': 'alcohol',
  'спирт денатурированный': 'alcohol denat',
  'этиловый спирт': 'ethanol',
  'изопропиловый спирт': 'isopropyl alcohol',

  // протеины — попадают сюда после разбиения списка по запятым
  'гидролизованные белки пшеницы': 'hydrolyzed wheat protein',
  'гидролизованный кератин': 'hydrolyzed keratin',
  'гидролизованные белки': 'hydrolyzed protein',
  'кератин': 'keratin',
}

/** Маркеры того, что перед нами рекламный список, а не INCI. */
export const MARKETING_MARKERS = [
  'косметическая основа',
  'комплекс',
  'пребиотик',
  'активные компоненты',
  'экстракт трав',
  'факторы роста',
  'натуральный увлажняющий фактор',
]
