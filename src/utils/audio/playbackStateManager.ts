/**
 * 播放状态管理器
 *
 * 维护当前播放状态（idle/loading/playing/paused/error），
 * 支持状态转换验证、订阅通知和状态重置。
 * 状态转换遵循设计文档中定义的状态机规则。
 *
 * 需求覆盖: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 18.6
 */

import type {
  PlaybackState,
  PlaybackStateInfo,
  StateChangeListener,
} from './types';

/** 日志前缀 */
const LOG_PREFIX = '[PinDrop Audio]';

/**
 * 合法的状态转换映射
 *
 * 定义每个状态可以转换到的目标状态集合，
 * 遵循设计文档中的状态机规则表。
 */
const VALID_TRANSITIONS: Record<PlaybackState, ReadonlySet<PlaybackState>> = {
  idle: new Set<PlaybackState>(['loading']),
  loading: new Set<PlaybackState>(['playing', 'error', 'idle']),
  playing: new Set<PlaybackState>(['paused', 'loading', 'idle', 'error']),
  paused: new Set<PlaybackState>(['playing', 'idle', 'loading']),
  error: new Set<PlaybackState>(['loading', 'idle']),
};

/**
 * 创建初始播放状态
 *
 * @returns 初始 PlaybackStateInfo 对象
 */
function createInitialState(): PlaybackStateInfo {
  return {
    state: 'idle',
    soundscapeId: null,
    loadedLayers: [],
    failedLayers: [],
    errorMessage: null,
  };
}

/**
 * 播放状态管理器
 *
 * 跟踪当前播放状态，验证状态转换合法性，
 * 支持订阅状态变更通知。所有状态转换会输出日志。
 */
export class PlaybackStateManager {
  /** 当前播放状态 */
  private currentState: PlaybackStateInfo;

  /** 状态变更监听器集合 */
  private listeners: Set<StateChangeListener>;

  constructor() {
    this.currentState = createInitialState();
    this.listeners = new Set();
  }

  /**
   * 获取当前播放状态
   *
   * 返回当前状态的深拷贝，防止外部直接修改内部状态。
   *
   * @returns 当前 PlaybackStateInfo 的副本
   */
  getState(): PlaybackStateInfo {
    return {
      ...this.currentState,
      loadedLayers: [...this.currentState.loadedLayers],
      failedLayers: [...this.currentState.failedLayers],
    };
  }

  /**
   * 转换到新状态
   *
   * 验证状态转换的合法性（按状态机规则），
   * 更新 currentState 并通知所有 listeners。
   * 非法转换会被拒绝并输出警告日志。
   *
   * @param newState - 目标播放状态
   * @param metadata - 可选的状态元数据（soundscapeId、loadedLayers 等）
   */
  transition(
    newState: PlaybackState,
    metadata?: Partial<PlaybackStateInfo>
  ): void {
    const oldState = this.currentState.state;

    // 验证状态转换合法性
    const validTargets = VALID_TRANSITIONS[oldState];
    if (!validTargets || !validTargets.has(newState)) {
      console.warn(
        `${LOG_PREFIX} 非法状态转换: ${oldState} → ${newState}，已忽略`
      );
      return;
    }

    // 记录状态转换日志
    console.log(`${LOG_PREFIX} State: ${oldState} → ${newState}`);

    // 更新状态
    this.currentState = {
      ...this.currentState,
      ...metadata,
      state: newState,
    };

    // 通知所有监听器（传递状态副本）
    const stateSnapshot = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(stateSnapshot);
      } catch (error) {
        console.error(
          `${LOG_PREFIX} 状态变更监听器执行出错:`,
          error
        );
      }
    }
  }

  /**
   * 订阅状态变更
   *
   * 注册一个监听器，每次状态转换时会被调用。
   * 返回一个取消订阅函数，调用后移除该监听器。
   *
   * @param listener - 状态变更回调函数
   * @returns 取消订阅函数
   */
  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);

    // 返回取消订阅函数
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 取消所有订阅
   *
   * 移除所有已注册的状态变更监听器。
   */
  unsubscribeAll(): void {
    this.listeners.clear();
  }

  /**
   * 重置为初始状态
   *
   * 将状态重置为 idle，清空所有元数据。
   * 不会触发状态变更通知（直接重置，不经过 transition）。
   */
  reset(): void {
    this.currentState = createInitialState();
  }
}
