/**
 * 顶层声景配方生成协调器
 *
 * 接收上游 Geocoding Engine 输出的 LocationContext，
 * 协调 RegionTemplateMapper、TerrainSoundMapper、TimeInterpolator 和 LayerBuilder，
 * 输出完整的 SoundscapeRecipe JSON 配方。
 *
 * 错误处理策略：
 * - 单层构建失败时使用静默默认层继续构建
 * - 所有 volume 值 clamp 到 [0, 1]
 * - 所有 pan 值 clamp 到 [-1, 1]
 *
 * 需求覆盖: 6.1-6.8, 15.1-15.5, 16.1, 16.2, 16.4, 16.5, 16.6, 18.1, 18.2
 */

import type { LocationContext } from '@/types/locationContext';
import type { AppLocale } from '@/i18n/types';
import type {
  SoundscapeNarrativeAnchors,
  SoundscapeRecipe,
} from '@/types/soundscapeRecipe';
import { generateCacheKey } from '@/utils/timeSlot';
import { getTemplate } from './regionTemplateMapper';
import { getTerrainSound } from './terrainSoundMapper';
import { interpolate } from './timeInterpolator';
import {
  buildAmbientLayer,
  buildSignatureLayer,
  buildDialogueLayer,
  buildSecondaryDialogueLayer,
  buildAtmosphereLayer,
  clamp,
  SILENT_AMBIENT,
  SILENT_SIGNATURE,
  SILENT_DIALOGUE,
  SILENT_ATMOSPHERE,
} from './layerBuilder';

export const CURRENT_PROMPT_VERSION = 3;

/**
 * 将小时数格式化为 "HH:MM" 字符串
 *
 * @param hour - 当地当前小时（0-23）
 * @returns "HH:MM" 格式字符串，如 hour=14 → "14:00"，hour=3 → "03:00"
 */
function formatLocalTime(hour: number): string {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const totalMinutes = Math.floor(normalizedHour * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * 对配方中所有层的 volume 和 pan 值执行最终 clamp
 *
 * 确保所有数值参数在有效范围内，即使上游构建器已经做了 clamp，
 * 这里作为最终安全网再次验证。
 *
 * @param recipe - 待验证的 SoundscapeRecipe
 * @returns clamp 后的 SoundscapeRecipe
 */
function clampRecipeValues(recipe: SoundscapeRecipe): SoundscapeRecipe {
  const { layers } = recipe;

  return {
    ...recipe,
    layers: {
      ambient: {
        ...layers.ambient,
        volume: clamp(layers.ambient.volume, 0, 1),
      },
      signature: {
        ...layers.signature,
        volume: clamp(layers.signature.volume, 0, 1),
      },
      dialogue: {
        ...layers.dialogue,
        volume: clamp(layers.dialogue.volume, 0, 1),
        pan: clamp(layers.dialogue.pan, -1, 1),
      },
      secondaryDialogue: {
        ...layers.secondaryDialogue,
        volume: clamp(layers.secondaryDialogue.volume, 0, 1),
        pan: clamp(layers.secondaryDialogue.pan, -1, 1),
      },
      atmosphere: {
        ...layers.atmosphere,
        volume: clamp(layers.atmosphere.volume, 0, 1),
      },
    },
  };
}

/**
 * 从 LocationContext 生成完整的 SoundscapeRecipe
 *
 * 协调流程：
 * 1. 使用 generateCacheKey 生成 recipe.id
 * 2. 设置 generatedAt 为当前 Unix 时间戳
 * 3. 设置 localTimeAtGeneration 为 "HH:MM" 格式
 * 4. 查询 RegionTemplateMapper 获取区域模板
 * 5. 查询 TerrainSoundMapper 获取地形声音
 * 6. 查询 TimeInterpolator 获取时间插值参数
 * 7. 使用 LayerBuilder 构建 5 层声音参数
 * 8. 组装完整 SoundscapeRecipe
 *
 * 单层构建失败时使用静默默认层继续构建，不会导致整体失败。
 *
 * @param context - 上游 GeocodingEngine 输出的 LocationContext
 * @returns 完整的 SoundscapeRecipe
 */
export interface RecipeGenerationOptions {
  narrativeAnchors?: SoundscapeNarrativeAnchors | null;
  interfaceLocale?: AppLocale;
}

export function generateRecipe(
  context: LocationContext,
  options: RecipeGenerationOptions = {}
): SoundscapeRecipe {
  // 步骤 1: 生成配方 ID（与缓存键一致）
  const [lat, lng] = context.coordinates;
  const id = generateCacheKey(lat, lng, context.timeSlot);

  // 步骤 2: 记录生成时间戳
  const generatedAt = Date.now();

  // 步骤 3: 格式化当地时间
  const localTimeAtGeneration = formatLocalTime(context.currentLocalHour);

  // 步骤 4: 获取区域声景模板
  const template = getTemplate(context.regionType);

  // 步骤 5: 获取地形自然声音描述
  const terrainSound = getTerrainSound(context.terrain);

  // 步骤 6: 计算时间插值参数
  const timeInterpolation = interpolate(context.currentLocalHour);
  const narrativeAnchors = options.narrativeAnchors ?? undefined;
  const interfaceLocale = options.interfaceLocale;

  // 步骤 7: 构建 5 层声音参数，每层独立 try-catch

  // 7a: 构建 Ambient 层
  let ambient;
  try {
    ambient = buildAmbientLayer(template, terrainSound, timeInterpolation, context, narrativeAnchors);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[PinDrop Error] LayerBuilder: Failed to build ambient: ${message}`);
    ambient = SILENT_AMBIENT;
  }

  // 7b: 构建 Signature 层
  let signature;
  try {
    signature = buildSignatureLayer(template, timeInterpolation, context, narrativeAnchors);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[PinDrop Error] LayerBuilder: Failed to build signature: ${message}`);
    signature = SILENT_SIGNATURE;
  }

  // 7c: 构建 Dialogue 层
  let dialogue;
  try {
    dialogue = buildDialogueLayer(template, timeInterpolation, context);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[PinDrop Error] LayerBuilder: Failed to build dialogue: ${message}`);
    dialogue = SILENT_DIALOGUE;
  }

  // 7d: 构建 SecondaryDialogue 层
  let secondaryDialogue;
  try {
    secondaryDialogue = buildSecondaryDialogueLayer(template, timeInterpolation, context, dialogue);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[PinDrop Error] LayerBuilder: Failed to build secondaryDialogue: ${message}`);
    secondaryDialogue = SILENT_DIALOGUE;
  }

  // 7e: 构建 Atmosphere 层
  let atmosphere;
  try {
    atmosphere = buildAtmosphereLayer(template, timeInterpolation, context, narrativeAnchors);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[PinDrop Error] LayerBuilder: Failed to build atmosphere: ${message}`);
    atmosphere = SILENT_ATMOSPHERE;
  }

  // 步骤 8: 组装完整配方
  const recipe: SoundscapeRecipe = {
    id,
    location: context,
    generatedAt,
    localTimeAtGeneration,
    layers: {
      ambient,
      signature,
      dialogue,
      secondaryDialogue,
      atmosphere,
    },
    timeInterpolation,
    narrativeAnchors,
    promptVersion: CURRENT_PROMPT_VERSION,
    interfaceLocale,
  };

  // 最终安全网：clamp 所有 volume 和 pan 值
  return clampRecipeValues(recipe);
}
