/**
 * 动态事件调度器
 *
 * 将 8 种 RegionType 映射到对应的动态事件池（DynamicEvent 数组），
 * 并提供纯函数 scheduleNextEvent 用于随机选取事件、分配音量和触发间隔。
 *
 * 所有事件的 minIntervalMs=30000, maxIntervalMs=90000。
 * scheduleNextEvent 接受可选的随机数生成器参数以支持确定性测试。
 *
 * 需求覆盖: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 13.1, 13.2, 13.3, 13.4
 */

import type { RegionType } from '@/types/locationContext';
import type { DynamicEvent } from '@/types/soundscapeRecipe';

// === 接口定义 ===

/** 动态事件调度结果 — 包含选中的事件、分配的音量和下次触发间隔 */
export interface ScheduledEvent {
  /** 选中的动态事件 */
  event: DynamicEvent;
  /** 在事件 volumeRange 内随机分配的音量，范围 [0, 1] */
  volume: number;
  /** 下次触发间隔（毫秒），范围 [30000, 90000] */
  nextIntervalMs: number;
}

// === 事件池定义 ===

/** 全部 8 种 RegionType 到 DynamicEvent 数组的映射表 */
export const EVENT_POOLS: Record<RegionType, DynamicEvent[]> = {
  // 城市中心 — 高密度城市环境的动态事件
  city_center: [
    {
      id: 'scooter_pass',
      prompt: 'Electric scooter passing by on city street, motor whirring and fading',
      volumeRange: [0.3, 0.7],
      panFromTo: [-1, 1],
      durationMs: 3000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'car_horn',
      prompt: 'Car horn honking briefly in urban traffic',
      volumeRange: [0.4, 0.8],
      panFromTo: [-0.5, 0.5],
      durationMs: 1500,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'bicycle_bell',
      prompt: 'Bicycle bell ringing twice as cyclist passes',
      volumeRange: [0.2, 0.5],
      panFromTo: [-0.8, 0.8],
      durationMs: 2000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'coin_drop',
      prompt: 'Coins dropping into a street performer hat, metallic clinks',
      volumeRange: [0.1, 0.3],
      panFromTo: [0.2, 0.6],
      durationMs: 1000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'street_musician',
      prompt: 'Street musician playing a short melodic phrase on accordion',
      volumeRange: [0.2, 0.5],
      panFromTo: [-0.3, 0.3],
      durationMs: 5000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
  ],

  // 城市郊区 — 安静住宅区的动态事件
  city_suburb: [
    {
      id: 'lawn_mower_distant',
      prompt: 'Distant lawn mower engine humming in a residential neighborhood',
      volumeRange: [0.1, 0.4],
      panFromTo: [-0.6, -0.2],
      durationMs: 4000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'dog_bark',
      prompt: 'Dog barking a few times from a nearby yard',
      volumeRange: [0.2, 0.5],
      panFromTo: [0.3, 0.7],
      durationMs: 2000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'car_door',
      prompt: 'Car door opening and closing in a driveway',
      volumeRange: [0.2, 0.4],
      panFromTo: [-0.4, 0.0],
      durationMs: 1500,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'sprinkler',
      prompt: 'Garden sprinkler rotating with rhythmic water spray',
      volumeRange: [0.1, 0.3],
      panFromTo: [-0.2, 0.4],
      durationMs: 3000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'children_playing',
      prompt: 'Children laughing and playing in a nearby park',
      volumeRange: [0.15, 0.4],
      panFromTo: [0.0, 0.8],
      durationMs: 4000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
  ],

  // 小镇 — 稀疏交通的动态事件
  town: [
    {
      id: 'church_bell_distant',
      prompt: 'Distant church bell tolling slowly',
      volumeRange: [0.2, 0.5],
      panFromTo: [-0.3, 0.3],
      durationMs: 4000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'bicycle_pass',
      prompt: 'Bicycle passing on a quiet town road, chain clicking',
      volumeRange: [0.15, 0.35],
      panFromTo: [-0.8, 0.8],
      durationMs: 3000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'market_chatter',
      prompt: 'Brief chatter from a small town market stall',
      volumeRange: [0.1, 0.3],
      panFromTo: [0.1, 0.5],
      durationMs: 3000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'train_horn',
      prompt: 'Distant train horn sounding as it passes through town',
      volumeRange: [0.3, 0.6],
      panFromTo: [-1, 1],
      durationMs: 3000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
  ],

  // 乡村 — 极少人类活动的动态事件
  village: [
    {
      id: 'rooster_crow',
      prompt: 'Rooster crowing in the early morning village air',
      volumeRange: [0.2, 0.5],
      panFromTo: [-0.4, 0.2],
      durationMs: 2000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'goat_bleat',
      prompt: 'Goat bleating from a nearby pen',
      volumeRange: [0.15, 0.4],
      panFromTo: [0.2, 0.6],
      durationMs: 1500,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'wooden_cart',
      prompt: 'Wooden cart wheels creaking on a dirt road',
      volumeRange: [0.1, 0.35],
      panFromTo: [-0.8, 0.8],
      durationMs: 4000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'temple_bell_distant',
      prompt: 'Distant temple bell ringing softly',
      volumeRange: [0.1, 0.3],
      panFromTo: [-0.2, 0.2],
      durationMs: 3000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
  ],

  // 田野 — 开阔乡村景观的动态事件
  rural: [
    {
      id: 'tractor_pass',
      prompt: 'Tractor engine rumbling as it passes on a rural road',
      volumeRange: [0.2, 0.5],
      panFromTo: [-1, 1],
      durationMs: 5000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'cow_moo',
      prompt: 'Cow mooing in a distant pasture',
      volumeRange: [0.15, 0.4],
      panFromTo: [-0.3, 0.3],
      durationMs: 2000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'sheep_bleat',
      prompt: 'Sheep bleating softly in a field',
      volumeRange: [0.1, 0.35],
      panFromTo: [0.0, 0.5],
      durationMs: 1500,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'hawk_cry',
      prompt: 'Hawk crying overhead while circling in the sky',
      volumeRange: [0.2, 0.5],
      panFromTo: [-0.5, 0.5],
      durationMs: 2000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
  ],

  // 荒野 — 偏远自然环境的动态事件
  wilderness: [
    {
      id: 'animal_sound',
      prompt: 'Wild animal call echoing through the wilderness',
      volumeRange: [0.2, 0.5],
      panFromTo: [-0.6, 0.6],
      durationMs: 3000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'wind_gust',
      prompt: 'Strong wind gust rushing through trees and rocks',
      volumeRange: [0.3, 0.7],
      panFromTo: [-1, 1],
      durationMs: 4000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'bird_call',
      prompt: 'Wild bird calling from a distant treetop',
      volumeRange: [0.15, 0.4],
      panFromTo: [-0.4, 0.4],
      durationMs: 2000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'branch_snap',
      prompt: 'Tree branch snapping and falling in the forest',
      volumeRange: [0.2, 0.5],
      panFromTo: [0.1, 0.7],
      durationMs: 1500,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
  ],

  // 海洋 — 海上环境的动态事件
  ocean: [
    {
      id: 'ship_horn',
      prompt: 'Distant ship horn blowing across the open ocean',
      volumeRange: [0.3, 0.6],
      panFromTo: [-0.8, -0.2],
      durationMs: 3000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'seagull_cry',
      prompt: 'Seagull crying while flying overhead near the coast',
      volumeRange: [0.2, 0.5],
      panFromTo: [-0.5, 0.5],
      durationMs: 2000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'wave_crash',
      prompt: 'Large ocean wave crashing against rocks or shore',
      volumeRange: [0.4, 0.8],
      panFromTo: [-0.3, 0.3],
      durationMs: 4000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'anchor_chain',
      prompt: 'Anchor chain rattling as a boat shifts in the water',
      volumeRange: [0.15, 0.4],
      panFromTo: [0.2, 0.6],
      durationMs: 2000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
  ],

  // 极地 — 极端寒冷环境的动态事件
  polar: [
    {
      id: 'ice_crack_loud',
      prompt: 'Loud ice cracking and splitting in the frozen landscape',
      volumeRange: [0.3, 0.7],
      panFromTo: [-0.5, 0.5],
      durationMs: 2000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'wind_howl',
      prompt: 'Arctic wind howling across the frozen tundra',
      volumeRange: [0.4, 0.8],
      panFromTo: [-1, 1],
      durationMs: 5000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'snow_crunch',
      prompt: 'Snow crunching underfoot in deep polar snow',
      volumeRange: [0.1, 0.3],
      panFromTo: [-0.2, 0.2],
      durationMs: 2000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
    {
      id: 'polar_bird_call',
      prompt: 'Polar bird calling in the cold arctic air',
      volumeRange: [0.15, 0.4],
      panFromTo: [-0.4, 0.4],
      durationMs: 2000,
      minIntervalMs: 30000,
      maxIntervalMs: 90000,
    },
  ],
};

// === 导出函数 ===

/**
 * 获取区域类型对应的动态事件池
 *
 * 为 8 种 RegionType 提供对应的 DynamicEvent 数组。
 * 每个事件池至少包含 3 个事件。
 *
 * @param regionType - 区域类型
 * @returns 动态事件数组
 */
export function getEventPool(regionType: RegionType): DynamicEvent[] {
  return EVENT_POOLS[regionType];
}

/**
 * 计算下一个动态事件的参数（纯函数）
 *
 * 从事件池中随机选取事件，在 volumeRange 内随机分配音量，
 * 在 [minIntervalMs, maxIntervalMs] 内随机分配下次触发间隔。
 * 接受可选的随机数生成器参数以支持确定性测试。
 *
 * @param eventPool - 动态事件池（非空数组）
 * @param random - 随机数生成器函数，返回 [0, 1) 范围的值，默认 Math.random
 * @returns 调度结果，包含选中事件、分配音量和下次触发间隔
 */
export function scheduleNextEvent(
  eventPool: DynamicEvent[],
  random: () => number = Math.random
): ScheduledEvent {
  // 步骤 1: 随机选取事件
  const index = Math.floor(random() * eventPool.length);
  const event = eventPool[index];

  // 步骤 2: 在 volumeRange 内随机分配音量
  const [minVol, maxVol] = event.volumeRange;
  const volume = minVol + random() * (maxVol - minVol);

  // 步骤 3: 在 [minIntervalMs, maxIntervalMs] 内随机分配间隔
  const nextIntervalMs =
    event.minIntervalMs + random() * (event.maxIntervalMs - event.minIntervalMs);

  return { event, volume, nextIntervalMs };
}
