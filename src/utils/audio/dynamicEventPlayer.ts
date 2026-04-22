/**
 * 动态事件运行时播放器
 *
 * 在运行时调度和播放动态事件。
 * 使用上游 DynamicEventScheduler（已在 soundscape 模块中实现）的
 * scheduleNextEvent 纯函数来选择事件和计算间隔。
 *
 * 调度流程：
 * 1. 调用 scheduleNextEvent(eventPool) 获取事件和间隔
 * 2. 使用 setTimeout(nextIntervalMs) 调度下一次触发
 * 3. 触发时：生成音频 → 解码 → 创建临时 SourceNode/GainNode/PanNode → 应用音量和 pan 动画 → 播放
 * 4. 播放完成后回到步骤 1
 *
 * 需求覆盖: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9
 */

import type { DynamicEvent } from '@/types/soundscapeRecipe';
import type { ScheduledEvent } from '@/utils/soundscape/dynamicEventScheduler';
import { scheduleNextEvent } from '@/utils/soundscape/dynamicEventScheduler';
import type { SpatialAudioController } from './spatialAudioController';

/** 日志前缀 */
const LOG_PREFIX = '[PinDrop Audio]';
const TERMINAL_DYNAMIC_EVENT_FAILURE_PATTERNS = [
  /elevenlabs request failed \((401|403)\):/i,
  /api key/i,
  /invalid or expired/i,
  /quota/i,
  /credits? remaining/i,
  /plan upgrade/i,
];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return String(error);
}

