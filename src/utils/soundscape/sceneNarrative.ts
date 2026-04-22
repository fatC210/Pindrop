import type { AppLocale } from '@/i18n/types';
import type { LocationContext, RegionType, WaterType } from '@/types/locationContext';
import type {
  NarrativeAnchorCue,
  SoundscapeNarrativeAnchors,
} from '@/types/soundscapeRecipe';

export type SoundCue = NarrativeAnchorCue;

interface PlaceSoundAnchor {
  aliases: string[];
  countries?: string[];
  cues: SoundCue[];
  signature?: SoundCue;
  atmosphereTone?: string;
}

const REGION_PLACE_DESCRIPTORS: Record<RegionType, string> = {
  city_center: 'a dense city center',
  city_suburb: 'a residential suburb',
  town: 'a small town center',
  village: 'a lived-in rural village',
  rural: 'open countryside',
  wilderness: 'remote wilderness',
  ocean: 'open ocean waters',
  polar: 'a polar landscape',
};

const REGION_CUES: Record<RegionType, SoundCue[]> = {
  city_center: [
    {
      prompt: 'footsteps weaving through the street at varied distances',
      label: { en: 'layered footsteps', 'zh-CN': '层次分明的脚步声' },
    },
    {
      prompt: 'a steady bed of nearby voices and storefront activity',
      label: { en: 'storefront chatter', 'zh-CN': '沿街店铺人声' },
    },
    {
      prompt: 'light bicycle or scooter movement instead of aggressive traffic bursts',
      label: { en: 'light bike or scooter passes', 'zh-CN': '轻微单车或踏板车掠过' },
    },
  ],
  city_suburb: [
    {
      prompt: 'sporadic neighborhood voices drifting across the block',
      label: { en: 'neighborhood voices', 'zh-CN': '街区里的零散人声' },
    },
    {
      prompt: 'a yard gate or front door opening and closing nearby',
      label: { en: 'yard gates and doors', 'zh-CN': '院门与家门开合声' },
    },
    {
      prompt: 'children or a schoolyard appearing only in the distance',
      label: { en: 'distant schoolyard sounds', 'zh-CN': '远处学校或孩童声' },
    },
  ],
  town: [
    {
      prompt: 'a modest town-square murmur with people passing in small groups',
      label: { en: 'town-square murmur', 'zh-CN': '小镇广场低声人群' },
    },
    {
      prompt: 'bicycle chains and tires over the local road surface',
      label: { en: 'bicycle chains on the road', 'zh-CN': '单车链条与路面声' },
    },
    {
      prompt: 'one recognisable local bell or public signal in the distance',
      label: { en: 'a distant local bell', 'zh-CN': '远处的本地钟铃' },
    },
  ],
  village: [
    {
      prompt: 'courtyard work and low voices close to homes',
      label: { en: 'courtyard work sounds', 'zh-CN': '院落劳作声' },
    },
    {
      prompt: 'occasional chickens or domestic animals woven naturally into the space',
      label: { en: 'domestic animals nearby', 'zh-CN': '自然融入的家畜声' },
    },
    {
      prompt: 'hand tools, buckets, or simple everyday tasks rather than dramatic events',
      label: { en: 'simple daily chores', 'zh-CN': '朴素的日常劳作声' },
    },
  ],
  rural: [
    {
      prompt: 'a distant tractor or farm utility vehicle only when it feels plausible',
      label: { en: 'distant farm machinery', 'zh-CN': '远处农机声' },
    },
    {
      prompt: 'livestock carried softly across the fields',
      label: { en: 'soft livestock calls', 'zh-CN': '轻微牲畜声' },
    },
    {
      prompt: 'wind moving across open fields and grasses',
      label: { en: 'wind over fields', 'zh-CN': '田野上的风声' },
    },
  ],
  wilderness: [
    {
      prompt: 'tree canopy movement and shifting wind through the terrain',
      label: { en: 'wind through the terrain', 'zh-CN': '穿过地形的风声' },
    },
    {
      prompt: 'isolated bird calls with long pockets of space between them',
      label: { en: 'spaced bird calls', 'zh-CN': '稀疏的鸟鸣' },
    },
    {
      prompt: 'branches, stones, and ground texture reacting naturally under the weather',
      label: { en: 'branches and ground texture', 'zh-CN': '树枝与地面质感声' },
    },
  ],
  ocean: [
    {
      prompt: 'rope tension, hull creaks, or harbor hardware moving with the water',
      label: { en: 'rigging and hull creaks', 'zh-CN': '缆绳与船体吱呀声' },
    },
    {
      prompt: 'gulls or coastal birds kept believable and not overused',
      label: { en: 'credible coastal birds', 'zh-CN': '自然可信的海鸟声' },
    },
    {
      prompt: 'broad water movement as the main bed of the scene',
      label: { en: 'broad water movement', 'zh-CN': '开阔水面流动声' },
    },
  ],
  polar: [
    {
      prompt: 'slow ice groans and fine cracking textures',
      label: { en: 'slow ice groans', 'zh-CN': '缓慢冰层咯吱声' },
    },
    {
      prompt: 'snow compressed under careful movement',
      label: { en: 'snow underfoot', 'zh-CN': '脚下压雪声' },
    },
    {
      prompt: 'wind occupying wide open space with long moments of quiet',
      label: { en: 'wide open polar wind', 'zh-CN': '开阔极地风声' },
    },
  ],
};

