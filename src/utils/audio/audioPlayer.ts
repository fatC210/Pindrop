/**
 * 音频播放器顶层 API 门面
 *
 * 对外暴露简洁的播放控制接口，内部协调所有子组件：
 * AudioContextManager、FiveLayerMixer、SpatialAudioController、
 * FadeController、LoopManager、IntervalTriggerManager、
 * DynamicEventPlayer、MasterVolumeController、AudioLoader、
 * PlaybackStateManager。
 *
 * 需求覆盖: 15.1-15.7, 16.1-16.7, 17.1-17.7, 21.1-21.10
 */

import type { SoundscapeRecipe, DynamicEvent } from '@/types/soundscapeRecipe';
import type {
  AudioBlobMap,
  LayerType,
  PlaybackStateInfo,
  StateChangeListener,
} from './types';
import {
  ALL_LAYER_TYPES,
  LOOPING_LAYERS,
  FADE_OUT_DURATION_S,
} from './types';
import { AudioContextManager } from './audioContextManager';
import { FiveLayerMixer } from './fiveLayerMixer';
import { SpatialAudioController } from './spatialAudioController';
import { FadeController } from './fadeController';
import { LoopManager } from './loopManager';
import { IntervalTriggerManager } from './intervalTriggerManager';
import { DynamicEventPlayer } from './dynamicEventPlayer';
import type { AudioGeneratorFn } from './dynamicEventPlayer';
import { MasterVolumeController } from './masterVolumeController';
import { AudioLoader } from './audioLoader';
import { PlaybackStateManager } from './playbackStateManager';
import { preferencesStore } from '@/components/settings/preferencesStore';
import { getEventPool } from '@/utils/soundscape/dynamicEventScheduler';

/** 日志前缀 */
const LOG_PREFIX = '[PinDrop Audio]';

/** 淡出完成后清理旧声景的延迟（毫秒） */
const CROSSFADE_CLEANUP_DELAY_MS = FADE_OUT_DURATION_S * 1000;

/** 失败层数阈值 — 超过此数量进入 error 状态 */
const MAX_TOLERABLE_FAILURES = 2;

/**
 * 音频播放器顶层 API
 *
 * 协调所有子组件，提供 play/pause/resume/stop 等播放控制，
 * 支持声景切换交叉淡入淡出、快速切换防抖、音量持久化。
 */
export class AudioPlayer {
  // === 子组件实例 ===
  private contextManager: AudioContextManager;
  private mixer: FiveLayerMixer;
  private spatialController: SpatialAudioController;
  private fadeController: FadeController;
  private loopManager: LoopManager;
  private intervalTriggerManager: IntervalTriggerManager;
  private dynamicEventPlayer: DynamicEventPlayer;
  private masterVolumeController: MasterVolumeController;
  private audioLoader: AudioLoader;
  private stateManager: PlaybackStateManager;

  // === 内部状态 ===

  /** 当前 AudioContext 引用 */
  private context: AudioContext | null = null;

  /** 快速切换防抖：递增的加载 ID，忽略过期回调 */
  private currentLoadId: number = 0;

  /** 旧声景清理 timeout 引用 */
  private cleanupTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();

  /** 已解码的 AudioBuffer 缓存（用于间隔触发复用） */
  private decodedBuffers: Map<LayerType, AudioBuffer> = new Map();

  /** 当前声景配方引用 */
  private currentRecipe: SoundscapeRecipe | null = null;

  /** 是否已销毁 */
  private destroyed: boolean = false;

  /** 音频生成函数（用于动态事件） */
  private audioGeneratorFn: AudioGeneratorFn;

  /** 是否启用动态事件 */
  private dynamicEventsEnabled: boolean = true;

  constructor(audioGeneratorFn?: AudioGeneratorFn) {
    this.contextManager = new AudioContextManager();
    this.mixer = new FiveLayerMixer();
    this.spatialController = new SpatialAudioController();
    this.fadeController = new FadeController();
    this.loopManager = new LoopManager();
    this.intervalTriggerManager = new IntervalTriggerManager();
    this.dynamicEventPlayer = new DynamicEventPlayer();
    this.masterVolumeController = new MasterVolumeController();
    this.audioLoader = new AudioLoader();
    this.stateManager = new PlaybackStateManager();

    // 默认使用空操作生成函数（MVP 阶段可由外部注入实际实现）
    this.audioGeneratorFn = audioGeneratorFn ?? (async () => new Blob());

    // 初始化时从 localStorage 加载播放相关偏好
    this.loadPlaybackPreferences();
  }

