/**
 * Audio Player 模块导出
 *
 * 导出 AudioPlayer 类、所有类型定义和常量。
 * 外部模块通过此文件统一引入音频播放器功能。
 *
 * 需求覆盖: 21.1
 */

// === 核心类 ===
export { AudioPlayer } from './audioPlayer';

// === 类型定义 ===
export type {
  LayerType,
  PlaybackState,
  FadeType,
  AudioLayerState,
  MixerState,
  PlaybackStateInfo,
  LayerDecodeResult,
  DecodeAllResult,
  AudioBlobMap,
  StateChangeListener,
} from './types';

// === 常量 ===
export {
  ALL_LAYER_TYPES,
  LOOPING_LAYERS,
  PANNED_LAYERS,
  INTERVAL_LAYERS,
  FADE_IN_DURATION_S,
  FADE_OUT_DURATION_S,
  MAX_CONCURRENT_SOURCE_NODES,
  AMBIENT_LOAD_DEADLINE_MS,
  ALL_LAYERS_LOAD_DEADLINE_MS,
  DYNAMIC_EVENT_MIN_INTERVAL_MS,
  DYNAMIC_EVENT_MAX_INTERVAL_MS,
  DEFAULT_MASTER_VOLUME,
  DEFAULT_LAYER_VOLUMES,
} from './types';

// === 动态事件播放器类型 ===
export type { AudioGeneratorFn } from './dynamicEventPlayer';
