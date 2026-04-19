/**
 * 空间音频控制器
 *
 * 为 dialogue 和 secondaryDialogue 层提供 StereoPannerNode，
 * 实现左右声道定位。
 *
 * 需求覆盖: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

/** 日志前缀 */
const LOG_PREFIX = '[PinDrop Audio]';

/**
 * 空间音频控制器
 *
 * 管理对话层的声像定位，支持实时调整和动画效果。
 */
export class SpatialAudioController {
  /**
   * 设置指定对话层的声像位置
   *
   * 将 pan 值 clamp 到 [-1, 1] 范围，其中：
   * - -1 表示完全左声道
   * - 0 表示中心（立体声）
   * - 1 表示完全右声道
   *
   * @param panNode - StereoPannerNode 实例
   * @param pan - 目标声像位置 (-1 到 1)
   */
  setPan(panNode: StereoPannerNode, pan: number): void {
    // 将 pan 值 clamp 到 [-1, 1]，NaN 视为 0
    const clampedPan = Number.isNaN(pan) ? 0 : Math.max(-1, Math.min(1, pan));
    panNode.pan.value = clampedPan;
  }

  /**
   * 获取指定对话层的当前声像位置
   *
   * @param panNode - StereoPannerNode 实例
   * @returns 当前声像位置 (-1 到 1)
   */
  getPan(panNode: StereoPannerNode): number {
    return panNode.pan.value;
  }

  /**
   * 创建声像移动动画
   *
   * 使用 linearRampToValueAtTime 实现从 fromPan 到 toPan 的平滑过渡。
   * 用于动态事件的 panFromTo 效果（例如声音从左移动到右）。
   *
   * @param panNode - StereoPannerNode 实例
   * @param fromPan - 起始声像位置 (-1 到 1)
   * @param toPan - 目标声像位置 (-1 到 1)
   * @param durationMs - 动画持续时间（毫秒）
   * @param currentTime - 当前 AudioContext 时间（秒）
   */
  animatePan(
    panNode: StereoPannerNode,
    fromPan: number,
    toPan: number,
    durationMs: number,
    currentTime: number
  ): void {
    // 将 pan 值 clamp 到 [-1, 1]
    const clampedFromPan = Math.max(-1, Math.min(1, fromPan));
    const clampedToPan = Math.max(-1, Math.min(1, toPan));

    // 转换持续时间为秒
    const durationSeconds = durationMs / 1000;

    // 设置起始值
    panNode.pan.setValueAtTime(clampedFromPan, currentTime);

    // 线性渐变到目标值
    panNode.pan.linearRampToValueAtTime(clampedToPan, currentTime + durationSeconds);
  }
}