  /**
   * 播放声景
   *
   * 协调所有子组件完成完整的播放流程：
   * 1. 状态转 loading
   * 2. 获取/恢复 AudioContext
   * 3. 初始化 MasterVolumeController 和 FiveLayerMixer
   * 4. 渐进式加载（ambient 优先）
   * 5. ambient 就绪后状态转 playing
   * 6. 所有层就绪后启动间隔触发和动态事件
   *
   * 如果当前正在播放，执行交叉淡入淡出切换。
   *
   * @param recipe - 声景配方
   * @param blobs - 各层音频 Blob 映射
   */
  async play(recipe: SoundscapeRecipe, blobs: AudioBlobMap): Promise<void> {
    if (this.destroyed) {
      console.warn(`${LOG_PREFIX} AudioPlayer 已销毁，无法播放`);
      return;
    }

    // 递增 loadId，使之前的加载失效
    const loadId = ++this.currentLoadId;

    const currentState = this.stateManager.getState().state;
    const isCurrentlyPlaying = currentState === 'playing' || currentState === 'paused';

    // 保存旧 mixer 引用用于交叉淡入淡出
    let oldMixer: FiveLayerMixer | null = null;

    try {
      // 如果正在播放，执行交叉淡入淡出
      if (isCurrentlyPlaying && this.context) {
        console.log(`${LOG_PREFIX} 检测到正在播放，执行声景切换`);
        oldMixer = this.mixer;

        // 旧声景淡出
        try {
          const oldMixerState = oldMixer.getMixerState();
          this.fadeController.fadeOutAll(oldMixerState, this.context.currentTime);
        } catch {
          // 旧 mixer 可能未初始化，忽略
        }

        // 停止旧的间隔触发和动态事件
        this.intervalTriggerManager.clearAll();
        this.dynamicEventPlayer.stop();

        // 创建新的 mixer 实例
        this.mixer = new FiveLayerMixer();

        // 延迟清理旧声景
        const cleanupTimeout = setTimeout(() => {
          this.cleanupTimeouts.delete(cleanupTimeout);
          if (oldMixer) {
            oldMixer.stopAll();
            oldMixer.dispose();
          }
        }, CROSSFADE_CLEANUP_DELAY_MS);
        this.cleanupTimeouts.add(cleanupTimeout);
      }

      // 状态转 loading
      this.stateManager.transition('loading', {
        soundscapeId: recipe.id,
        loadedLayers: [],
        failedLayers: [],
        errorMessage: null,
      });

      // 获取 AudioContext（如果尚未创建）
      this.context = this.contextManager.getContext();

      // 恢复被 autoplay 策略挂起的 AudioContext
      await this.contextManager.resume();

      // 初始化 MasterVolumeController → 获取 masterGainNode
      const masterGainNode = this.masterVolumeController.initialize(this.context);

      // 初始化新的 FiveLayerMixer
      this.mixer.initialize(this.context, masterGainNode);

      // 应用已保存的层音量
      this.applyLayerVolumesFromPreferences();

      // 保存当前配方
      this.currentRecipe = recipe;

      // 清空已解码 buffer 缓存
      this.decodedBuffers.clear();

      // 跟踪已加载和失败的层
      const loadedLayers: LayerType[] = [];
      const failedLayers: LayerType[] = [];
      let ambientReady = false;

      // 渐进式加载
      const decodeResult = await this.audioLoader.decodeAllProgressive(
        blobs,
        this.context,
        (layerType: LayerType, buffer: AudioBuffer) => {
          // 检查 loadId 是否仍然是最新的
          if (loadId !== this.currentLoadId) {
            console.log(`${LOG_PREFIX} 忽略过期的加载回调 (loadId: ${loadId}, current: ${this.currentLoadId})`);
            return;
          }

          // 缓存已解码的 buffer
          this.decodedBuffers.set(layerType, buffer);
          loadedLayers.push(layerType);

          // 判断是否需要循环
          const shouldLoop = (LOOPING_LAYERS as readonly string[]).includes(layerType);

          // 播放该层
          this.mixer.playLayer(layerType, buffer, shouldLoop);

          // 配置循环
          const layerState = this.mixer.getLayerState(layerType);
          if (layerState.sourceNode) {
            this.loopManager.configureLoop(layerState.sourceNode, layerType);
          }

          // 淡入
          this.fadeController.fadeIn(
            layerState.gainNode,
            layerState.volume,
            this.context!.currentTime
          );

          // 设置对话层的 pan 值
          if (layerType === 'dialogue' && layerState.panNode) {
            this.spatialController.setPan(layerState.panNode, recipe.layers.dialogue.pan);
          } else if (layerType === 'secondaryDialogue' && layerState.panNode) {
            this.spatialController.setPan(layerState.panNode, recipe.layers.secondaryDialogue.pan);
          }

          // ambient 就绪后状态转 playing
          if (layerType === 'ambient' && !ambientReady) {
            ambientReady = true;
            this.stateManager.transition('playing', {
              soundscapeId: recipe.id,
              loadedLayers: [...loadedLayers],
              failedLayers: [...failedLayers],
            });
          }
        }
      );

      // 检查 loadId 是否仍然是最新的
      if (loadId !== this.currentLoadId) {
        console.log(`${LOG_PREFIX} 加载完成但已过期，忽略后续处理`);
        return;
      }

      // 统计失败的层
      for (const result of decodeResult.results) {
        if (!result.success) {
          failedLayers.push(result.layerType);
        }
      }

      // 根据失败数量决定状态
      if (decodeResult.failureCount > MAX_TOLERABLE_FAILURES) {
        // 3+ 层失败 → error 状态
        this.stateManager.transition('error', {
          soundscapeId: recipe.id,
          loadedLayers: [...loadedLayers],
          failedLayers: [...failedLayers],
          errorMessage: `${decodeResult.failureCount} 层加载失败`,
        });
        return;
      }

      // 如果 ambient 未就绪但有其他层成功，也转为 playing
      if (!ambientReady && decodeResult.successCount > 0) {
        this.stateManager.transition('playing', {
          soundscapeId: recipe.id,
          loadedLayers: [...loadedLayers],
          failedLayers: [...failedLayers],
        });
      }

      // 更新失败层信息
      if (failedLayers.length > 0) {
        // 记录每个失败的层
        for (const result of decodeResult.results) {
          if (!result.success) {
            console.error(`${LOG_PREFIX} Layer ${result.layerType} failed: ${result.error}`);
          }
        }
      }

      // 所有层就绪后启动间隔触发和动态事件
      this.startIntervalTriggers(recipe);
      this.startDynamicEvents(recipe);

    } catch (error) {
      // 检查 loadId 是否仍然是最新的
      if (loadId !== this.currentLoadId) {
        return;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`${LOG_PREFIX} AudioPlayer play() 失败: ${errorMessage}`);

      this.stateManager.transition('error', {
        soundscapeId: recipe.id,
        errorMessage,
      });
    }
  }