function shouldPauseDynamicEvents(error: unknown): boolean {
  const message = getErrorMessage(error);
  return TERMINAL_DYNAMIC_EVENT_FAILURE_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * 音频生成函数类型
 *
 * 接收事件 prompt，返回生成的音频 Blob。
 * 实际实现由上层注入（例如调用 ElevenLabs sound-generation API）。
 */
export type AudioGeneratorFn = (prompt: string) => Promise<Blob>;

/**
 * 动态事件运行时播放器
 *
 * 在声景播放期间，按随机间隔（30-90 秒）从区域事件池中选择并播放动态音效。
 * 每个事件创建临时的 SourceNode/GainNode/PanNode 节点链，播放完成后自动清理。
 */
export class DynamicEventPlayer {
  /** 待执行的 timeout ID */
  private pendingTimeout: ReturnType<typeof setTimeout> | null = null;

  /** 是否正在运行 */
  private isRunning: boolean = false;

  /**
   * 启动动态事件调度循环
   *
   * 调用 scheduleNextEvent 获取事件和间隔，使用 setTimeout 调度循环。
   * 每次触发后播放事件音频，然后继续调度下一个事件。
   *
   * @param eventPool - 动态事件池（DynamicEvent 数组）
   * @param context - AudioContext 实例
   * @param masterGainNode - 总音量 GainNode
   * @param spatialController - 空间音频控制器
   * @param audioGeneratorFn - 音频生成回调函数
   */
  start(
    eventPool: DynamicEvent[],
    context: AudioContext,
    masterGainNode: GainNode,
    spatialController: SpatialAudioController,
    audioGeneratorFn: AudioGeneratorFn
  ): void {
    // 如果已在运行，先停止
    if (this.isRunning) {
      this.stop();
    }

    // 事件池为空时不启动
    if (!eventPool || eventPool.length === 0) {
      console.warn(`${LOG_PREFIX} DynamicEvent: 事件池为空，跳过调度`);
      return;
    }

    this.isRunning = true;

    console.log(`${LOG_PREFIX} DynamicEvent: 启动动态事件调度，事件池大小: ${eventPool.length}`);

    // 开始调度循环
    this.scheduleLoop(eventPool, context, masterGainNode, spatialController, audioGeneratorFn);
  }

  /**
   * 停止动态事件调度
   *
   * 清除 pending timeout，设置 isRunning=false。
   */
  stop(): void {
    this.isRunning = false;

    if (this.pendingTimeout !== null) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }

    console.log(`${LOG_PREFIX} DynamicEvent: 已停止动态事件调度`);
  }

  /**
   * 获取当前运行状态
   *
   * @returns 是否正在运行
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 调度循环 — 计算下一个事件并设置 timeout
   *
   * @private
   */
  private scheduleLoop(
    eventPool: DynamicEvent[],
    context: AudioContext,
    masterGainNode: GainNode,
    spatialController: SpatialAudioController,
    audioGeneratorFn: AudioGeneratorFn
  ): void {
    if (!this.isRunning) {
      return;
    }

    // 使用上游纯函数计算下一个事件
    const scheduled = scheduleNextEvent(eventPool);

    // 使用 setTimeout 调度下一次触发
    this.pendingTimeout = setTimeout(async () => {
      this.pendingTimeout = null;

      if (!this.isRunning) {
        return;
      }

      // 播放事件（异步，不阻塞调度）
      await this.playEvent(scheduled, context, masterGainNode, spatialController, audioGeneratorFn);

      // 无论成功失败，继续调度下一个事件
      this.scheduleLoop(eventPool, context, masterGainNode, spatialController, audioGeneratorFn);
    }, scheduled.nextIntervalMs);
  }

  /**
   * 播放单个动态事件
   *
   * 生成音频 → 解码 → 创建临时 SourceNode/GainNode/PanNode → 应用音量和 pan 动画 → 播放 → 完成后清理。
   * 错误处理：生成/解码失败时记录日志，不抛出异常。
   *
   * @private
   * @param scheduledEvent - 调度结果，包含事件、音量和间隔
   * @param context - AudioContext 实例
   * @param masterGainNode - 总音量 GainNode
   * @param spatialController - 空间音频控制器
   * @param audioGeneratorFn - 音频生成回调函数
   */
  private async playEvent(
    scheduledEvent: ScheduledEvent,
    context: AudioContext,
    masterGainNode: GainNode,
    spatialController: SpatialAudioController,
    audioGeneratorFn: AudioGeneratorFn
  ): Promise<void> {
    const { event, volume } = scheduledEvent;

    try {
      // 步骤 1: 生成事件音频
      const audioBlob = await audioGeneratorFn(event.prompt);

      // 步骤 2: 解码音频
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);

      // 步骤 3: 创建临时音频节点链
      const sourceNode = context.createBufferSource();
      const gainNode = context.createGain();
      const panNode = context.createStereoPanner();

      sourceNode.buffer = audioBuffer;

      // 步骤 4: 应用音量
      gainNode.gain.value = volume;

      // 步骤 5: 应用 pan 动画（从 panFromTo[0] 到 panFromTo[1]）
      spatialController.animatePan(
        panNode,
        event.panFromTo[0],
        event.panFromTo[1],
        event.durationMs,
        context.currentTime
      );

      // 步骤 6: 连接节点链 — SourceNode → PanNode → GainNode → MasterGainNode
      sourceNode.connect(panNode);
      panNode.connect(gainNode);
      gainNode.connect(masterGainNode);

      // 步骤 7: 播放完成后清理
      sourceNode.onended = () => {
        try {
          sourceNode.disconnect();
        } catch {
          // 节点可能已断开连接，忽略错误
        }
        try {
          panNode.disconnect();
        } catch {
          // 忽略断开连接错误
        }
        try {
          gainNode.disconnect();
        } catch {
          // 忽略断开连接错误
        }
      };

      // 步骤 8: 开始播放
      sourceNode.start();

      console.log(
        `${LOG_PREFIX} DynamicEvent: 播放事件 "${event.id}"，音量: ${volume.toFixed(2)}，` +
        `pan: ${event.panFromTo[0]} → ${event.panFromTo[1]}，持续: ${event.durationMs}ms`
      );
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      if (shouldPauseDynamicEvents(errorMessage)) {
        console.warn(
          `${LOG_PREFIX} DynamicEvent: 因 ElevenLabs 计费或访问限制暂停动态事件调度:`,
          errorMessage
        );
        this.stop();
        return;
      }

      // 生成/解码失败时记录 warning 并继续（不阻塞调度）
      console.warn(
        `${LOG_PREFIX} DynamicEvent: 播放事件 "${event.id}" 失败，将继续调度:`,
        errorMessage
      );
    }
  }
}
