/**
 * 地形声音映射器
 *
 * 将 9 种 TerrainType 映射到对应的自然声音描述字符串。
 * 每种地形的描述字符串长度 ≥ 20 字符，包含该地形特征性的自然声音。
 *
 * 未识别的 TerrainType 降级到 "plain" 声音并输出错误日志。
 *
 * 需求覆盖: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 16.2
 */

import type { TerrainType } from '@/types/locationContext';

/** 全部 9 种 TerrainType 到自然声音描述的映射表 */
export const TERRAIN_SOUNDS: Record<TerrainType, string> = {
  // 山地 — 风、回声、岩石相关声音
  mountain:
    'wind through mountain pass, distant eagle cry, rock crunching, echo',

  // 平原 — 草虫、微风、远处牛铃
  plain:
    'grasshoppers, gentle wind through grass, distant cowbell, open sky silence',

  // 海岸 — 海浪、海鸟、风
  coast:
    'waves, seabirds, wind, shell crunching underfoot, salt air hiss',

  // 沙漠 — 风吹沙、寂静
  desert:
    'wind over sand, absolute silence with occasional sand rustle, heat shimmer hum',

  // 森林 — 鸟鸣、树叶沙沙、啄木鸟
  forest:
    'birdsong variety, leaves rustling, woodpecker, stream trickle, twig snap',

  // 冻原 — 极地风、冰裂、狼嚎
  tundra:
    'arctic wind, ice cracking, absolute quiet, wolf howl distant, snow crunch',

  // 丛林 — 密集昆虫、猴叫、雨打树冠、蛙鸣
  jungle:
    'dense insect hum, monkey calls, rain on canopy, frog chorus, bird screech',

  // 河流 — 流水、河岸鸟鸣、芦苇沙沙
  river:
    'flowing water, riverside birds, reed rustling, fish splash, dragonfly buzz',

  // 湖泊 — 潜鸟、轻柔拍岸、蜻蜓嗡嗡
  lake:
    'loons, gentle lapping, dragonfly buzz, stillness, occasional splash',
};

/**
 * 获取地形类型对应的自然声音描述
 *
 * 为 9 种 TerrainType 提供特征性自然声音 prompt。
 * 未识别的 TerrainType 降级到 "plain" 声音并输出错误日志。
 *
 * @param terrain - 地形类型
 * @returns 自然声音描述字符串（≥ 20 字符）
 */
export function getTerrainSound(terrain: TerrainType): string {
  const sound = TERRAIN_SOUNDS[terrain];

  if (sound) {
    return sound;
  }

  // 未识别的 TerrainType 降级到 plain 声音
  console.error(
    `[PinDrop Error] RecipeGenerator: Unknown terrainType ${terrain}, falling back to plain`
  );
  return TERRAIN_SOUNDS.plain;
}
