/**
 * 音频加载器
 *
 * 将 Blob 数据解码为 AudioBuffer，供 Web Audio API 使用。
 * 支持渐进式加载策略：ambient 层优先解码并立即回调，
 * 剩余 4 层并行解码，每层就绪后立即通知调用方。
 *
 * 需求覆盖: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7,
 *           12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */

import type {
  LayerType,
  AudioBlobMap,
  LayerDecodeResult,
  DecodeAllResult,
} from './types';

/** 日志前缀 */
const LOG_PREFIX = '[PinDrop Audio]';

/** 渐进式加载中，除 ambient 外的剩余层顺序 */
const REMAINING_LAYERS: readonly LayerType[] = [
  'signature',
  'dialogue',
  'secondaryDialogue',
  'atmosphere',
] as const;

/**
 * 音频加载器
 *
 * 提供三种解码模式：
 * - decodeBlob: 解码单个 Blob
 * - decodeAllProgressive: 渐进式解码（ambient 优先）
 * - decodeParallel: 并行解码所有层
 */
export class AudioLoader {
  /**
   * 解码单个 Blob 为 AudioBuffer
   *
   * 将 Blob 转为 ArrayBuffer 后调用 AudioContext.decodeAudioData，
   * 记录解码耗时和错误信息。
   *
   * @param blob - 音频 Blob 数据
   * @param layerType - 层类型标识
   * @param context - AudioContext 实例
   * @returns 解码结果，包含 buffer、耗时和错误信息
   */
  async decodeBlob(
    blob: Blob,
    layerType: LayerType,
    context: AudioContext
  ): Promise<LayerDecodeResult> {
    const startTime = performance.now();

    try {
      // 将 Blob 转为 ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();

      // 调用 AudioContext.decodeAudioData 解码
      const audioBuffer = await context.decodeAudioData(arrayBuffer);

      const decodeTimeMs = performance.now() - startTime;

      // 记录性能日志
      console.log(
        `${LOG_PREFIX} Decoded ${layerType} in ${Math.round(decodeTimeMs)}ms`
      );

      return {
        layerType,
        success: true,
        buffer: audioBuffer,
        decodeTimeMs,
        error: null,
      };
    } catch (error) {
      const decodeTimeMs = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // 记录错误日志
      console.error(
        `${LOG_PREFIX} Failed to decode ${layerType} audio: ${errorMessage}`
      );

      return {
        layerType,
        success: false,
        buffer: null,
        decodeTimeMs,
        error: errorMessage,
      };
    }
  }

  /**
   * 渐进式解码所有层（ambient 优先）
   *
   * 加载策略：
   * 1. 优先解码 ambient 层
   * 2. ambient 就绪后立即通过 onLayerReady 回调通知调用方
   * 3. 并行解码剩余 4 层（signature、dialogue、secondaryDialogue、atmosphere）
   * 4. 每层就绪后立即通过 onLayerReady 回调加入混音
   *
   * @param blobs - 各层的音频 Blob 映射
   * @param context - AudioContext 实例
   * @param onLayerReady - 层解码完成回调，成功时立即调用
   * @returns 全部层的解码结果汇总
   */
  async decodeAllProgressive(
    blobs: AudioBlobMap,
    context: AudioContext,
    onLayerReady: (layerType: LayerType, buffer: AudioBuffer) => void
  ): Promise<DecodeAllResult> {
    const results: LayerDecodeResult[] = [];

    // 阶段 1: 优先解码 ambient 层
    if (blobs.ambient) {
      const ambientResult = await this.decodeBlob(
        blobs.ambient,
        'ambient',
        context
      );
      results.push(ambientResult);

      // ambient 就绪后立即回调
      if (ambientResult.success && ambientResult.buffer) {
        onLayerReady('ambient', ambientResult.buffer);
      }
    }

    // 阶段 2: 并行解码剩余 4 层
    const remainingPromises = REMAINING_LAYERS
      .filter((layer) => blobs[layer] != null)
      .map(async (layer) => {
        const result = await this.decodeBlob(
          blobs[layer]!,
          layer,
          context
        );
        results.push(result);

        // 每层就绪后立即回调
        if (result.success && result.buffer) {
          onLayerReady(layer, result.buffer);
        }

        return result;
      });

    await Promise.allSettled(remainingPromises);

    // 汇总结果
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return {
      results,
      successCount,
      failureCount,
    };
  }

  /**
   * 并行解码所有层
   *
   * 使用 Promise.allSettled 同时解码所有提供的层，
   * 不区分优先级，适用于不需要渐进式加载的场景。
   *
   * @param blobs - 各层的音频 Blob 映射
   * @param context - AudioContext 实例
   * @returns 全部层的解码结果汇总
   */
  async decodeParallel(
    blobs: AudioBlobMap,
    context: AudioContext
  ): Promise<DecodeAllResult> {
    // 收集所有需要解码的层
    const entries = (Object.entries(blobs) as [LayerType, Blob][]).filter(
      ([, blob]) => blob != null
    );

    // 并行解码所有层
    const settledResults = await Promise.allSettled(
      entries.map(([layerType, blob]) =>
        this.decodeBlob(blob, layerType, context)
      )
    );

    // 提取结果（Promise.allSettled 不会 reject，但 decodeBlob 内部已处理错误）
    const results: LayerDecodeResult[] = settledResults.map(
      (settled, index) => {
        if (settled.status === 'fulfilled') {
          return settled.value;
        }

        // 理论上不会走到这里，因为 decodeBlob 内部已 catch
        const [layerType] = entries[index];
        const errorMessage =
          settled.reason instanceof Error
            ? settled.reason.message
            : String(settled.reason);

        return {
          layerType,
          success: false,
          buffer: null,
          decodeTimeMs: 0,
          error: errorMessage,
        };
      }
    );

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return {
      results,
      successCount,
      failureCount,
    };
  }
}
