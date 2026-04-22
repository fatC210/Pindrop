import type {
  RegionType,
  SceneType,
  TerrainType,
  WaterType,
} from '@/types/locationContext';
import type { NominatimResponse } from '@/utils/nominatim';

export interface SceneInference {
  sceneType: SceneType;
  sceneConfidence: number;
  sceneTags: string[];
}

interface SceneBasis {
  regionType: RegionType;
  terrain: TerrainType;
  nearWater: WaterType | null;
  urbanDensity: number;
}

interface SceneKeywordRule {
  sceneType: SceneType;
  weight: number;
  tag: string;
  patterns: RegExp[];
}

const SCENE_KEYWORD_RULES: readonly SceneKeywordRule[] = [
  {
    sceneType: 'coastal_waterfront',
    weight: 3.4,
    tag: 'coast',
    patterns: [
      /\bcoast(?:al)?\b/i,
      /\bbeach\b/i,
      /\bshore\b/i,
      /\bseafront\b/i,
      /\bpromenade\b/i,
      /\bbay\b/i,
      /\boceanfront\b/i,
      /海边|海岸|沙滩|滨海|海滨/,
    ],
  },
  {
    sceneType: 'riverfront',
    weight: 3.1,
    tag: 'river',
    patterns: [
      /\briver(?:side)?\b/i,
      /\bwaterfront\b/i,
      /\bembankment\b/i,
      /\bcreek\b/i,
      /\bcanal\b/i,
      /\bquay\b/i,
      /\bboardwalk\b/i,
      /江边|河边|沿河|河岸|运河|滨江/,
    ],
  },
  {
    sceneType: 'harbor',
    weight: 3.6,
    tag: 'harbor',
    patterns: [
      /\bharb[o]?u?r\b/i,
      /\bport\b/i,
      /\bpier\b/i,
      /\bdock\b/i,
      /\bwharf\b/i,
      /\bmarina\b/i,
      /\bferry\b/i,
      /港口|码头|渡口|船坞|游艇码头/,
    ],
  },
  {
    sceneType: 'transit_hub',
    weight: 3.8,
    tag: 'transit',
    patterns: [
      /\bstation\b/i,
      /\bterminal\b/i,
      /\bplatform\b/i,
      /\bmetro\b/i,
      /\bsubway\b/i,
      /\brail(?:way)?\b/i,
      /\btram\b/i,
      /\bbus\s+station\b/i,
      /\bairport\b/i,
      /地铁|车站|火车站|高铁站|轻轨|公交枢纽|机场|站台/,
    ],
  },
  {
    sceneType: 'park',
    weight: 3.4,
    tag: 'park',
    patterns: [
      /\bpark\b/i,
      /\bgarden\b/i,
      /\bgreen\b/i,
      /\bbotanic(?:al)?\b/i,
      /\bplayground\b/i,
      /\bcommon\b/i,
      /公园|花园|绿地|植物园|湿地|游园/,
    ],
  },
  {
    sceneType: 'campus',
    weight: 3.4,
    tag: 'campus',
    patterns: [
      /\buniversit(?:y|ies)\b/i,
      /\bcollege\b/i,
      /\bschool\b/i,
      /\bacademy\b/i,
      /\bcampus\b/i,
      /\blibrary\b/i,
      /大学|学院|校园|学校|图书馆/,
    ],
  },
  {
    sceneType: 'commercial_district',
    weight: 3.2,
    tag: 'market',
    patterns: [
      /\bmarket\b/i,
      /\bbazaar\b/i,
      /\bmall\b/i,
      /\bshopping\b/i,
      /\bretail\b/i,
      /\bplaza\b/i,
      /\bsquare\b/i,
      /\bpedestrian\b/i,
      /\bshop(?:ping)?\b/i,
      /商业街|步行街|商场|市场|集市|广场|购物/,
    ],
  },
  {
    sceneType: 'urban_main_road',
    weight: 3,
    tag: 'traffic',
    patterns: [
      /\bavenue\b/i,
      /\bboulevard\b/i,
      /\bexpressway\b/i,
      /\bmotorway\b/i,
      /\bhighway\b/i,
      /\bring\s+road\b/i,
      /\bintersection\b/i,
      /\bjunction\b/i,
      /\bmain\s+road\b/i,
      /大道|主干道|高架|快速路|立交|十字路口|环路/,
    ],
  },
  {
    sceneType: 'residential_block',
    weight: 3,
    tag: 'residential',
    patterns: [
      /\bresidential\b/i,
      /\bneighbo[u]?rhood\b/i,
      /\bsuburb\b/i,
      /\bestate\b/i,
      /\bapartment\b/i,
      /\bhousing\b/i,
      /\bcommunity\b/i,
      /\bcourtyard\b/i,
      /\bcompound\b/i,
      /住宅区|居民区|小区|社区|家属院|公寓|院落/,
    ],
  },
  {
    sceneType: 'historic_quarter',
    weight: 3.1,
    tag: 'historic',
    patterns: [
      /\bhistoric\b/i,
      /\bold\s+town\b/i,
      /\bheritage\b/i,
      /\bfort\b/i,
      /\bcastle\b/i,
      /\bcathedral\b/i,
      /\btemple\b/i,
      /\bmosque\b/i,
      /\bgate\b/i,
      /\bhutong\b/i,
      /古城|老城|古镇|历史街区|牌坊|寺|庙|胡同/,
    ],
  },
  {
    sceneType: 'industrial_edge',
    weight: 3.1,
    tag: 'industrial',
    patterns: [
      /\bindustrial\b/i,
      /\bfactory\b/i,
      /\bwarehouse\b/i,
      /\blogistics\b/i,
      /\bplant\b/i,
      /\bdepot\b/i,
      /\bworkshop\b/i,
      /工业区|厂区|仓库|物流园|园区/,
    ],
  },
  {
    sceneType: 'rural_fields',
    weight: 3.1,
    tag: 'fields',
    patterns: [
      /\bfarm\b/i,
      /\bfarmland\b/i,
      /\bfield\b/i,
      /\bmeadow\b/i,
      /\bpasture\b/i,
      /\borchard\b/i,
      /\bvineyard\b/i,
      /\bgrassland\b/i,
      /农田|田野|牧场|果园|稻田|草场/,
    ],
  },
  {
    sceneType: 'forest_path',
    weight: 3.2,
    tag: 'forest',
    patterns: [
      /\bforest\b/i,
      /\bwoods?\b/i,
      /\bwoodland\b/i,
      /\bgrove\b/i,
      /\btrail\b/i,
      /\breserve\b/i,
      /\bnational\s+park\b/i,
      /森林|林地|林间|山林|步道|自然保护区/,
    ],
  },
  {
    sceneType: 'mountain_path',
    weight: 3.2,
    tag: 'mountain',
    patterns: [
      /\bmountain\b/i,
      /\bhill\b/i,
      /\bpeak\b/i,
      /\bsummit\b/i,
      /\bridge\b/i,
      /\bpass\b/i,
      /\blookout\b/i,
      /\bvalley\b/i,
      /山口|山路|山顶|山谷|观景台|峰/,
    ],
  },
];

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function normalizeCorpusEntry(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function pushTag(tags: string[], nextTag: string): void {
  if (nextTag && !tags.includes(nextTag)) {
    tags.push(nextTag);
  }
}

function getFallbackSceneType(
  regionType: RegionType,
  terrain: TerrainType,
  nearWater: WaterType | null
): SceneType {
  if (regionType === 'ocean') {
    return 'open_water';
  }

  if (regionType === 'polar') {
    return 'polar_outpost';
  }

  if (nearWater === 'sea' || terrain === 'coast') {
    return 'coastal_waterfront';
  }

  if (nearWater === 'river' || nearWater === 'canal' || terrain === 'river') {
    return 'riverfront';
  }

  if (terrain === 'lake') {
    return 'riverfront';
  }

  if (terrain === 'forest' || terrain === 'jungle') {
    return 'forest_path';
  }

  if (terrain === 'mountain') {
    return 'mountain_path';
  }

  if (regionType === 'city_center') {
    return 'urban_main_road';
  }

  if (regionType === 'city_suburb') {
    return 'residential_block';
  }

  if (regionType === 'town') {
    return 'commercial_district';
  }

  return 'rural_fields';
}

function collectCorpus(response: NominatimResponse): string {
  const addressEntries = Object.entries(response.address ?? {}).flatMap(([key, value]) => {
    const normalizedValue = normalizeCorpusEntry(value);
    return normalizedValue ? [key.replace(/_/g, ' '), normalizedValue] : [key.replace(/_/g, ' ')];
  });

  return [
    response.display_name,
    response.name,
    response.category,
    response.type,
    response.addresstype,
    ...addressEntries,
  ]
    .map((value) => normalizeCorpusEntry(value))
    .filter(Boolean)
    .join(' | ');
}

function applyPriorScores(
  scores: Map<SceneType, number>,
  tags: string[],
  basis: SceneBasis
): void {
  const addScore = (sceneType: SceneType, weight: number, tag?: string): void => {
    scores.set(sceneType, (scores.get(sceneType) ?? 0) + weight);
    if (tag) {
      pushTag(tags, tag);
    }
  };

  switch (basis.regionType) {
    case 'city_center':
      addScore('urban_main_road', 1.9, 'city');
      addScore('commercial_district', 1.7, 'street');
      break;
    case 'city_suburb':
      addScore('residential_block', 2.2, 'residential');
      addScore('park', 0.7, 'green');
      break;
    case 'town':
      addScore('commercial_district', 1.7, 'town-center');
      addScore('historic_quarter', 1.1, 'old-street');
      addScore('residential_block', 0.9, 'residential');
      break;
    case 'village':
      addScore('rural_fields', 2.2, 'village');
      addScore('residential_block', 1.1, 'courtyard');
      break;
    case 'rural':
      addScore('rural_fields', 2.5, 'fields');
      break;
    case 'wilderness':
      addScore('forest_path', 1.7, 'wild');
      addScore('mountain_path', 0.9, 'trail');
      break;
    case 'ocean':
      addScore('open_water', 3.8, 'open-water');
      break;
    case 'polar':
      addScore('polar_outpost', 4, 'polar');
      break;
    default:
      break;
  }

  switch (basis.terrain) {
    case 'coast':
      addScore('coastal_waterfront', 2.8, 'coast');
      addScore('harbor', 0.8, 'waterfront');
      break;
    case 'river':
    case 'lake':
      addScore('riverfront', 2.5, 'waterfront');
      break;
    case 'forest':
    case 'jungle':
      addScore('forest_path', 2.8, 'forest');
      break;
    case 'mountain':
      addScore('mountain_path', 2.8, 'mountain');
      break;
    default:
      break;
  }

  if (basis.nearWater === 'sea') {
    addScore('coastal_waterfront', 1.8, 'sea');
    addScore('harbor', 0.9, 'pier');
  } else if (basis.nearWater === 'river' || basis.nearWater === 'canal') {
    addScore('riverfront', 1.7, 'river');
  } else if (basis.nearWater === 'lake') {
    addScore('riverfront', 1.3, 'lakeside');
  }

  if (basis.urbanDensity >= 0.8) {
    addScore('urban_main_road', 0.8, 'dense');
    addScore('commercial_district', 0.6, 'busy');
  } else if (basis.urbanDensity <= 0.2) {
    addScore('rural_fields', 0.8, 'quiet');
  }
}

function calculateConfidence(
  topScore: number,
  secondScore: number
): number {
  return clamp01(0.42 + Math.min(0.3, topScore / 12) + Math.min(0.2, (topScore - secondScore) / 6));
}

export function inferLocalScene(
  response: NominatimResponse,
  basis: SceneBasis
): SceneInference {
  const scores = new Map<SceneType, number>();
  const tags: string[] = [];
  const corpus = collectCorpus(response);

  applyPriorScores(scores, tags, basis);

  for (const rule of SCENE_KEYWORD_RULES) {
    if (!rule.patterns.some((pattern) => pattern.test(corpus))) {
      continue;
    }

    scores.set(rule.sceneType, (scores.get(rule.sceneType) ?? 0) + rule.weight);
    pushTag(tags, rule.tag);
  }

  const fallbackSceneType = getFallbackSceneType(
    basis.regionType,
    basis.terrain,
    basis.nearWater
  );
  scores.set(fallbackSceneType, (scores.get(fallbackSceneType) ?? 0) + 0.6);

  const rankedScenes = Array.from(scores.entries()).sort((left, right) => right[1] - left[1]);
  const [topSceneType, topScore] = rankedScenes[0] ?? [fallbackSceneType, 1];
  const secondScore = rankedScenes[1]?.[1] ?? 0;

  if (tags.length === 0) {
    pushTag(tags, topSceneType.replace(/_/g, '-'));
  }

  return {
    sceneType: topSceneType,
    sceneConfidence: calculateConfidence(topScore, secondScore),
    sceneTags: [topSceneType.replace(/_/g, '-'), ...tags.filter((tag) => tag !== topSceneType.replace(/_/g, '-'))].slice(0, 6),
  };
}

export const __private__ = {
  collectCorpus,
  getFallbackSceneType,
};
