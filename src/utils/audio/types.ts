/**
 * 音频播放器类型定义
 *
 * 定义 Audio Player 模块的核心类型、接口和常量。
 * 包括 5 层音频类型、播放状态、混音器状态、加载结果等。
 *
 * 需求覆盖: 2.1, 2.4, 2.7, 3.5, 14.1
 */

// === 层类型 ===

/** 音频层类型 */
export type LayerType = 'ambient' | 'signature' | 'dialogue' | 'secondaryDialogue' | 'atmosphere';

/** 所有有效的层类型值 */
export const ALL_LAYER_TYPES: readonly LayerType[] = [
  'ambient', 'signature', 'dialogue', 'secondaryDialogue', 'atmosphere',
] as const;

/** 需要循环播放的层 */
export const LOOPING_LAYERS: readonly LayerType[] = ['ambient', 'atmosphere'] as const;

/** 需要 PanNode 的层 */
export const PANNED_LAYERS: readonly LayerType[] = ['dialogue', 'secondaryDialogue'] as const;

/** 需要间隔触发的层 */
export const INTERVAL_LAYERS: readonly LayerType[] = ['signature', 'dialogue', 'secondaryDialogue'] as const;

// === 播放状态 ===

/** 播放状态枚举 */
export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

/** 淡入淡出类型 */
export type FadeType = 'fadeIn' | 'fadeOut';

// === 单层音频状态 ===

/** 单层音频状态 — 跟踪每层的 Web Audio 节点和播放信息 */
export interface AudioLayerState {
  /** 当前的 AudioBufferSourceNode，未播放时为 null */
  sourceNode: AudioBufferSourceNode | null;
  /** 该层的 GainNode，始终存在 */
  gainNode: GainNode;
  /** 该层的 StereoPannerNode，仅 dialogue/secondaryDialogue 层有 */
  panNode: StereoPannerNode | null;
  /** 解码后的 AudioBuffer，未加载时为 null */
  buffer: AudioBuffer | null;
  /** 该层是否正在播放 */
  isPlaying: boolean;
  /** 该层的目标音量 (0-1) */
  volume: number;
  /** 该层是否加载失败 */
  failed: boolean;
}

// === 混音器状态 ===

/** 混音器状态 — 包含 5 层状态和总音量节点 */
export interface MixerState {
  /** 5 层音频状态 */
  layers: Record<LayerType, AudioLayerState>;
  /** 总音量 GainNode */
  masterGainNode: GainNode;
}

// === 播放状态元数据 ===

/** 播放状态详情 — 包含当前播放的完整信息 */
export interface PlaybackStateInfo {
  /** 当前播放状态 */
  state: PlaybackState;
  /** 当前声景配方 ID */
  soundscapeId: string | null;
  /** 已成功加载的层 */
  loadedLayers: LayerType[];
  /** 加载失败的层 */
  failedLayers: LayerType[];
  /** 错误信息（state 为 error 时） */
  errorMessage: string | null;
}

// === 音频加载结果 ===

/** 单层解码结果 */
export interface LayerDecodeResult {
  /** 层类型 */
  layerType: LayerType;
  /** 解码是否成功 */
  success: boolean;
  /** 解码后的 AudioBuffer，失败时为 null */
  buffer: AudioBuffer | null;
  /** 解码耗时（毫秒） */
  decodeTimeMs: number;
  /** 错误信息，成功时为 null */
  error: string | null;
}

/** 全部层解码结果 */
export interface DecodeAllResult {
  /** 各层解码结果 */
  results: LayerDecodeResult[];
  /** 成功解码的层数 */
  successCount: number;
  /** 失败的层数 */
  failureCount: number;
}

// === 音频 Blob 输入 ===

/** 音频 Blob 映射 — 从上游传入的 5 层音频数据 */
export type AudioBlobMap = Partial<Record<LayerType, Blob>>;

// === 状态变更回调 ===

/** 状态变更监听器 */
export type StateChangeListener = (state: PlaybackStateInfo) => void;

// === 淡入淡出配置 ===

/** 淡入持续时间（秒） */
export const FADE_IN_DURATION_S = 1.5;

/** 淡出持续时间（秒） */
export const FADE_OUT_DURATION_S = 0.8;

// === 性能常量 ===

/** 并发 AudioBufferSourceNode 最大数量 */
export const MAX_CONCURRENT_SOURCE_NODES = 10;

/** ambient 层最大加载时间（毫秒） */
export const AMBIENT_LOAD_DEADLINE_MS = 3000;

/** 全部层最大加载时间（毫秒） */
export const ALL_LAYERS_LOAD_DEADLINE_MS = 5000;

/** 动态事件最小间隔（毫秒） */
export const DYNAMIC_EVENT_MIN_INTERVAL_MS = 30000;

/** 动态事件最大间隔（毫秒） */
export const DYNAMIC_EVENT_MAX_INTERVAL_MS = 90000;

// === 默认音量 ===

/** 默认总音量 */
export const DEFAULT_MASTER_VOLUME = 0.7;

/** 默认各层音量 */
export const DEFAULT_LAYER_VOLUMES: Record<LayerType, number> = {
  ambient: 0.5,
  signature: 0.5,
  dialogue: 0.5,
  secondaryDialogue: 0.5,
  atmosphere: 0.5,
};