const CULTURE_CUES: Record<string, SoundCue[]> = {
  western_europe: [
    {
      prompt: 'cafe terrace murmur, ceramic cups, and a soft door chime from a corner bakery or cafe',
      label: { en: 'cafe terrace cups and chatter', 'zh-CN': '咖啡馆露台杯盘与交谈' },
    },
    {
      prompt: 'bicycles and calm street movement mixed with stone or brick pavement reflections',
      label: { en: 'bicycles on stone streets', 'zh-CN': '石板街上的单车声' },
    },
  ],
  eastern_europe: [
    {
      prompt: 'apartment courtyard human murmur and metal gates opening or closing',
      label: { en: 'courtyard voices and gates', 'zh-CN': '院落人声与铁门声' },
    },
    {
      prompt: 'tram or trolley movement, light market stall handling, and practical street rhythm',
      label: { en: 'tram hum and market handling', 'zh-CN': '电车低鸣与摊位搬动声' },
    },
  ],
  east_asia: [
    {
      prompt:
        'a shop shutter rolling upward, folding stools scraping lightly, and park-edge human murmur matched to the exact block',
      label: { en: 'a shop opening beside park-side talk', 'zh-CN': '卷闸门拉起与公园边闲谈声' },
    },
    {
      prompt:
        'street-side food preparation, bowls or chopsticks being set down, and crossing cues only when they truly belong to the street',
      label: { en: 'street-side prep with bowls and utensils', 'zh-CN': '街边备餐与碗筷轻碰声' },
    },
  ],
  south_asia: [
    {
      prompt: 'tea stall cups, fabric awnings fluttering, and scooters idling in passing',
      label: { en: 'tea stall cups and scooters', 'zh-CN': '茶摊杯具与踏板车声' },
    },
    {
      prompt: 'street-side human murmur and utensils from everyday food preparation',
      label: { en: 'street-side cooking sounds', 'zh-CN': '街边备餐器具声' },
    },
  ],
  southeast_asia: [
    {
      prompt: 'food stall utensils, scooters gliding past, and half-open metal shutters',
      label: { en: 'food stalls and scooters', 'zh-CN': '路边摊与踏板车声' },
    },
    {
      prompt: 'covered walkway human murmur and humid street activity kept light and continuous',
      label: { en: 'covered walkway voices', 'zh-CN': '骑楼或遮棚下的人声' },
    },
  ],
  middle_east: [
    {
      prompt: 'tea glasses touching softly, shaded courtyard footsteps, and a lived-in market edge',
      label: { en: 'tea glasses and courtyard steps', 'zh-CN': '茶杯轻碰与院落脚步声' },
    },
    {
      prompt: 'vendors and passersby heard as a natural murmur rather than a staged marketplace',
      label: { en: 'natural market-edge murmur', 'zh-CN': '自然的集市边缘低语声' },
    },
  ],
  north_africa: [
    {
      prompt: 'tea glasses, hand carts over stone, and alley human murmur moving in and out of earshot',
      label: { en: 'tea glasses and alley carts', 'zh-CN': '茶杯与巷道手推车声' },
    },
    {
      prompt: 'woven market life and enclosed street acoustics without theatrical shouting',
      label: { en: 'enclosed street market life', 'zh-CN': '封闭街巷中的市集生活声' },
    },
  ],
  sub_saharan_africa: [
    {
      prompt: 'open-air market calls kept indistinct, light motorbike movement, and nearby compound life',
      label: { en: 'market greetings and motorbikes', 'zh-CN': '集市招呼声与摩托声' },
    },
    {
      prompt: 'a low neighborhood radio or speaker texture kept far in the background',
      label: { en: 'distant neighborhood radio', 'zh-CN': '远处街区收音机声' },
    },
  ],
  latin_america: [
    {
      prompt: 'plaza murmur, bus brakes sighing, and street food griddle sounds',
      label: { en: 'plaza talk and bus brakes', 'zh-CN': '广场交谈与公交刹车声' },
    },
    {
      prompt: 'balcony or sidewalk life carrying through the street without sounding festive or staged',
      label: { en: 'sidewalk daily life', 'zh-CN': '街边阳台与人行道生活声' },
    },
  ],
  north_america: [
    {
      prompt: 'coffee shop doors, crosswalk chirps, and practical foot traffic',
      label: { en: 'coffee shop doors and crossing chirps', 'zh-CN': '咖啡店门与过街提示声' },
    },
    {
      prompt: 'bus stop rhythm and sneakers on pavement instead of dramatic traffic noise',
      label: { en: 'bus-stop rhythm and pavement steps', 'zh-CN': '公交站节奏与人行道脚步' },
    },
  ],
  central_asia: [
    {
      prompt: 'bazaar fabric rustle, shared tea cups, and restrained roadside vehicle movement',
      label: { en: 'bazaar cloth and tea cups', 'zh-CN': '市集布料与茶杯声' },
    },
    {
      prompt: 'courtyard life and compact market handling heard at a realistic distance',
      label: { en: 'courtyard and market handling', 'zh-CN': '院落与集市搬动声' },
    },
  ],
  oceania: [
    {
      prompt: 'cafe verandah murmur, bicycles, and breezy waterfront routine where appropriate',
      label: { en: 'verandah talk and bicycles', 'zh-CN': '门廊交谈与单车声' },
    },
    {
      prompt: 'ferry or dockside rope strain used only when the place is actually near water',
      label: { en: 'dockside rope strain', 'zh-CN': '码头缆绳受力声' },
    },
  ],
  arctic: [
    {
      prompt: 'ice shifting, wind, and snow as the dominant physical texture',
      label: { en: 'ice, wind, and snow texture', 'zh-CN': '冰、风与雪的质感声' },
    },
  ],
  global: [
    {
      prompt:
        'a nearby shop or stall opening for the day, with practical footsteps and hand movement that fit the place',
      label: { en: 'a nearby shop or stall opening', 'zh-CN': '附近店铺或小摊开张声' },
    },
  ],
  unknown: [
    {
      prompt:
        'one credible local setup moment with small human-scale movement grounded in the place',
      label: { en: 'one credible local setup moment', 'zh-CN': '一个可信的本地开张细节' },
    },
  ],
};

