/**
 * 5 层声音配方构建器
 *
 * 分别构建 ambient、signature、dialogue、secondaryDialogue、atmosphere 五个声音层。
 * 每个构建函数接收区域模板、时间插值参数和位置语境，输出对应的层参数对象。
 *
 * 辅助函数包括：
 * - clamp: 数值范围限制
 * - getWeatherDescription: 气候类型到天气描述映射
 * - getWaterSoundDescription: 水体类型到水声描述映射
 * - getTimeMoodDescription: 时间档到氛围描述映射
 *
 * 需求覆盖: 7.1-7.6, 8.1-8.6, 9.1-9.8, 10.1-10.6, 11.1-11.5, 14.1-14.9, 16.4, 16.5
 */

import type { ClimateType, LocationContext, WaterType } from '@/types/locationContext';
import type {
  AmbientLayer,
  AtmosphereLayer,
  DialogueLayer,
  SignatureLayer,
  SoundscapeTemplate,
  TimeInterpolation,
} from '@/types/soundscapeRecipe';
import type { TimeSlot } from '@/utils/timeSlot';

// === 静默默认层常量 ===

/** 静默环境音层 — 用于构建失败时的降级 */
export const SILENT_AMBIENT: AmbientLayer = {
  type: 'sfx',
  prompt: '',
  volume: 0,
  loop: true,
};

/** 静默标志性声音层 — 用于构建失败时的降级 */
export const SILENT_SIGNATURE: SignatureLayer = {
  type: 'sfx',
  prompt: '',
  volume: 0,
  loop: false,
  intervalSeconds: 60,
};

/** 静默对话层 — 用于构建失败时的降级 */
export const SILENT_DIALOGUE: DialogueLayer = {
  type: 'tts',
  model: 'eleven_v3',
  voiceId: '',
  language: 'en-US',
  text: '',
  emotionTags: [],
  volume: 0,
  pan: 0,
  repeatIntervalSeconds: 60,
};

/** 静默氛围音乐层 — 用于构建失败时的降级 */
export const SILENT_ATMOSPHERE: AtmosphereLayer = {
  type: 'music',
  prompt: '',
  volume: 0,
  loop: true,
};

// === 辅助函数 ===

/**
 * 将数值限制在 [min, max] 范围内
 *
 * @param value - 输入值
 * @param min - 最小值
 * @param max - 最大值
 * @returns clamp 后的值
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 根据气候类型生成天气描述
 *
 * 5 种气候类型到天气描述的映射：
 * - tropical → 温暖潮湿空气，偶尔热带雨
 * - temperate → 温和微风，部分多云
 * - subarctic → 寒冷刺骨的风，霜冻
 * - arid → 干燥炎热空气，灰尘
 * - mediterranean → 温暖干燥微风，晴空
 *
 * @param climate - 气候类型
 * @returns 天气描述字符串
 */
export function getWeatherDescription(climate: ClimateType): string {
  const descriptions: Record<ClimateType, string> = {
    tropical: 'warm humid air, occasional tropical rain',
    temperate: 'mild breeze, partly cloudy',
    subarctic: 'cold biting wind, frost',
    arid: 'dry hot air, dust',
    mediterranean: 'warm dry breeze, clear sky',
  };
  return descriptions[climate] ?? descriptions.temperate;
}

/**
 * 根据水体类型生成水声描述
 *
 * 4 种水体类型到水声描述的映射：
 * - sea → 背景海浪，盐雾
 * - river → 附近流水，水流过岩石
 * - lake → 轻柔湖水拍岸，静水
 * - canal → 运河水缓缓流动，船尾浪
 *
 * @param waterType - 水体类型
 * @returns 水声描述字符串
 */
export function getWaterSoundDescription(waterType: WaterType): string {
  const descriptions: Record<WaterType, string> = {
    sea: 'ocean waves in the background, salt spray',
    river: 'flowing river nearby, water over rocks',
    lake: 'gentle lake lapping, still water',
    canal: 'canal water flowing gently, boat wake',
  };
  return descriptions[waterType] ?? descriptions.river;
}

/**
 * 根据时间档生成时间氛围描述
 *
 * 4 种时间档到氛围描述的映射：
 * - dawn → 清晨感觉，温柔唤醒
 * - day → 明亮白天能量，活跃
 * - dusk → 傍晚安定，金色时光温暖
 * - night → 夜晚氛围，安静沉思
 *
 * @param timeSlot - 时间档
 * @returns 时间氛围描述字符串
 */
