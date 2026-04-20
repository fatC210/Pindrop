/**
 * SoundscapeRecipe 类型定义
 *
 * 定义 Soundscape Recipe Engine 的核心数据结构，包括 5 层声音接口、
 * 时间插值类型、声景模板、动态事件以及主配方接口。
 *
 * 需求覆盖: 1.1-1.8, 12.3
 */

import type { LocationContext } from '@/types/locationContext';
import type { TimeSlot } from '@/utils/timeSlot';

export interface LocalizedCueLabel {
  en: string;
  'zh-CN': string;
}

export interface NarrativeAnchorCue {
  prompt: string;
  label: LocalizedCueLabel;
}

export interface SoundscapeNarrativeAnchors {
  source: 'llm' | 'rules';
  confidence: number;
  cues: NarrativeAnchorCue[];
  signature?: NarrativeAnchorCue;
  atmosphereTone?: string;
  specificityInstruction?: string;
}

// === 层接口 ===

/** 环境音层 — SFX 类型，持续循环播放 */
export interface AmbientLayer {
  /** 音频类型，始终为 "sfx" */
  type: 'sfx';
  /** 环境音 prompt，用于 ElevenLabs sound-generation API */
  prompt: string;
  /** 音量，范围 0-1 */
  volume: number;
  /** 是否循环播放，始终为 true */
  loop: true;
}

/** 标志性声音层 — SFX 类型，按间隔触发 */
export interface SignatureLayer {
  /** 音频类型，始终为 "sfx" */
  type: 'sfx';
  /** 标志性声音 prompt，用于 ElevenLabs sound-generation API */
  prompt: string;
  /** 音量，范围 0-1 */
  volume: number;
  /** 是否循环播放，始终为 false */
  loop: false;
  /** 触发间隔（秒），范围 30-90 */
  intervalSeconds: number;
}

/** 对话层 — TTS 类型 */
export interface DialogueLayer {
  /** 音频类型，始终为 "tts" */
  type: 'tts';
  /** TTS 模型，"eleven_v3" 或 "eleven_flash_v2_5" */
  model: string;
  /** ElevenLabs 语音 ID */
  voiceId: string;
  /** 语言标签，BCP 47 格式，如 "fr-FR" */
  language: string;
  /** 对话文本内容 */
  text: string;
  /** 情感标签数组，如 ["warm laughter", "muttering"] */
  emotionTags: string[];
  /** 音量，范围 0-1 */
  volume: number;
  /** 声像位置，范围 -1（左）到 1（右） */
  pan: number;
  /** 重复间隔（秒），范围 30-120 */
  repeatIntervalSeconds: number;
}

/** 氛围音乐层 — Music 类型，持续循环播放 */
export interface AtmosphereLayer {
  /** 音频类型，始终为 "music" */
  type: 'music';
  /** 氛围音乐 prompt，用于 ElevenLabs music-generation API */
  prompt: string;
  /** 音量，范围 0-1 */
  volume: number;
  /** 是否循环播放，始终为 true */
  loop: true;
}

// === 时间插值 ===

/** 时间参数 — 5 个 0-1 范围的声景参数 */
export interface TimeParams {
  /** 环境活动度 */
  activity: number;
  /** 交通密度 */
  traffic: number;
  /** 自然声强度 */
  nature: number;
  /** 人声密度 */
  humanVoice: number;
  /** 音乐强度 */
  music: number;
}

/** 时间插值结果 — 包含源/目标时间档、插值进度和应用后的参数 */
export interface TimeInterpolation {
  /** 源时间档 */
  sourceSlot: TimeSlot;
  /** 目标时间档 */
  targetSlot: TimeSlot;
  /** 插值进度，范围 0-1 */
  progress: number;
  /** 插值后的声景参数 */
  appliedParams: TimeParams;
}

// === 5 层容器 ===

/** 声景层集合 — 包含完整的 5 层声音配方 */
export interface SoundscapeLayers {
  /** 环境音层 */
  ambient: AmbientLayer;
  /** 标志性声音层 */
  signature: SignatureLayer;
  /** 主对话层 */
  dialogue: DialogueLayer;
  /** 次要对话层 */
  secondaryDialogue: DialogueLayer;
  /** 氛围音乐层 */
  atmosphere: AtmosphereLayer;
}

// === 主接口 ===

