/**
 * AudioContext 生命周期管理器
 *
 * 负责创建、恢复和关闭 AudioContext。
 * 全局单例模式，所有音频组件共享同一个 AudioContext。
 *
 * 需求覆盖: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 19.2, 19.3
 */

/** 日志前缀 */
const LOG_PREFIX = '[PinDrop Audio]';

/**
 * AudioContext 生命周期管理器
 *
 * 提供 AudioContext 的创建（单例）、恢复、关闭和浏览器支持检测。
 * 所有状态变更会输出日志。
 */
export class AudioContextManager {
  /** 当前 AudioContext 实例，未初始化时为 null */
  private context: AudioContext | null = null;

  /** 浏览器是否支持 Web Audio API */
  private isSupported: boolean;

  constructor() {
    this.isSupported = this.detectSupport();
  }

  /**
   * 检测浏览器是否支持 Web Audio API
   *
   * 检查 window.AudioContext 和 window.webkitAudioContext（Safari 兼容）。
   */
  private detectSupport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return !!(
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    );
  }

  /**
   * 获取 AudioContext 构造函数
   *
   * 优先使用标准 AudioContext，回退到 webkitAudioContext。
   */
  private getAudioContextConstructor(): typeof AudioContext | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
      null
    );
  }

  /**
   * 获取或创建 AudioContext 实例（单例模式）
   *
   * 首次调用时创建 AudioContext，后续调用返回同一实例。
   * 如果浏览器不支持 Web Audio API，抛出错误。
   *
   * @returns AudioContext 实例
   * @throws Error 浏览器不支持 Web Audio API 时抛出
   */
  getContext(): AudioContext {
    // 如果已有实例且未关闭，直接返回
    if (this.context && this.context.state !== 'closed') {
      return this.context;
    }

    // 检查浏览器支持
    if (!this.isSupported) {
      throw new Error(
        `${LOG_PREFIX} 浏览器不支持 Web Audio API，无法创建 AudioContext`
      );
    }

    const AudioContextClass = this.getAudioContextConstructor();
    if (!AudioContextClass) {
      throw new Error(
        `${LOG_PREFIX} 浏览器不支持 Web Audio API，无法创建 AudioContext`
      );
    }

    try {
      this.context = new AudioContextClass();
      console.log(`${LOG_PREFIX} AudioContext state: ${this.context.state}`);
      return this.context;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${LOG_PREFIX} AudioContext 创建失败: ${message}`
      );
    }
  }

  /**
   * 恢复被浏览器 autoplay 策略挂起的 AudioContext
   *
   * 当 AudioContext 处于 "suspended" 状态时，调用 context.resume() 恢复。
   * 通常需要在用户交互事件（如 click）中调用。
   */
  async resume(): Promise<void> {
    if (!this.context) {
      console.warn(`${LOG_PREFIX} 无法恢复：AudioContext 尚未创建`);
      return;
    }

    if (this.context.state === 'closed') {
      console.warn(`${LOG_PREFIX} 无法恢复：AudioContext 已关闭`);
      return;
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
      console.log(`${LOG_PREFIX} AudioContext state: ${this.context.state}`);
    }
  }

  /**
   * 关闭 AudioContext 并释放资源
   *
   * 关闭后 context 被置为 null，下次调用 getContext() 会创建新实例。
   */
  async close(): Promise<void> {
    if (!this.context) {
      return;
    }

    if (this.context.state === 'closed') {
      this.context = null;
      return;
    }

    try {
      await this.context.close();
      console.log(`${LOG_PREFIX} AudioContext state: closed`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${LOG_PREFIX} AudioContext 关闭失败: ${message}`);
    } finally {
      this.context = null;
    }
  }

  /**
   * 检查浏览器是否支持 Web Audio API
   *
   * @returns true 表示支持，false 表示不支持
   */
  checkSupport(): boolean {
    return this.isSupported;
  }

  /**
   * 获取当前 AudioContext 状态
   *
   * @returns AudioContext 的状态（'running' | 'suspended' | 'closed'），
   *          如果浏览器不支持则返回 'unsupported'
   */
  getState(): AudioContextState | 'unsupported' {
    if (!this.isSupported) {
      return 'unsupported';
    }

    if (!this.context) {
      return 'unsupported';
    }

    return this.context.state;
  }
}
