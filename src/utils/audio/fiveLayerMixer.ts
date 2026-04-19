/**
 * 5 层音频混音器
 *
 * 为每层创建独立的音频处理链（SourceNode → [PanNode] → GainNode → MasterGain）。
 * 维护 MixerState 对象，提供独立音量控制。
 *
 * 需求覆盖: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 20.2, 20.3
 */

import type { AudioLayerState, LayerType, MixerState } from './types';
import {
  ALL_LAYER_TYPES,
  DEFAULT_LAYER_VOLUMES,
  MAX_CONCURRENT_SOURCE_NODES,
  PANNED_LAYERS,
} from './types';

/** 日志前缀 */
const LOG_PREFIX = '[PinDrop Audio]';

/**
 * 5 层音频混音器
 *
 * 为 ambient、signature、dialogue、secondaryDialogue、atmosphere 各创建独立的
 * 音频处理链，支持独立音量控制和并发 SourceNode 管理。
 */
export class FiveLayerMixer {
  /** 混音器状态，包含 5 层状态和 masterGainNode */
  private mixerState: MixerState | null = null;

  /** 当前活跃的 AudioBufferSourceNode 集合 */
  private activeSourceNodes: Set<AudioBufferSourceNode> = new Set();

  /** AudioContext 引用 */
  private context: AudioContext | null = null;

  /**
   * 初始化 5 层音频处理链
   *
   * 为每层创建 GainNode，dialogue/secondaryDialogue 层额外创建 StereoPannerNode。
   * 节点连接链：[PanNode] → GainNode → MasterGain
   * SourceNode 在 playLayer() 时动态创建并连接。
   *
   * @param context - AudioContext 实例
   * @param masterGainNode - 总音量 GainNode，已连接到 destination
   */
  initialize(context: AudioContext, masterGainNode: GainNode): void {
    this.context = context;
    this.activeSourceNodes.clear();

    // 为 5 层各创建音频处理节点
    const layers = {} as Record<LayerType, AudioLayerState>;

    for (const layerType of ALL_LAYER_TYPES) {
      // 每层都创建 GainNode
      const gainNode = context.createGain();
      gainNode.gain.value = DEFAULT_LAYER_VOLUMES[layerType];

      // dialogue 和 secondaryDialogue 层额外创建 StereoPannerNode
      let panNode: StereoPannerNode | null = null;
      if ((PANNED_LAYERS as readonly string[]).includes(layerType)) {
        panNode = context.createStereoPanner();
        // 连接链：PanNode → GainNode → MasterGain
        panNode.connect(gainNode);
      }

      // GainNode 连接到 MasterGain
      gainNode.connect(masterGainNode);

      layers[layerType] = {
        sourceNode: null,
        gainNode,
        panNode,
        buffer: null,
        isPlaying: false,
        volume: DEFAULT_LAYER_VOLUMES[layerType],
        failed: false,
      };
    }

    this.mixerState = {
      layers,
      masterGainNode,
    };

    console.log(`${LOG_PREFIX} FiveLayerMixer 初始化完成，已创建 5 层音频处理链`);
  }

  /**
   * 为指定层播放 AudioBuffer
   *
   * 创建新的 AudioBufferSourceNode，连接到该层的处理链并开始播放。
   * 如果该层已有正在播放的 SourceNode，先停止旧的。
   * 受 MAX_CONCURRENT_SOURCE_NODES 并发限制。
   *
   * @param layerType - 层类型
   * @param buffer - 解码后的 AudioBuffer
   * @param loop - 是否循环播放
   */
  playLayer(layerType: LayerType, buffer: AudioBuffer, loop: boolean): void {
    if (!this.mixerState || !this.context) {
      console.warn(`${LOG_PREFIX} FiveLayerMixer 尚未初始化`);
      return;
    }

    // 检查并发限制
    if (this.activeSourceNodes.size >= MAX_CONCURRENT_SOURCE_NODES) {
      console.warn(
        `${LOG_PREFIX} 跳过播放 ${layerType}：并发 SourceNode 数量已达上限 (${MAX_CONCURRENT_SOURCE_NODES})`
      );
      return;
    }

    const layerState = this.mixerState.layers[layerType];

    // 如果该层已有正在播放的 SourceNode，先停止
    if (layerState.sourceNode && layerState.isPlaying) {
      this.stopLayer(layerType);
    }

    // 创建新的 AudioBufferSourceNode
    const sourceNode = this.context.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.loop = loop;

    // 根据层类型连接节点
    if (layerState.panNode) {
      // 有 PanNode 的层：SourceNode → PanNode → GainNode → MasterGain
      sourceNode.connect(layerState.panNode);
    } else {
      // 无 PanNode 的层：SourceNode → GainNode → MasterGain
      sourceNode.connect(layerState.gainNode);
    }

    // 注册 onended 回调，自动清理
    sourceNode.onended = () => {
      this.activeSourceNodes.delete(sourceNode);
      try {
        sourceNode.disconnect();
      } catch {
        // 节点可能已断开连接，忽略错误
      }

      // 如果当前层的 sourceNode 仍是这个节点，更新状态
      if (layerState.sourceNode === sourceNode) {
        layerState.sourceNode = null;
        layerState.isPlaying = false;
      }
    };

    // 开始播放
    sourceNode.start();

    // 更新层状态
    layerState.sourceNode = sourceNode;
    layerState.buffer = buffer;
    layerState.isPlaying = true;

    // 加入活跃集合
    this.activeSourceNodes.add(sourceNode);
  }

