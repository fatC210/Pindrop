/**
 * 循环播放管理器
 *
 * 为 ambient 和 atmosphere 层设置 loop=true，
 * 确保无缝循环播放。
 *
 * 需求覆盖: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import type { LayerType } from './types';
import { LOOPING_LAYERS } from './types';

/** 日志前缀 */
const LOG_PREFIX = '[PinDrop Audio]';

/**
 * 循环播放管理器
 *
 * 配置 AudioBufferSourceNode 的循环属性。
 */
export class LoopManager {
  /**
   * 配置指定层的循环属性
   *
   * ambient 和 atmosphere 层设置 loop=true，其他层设置 loop=false。
   *
   * @param sourceNode - AudioBufferSourceNode 实例
   * @param layerType - 层类型
   */
  configureLoop(sourceNode: AudioBufferSourceNode, layerType: LayerType): void {
    const shouldLoop = (LOOPING_LAYERS as readonly string[]).includes(layerType);
    sourceNode.loop = shouldLoop;
  }

  /**
   * 停止循环播放
   *
   * 先设置 loop=false，再调用 stop()，确保正确清理。
   *
   * @param sourceNode - AudioBufferSourceNode 实例
   */
  stopLoop(sourceNode: AudioBufferSourceNode): void {
    sourceNode.loop = false;
    try {
      sourceNode.stop();
    } catch {
      // 节点可能尚未启动或已停止，忽略错误
    }
  }
}