const CULTURE_SIGNATURES: Record<string, SoundCue> = {
  western_europe: {
    prompt: 'a quick cafe door chime followed by cups set down on a counter',
    label: { en: 'a cafe door chime and cups', 'zh-CN': '咖啡馆门铃与杯盘声' },
  },
  eastern_europe: {
    prompt: 'a tram or trolley bell glancing through an apartment-lined street',
    label: { en: 'a passing tram bell', 'zh-CN': '掠过街道的电车铃声' },
  },
  east_asia: {
    prompt:
      'a street-side breakfast or snack stall rolling up its shutter, setting down bowls or chopsticks, and letting one quick local call blur into the background',
    label: { en: 'a street-side stall opening for the day', 'zh-CN': '街边小摊拉起卷闸门准备开张' },
  },
  south_asia: {
    prompt: 'tea glasses meeting lightly beside a passing scooter',
    label: { en: 'tea glasses and a scooter', 'zh-CN': '茶杯轻碰与踏板车声' },
  },
  southeast_asia: {
    prompt: 'brief utensil handling from a food stall with a scooter passing beyond it',
    label: { en: 'food-stall utensils and a scooter', 'zh-CN': '路边摊器具与踏板车声' },
  },
  middle_east: {
    prompt: 'tea glasses touching softly with distant market foot traffic',
    label: { en: 'tea glasses near a market', 'zh-CN': '集市边的茶杯轻碰声' },
  },
  north_africa: {
    prompt: 'a cart wheel over stone and a brief tea-glass clink in the same alley',
    label: { en: 'cart wheels and tea glasses', 'zh-CN': '手推车与茶杯轻响声' },
  },
  sub_saharan_africa: {
    prompt: 'a passing motorbike and one nearby market call caught as an indistinct moment',
    label: { en: 'a motorbike and market greeting', 'zh-CN': '摩托掠过与集市招呼声' },
  },
  latin_america: {
    prompt: 'bus brakes easing to a stop while plaza murmur carries nearby',
    label: { en: 'bus brakes by the plaza', 'zh-CN': '广场边的公交刹车声' },
  },
  north_america: {
    prompt: 'a coffee shop door opening into a short burst of sidewalk movement',
    label: { en: 'a coffee shop door opening', 'zh-CN': '咖啡店门开启声' },
  },
  central_asia: {
    prompt: 'bazaar fabric shifting with tea cups being set down nearby',
    label: { en: 'bazaar fabric and tea cups', 'zh-CN': '市集布料与茶杯放下声' },
  },
  oceania: {
    prompt: 'verandah murmur with a bicycle and a breezy rope strain near the water',
    label: { en: 'verandah voices and dock ropes', 'zh-CN': '门廊人声与码头缆绳声' },
  },
  arctic: {
    prompt: 'a small ice fracture followed by wind reclaiming the space',
    label: { en: 'a brief ice fracture', 'zh-CN': '短促的冰层裂响' },
  },
  global: {
    prompt:
      'a nearby shop or stall starting the day with one short, place-credible setup sound',
    label: { en: 'a nearby shop or stall starting the day', 'zh-CN': '附近店铺或小摊开始营业' },
  },
  unknown: {
    prompt:
      'one realistic nearby setup moment or small task that fits this exact place',
    label: { en: 'one realistic local setup moment', 'zh-CN': '一个真实的本地开张瞬间' },
  },
};

