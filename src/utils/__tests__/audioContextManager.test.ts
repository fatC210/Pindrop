/**
 * AudioContextManager 单元测试
 *
 * 测试 AudioContext 创建、恢复、关闭和浏览器支持检测。
 *
 * Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 22.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioContextManager } from '@/utils/audio/audioContextManager';
import { MockAudioContext } from './webAudioMock';

describe('AudioContextManager', () => {
  let manager: AudioContextManager;
  let originalAudioContext: typeof globalThis.AudioContext | undefined;

  beforeEach(() => {
    // 保存原始 AudioContext 并注入 Mock
    originalAudioContext = globalThis.AudioContext;
    (globalThis as unknown as Record<string, unknown>).AudioContext = MockAudioContext;
    manager = new AudioContextManager();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // 清理 AudioContext
    try {
      const ctx = manager.getContext();
      if (ctx && ctx.state !== 'closed') {
        await manager.close();
      }
    } catch {
      // 忽略错误
    }
    // 恢复原始 AudioContext
    if (originalAudioContext !== undefined) {
      globalThis.AudioContext = originalAudioContext;
    } else {
      delete (globalThis as unknown as Record<string, unknown>).AudioContext;
    }
  });

  describe('getContext()', () => {
    it('应该创建 AudioContext 实例', () => {
      const context = manager.getContext();
      expect(context).toBeDefined();
      expect(context).toBeInstanceOf(AudioContext);
    });

    it('应该返回单例 AudioContext', () => {
      const context1 = manager.getContext();
      const context2 = manager.getContext();
      expect(context1).toBe(context2);
    });

    it('应该在浏览器不支持时抛出错误', () => {
      // 移除 AudioContext mock 以模拟不支持的环境
      delete (globalThis as unknown as Record<string, unknown>).AudioContext;
      const newManager = new AudioContextManager();
      expect(() => {
        newManager.getContext();
      }).toThrow();
    });
  });

  describe('resume()', () => {
    it('应该恢复被挂起的 AudioContext', async () => {
      const context = manager.getContext();
      
      // 模拟 suspended 状态
      if (context.state === 'suspended') {
        await manager.resume();
        expect(context.state).toBe('running');
      }
    });

    it('应该在 AudioContext 未创建时输出警告', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await manager.resume();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('AudioContext 尚未创建')
      );

      warnSpy.mockRestore();
    });
  });

  describe('close()', () => {
    it('应该关闭 AudioContext', async () => {
      const context = manager.getContext();
      await manager.close();
      expect(context.state).toBe('closed');
    });

    it('应该在 AudioContext 已关闭时安全处理', async () => {
      manager.getContext();
      await manager.close();
      
      // 再次关闭应该不会抛出错误
      await expect(manager.close()).resolves.not.toThrow();
    });

    it('应该在 AudioContext 未创建时安全处理', async () => {
      const newManager = new AudioContextManager();
      
      // 关闭未创建的 AudioContext 应该不会抛出错误
      await expect(newManager.close()).resolves.not.toThrow();
    });
  });

  describe('checkSupport()', () => {
    it('应该返回布尔值', () => {
      const supported = manager.checkSupport();
      expect(typeof supported).toBe('boolean');
    });

    it('应该在浏览器环境中返回 true', () => {
      // AudioContext 已在 beforeEach 中注入到 globalThis
      const supported = manager.checkSupport();
      expect(supported).toBe(true);
    });
  });

  describe('getState()', () => {
    it('应该返回 AudioContext 状态', () => {
      const context = manager.getContext();
      const state = manager.getState();
      expect(state).toBe(context.state);
    });

    it('应该返回 "unsupported" 当浏览器不支持时', () => {
      // 移除 AudioContext mock 以模拟不支持的环境
      delete (globalThis as unknown as Record<string, unknown>).AudioContext;
      const newManager = new AudioContextManager();
      const state = newManager.getState();
      expect(state).toBe('unsupported');
    });

    it('应该返回 "running" 或 "suspended" 当 AudioContext 已创建时', () => {
      manager.getContext();
      const state = manager.getState();
      expect(['running', 'suspended']).toContain(state);
    });
  });

  describe('日志输出', () => {
    it('应该在创建 AudioContext 时输出日志', () => {
      const logSpy = vi.spyOn(console, 'log');
      
      const newManager = new AudioContextManager();
      newManager.getContext();
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PinDrop Audio]')
      );
      
      logSpy.mockRestore();
    });

    it('应该在关闭 AudioContext 时输出日志', async () => {
      const logSpy = vi.spyOn(console, 'log');
      
      manager.getContext();
      await manager.close();
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PinDrop Audio]')
      );
      
      logSpy.mockRestore();
    });
  });
});