/** 声景配方 — 完整的声景生成规格，是 ElevenLabs 音频合成的输入 */
export interface SoundscapeRecipe {
  /** 配方 ID，格式 "{lat},{lng}-{timeSlot}"，坐标精度 0.01° */
  id: string;
  /** 位置语境，来自上游 Geocoding Engine */
  location: LocationContext;
  /** 生成时的 Unix 时间戳 */
  generatedAt: number;
  /** 生成时的当地时间，"HH:MM" 格式 */
  localTimeAtGeneration: string;
  /** 5 层声音配方 */
  layers: SoundscapeLayers;
  /** 时间插值信息 */
  timeInterpolation: TimeInterpolation;
  /** Optional narrative anchors used to make the prompts more place-specific */
  narrativeAnchors?: SoundscapeNarrativeAnchors;
}

// === 声景模板 ===

/** 区域声景模板 — RegionTemplateMapper 的输出 */
export interface SoundscapeTemplate {
  /** 环境音 prompt 模板，含 {weather} 占位符 */
  ambientPrompt: string;
  /** 标志性声音池，≥ 3 个条目 */
  signaturePool: string[];
  /** 对话主题列表，rural/wilderness/polar 为空数组 */
  dialogueTopics: string[];
  /** 氛围音乐风格模板，含 {culture} 占位符 */
  atmosphereStyle: string;
  /** 动态事件池 */
  dynamicEventPool: string[];
}

// === 动态事件 ===

/** 动态事件定义 — 用于随机触发的环境声音事件 */
export interface DynamicEvent {
  /** 事件唯一标识 */
  id: string;
  /** 事件声音 prompt */
  prompt: string;
  /** 音量范围 [最小值, 最大值]，各 0-1，[0] ≤ [1] */
  volumeRange: [number, number];
  /** 声像移动方向 [起始, 结束]，各 -1 到 1 */
  panFromTo: [number, number];
  /** 事件持续时间（毫秒） */
  durationMs: number;
  /** 最小触发间隔（毫秒），固定为 30000 */
  minIntervalMs: number;
  /** 最大触发间隔（毫秒），固定为 90000 */
  maxIntervalMs: number;
}

// === 验证常量 ===

/** 所有有效的 TimeSlot 值 */
const VALID_TIME_SLOTS: readonly string[] = [
  'dawn',
  'day',
  'dusk',
  'night',
] as const;

/** 层容器必须包含的 5 个键 */
const REQUIRED_LAYER_KEYS: readonly string[] = [
  'ambient',
  'signature',
  'dialogue',
  'secondaryDialogue',
  'atmosphere',
] as const;

/** TimeParams 必须包含的 5 个字段 */
const REQUIRED_TIME_PARAMS_KEYS: readonly string[] = [
  'activity',
  'traffic',
  'nature',
  'humanVoice',
  'music',
] as const;

// === 序列化函数 ===

/**
 * 将 SoundscapeRecipe 序列化为 JSON 字符串
 *
 * 使用 JSON.stringify 进行序列化，保留所有数值精度。
 * 包括 volume、pan、intervalSeconds、TimeInterpolation 参数等。
 *
 * @param recipe - 要序列化的 SoundscapeRecipe 对象
 * @returns JSON 字符串
 */
export function serializeSoundscapeRecipe(recipe: SoundscapeRecipe): string {
  return JSON.stringify(recipe);
}

/**
 * 将 JSON 字符串解析为 SoundscapeRecipe 对象
 *
 * 使用 JSON.parse 解析后进行完整的类型验证，
 * 确保所有字段存在且类型正确。无效输入返回 null，不抛出未处理异常。
 *
 * @param json - 要解析的 JSON 字符串
 * @returns 解析后的 SoundscapeRecipe 对象，无效输入返回 null
 */