  /**
   * 暂停播放
   *
   * 挂起 AudioContext，所有音频输出暂停。
   */
  pause(): void {
    if (this.destroyed) {
      return;
    }

    const currentState = this.stateManager.getState().state;
    if (currentState !== 'playing') {
      console.warn(`${LOG_PREFIX} 当前状态 ${currentState} 不支持暂停`);
      return;
    }

    if (this.context && this.context.state === 'running') {
      this.context.suspend().catch((error) => {
        console.error(`${LOG_PREFIX} AudioContext suspend 失败:`, error);
      });
    }

    this.stateManager.transition('paused');
  }

  /**
   * 恢复播放
   *
   * 恢复 AudioContext，所有音频输出继续。
   */
  resume(): void {
    if (this.destroyed) {
      return;
    }

    const currentState = this.stateManager.getState().state;
    if (currentState !== 'paused') {
      console.warn(`${LOG_PREFIX} 当前状态 ${currentState} 不支持恢复`);
      return;
    }

    if (this.context && this.context.state === 'suspended') {
      this.context.resume().catch((error) => {
        console.error(`${LOG_PREFIX} AudioContext resume 失败:`, error);
      });
    }

    this.stateManager.transition('playing');
  }

  /**
   * 停止播放并重置
   *
   * 淡出 → 清除所有 timeout → 停止所有层 → dispose → 状态转 idle。
   */
  stop(): void {
    if (this.destroyed) {
      return;
    }

    const currentState = this.stateManager.getState().state;
    if (currentState === 'idle') {
      return;
    }

    // 淡出所有层
    if (this.context) {
      try {
        const mixerState = this.mixer.getMixerState();
        this.fadeController.fadeOutAll(mixerState, this.context.currentTime);
      } catch {
        // mixer 可能未初始化，忽略
      }
    }

    // 清除所有间隔触发和动态事件
    this.intervalTriggerManager.clearAll();
    this.dynamicEventPlayer.stop();

    // 清除所有清理 timeout
    for (const timeout of this.cleanupTimeouts) {
      clearTimeout(timeout);
    }
    this.cleanupTimeouts.clear();

    // 延迟停止（等淡出完成）
    const stopTimeout = setTimeout(() => {
      this.cleanupTimeouts.delete(stopTimeout);
      this.performStop();
    }, CROSSFADE_CLEANUP_DELAY_MS);
    this.cleanupTimeouts.add(stopTimeout);

    // 立即转为 idle 状态
    this.stateManager.transition('idle', {
      soundscapeId: null,
      loadedLayers: [],
      failedLayers: [],
      errorMessage: null,
    });
  }