export function getTimeMoodDescription(timeSlot: TimeSlot): string {
  const descriptions: Record<TimeSlot, string> = {
    dawn: 'morning feeling, gentle awakening',
    day: 'bright daytime energy, active',
    dusk: 'evening settling, golden hour warmth',
    night: 'night mood, quiet contemplation',
  };
  return descriptions[timeSlot] ?? descriptions.day;
}

// === 层构建函数 ===

/**
 * 构建 Ambient 层（环境音层）
 *
 * 组合区域模板 ambientPrompt + 地形声音 + 气候天气描述。
 * 若 nearWater 非 null，追加水体声音描述。
 * 音量 = 0.7 * activity，clamp 到 [0, 1]。
 *
 * @param template - 区域声景模板
 * @param terrainSound - 地形自然声音描述
 * @param interpolation - 时间插值结果
 * @param context - 位置语境
 * @returns AmbientLayer 环境音层参数
 */
export function buildAmbientLayer(
  template: SoundscapeTemplate,
  terrainSound: string,
  interpolation: TimeInterpolation,
  context: LocationContext
): AmbientLayer {
  // 替换 {weather} 占位符为气候天气描述
  const weatherDesc = getWeatherDescription(context.climate);
  let prompt = template.ambientPrompt.replace('{weather}', weatherDesc);

  // 追加地形声音
  prompt = prompt + ', ' + terrainSound;

  // 若 nearWater 非 null，追加水体声音描述
  if (context.nearWater !== null) {
    const waterDesc = getWaterSoundDescription(context.nearWater);
    prompt = prompt + ', ' + waterDesc;
  }

  // 音量 = 基础音量(0.7) * activity 参数
  const volume = clamp(0.7 * interpolation.appliedParams.activity, 0, 1);

  return {
    type: 'sfx',
    prompt,
    volume,
    loop: true,
  };
}

/**
 * 构建 Signature 层（标志性声音层）
 *
 * 从 signaturePool 选取第一个声音 prompt（确定性选择）。
 * intervalSeconds = 90 - (60 * activity)，clamp 到 [30, 90]。
 * 音量 = 0.6 * activity，clamp 到 [0, 1]。
 *
 * @param template - 区域声景模板
 * @param interpolation - 时间插值结果
 * @returns SignatureLayer 标志性声音层参数
 */
export function buildSignatureLayer(
  template: SoundscapeTemplate,
  interpolation: TimeInterpolation
): SignatureLayer {
  const { activity } = interpolation.appliedParams;

  // 选取 signaturePool 中的第一个声音（确定性）
  const prompt = template.signaturePool.length > 0
    ? template.signaturePool[0]
    : '';

  // 高活动度 → 短间隔，低活动度 → 长间隔
  const intervalSeconds = clamp(90 - (60 * activity), 30, 90);

  // 音量由 activity 参数调节
  const volume = clamp(0.6 * activity, 0, 1);

  return {
    type: 'sfx',
    prompt,
    volume,
    loop: false,
    intervalSeconds,
  };
}

/**
 * 根据时间档获取情感标签
 *
 * @param timeSlot - 时间档
 * @returns 情感标签数组
 */
function getEmotionTagsForTime(timeSlot: TimeSlot): string[] {
  const emotionMap: Record<TimeSlot, string[]> = {
    dawn: ['calm', 'gentle'],
    day: ['energetic', 'cheerful'],
    dusk: ['relaxed', 'warm'],
    night: ['quiet', 'intimate'],
  };
  return emotionMap[timeSlot] ?? ['calm', 'gentle'];
}

/**
 * 构建 Dialogue 层（主对话层）
 *
 * model="eleven_v3"，language=context.languageVariant。
 * dialogueTopics 为空时 volume=0, text=""。
 * repeatIntervalSeconds = 120 - (90 * humanVoice)，clamp 到 [30, 120]。
 * pan = -0.3（主对话偏左）。
 *
 * @param template - 区域声景模板
 * @param interpolation - 时间插值结果
 * @param context - 位置语境
 * @returns DialogueLayer 主对话层参数
 */