export function parseSoundscapeRecipe(json: string): SoundscapeRecipe | null {
  try {
    const parsed: unknown = JSON.parse(json);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const obj = parsed as Record<string, unknown>;

    // 验证 id 字段
    if (typeof obj.id !== 'string') return null;

    // 验证 location 字段（基本对象检查）
    if (!obj.location || typeof obj.location !== 'object') return null;

    // 验证 generatedAt 字段（正数）
    if (typeof obj.generatedAt !== 'number' || obj.generatedAt <= 0) return null;

    // 验证 localTimeAtGeneration 字段（HH:MM 格式）
    if (
      typeof obj.localTimeAtGeneration !== 'string' ||
      !/^\d{2}:\d{2}$/.test(obj.localTimeAtGeneration)
    ) {
      return null;
    }

    // 验证 layers 字段
    if (!obj.layers || typeof obj.layers !== 'object') return null;
    const layers = obj.layers as Record<string, unknown>;

    // 验证 layers 恰好包含 5 个键
    const layerKeys = Object.keys(layers);
    if (layerKeys.length !== 5) return null;
    for (const key of REQUIRED_LAYER_KEYS) {
      if (!(key in layers)) return null;
    }

    // 验证 ambient 层：type='sfx', loop=true, volume in [0,1]
    if (!validateAmbientLayer(layers.ambient)) return null;

    // 验证 signature 层：type='sfx', loop=false, volume in [0,1], intervalSeconds in [30,90]
    if (!validateSignatureLayer(layers.signature)) return null;

    // 验证 dialogue 层：type='tts', volume in [0,1], pan in [-1,1], repeatIntervalSeconds in [30,120]
    if (!validateDialogueLayer(layers.dialogue)) return null;

    // 验证 secondaryDialogue 层
    if (!validateDialogueLayer(layers.secondaryDialogue)) return null;

    // 验证 atmosphere 层：type='music', loop=true, volume in [0,1]
    if (!validateAtmosphereLayer(layers.atmosphere)) return null;

    // 验证 timeInterpolation 字段
    if (!validateTimeInterpolation(obj.timeInterpolation)) return null;

    return obj as unknown as SoundscapeRecipe;
  } catch {
    return null;
  }
}

// === 验证辅助函数 ===

/**
 * 验证数值是否在指定范围内
 */
function isInRange(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && value >= min && value <= max;
}

/**
 * 验证 AmbientLayer 结构
 */
function validateAmbientLayer(layer: unknown): boolean {
  if (!layer || typeof layer !== 'object') return false;
  const l = layer as Record<string, unknown>;
  if (l.type !== 'sfx') return false;
  if (l.loop !== true) return false;
  if (!isInRange(l.volume, 0, 1)) return false;
  return true;
}

/**
 * 验证 SignatureLayer 结构
 */
function validateSignatureLayer(layer: unknown): boolean {
  if (!layer || typeof layer !== 'object') return false;
  const l = layer as Record<string, unknown>;
  if (l.type !== 'sfx') return false;
  if (l.loop !== false) return false;
  if (!isInRange(l.volume, 0, 1)) return false;
  if (!isInRange(l.intervalSeconds, 30, 90)) return false;
  return true;
}

/**
 * 验证 DialogueLayer 结构
 */
function validateDialogueLayer(layer: unknown): boolean {
  if (!layer || typeof layer !== 'object') return false;
  const l = layer as Record<string, unknown>;
  if (l.type !== 'tts') return false;
  if (!isInRange(l.volume, 0, 1)) return false;
  if (!isInRange(l.pan, -1, 1)) return false;
  if (!isInRange(l.repeatIntervalSeconds, 30, 120)) return false;
  return true;
}

/**
 * 验证 AtmosphereLayer 结构
 */
function validateAtmosphereLayer(layer: unknown): boolean {
  if (!layer || typeof layer !== 'object') return false;
  const l = layer as Record<string, unknown>;
  if (l.type !== 'music') return false;
  if (l.loop !== true) return false;
  if (!isInRange(l.volume, 0, 1)) return false;
  return true;
}

/**
 * 验证 TimeInterpolation 结构
 */
function validateTimeInterpolation(interp: unknown): boolean {
  if (!interp || typeof interp !== 'object') return false;
  const t = interp as Record<string, unknown>;

  // 验证 sourceSlot 和 targetSlot 为有效 TimeSlot
  if (typeof t.sourceSlot !== 'string' || !VALID_TIME_SLOTS.includes(t.sourceSlot)) return false;
  if (typeof t.targetSlot !== 'string' || !VALID_TIME_SLOTS.includes(t.targetSlot)) return false;

  // 验证 progress in [0,1]
  if (!isInRange(t.progress, 0, 1)) return false;

  // 验证 appliedParams 包含 5 个字段，每个在 [0,1]
  if (!t.appliedParams || typeof t.appliedParams !== 'object') return false;
  const params = t.appliedParams as Record<string, unknown>;
  for (const key of REQUIRED_TIME_PARAMS_KEYS) {
    if (!isInRange(params[key], 0, 1)) return false;
  }

  return true;
}
