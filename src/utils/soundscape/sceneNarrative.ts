import type { AppLocale } from '@/i18n/types';
import type { LocationContext, RegionType, WaterType } from '@/types/locationContext';

interface LocalizedLabel {
  en: string;
  'zh-CN': string;
}

export interface SoundCue {
  prompt: string;
  label: LocalizedLabel;
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
      prompt: 'cafe terrace conversation, ceramic cups, and a soft door chime from a corner bakery or cafe',
      label: { en: 'cafe terrace cups and chatter', 'zh-CN': '咖啡馆露台杯盘与交谈' },
    },
    {
      prompt: 'bicycles and calm street movement mixed with stone or brick pavement reflections',
      label: { en: 'bicycles on stone streets', 'zh-CN': '石板街上的单车声' },
    },
  ],
  eastern_europe: [
    {
      prompt: 'apartment courtyard voices and metal gates opening or closing',
      label: { en: 'courtyard voices and gates', 'zh-CN': '院落人声与铁门声' },
    },
    {
      prompt: 'tram or trolley movement, light market stall handling, and practical street rhythm',
      label: { en: 'tram hum and market handling', 'zh-CN': '电车低鸣与摊位搬动声' },
    },
  ],
  east_asia: [
    {
      prompt: 'shop door chimes, bicycle freewheels, and low storefront routine',
      label: { en: 'shop chimes and bicycles', 'zh-CN': '店门铃与单车滑行声' },
    },
    {
      prompt: 'crosswalk beeps or station-adjacent cues used lightly and realistically',
      label: { en: 'subtle crossing signals', 'zh-CN': '轻微的人行提示音' },
    },
  ],
  south_asia: [
    {
      prompt: 'tea stall cups, fabric awnings fluttering, and scooters idling in passing',
      label: { en: 'tea stall cups and scooters', 'zh-CN': '茶摊杯具与踏板车声' },
    },
    {
      prompt: 'street-side conversation and utensils from everyday food preparation',
      label: { en: 'street-side cooking sounds', 'zh-CN': '街边备餐器具声' },
    },
  ],
  southeast_asia: [
    {
      prompt: 'food stall utensils, scooters gliding past, and half-open metal shutters',
      label: { en: 'food stalls and scooters', 'zh-CN': '路边摊与踏板车声' },
    },
    {
      prompt: 'covered walkway voices and humid street activity kept light and continuous',
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
      prompt: 'tea glasses, hand carts over stone, and alley voices moving in and out of earshot',
      label: { en: 'tea glasses and alley carts', 'zh-CN': '茶杯与巷道手推车声' },
    },
    {
      prompt: 'woven market life and enclosed street acoustics without theatrical shouting',
      label: { en: 'enclosed street market life', 'zh-CN': '封闭街巷中的市集生活声' },
    },
  ],
  sub_saharan_africa: [
    {
      prompt: 'open-air market greetings, light motorbike movement, and nearby compound life',
      label: { en: 'market greetings and motorbikes', 'zh-CN': '集市招呼声与摩托声' },
    },
    {
      prompt: 'a low neighborhood radio or speaker texture kept far in the background',
      label: { en: 'distant neighborhood radio', 'zh-CN': '远处街区收音机声' },
    },
  ],
  latin_america: [
    {
      prompt: 'plaza conversation, bus brakes sighing, and street food griddle sounds',
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
      prompt: 'cafe verandah talk, bicycles, and breezy waterfront routine where appropriate',
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
      prompt: 'local storefront routine and practical foot traffic rather than novelty effects',
      label: { en: 'storefront routine', 'zh-CN': '日常店铺运作声' },
    },
  ],
  unknown: [
    {
      prompt: 'credible local daily routine and small human-scale movement grounded in the place',
      label: { en: 'credible local daily routine', 'zh-CN': '可信的本地日常声' },
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
    prompt: 'a modest storefront chime with a bicycle rolling past seconds later',
    label: { en: 'a storefront chime and bicycle', 'zh-CN': '店门铃与单车掠过声' },
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
    prompt: 'a passing motorbike and a nearby market greeting caught in one moment',
    label: { en: 'a motorbike and market greeting', 'zh-CN': '摩托掠过与集市招呼声' },
  },
  latin_america: {
    prompt: 'bus brakes easing to a stop while plaza conversation carries nearby',
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
    prompt: 'verandah conversation with a bicycle and a breezy rope strain near the water',
    label: { en: 'verandah voices and dock ropes', 'zh-CN': '门廊人声与码头缆绳声' },
  },
  arctic: {
    prompt: 'a small ice fracture followed by wind reclaiming the space',
    label: { en: 'a brief ice fracture', 'zh-CN': '短促的冰层裂响' },
  },
  global: {
    prompt: 'one recognisable nearby daily-life sound anchored in the local street',
    label: { en: 'one local daily-life detail', 'zh-CN': '一个本地日常细节声' },
  },
  unknown: {
    prompt: 'one realistic nearby daily-life detail that fits this exact place',
    label: { en: 'one realistic local detail', 'zh-CN': '一个真实的本地细节声' },
  },
};

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