  /**
   * 设置总音量
   *
   * 立即更新 Master GainNode 并持久化到 localStorage。
   *
   * @param volume - 目标音量值（0-1）
   */
  setMasterVolume(volume: number): void {
    this.masterVolumeController.setVolume(volume);
  }

  /**
   * 设置指定层音量
   *
   * 立即更新该层 GainNode 并持久化到 localStorage。
   *
   * @param layerType - 层类型
   * @param volume - 目标音量值（0-1）
   */
  setLayerVolume(layerType: LayerType, volume: number): void {
    this.mixer.setLayerVolume(layerType, volume);

    // 持久化到 localStorage
    this.persistLayerVolume(layerType, volume);
  }

  /**
   * 设置对话层声像位置
   *
   * @param layerType - 对话层类型（'dialogue' 或 'secondaryDialogue'）
   * @param pan - 目标声像位置（-1 到 1）
   */
  setLayerPan(layerType: 'dialogue' | 'secondaryDialogue', pan: number): void {
    try {
      const layerState = this.mixer.getLayerState(layerType);
      if (layerState.panNode) {
        this.spatialController.setPan(layerState.panNode, pan);
      }
    } catch {
      // mixer 可能未初始化，忽略
      console.warn(`${LOG_PREFIX} 无法设置 ${layerType} 声像：mixer 未初始化`);
    }
  }

  setFadeInDuration(durationSeconds: number): void {
    this.fadeController.setDurations({ fadeInDuration: durationSeconds });
  }

  setDynamicEventsEnabled(enabled: boolean): void {
    this.dynamicEventsEnabled = enabled;
    if (!enabled) {
      this.dynamicEventPlayer.stop();
    }
  }

  /**
   * 获取当前播放状态
   *
   * @returns 当前 PlaybackStateInfo 的副本
   */
  getState(): PlaybackStateInfo {
    return this.stateManager.getState();
  }

  /**
   * 订阅状态变更
   *
   * @param callback - 状态变更回调函数
   * @returns 取消订阅函数
   */
  subscribe(callback: StateChangeListener): () => void {
    return this.stateManager.subscribe(callback);
  }

  /**
   * 销毁播放器，释放所有资源
   *
   * stop() + 关闭 AudioContext + 取消所有订阅。
   * 销毁后不可再使用。
   */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    // 立即停止所有播放（不等淡出）
    this.intervalTriggerManager.clearAll();
    this.dynamicEventPlayer.stop();

    // 清除所有清理 timeout
    for (const timeout of this.cleanupTimeouts) {
      clearTimeout(timeout);
    }
    this.cleanupTimeouts.clear();

    // 停止所有层并释放资源
    this.mixer.stopAll();
    this.mixer.dispose();

    // 清空 buffer 缓存
    this.decodedBuffers.clear();
    this.currentRecipe = null;

    // 关闭 AudioContext
    this.contextManager.close().catch((error) => {
      console.error(`${LOG_PREFIX} AudioContext 关闭失败:`, error);
    });
    this.context = null;

    // 取消所有订阅并重置状态
    this.stateManager.unsubscribeAll();
    this.stateManager.reset();