const PLACE_SOUND_ANCHORS: PlaceSoundAnchor[] = [
  {
    aliases: ['beijing', '北京市'],
    countries: ['china', '中国'],
    cues: [
      {
        prompt:
          'a Beijing street vendor presence around candied hawthorn skewers, with the familiar bing tang hu lu hawker texture staying natural, brief, and not fully intelligible',
        label: {
          en: 'an elder hawking candied hawthorn by bicycle',
          'zh-CN': '老人骑车叫卖冰糖葫芦',
        },
      },
      {
        prompt:
          'older men laughing softly and tapping xiangqi pieces on a park-side table, with no isolated intelligible remarks',
        label: { en: 'park-side xiangqi laughter', 'zh-CN': '公园里下象棋落子和笑谈声' },
      },
      {
        prompt:
          'thermos lids, folding chairs, and slow park footsteps around a Beijing neighborhood park',
        label: { en: 'park thermos and chair movement', 'zh-CN': '公园里暖壶和折叠椅挪动声' },
      },
    ],
    signature: {
      prompt:
        'a familiar Beijing hawker texture for candied hawthorn skewers passing once at natural street distance, brief and not fully intelligible',
      label: {
        en: 'a Beijing candied hawthorn cry passing once',
        'zh-CN': '一声从胡同口掠过的冰糖葫芦叫卖',
      },
    },
    atmosphereTone: 'Beijing park and hutong textures',
  },
  {
    aliases: ['guilin', '桂林'],
    countries: ['china', '中国'],
    cues: [
      {
        prompt:
          'wooden oars dipping and pulling through the Li River beside a small local boat',
        label: { en: 'wooden oars on the Li River', 'zh-CN': '木桨划过漓江水声' },
      },
      {
        prompt:
          'a riverside waterwheel turning with rhythmic splashes and soft wooden creaks',
        label: { en: 'a riverside waterwheel flow', 'zh-CN': '水风车转动与流水声' },
      },
      {
        prompt:
          'soft boatman presence and gentle passenger movement on the river kept natural, unhurried, and not fully intelligible',
        label: { en: 'soft boatman calls on the river', 'zh-CN': '江面轻微的船家招呼声' },
      },
    ],
    signature: {
      prompt:
        'one close wooden oar stroke cutting through Guilin river water with a natural splash',
      label: { en: 'a close Guilin oar stroke', 'zh-CN': '一声贴近的桂林划桨声' },
    },
    atmosphereTone: 'Guilin riverside karst-water textures',
  },
];