export function buildDialogueLayer(
  template: SoundscapeTemplate,
  interpolation: TimeInterpolation,
  context: LocationContext
): DialogueLayer {
  const { humanVoice } = interpolation.appliedParams;

  // 对话主题为空时（rural/wilderness/polar），静默处理
  if (template.dialogueTopics.length === 0) {
    return {
      type: 'tts',
      model: 'eleven_v3',
      voiceId: 'default_voice',
      language: context.languageVariant,
      text: '',
      emotionTags: getEmotionTagsForTime(interpolation.sourceSlot),
      volume: 0,
      pan: -0.3,
      repeatIntervalSeconds: clamp(120 - (90 * humanVoice), 30, 120),
    };
  }

  // 选取第一个对话主题
  const topic = template.dialogueTopics[0];
  const text = `A local conversation about ${topic}`;

  // 重复间隔：高人声密度 → 短间隔
  const repeatIntervalSeconds = clamp(120 - (90 * humanVoice), 30, 120);

  // 音量由 humanVoice 参数调节
  const volume = clamp(0.7 * humanVoice, 0, 1);

  // 根据时间档设置情感标签
  const emotionTags = getEmotionTagsForTime(interpolation.sourceSlot);

  return {
    type: 'tts',
    model: 'eleven_v3',
    voiceId: 'default_voice',
    language: context.languageVariant,
    text,
    emotionTags,
    volume,
    pan: -0.3,
    repeatIntervalSeconds,
  };
}

/**
 * 构建 SecondaryDialogue 层（次要对话层）
 *
 * model="eleven_flash_v2_5"。
 * 音量低于主对话层（primaryDialogue.volume * 0.6）。
 * pan 与主对话层空间分离（取反）。
 * repeatIntervalSeconds 大于主对话层（+15 秒）。
 * dialogueTopics 为空时 volume=0, text=""。
 *
 * @param template - 区域声景模板
 * @param interpolation - 时间插值结果
 * @param context - 位置语境
 * @param primaryDialogue - 主对话层参数（用于计算相对值）
 * @returns DialogueLayer 次要对话层参数
 */
export function buildSecondaryDialogueLayer(
  template: SoundscapeTemplate,
  interpolation: TimeInterpolation,
  context: LocationContext,
  primaryDialogue: DialogueLayer
): DialogueLayer {
  // 使用第一个次要语言，若无则回退到主语言
  const language = context.secondaryLanguages.length > 0
    ? context.secondaryLanguages[0]
    : context.languageVariant;

  // 对话主题为空时，静默处理
  if (template.dialogueTopics.length === 0) {
    return {
      type: 'tts',
      model: 'eleven_flash_v2_5',
      voiceId: 'default_secondary_voice',
      language,
      text: '',
      emotionTags: primaryDialogue.emotionTags,
      volume: 0,
      pan: clamp(-primaryDialogue.pan, -1, 1),
      repeatIntervalSeconds: clamp(primaryDialogue.repeatIntervalSeconds + 15, 30, 120),
    };
  }

  // 选取第二个主题（若有），否则使用第一个
  const topicIndex = template.dialogueTopics.length > 1 ? 1 : 0;
  const topic = template.dialogueTopics[topicIndex];
  const text = `Background conversation about ${topic}`;

  // 音量低于主对话层
  const volume = clamp(primaryDialogue.volume * 0.6, 0, 1);

  // pan 与主对话层空间分离（取反）
  const pan = clamp(-primaryDialogue.pan, -1, 1);

  // 重复间隔大于主对话层
  const repeatIntervalSeconds = clamp(primaryDialogue.repeatIntervalSeconds + 15, 30, 120);

  return {
    type: 'tts',
    model: 'eleven_flash_v2_5',
    voiceId: 'default_secondary_voice',
    language,
    text,
    emotionTags: primaryDialogue.emotionTags,
    volume,
    pan,
    repeatIntervalSeconds,
  };
}

/**
 * 构建 Atmosphere 层（氛围音乐层）
 *
 * 使用 atmosphereStyle 模板，替换 {culture} 占位符为 context.cultureRegion。
 * prompt 追加时间段氛围描述。
 * 音量 = 0.5 * music，clamp 到 [0, 1]。
 *
 * @param template - 区域声景模板
 * @param interpolation - 时间插值结果
 * @param context - 位置语境
 * @returns AtmosphereLayer 氛围音乐层参数
 */
export function buildAtmosphereLayer(
  template: SoundscapeTemplate,
  interpolation: TimeInterpolation,
  context: LocationContext
): AtmosphereLayer {
  // 替换 {culture} 占位符为文化区域
  let prompt = template.atmosphereStyle.replace('{culture}', context.cultureRegion);

  // 追加时间段氛围描述
  const timeMood = getTimeMoodDescription(interpolation.sourceSlot);
  prompt = prompt + ', ' + timeMood;

  // 音量由 music 参数调节
  const volume = clamp(0.5 * interpolation.appliedParams.music, 0, 1);

  return {
    type: 'music',
    prompt,
    volume,
    loop: true,
  };
}
