/**
 * Soundscape Recipe Engine — 模块导出
 *
 * 声景配方生成引擎的统一入口，重新导出所有子模块的公共 API。
 * 包括顶层协调器、映射器、插值器、调度器、层构建器和序列化工具。
 */

// === 顶层配方生成协调器 ===
export { generateRecipe } from './recipeGenerator';

// === 区域模板映射器 ===
export { getTemplate, REGION_TEMPLATES } from './regionTemplateMapper';

// === 地形声音映射器 ===
export { getTerrainSound, TERRAIN_SOUNDS } from './terrainSoundMapper';

// === 时间插值器 ===
export { interpolate, lerp, TIME_KEYFRAMES, KEYFRAME_HOURS } from './timeInterpolator';

// === 动态事件调度器 ===
export { getEventPool, scheduleNextEvent, EVENT_POOLS } from './dynamicEventScheduler';
export type { ScheduledEvent } from './dynamicEventScheduler';

// === 5 层构建器及辅助函数 ===
export {
  buildAmbientLayer,
  buildSignatureLayer,
  buildDialogueLayer,
  buildSecondaryDialogueLayer,
  buildAtmosphereLayer,
  clamp,
  getWeatherDescription,
  getWaterSoundDescription,
  getTimeMoodDescription,
  SILENT_AMBIENT,
  SILENT_SIGNATURE,
  SILENT_DIALOGUE,
  SILENT_ATMOSPHERE,
} from './layerBuilder';

// === 序列化与反序列化 ===
export { serializeSoundscapeRecipe, parseSoundscapeRecipe } from '@/types/soundscapeRecipe';