const WATER_CUES: Record<WaterType, SoundCue> = {
  sea: {
    prompt: 'salt water surging, receding, and breathing against the shore',
    label: { en: 'sea wash nearby', 'zh-CN': '近处海浪冲刷声' },
  },
  river: {
    prompt: 'river movement close enough to soften the edges of the street',
    label: { en: 'river flow nearby', 'zh-CN': '近处河水流动声' },
  },
  lake: {
    prompt: 'gentle lake water lapping with broad open-air reflections',
    label: { en: 'gentle lake lapping', 'zh-CN': '轻柔湖水拍岸声' },
  },
  canal: {
    prompt: 'slow canal water and the occasional wake touching stone walls',
    label: { en: 'slow canal water', 'zh-CN': '缓慢运河水声' },
  },
};

const CULTURAL_ATMOSPHERE_TONES: Record<string, string> = {
  western_europe: 'western European acoustic colors',
  eastern_europe: 'eastern European street and courtyard colors',
  east_asia: 'East Asian everyday urban textures',
  south_asia: 'South Asian street-side acoustic colors',
  southeast_asia: 'Southeast Asian humid street textures',
  middle_east: 'Middle Eastern courtyard and market colors',
  north_africa: 'North African alley and market colors',
  sub_saharan_africa: 'sub-Saharan neighborhood and market colors',
  latin_america: 'Latin American plaza and sidewalk colors',
  north_america: 'North American sidewalk and coffee-shop colors',
  central_asia: 'Central Asian bazaar and courtyard colors',
  oceania: 'Oceanian verandah and waterfront colors',
  arctic: 'arctic physical textures',
  global: 'local acoustic colors',
  unknown: 'local acoustic colors',
};

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getContextSeed(context: LocationContext, salt: string): number {
  const basis = [
    salt,
    context.countryName,
    context.administrativeRegionName ?? '',
    context.cityName,
    context.regionName ?? '',
    context.regionType,
    context.terrain,
    context.nearWater ?? '',
    context.timeSlot,
    context.coordinates[0].toFixed(3),
    context.coordinates[1].toFixed(3),
  ].join('|');

  return hashString(basis);
}

function selectCueBySeed(cues: SoundCue[], seed: number): SoundCue | null {
  if (cues.length === 0) {
    return null;
  }

  return cues[seed % cues.length] ?? null;
}

function dedupeDefinedCues(...cues: Array<SoundCue | null | undefined>): SoundCue[] {
  return dedupeCues(cues.filter((cue): cue is SoundCue => cue !== null && cue !== undefined));
}

function dedupeCues(cues: SoundCue[]): SoundCue[] {
  const seen = new Set<string>();
  const result: SoundCue[] = [];

  for (const cue of cues) {
    if (seen.has(cue.prompt)) {
      continue;
    }

    seen.add(cue.prompt);
    result.push(cue);
  }

  return result;
}

