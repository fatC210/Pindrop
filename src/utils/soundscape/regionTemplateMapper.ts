/**
 * 区域模板映射器
 *
 * 将 8 种 RegionType 映射到对应的 SoundscapeTemplate 声景模板。
 * 每个模板包含 ambientPrompt（含 {weather} 占位符）、signaturePool（≥3 条目）、
 * dialogueTopics、atmosphereStyle（含 {culture} 占位符）和 dynamicEventPool。
 *
 * 未识别的 RegionType 降级到 "rural" 模板并输出错误日志。
 *
 * 需求覆盖: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 16.1
 */

import type { RegionType } from '@/types/locationContext';
import type { SoundscapeTemplate } from '@/types/soundscapeRecipe';

/** 全部 8 种 RegionType 到 SoundscapeTemplate 的映射表 */
export const REGION_TEMPLATES: Record<RegionType, SoundscapeTemplate> = {
  // 城市中心 — 高密度城市环境
  city_center: {
    ambientPrompt:
      'Urban ambient: steady traffic hum, distant siren, pedestrian noise, {weather} sound',
    signaturePool: [
      'street_musician',
      'market_vendor',
      'construction',
      'tram_bell',
      'cafe_chatter',
    ],
    dialogueTopics: [
      'greeting',
      'ordering_food',
      'asking_directions',
      'small_talk',
      'phone_call',
    ],
    atmosphereStyle: 'lo-fi urban ambient, minimal, {culture} influence',
    dynamicEventPool: [
      'scooter_pass',
      'car_horn',
      'bicycle_bell',
      'coin_drop',
      'street_musician',
    ],
  },

  // 城市郊区 — 安静的住宅区环境
  city_suburb: {
    ambientPrompt:
      'Quiet residential street ambient, occasional car, dog barking, {weather} sound',
    signaturePool: [
      'lawn_mower',
      'ice_cream_truck',
      'school_bell',
      'neighbor_greeting',
    ],
    dialogueTopics: ['neighbor_chat', 'dog_walking', 'coming_home'],
    atmosphereStyle: 'gentle ambient, suburban peaceful, {culture} influence',
    dynamicEventPool: [
      'lawn_mower_distant',
      'dog_bark',
      'car_door',
      'sprinkler',
      'children_playing',
    ],
  },

  // 小镇 — 稀疏交通，自然声为主
  town: {
    ambientPrompt:
      'Small town ambient, sparse traffic, birds, wind, {weather} sound',
    signaturePool: [
      'church_bell',
      'market_bell',
      'local_announcement',
      'train_whistle',
    ],
    dialogueTopics: ['greeting', 'local_news', 'weather_comment'],
    atmosphereStyle: 'minimal ambient, small town feel, {culture} influence',
    dynamicEventPool: [
      'church_bell_distant',
      'bicycle_pass',
      'market_chatter',
      'train_horn',
    ],
  },

  // 乡村 — 极少人类活动，自然声主导
  village: {
    ambientPrompt:
      'Rural village ambient, very sparse human activity, nature dominant, {weather} sound',
    signaturePool: [
      'rooster',
      'temple_bell',
      'well_bucket',
      'children_playing',
    ],
    dialogueTopics: ['greeting', 'farming_talk', 'seasonal_comment'],
    atmosphereStyle: 'very sparse ambient, rural, {culture} influence',
    dynamicEventPool: [
      'rooster_crow',
      'goat_bleat',
      'wooden_cart',
      'temple_bell_distant',
    ],
  },

  // 田野 — 开阔的乡村景观，无对话
  rural: {
    ambientPrompt:
      'Open rural landscape, wind, insects, distant animals, {weather} sound',
    signaturePool: [
      'tractor_distant',
      'cow_bell',
      'sheep_bleating',
      'river_trickle',
    ],
    dialogueTopics: [],
    atmosphereStyle: 'nature soundscape, very minimal, spacious',
    dynamicEventPool: [
      'tractor_pass',
      'cow_moo',
      'sheep_bleat',
      'hawk_cry',
    ],
  },

  // 荒野 — 偏远自然环境，无对话
  wilderness: {
    ambientPrompt:
      'Remote wilderness, wind, birds, natural silence, {weather} sound',
    signaturePool: [
      'eagle_cry',
      'wolf_howl',
      'stream',
      'crackling_twigs',
    ],
    dialogueTopics: [],
    atmosphereStyle: 'wilderness soundscape, very sparse, ancient feel',
    dynamicEventPool: [
      'animal_sound',
      'wind_gust',
      'bird_call',
      'branch_snap',
    ],
  },

  // 海洋 — 海浪、风、远处船引擎
  ocean: {
    ambientPrompt:
      'Ocean waves rolling steadily, wind over water, distant ship engine',
    signaturePool: [
      'ship_horn',
      'buoy_bell',
      'fishing_boat',
      'ferry_arrival',
    ],
    dialogueTopics: ['fisherman_chat', 'harbor_master'],
    atmosphereStyle: 'ocean soundscape, peaceful, vast',
    dynamicEventPool: [
      'ship_horn_distant',
      'seagull_cry',
      'wave_crash',
      'anchor_chain',
    ],
  },

  // 极地 — 极端寒冷环境，无对话
  polar: {
    ambientPrompt:
      'Arctic wind, ice cracking, absolute quiet between gusts',
    signaturePool: [
      'ice_crack',
      'aurora_hum',
      'polar_bird',
      'whale_blow',
    ],
    dialogueTopics: [],
    atmosphereStyle: 'polar soundscape, extreme minimal, crystalline',
    dynamicEventPool: [
      'ice_crack_loud',
      'wind_howl',
      'snow_crunch',
      'polar_bird_call',
    ],
  },
};

/**
 * 获取区域类型对应的声景模板
 *
 * 为 8 种 RegionType 提供完整的声景模板。
 * 未识别的 RegionType 降级到 "rural" 模板并输出错误日志。
 *
 * @param regionType - 区域类型
 * @returns 声景模板
 */
export function getTemplate(regionType: RegionType): SoundscapeTemplate {
  const template = REGION_TEMPLATES[regionType];

  if (template) {
    return template;
  }

  // 未识别的 RegionType 降级到 rural 模板
  console.error(
    `[PinDrop Error] RecipeGenerator: Unknown regionType ${regionType}, falling back to rural`
  );
  return REGION_TEMPLATES.rural;
}
