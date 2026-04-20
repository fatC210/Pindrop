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
      'dense city ambience with layered foot traffic, restrained vehicle wash, storefront activity, and weather shaped by {weather}',
    signaturePool: [
      'a nearby shop door chime and a few seconds of lived-in sidewalk motion',
      'a market-side exchange heard briefly from the edge of the street',
      'delivery handling or handcart movement caught in passing',
      'a tram or streetcar bell heard naturally in the distance',
      'cups and low cafe conversation spilling out of a doorway',
    ],
    dialogueTopics: [
      'greeting',
      'ordering_food',
      'asking_directions',
      'small_talk',
      'phone_call',
    ],
    atmosphereStyle: 'minimal urban atmosphere with {culture} influence',
    dynamicEventPool: [
      'scooter_pass',
      'car_horn',
      'bicycle_bell',
      'shop_door_chime',
      'cups_on_counter',
    ],
  },

  // 城市郊区 — 安静的住宅区环境
  city_suburb: {
    ambientPrompt:
      'quiet residential street ambience with occasional passing cars, distant household activity, and weather shaped by {weather}',
    signaturePool: [
      'a lawn mower or yard tool heard from a few houses away',
      'a neighborhood van or truck moving through the block',
      'a distant school bell or pickup-time cue carried by the air',
      'a short greeting between neighbors near a gate or driveway',
    ],
    dialogueTopics: ['neighbor_chat', 'dog_walking', 'coming_home'],
    atmosphereStyle: 'gentle suburban atmosphere with {culture} influence',
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
      'small-town ambience with sparse traffic, open air, scattered voices, and weather shaped by {weather}',
    signaturePool: [
      'a distant church or civic bell marking the hour',
      'a market bell or stall signal from the town center',
      'a brief local announcement or public-address fragment',
      'a train whistle carrying in from the edge of town',
    ],
    dialogueTopics: ['greeting', 'local_news', 'weather_comment'],
    atmosphereStyle: 'minimal small-town atmosphere with {culture} influence',
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
      'rural village ambience with close domestic life, nature dominant, and weather shaped by {weather}',
    signaturePool: [
      'a rooster or domestic bird sounding from within the village',
      'a temple or village bell heard softly over the homes',
      'a bucket, hand pump, or courtyard water task caught nearby',
      'children playing briefly between houses',
    ],
    dialogueTopics: ['greeting', 'farming_talk', 'seasonal_comment'],
    atmosphereStyle: 'very sparse village atmosphere with {culture} influence',
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
      'open rural landscape with wind, insects, distant animals, and weather shaped by {weather}',
    signaturePool: [
      'a tractor or farm utility vehicle working far from the listener',
      'a single cow bell or livestock tag carrying across the field',
      'sheep or goats sounding softly in the distance',
      'a narrow stream or irrigation water moving through the land',
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
      'remote wilderness with wind, birds, long natural quiet, and weather shaped by {weather}',
    signaturePool: [
      'one distant raptor call carried through the landscape',
      'a remote animal call echoing far away',
      'a stream cutting through otherwise quiet terrain',
      'twigs or brush cracking under natural movement',
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
      'coastal or open-ocean ambience with steady wave motion, wind over water, and distant marine traffic',
    signaturePool: [
      'a ship horn sounding softly across the water',
      'a buoy bell or harbor marker ringing in the swell',
      'a fishing boat engine passing at moderate distance',
      'a ferry arriving or departing beyond the immediate shoreline',
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
      'polar ambience with arctic wind, ice textures, and long quiet between gusts',
    signaturePool: [
      'a brief ice crack carrying through frozen air',
      'wind moving over the ice shelf with a tonal edge',
      'a distant polar bird cutting through the quiet',
      'a whale blow or marine exhale if open water is plausible',
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