function normalizeMatchText(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function getContextMatchTexts(context: LocationContext): string[] {
  return [context.cityName, context.regionName, context.countryName]
    .map((value) => normalizeMatchText(value))
    .filter((value): value is string => value.length > 0);
}

function matchAlias(matchTexts: string[], alias: string): boolean {
  const normalizedAlias = normalizeMatchText(alias);
  return normalizedAlias.length > 0 && matchTexts.some((text) => text.includes(normalizedAlias));
}

function getPlaceSoundAnchor(context: LocationContext): PlaceSoundAnchor | null {
  const matchTexts = getContextMatchTexts(context);

  for (const anchor of PLACE_SOUND_ANCHORS) {
    const hasAliasMatch = anchor.aliases.some((alias) => matchAlias(matchTexts, alias));
    if (!hasAliasMatch) {
      continue;
    }

    if (!anchor.countries || anchor.countries.some((country) => matchAlias(matchTexts, country))) {
      return anchor;
    }
  }

  return null;
}

function getProvidedNarrativeCues(
  narrativeAnchors?: SoundscapeNarrativeAnchors | null
): SoundCue[] {
  return narrativeAnchors?.cues ?? [];
}

function isEverydayCultureRegion(regionType: RegionType): boolean {
  return (
    regionType === 'city_center' ||
    regionType === 'city_suburb' ||
    regionType === 'town' ||
    regionType === 'village'
  );
}

function formatLocationName(context: LocationContext): string {
  const city = context.cityName.trim();
  const country = context.countryName.trim();

  if (city && country) {
    return `${city}, ${country}`;
  }

  if (city) {
    return city;
  }

  if (country) {
    return country;
  }

  const [lat, lng] = context.coordinates;
  return `${REGION_PLACE_DESCRIPTORS[context.regionType]} at ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
}

function getSummaryLocationName(context: LocationContext): string {
  const city = context.cityName.trim();
  const country = context.countryName.trim();

  if (city) {
    return city;
  }

  if (country) {
    return country;
  }

  return REGION_PLACE_DESCRIPTORS[context.regionType];
}

function getSummarySettingLabel(context: LocationContext, locale: AppLocale): string {
  const waterPrefix =
    locale === 'zh-CN'
      ? (
          {
            sea: '海边',
            river: '临河',
            lake: '湖边',
            canal: '沿运河',
          } as const
        )[context.nearWater ?? 'river']
      : (
          {
            sea: 'coastal',
            river: 'riverside',
            lake: 'lakeside',
            canal: 'canal-side',
          } as const
        )[context.nearWater ?? 'river'];

  const baseLabel =
    locale === 'zh-CN'
      ? (
          {
            city_center: '城市中心街头',
            city_suburb: '城市街区',
            town: '小镇街口',
            village: '村落周边',
            rural: '乡野地带',
            wilderness: '自然荒野',
            ocean: '海面环境',
            polar: '极地户外',
          } as const
        )[context.regionType]
      : (
          {
            city_center: 'dense city center',
            city_suburb: 'city district',
            town: 'small-town center',
            village: 'lived-in village edge',
            rural: 'open countryside',
            wilderness: 'remote wilderness',
            ocean: 'open water',
            polar: 'polar outdoors',
          } as const
        )[context.regionType];

  if (context.regionType === 'ocean' || context.regionType === 'polar' || context.nearWater === null) {
    return baseLabel;
  }

  return locale === 'zh-CN' ? `${waterPrefix}${baseLabel}` : `${waterPrefix} ${baseLabel}`;
}

function getRuleBasedNarrativeAnchors(context: LocationContext): SoundscapeNarrativeAnchors | null {
  const regionCues = REGION_CUES[context.regionType] ?? REGION_CUES.rural;
  const cultureCues = isEverydayCultureRegion(context.regionType)
    ? (CULTURE_CUES[context.cultureRegion] ?? CULTURE_CUES.unknown)
    : [];
  const waterCue = context.nearWater ? WATER_CUES[context.nearWater] : null;
  const cultureSignature = CULTURE_SIGNATURES[context.cultureRegion] ?? CULTURE_SIGNATURES.unknown;
  const locationName = getSummaryLocationName(context);

  let featuredCue: SoundCue | null = null;
  if (
    waterCue &&
    (context.regionType === 'ocean' ||
      context.terrain === 'river' ||
      context.terrain === 'lake' ||
      context.terrain === 'coast')
  ) {
    featuredCue = waterCue;
  } else if (context.regionType === 'town' || context.regionType === 'village') {
    featuredCue = selectCueBySeed(
      dedupeDefinedCues(regionCues[0], regionCues[1], cultureCues[0], waterCue),
      getContextSeed(context, 'small-place')
    );
  } else if (context.regionType === 'city_suburb') {
    featuredCue = selectCueBySeed(
      dedupeDefinedCues(regionCues[0], cultureCues[0], regionCues[1], waterCue),
      getContextSeed(context, 'suburb')
    );
  } else if (context.regionType === 'city_center') {
    featuredCue = selectCueBySeed(
      dedupeDefinedCues(cultureSignature, cultureCues[0], regionCues[0], cultureCues[1], waterCue),
      getContextSeed(context, 'city-center')
    );
  } else {
    featuredCue = selectCueBySeed(
      dedupeDefinedCues(waterCue, regionCues[0], cultureSignature, cultureCues[0]),
      getContextSeed(context, 'fallback')
    );
  }

  if (!featuredCue) {
    return null;
  }

  const cues = dedupeCues([
    featuredCue,
    ...regionCues,
    ...cultureCues,
    ...(waterCue ? [waterCue] : []),
  ]).slice(0, 3);
  const signature =
    selectCueBySeed(
      dedupeDefinedCues(featuredCue, cultureSignature, cues[1], waterCue),
      getContextSeed(context, 'signature')
    ) ?? featuredCue;

  return {
    source: 'rules',
    confidence: 0.58,
    cues,
    signature,
    atmosphereTone: CULTURAL_ATMOSPHERE_TONES[context.cultureRegion] ?? 'local acoustic colors',
    specificityInstruction: `Center the scene on one precise routine residents of ${locationName} would recognize immediately, especially ${featuredCue.label.en}, and avoid falling back to generic regional stock sounds.`,
  };
}

function interleaveEverydayCues(
  regionCues: SoundCue[],
  cultureCues: SoundCue[],
  waterCue: SoundCue[]
): SoundCue[] {
  const ordered: SoundCue[] = [];

  if (regionCues[0]) {
    ordered.push(regionCues[0]);
  }
  if (cultureCues[0]) {
    ordered.push(cultureCues[0]);
  }
  if (waterCue[0]) {
    ordered.push(waterCue[0]);
  }
  if (regionCues[1]) {
    ordered.push(regionCues[1]);
  }
  if (cultureCues[1]) {
    ordered.push(cultureCues[1]);
  }
  if (regionCues[2]) {
    ordered.push(regionCues[2]);
  }

  return ordered;
}

export function getPromptPlaceDescriptor(context: LocationContext): string {
  const locationName = formatLocationName(context);
  const regionDescriptor = REGION_PLACE_DESCRIPTORS[context.regionType];
  const waterSuffix = context.nearWater ? ` near the ${context.nearWater}` : '';

  if (locationName.includes(' at ')) {
    return `${locationName}${waterSuffix}`;
  }

  return `${locationName}, ${regionDescriptor}${waterSuffix}`;
}

export function getSelectedSoundCues(
  context: LocationContext,
  narrativeAnchors?: SoundscapeNarrativeAnchors | null
): SoundCue[] {
  const effectiveNarrativeAnchors =
    narrativeAnchors ?? getRuleBasedNarrativeAnchors(context);
  const providedCues = getProvidedNarrativeCues(effectiveNarrativeAnchors);
  const placeCues = getPlaceSoundAnchor(context)?.cues ?? [];
  const regionCues = REGION_CUES[context.regionType] ?? REGION_CUES.rural;
  const cultureCues = isEverydayCultureRegion(context.regionType)
    ? (CULTURE_CUES[context.cultureRegion] ?? CULTURE_CUES.unknown)
    : [];
  const waterCue = context.nearWater ? [WATER_CUES[context.nearWater]] : [];

  if (placeCues.length > 0 || providedCues.length > 0) {
    const prioritizedNarrativeCues =
      effectiveNarrativeAnchors?.source === 'llm' ? providedCues : [];
    const secondaryNarrativeCues =
      effectiveNarrativeAnchors?.source === 'llm' ? [] : providedCues;

    return dedupeCues([
      ...prioritizedNarrativeCues,
      ...placeCues,
      ...secondaryNarrativeCues,
      ...waterCue,
      ...regionCues,
      ...cultureCues,
    ]).slice(0, 3);
  }

  const ordered = isEverydayCultureRegion(context.regionType)
    ? interleaveEverydayCues(regionCues, cultureCues, waterCue)
    : [...waterCue, ...regionCues, ...cultureCues];

  return dedupeCues(ordered).slice(0, 3);
}

export function getSignatureCue(
  context: LocationContext,
  narrativeAnchors?: SoundscapeNarrativeAnchors | null
): SoundCue {
  const placeAnchor = getPlaceSoundAnchor(context);
  const effectiveNarrativeAnchors =
    narrativeAnchors ?? getRuleBasedNarrativeAnchors(context);
  const preferNarrativeSignature =
    effectiveNarrativeAnchors?.source === 'llm' &&
    !placeAnchor?.signature &&
    !placeAnchor?.cues[0];

  return (
    (preferNarrativeSignature ? effectiveNarrativeAnchors?.signature : undefined) ??
    (preferNarrativeSignature ? effectiveNarrativeAnchors?.cues[0] : undefined) ??
    placeAnchor?.signature ??
    placeAnchor?.cues[0] ??
    effectiveNarrativeAnchors?.signature ??
    effectiveNarrativeAnchors?.cues[0] ??
    CULTURE_SIGNATURES[context.cultureRegion] ??
    (context.nearWater ? WATER_CUES[context.nearWater] : undefined) ??
    getSelectedSoundCues(context, effectiveNarrativeAnchors)[0] ??
    REGION_CUES.rural[0]
  );
}

export function getCulturalAtmosphereTone(
  context: LocationContext,
  narrativeAnchors?: SoundscapeNarrativeAnchors | null
): string {
  const placeAnchor = getPlaceSoundAnchor(context);
  const effectiveNarrativeAnchors =
    narrativeAnchors ?? getRuleBasedNarrativeAnchors(context);

  if (placeAnchor?.atmosphereTone) {
    return placeAnchor.atmosphereTone;
  }

  if (effectiveNarrativeAnchors?.atmosphereTone) {
    return effectiveNarrativeAnchors.atmosphereTone;
  }

  return CULTURAL_ATMOSPHERE_TONES[context.cultureRegion] ?? 'local acoustic colors';
}

export function getPromptSpecificityInstruction(
  context: LocationContext,
  narrativeAnchors?: SoundscapeNarrativeAnchors | null
): string {
  const locationName = getSummaryLocationName(context);
  const effectiveNarrativeAnchors =
    narrativeAnchors ?? getRuleBasedNarrativeAnchors(context);
  const featuredCue = getSignatureCue(context, effectiveNarrativeAnchors);

  if (effectiveNarrativeAnchors?.specificityInstruction) {
    return effectiveNarrativeAnchors.specificityInstruction;
  }

  if (getPlaceSoundAnchor(context)) {
    return `Prioritize the concrete local anchors above, especially ${featuredCue.label.en}, so the scene is recognisably ${locationName}, not just a generic ${context.cultureRegion.replace(/_/g, ' ')} setting.`;
  }

  return `Center the scene on one precise routine residents of ${locationName} would recognize immediately, such as ${featuredCue.label.en}, and avoid falling back to generic regional stock sounds.`;
}

export function getSoundSummary(
  context: LocationContext,
  locale: AppLocale,
  narrativeAnchors?: SoundscapeNarrativeAnchors | null
): string {
  const cues = getSelectedSoundCues(context, narrativeAnchors);
  const featuredCue = getSignatureCue(context, narrativeAnchors);
  const locationName = getSummaryLocationName(context);
  const settingLabel = getSummarySettingLabel(context, locale);
  const featuredLabel = featuredCue.label[locale];
  const supportingLabels = cues
    .filter((cue) => cue.prompt !== featuredCue.prompt)
    .map((cue) => cue.label[locale])
    .slice(0, 2);

  if (!featuredLabel && cues.length === 0) {
    return locale === 'zh-CN'
      ? `在${locationName}，会围绕贴近${settingLabel}的真实日常细节展开。`
      : `In ${locationName}, the sound stays grounded in everyday ambience that plausibly belongs to this ${settingLabel}.`;
  }

  if (locale === 'zh-CN') {
    if (supportingLabels.length === 0) {
      return `在${locationName}，声音会围绕${featuredLabel}展开，整体贴近${settingLabel}里真实可闻的日常。`;
    }

    if (supportingLabels.length === 1) {
      return `在${locationName}，声音会围绕${featuredLabel}展开，整体贴近${settingLabel}，周围带着${supportingLabels[0]}。`;
    }

    return `在${locationName}，声音会围绕${featuredLabel}展开，整体贴近${settingLabel}，周围带着${supportingLabels[0]}和${supportingLabels[1]}。`;
  }

  if (supportingLabels.length === 0) {
    return `In ${locationName}, the scene revolves around ${featuredLabel}, grounded in the everyday sound of this ${settingLabel}.`;
  }

  if (supportingLabels.length === 1) {
    return `In ${locationName}, the scene revolves around ${featuredLabel}, grounded in the everyday sound of this ${settingLabel}, with ${supportingLabels[0]} around it.`;
  }

  return `In ${locationName}, the scene revolves around ${featuredLabel}, grounded in the everyday sound of this ${settingLabel}, with ${supportingLabels[0]} and ${supportingLabels[1]} around it.`;
}