  /**
   * 停止指定层的播放
   *
   * 停止该层的 AudioBufferSourceNode 并从活跃集合中移除。
   *
   * @param layerType - 层类型
   */
  stopLayer(layerType: LayerType): void {
    if (!this.mixerState) {
      return;
    }

    const layerState = this.mixerState.layers[layerType];

    if (layerState.sourceNode) {
      const sourceNode = layerState.sourceNode;

      // 移除 onended 回调，避免重复清理
      sourceNode.onended = null;

      try {
        sourceNode.stop();
      } catch {
        // 节点可能尚未启动或已停止，忽略错误
      }

      try {
        sourceNode.disconnect();
      } catch {
        // 节点可能已断开连接，忽略错误
      }

      // 从活跃集合中移除
      this.activeSourceNodes.delete(sourceNode);

      // 更新层状态
      layerState.sourceNode = null;
      layerState.isPlaying = false;
    }
  }

  /**
   * 停止所有层的播放
   */
  stopAll(): void {
    if (!this.mixerState) {
      return;
    }

    for (const layerType of ALL_LAYER_TYPES) {
      this.stopLayer(layerType);
    }
  }

  /**
   * 设置指定层的音量
   *
   * 音量值会被 clamp 到 [0, 1] 范围，且不影响其他层。
   *
   * @param layerType - 层类型
   * @param volume - 目标音量值（0-1）
   */
  setLayerVolume(layerType: LayerType, volume: number): void {
    if (!this.mixerState) {
      console.warn(`${LOG_PREFIX} FiveLayerMixer 尚未初始化`);
      return;
    }

    // 将音量值 clamp 到 [0, 1]，NaN 视为 0
    const clampedVolume = Number.isNaN(volume) ? 0 : Math.max(0, Math.min(1, volume));

    const layerState = this.mixerState.layers[layerType];
    layerState.volume = clampedVolume;
    layerState.gainNode.gain.value = clampedVolume;
  }

  /**
   * 获取指定层的当前状态
   *
   * @param layerType - 层类型
   * @returns 该层的 AudioLayerState
   */
  getLayerState(layerType: LayerType): AudioLayerState {
    if (!this.mixerState) {
      throw new Error(`${LOG_PREFIX} FiveLayerMixer 尚未初始化`);
    }

    return this.mixerState.layers[layerType];
  }

  /**
   * 获取完整的混音器状态
   *
   * @returns MixerState 对象
   */
  getMixerState(): MixerState {
    if (!this.mixerState) {
      throw new Error(`${LOG_PREFIX} FiveLayerMixer 尚未初始化`);
    }

    return this.mixerState;
  }

  /**
   * 获取当前活跃的 SourceNode 数量
   *
   * @returns 活跃 SourceNode 数量
   */
  getActiveSourceCount(): number {
    return this.activeSourceNodes.size;
  }

  /**
   * 断开所有节点并释放资源
   *
   * 停止所有播放，断开所有 GainNode 和 PanNode，清空状态。
   */
  dispose(): void {
    // 先停止所有播放
    this.stopAll();

    if (this.mixerState) {
      // 断开所有层的节点连接
      for (const layerType of ALL_LAYER_TYPES) {
        const layerState = this.mixerState.layers[layerType];

        try {
          layerState.gainNode.disconnect();
        } catch {
          // 忽略断开连接错误
        }

        if (layerState.panNode) {
          try {
            layerState.panNode.disconnect();
          } catch {
            // 忽略断开连接错误
          }
        }

        // 释放 buffer 引用
        layerState.buffer = null;
      }
    }

    // 清空状态
    this.mixerState = null;
    this.context = null;
    this.activeSourceNodes.clear();

    console.log(`${LOG_PREFIX} FiveLayerMixer 已释放所有资源`);
  }
}