export function getSelectedSoundCues(context: LocationContext): SoundCue[] {
  const regionCues = REGION_CUES[context.regionType] ?? REGION_CUES.rural;
  const cultureCues = isEverydayCultureRegion(context.regionType)
    ? (CULTURE_CUES[context.cultureRegion] ?? CULTURE_CUES.unknown)
    : [];
  const waterCue = context.nearWater ? [WATER_CUES[context.nearWater]] : [];

  const ordered = isEverydayCultureRegion(context.regionType)
    ? interleaveEverydayCues(regionCues, cultureCues, waterCue)
    : [...waterCue, ...regionCues, ...cultureCues];

  return dedupeCues(ordered).slice(0, 3);
}

export function getSignatureCue(context: LocationContext): SoundCue {
  return (
    CULTURE_SIGNATURES[context.cultureRegion] ??
    (context.nearWater ? WATER_CUES[context.nearWater] : undefined) ??
    getSelectedSoundCues(context)[0] ??
    REGION_CUES.rural[0]
  );
}

export function getCulturalAtmosphereTone(context: LocationContext): string {
  return CULTURAL_ATMOSPHERE_TONES[context.cultureRegion] ?? 'local acoustic colors';
}

export function getSoundSummary(context: LocationContext, locale: AppLocale): string {
  const cues = getSelectedSoundCues(context);
  const locationName = getSummaryLocationName(context);
  const settingLabel = getSummarySettingLabel(context, locale);

  if (cues.length === 0) {
    return locale === 'zh-CN'
      ? `在${locationName}，会以这类${settingLabel}真实可能出现的日常环境声为主。`
      : `In ${locationName}, the sound stays grounded in everyday ambience that plausibly belongs to this ${settingLabel}.`;
  }

  const labels = cues.map((cue) => cue.label[locale]);
  if (locale === 'zh-CN') {
    if (labels.length === 1) {
      return `在${locationName}，会更接近${settingLabel}的日常声场，以${labels[0]}为主。`;
    }

    if (labels.length === 2) {
      return `在${locationName}，会更接近${settingLabel}的日常声场，以${labels[0]}和${labels[1]}为主。`;
    }

    return `在${locationName}，会更接近${settingLabel}的日常声场，以${labels[0]}、${labels[1]}，以及${labels[2]}为主。`;
  }

  if (labels.length === 1) {
    return `In ${locationName}, expect the everyday sound field of a ${settingLabel}, centered on ${labels[0]}.`;
  }

  if (labels.length === 2) {
    return `In ${locationName}, expect the everyday sound field of a ${settingLabel}, centered on ${labels[0]} and ${labels[1]}.`;
  }

  return `In ${locationName}, expect the everyday sound field of a ${settingLabel}, centered on ${labels[0]}, ${labels[1]}, and ${labels[2]}.`;
}