    console.log(`${LOG_PREFIX} AudioPlayer 已销毁`);
  }

  // === 私有方法 ===

  /**
   * 执行实际的停止操作（淡出完成后调用）
   *
   * @private
   */
  private performStop(): void {
    this.mixer.stopAll();
    this.mixer.dispose();
    this.decodedBuffers.clear();
    this.currentRecipe = null;
  }

  /**
   * 启动间隔触发（signature 和 dialogue 层）
   *
   * @private
   * @param recipe - 声景配方
   */
  private startIntervalTriggers(recipe: SoundscapeRecipe): void {
    if (!this.context) {
      return;
    }

    // signature 层间隔触发
    const signatureBuffer = this.decodedBuffers.get('signature');
    if (signatureBuffer) {
      this.intervalTriggerManager.startSignatureTrigger(
        recipe.layers.signature.intervalSeconds,
        signatureBuffer,
        this.mixer,
        this.fadeController,
        this.context
      );
    }

    // dialogue 层间隔触发
    const dialogueBuffer = this.decodedBuffers.get('dialogue');
    if (dialogueBuffer) {
      this.intervalTriggerManager.startDialogueTrigger(
        'dialogue',
        recipe.layers.dialogue.repeatIntervalSeconds,
        dialogueBuffer,
        this.mixer,
        this.fadeController,
        this.context
      );
    }

    // secondaryDialogue 层间隔触发
    const secondaryDialogueBuffer = this.decodedBuffers.get('secondaryDialogue');
    if (secondaryDialogueBuffer) {
      this.intervalTriggerManager.startDialogueTrigger(
        'secondaryDialogue',
        recipe.layers.secondaryDialogue.repeatIntervalSeconds,
        secondaryDialogueBuffer,
        this.mixer,
        this.fadeController,
        this.context
      );
    }
  }

  /**
   * 启动动态事件调度
   *
   * @private
   * @param recipe - 声景配方
   */
  private startDynamicEvents(recipe: SoundscapeRecipe): void {
    if (!this.context) {
      return;
    }

    if (!this.dynamicEventsEnabled) {
      return;
    }

    // 从配方的 location 中获取动态事件池
    // 动态事件池来自上游 SoundscapeRecipe 的 dynamicEvents 字段（如果存在）
    // 或者从 regionType 映射获取
    const dynamicEvents = this.getDynamicEventPool(recipe);
    if (dynamicEvents.length === 0) {
      return;
    }

    try {
      const masterGainNode = this.mixer.getMixerState().masterGainNode;
      this.dynamicEventPlayer.start(
        dynamicEvents,
        this.context,
        masterGainNode,
        this.spatialController,
        this.audioGeneratorFn
      );
    } catch {
      // mixer 可能未初始化，忽略
      console.warn(`${LOG_PREFIX} 无法启动动态事件：mixer 未初始化`);
    }
  }

  /**
   * 从配方中获取动态事件池
   *
   * @private
   * @param recipe - 声景配方
   * @returns 动态事件数组
   */
  private getDynamicEventPool(recipe: SoundscapeRecipe): DynamicEvent[] {
    try {
      if (recipe.location && recipe.location.regionType) {
        return getEventPool(recipe.location.regionType) || [];
      }
    } catch {
      // 获取事件池失败，返回空数组
    }
    return [];
  }

  /**
   * 从 preferencesStore 加载层音量偏好
   *
   * @private
   */
  private loadPlaybackPreferences(): void {
    try {
      const preferences = preferencesStore.loadPreferences();
      this.dynamicEventsEnabled = preferences.dynamicEvents;
      this.fadeController.setDurations({
        fadeInDuration: preferences.fadeInDuration,
      });

      if (preferences.layerVolumes) {
        console.log(`${LOG_PREFIX} 已加载层音量偏好`);
      }
    } catch (error) {
      console.warn(`${LOG_PREFIX} 加载层音量偏好失败:`, error);
    }
  }

  /**
   * 将已保存的层音量应用到 mixer
   *
   * @private
   */
  private applyLayerVolumesFromPreferences(): void {
    try {
      const preferences = preferencesStore.loadPreferences();
      const layerVolumes = preferences.layerVolumes;

      for (const layerType of ALL_LAYER_TYPES) {
        const volume = layerVolumes[layerType as keyof typeof layerVolumes];
        if (typeof volume === 'number' && volume >= 0 && volume <= 1) {
          this.mixer.setLayerVolume(layerType, volume);
        }
      }
    } catch (error) {
      console.warn(`${LOG_PREFIX} 应用层音量偏好失败:`, error);
    }
  }

  /**
   * 持久化单层音量到 localStorage
   *
   * @private
   * @param layerType - 层类型
   * @param volume - 音量值
   */
  private persistLayerVolume(layerType: LayerType, volume: number): void {
    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      const preferences = preferencesStore.loadPreferences();
      const key = layerType as keyof typeof preferences.layerVolumes;
      preferences.layerVolumes[key] = clampedVolume;
      preferencesStore.savePreferences(preferences);
    } catch (error) {
      console.error(`${LOG_PREFIX} 持久化层音量失败:`, error);
    }
  }
}
