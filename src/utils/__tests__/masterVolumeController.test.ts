/**
 * MasterVolumeController 单元测试
 *
 * 测试总音量控制器的初始化、音量设置、加载、重置和持久化功能。
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 16.1, 16.3, 22.9
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MasterVolumeController } from '@/utils/audio/masterVolumeController';
import { MockAudioContext } from './webAudioMock';
import { DEFAULT_MASTER_VOLUME } from '@/utils/audio/types';
import { PREFERENCES_KEY } from '@/components/settings/preferencesStore';

describe('MasterVolumeController', () => {
  let controller: MasterVolumeController;
  let mockContext: MockAudioContext;

  beforeEach(() => {
    controller = new MasterVolumeController();
    mockContext = new MockAudioContext();
    // 清理 localStorage
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('initialize()', () => {
    it('应该创建 Master GainNode', () => {
      controller.initialize(mockContext as unknown as AudioContext);

      expect(mockContext.createdGainNodes.length).toBe(1);
    });

    it('应该将 GainNode 连接到 AudioContext.destination', () => {
      controller.initialize(mockContext as unknown as AudioContext);

      const createdGainNode = mockContext.createdGainNodes[0];
      expect(createdGainNode.connectedTo).toContain(mockContext.destination);
    });

    it('应该使用默认音量初始化（无已保存值时）', () => {
      controller.initialize(mockContext as unknown as AudioContext);

      const createdGainNode = mockContext.createdGainNodes[0];
      // preferencesStore 默认 masterVolume 为 0.8
      expect(createdGainNode.gain.value).toBe(0.8);
    });

    it('应该使用已保存的音量初始化', () => {
      // 预先保存偏好
      const prefs = {
        mapStyle: 'light',
        autoPlay: true,
        fadeInDuration: 1.5,
        dynamicEvents: true,
        masterVolume: 0.4,
        layerVolumes: {
          ambient: 0.7,
          signature: 0.6,
          dialogue: 0.8,
          secondaryDialogue: 0.5,
          atmosphere: 0.4,
        },
      };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));

      controller.initialize(mockContext as unknown as AudioContext);

      const createdGainNode = mockContext.createdGainNodes[0];
      expect(createdGainNode.gain.value).toBe(0.4);
    });

    it('应该返回创建的 GainNode', () => {
      const gainNode = controller.initialize(mockContext as unknown as AudioContext);

      expect(gainNode).toBe(mockContext.createdGainNodes[0]);
    });
  });

  describe('setVolume()', () => {
    it('应该更新 GainNode.gain.value', () => {
      controller.initialize(mockContext as unknown as AudioContext);

      controller.setVolume(0.5);

      const createdGainNode = mockContext.createdGainNodes[0];
      expect(createdGainNode.gain.value).toBe(0.5);
    });

    it('应该将超过 1 的值 clamp 到 1', () => {
      controller.initialize(mockContext as unknown as AudioContext);

      controller.setVolume(1.5);

      const createdGainNode = mockContext.createdGainNodes[0];
      expect(createdGainNode.gain.value).toBe(1);
    });

    it('应该将低于 0 的值 clamp 到 0', () => {
      controller.initialize(mockContext as unknown as AudioContext);

      controller.setVolume(-0.5);

      const createdGainNode = mockContext.createdGainNodes[0];
      expect(createdGainNode.gain.value).toBe(0);
    });

    it('应该持久化音量到 localStorage', () => {
      controller.initialize(mockContext as unknown as AudioContext);

      controller.setVolume(0.6);

      const stored = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}');
      expect(stored.masterVolume).toBe(0.6);
    });

    it('在未初始化时也应该持久化音量', () => {
      controller.setVolume(0.3);

      const stored = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}');
      expect(stored.masterVolume).toBe(0.3);
    });

    it('不应该影响其他偏好设置', () => {
      // 预先保存偏好
      const prefs = {
        mapStyle: 'dark',
        autoPlay: false,
        fadeInDuration: 2.0,
        dynamicEvents: false,
        masterVolume: 0.8,
        layerVolumes: {
          ambient: 0.7,
          signature: 0.6,
          dialogue: 0.8,
          secondaryDialogue: 0.5,
          atmosphere: 0.4,
        },
      };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));

      controller.initialize(mockContext as unknown as AudioContext);
      controller.setVolume(0.5);

      const stored = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}');
      expect(stored.mapStyle).toBe('dark');
      expect(stored.autoPlay).toBe(false);
      expect(stored.masterVolume).toBe(0.5);
    });
  });

  describe('getVolume()', () => {
    it('应该返回 GainNode 的当前值（已初始化时）', () => {
      controller.initialize(mockContext as unknown as AudioContext);
      controller.setVolume(0.6);

      expect(controller.getVolume()).toBe(0.6);
    });

    it('应该从持久化存储加载值（未初始化时）', () => {
      const prefs = {
        mapStyle: 'light',
        autoPlay: true,
        fadeInDuration: 1.5,
        dynamicEvents: true,
        masterVolume: 0.35,
        layerVolumes: {
          ambient: 0.7,
          signature: 0.6,
          dialogue: 0.8,
          secondaryDialogue: 0.5,
          atmosphere: 0.4,
        },
      };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));

      expect(controller.getVolume()).toBe(0.35);
    });

    it('应该返回默认值（无已保存值且未初始化时）', () => {
      // preferencesStore 默认 masterVolume 为 0.8
      expect(controller.getVolume()).toBe(0.8);
    });
  });

  describe('loadSavedVolume()', () => {
    it('应该从 localStorage 加载已保存的音量', () => {
      const prefs = {
        mapStyle: 'light',
        autoPlay: true,
        fadeInDuration: 1.5,
        dynamicEvents: true,
        masterVolume: 0.42,
        layerVolumes: {
          ambient: 0.7,
          signature: 0.6,
          dialogue: 0.8,
          secondaryDialogue: 0.5,
          atmosphere: 0.4,
        },
      };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));

      expect(controller.loadSavedVolume()).toBe(0.42);
    });

    it('无已保存值时应该返回 preferencesStore 默认值 0.8', () => {
      expect(controller.loadSavedVolume()).toBe(0.8);
    });

    it('已保存值为 0 时应该正确返回 0', () => {
      const prefs = {
        mapStyle: 'light',
        autoPlay: true,
        fadeInDuration: 1.5,
        dynamicEvents: true,
        masterVolume: 0,
        layerVolumes: {
          ambient: 0.7,
          signature: 0.6,
          dialogue: 0.8,
          secondaryDialogue: 0.5,
          atmosphere: 0.4,
        },
      };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));

      expect(controller.loadSavedVolume()).toBe(0);
    });

    it('已保存值为 1 时应该正确返回 1', () => {
      const prefs = {
        mapStyle: 'light',
        autoPlay: true,
        fadeInDuration: 1.5,
        dynamicEvents: true,
        masterVolume: 1,
        layerVolumes: {
          ambient: 0.7,
          signature: 0.6,
          dialogue: 0.8,
          secondaryDialogue: 0.5,
          atmosphere: 0.4,
        },
      };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));

      expect(controller.loadSavedVolume()).toBe(1);
    });

    it('localStorage 损坏时应该返回 preferencesStore 默认值', () => {
      localStorage.setItem(PREFERENCES_KEY, 'invalid json{{{');

      // preferencesStore.loadPreferences() 会在 JSON.parse 失败时返回默认值
      // 默认 masterVolume 为 0.8
      expect(controller.loadSavedVolume()).toBe(0.8);
    });
  });

  describe('resetToDefault()', () => {
    it('应该将音量重置为 DEFAULT_MASTER_VOLUME (0.7)', () => {
      controller.initialize(mockContext as unknown as AudioContext);
      controller.setVolume(0.3);

      controller.resetToDefault();

      const createdGainNode = mockContext.createdGainNodes[0];
      expect(createdGainNode.gain.value).toBe(DEFAULT_MASTER_VOLUME);
    });

    it('应该将默认值持久化到 localStorage', () => {
      controller.initialize(mockContext as unknown as AudioContext);
      controller.setVolume(0.3);

      controller.resetToDefault();

      const stored = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}');
      expect(stored.masterVolume).toBe(DEFAULT_MASTER_VOLUME);
    });

    it('getVolume() 应该返回默认值', () => {
      controller.initialize(mockContext as unknown as AudioContext);
      controller.setVolume(0.9);

      controller.resetToDefault();

      expect(controller.getVolume()).toBe(DEFAULT_MASTER_VOLUME);
    });
  });

  describe('音量 clamp 边界值', () => {
    it('setVolume(0) 应该设置为 0', () => {
      controller.initialize(mockContext as unknown as AudioContext);
      controller.setVolume(0);

      expect(controller.getVolume()).toBe(0);
    });

    it('setVolume(1) 应该设置为 1', () => {
      controller.initialize(mockContext as unknown as AudioContext);
      controller.setVolume(1);

      expect(controller.getVolume()).toBe(1);
    });

    it('setVolume(100) 应该 clamp 到 1', () => {
      controller.initialize(mockContext as unknown as AudioContext);
      controller.setVolume(100);

      expect(controller.getVolume()).toBe(1);
    });

    it('setVolume(-100) 应该 clamp 到 0', () => {
      controller.initialize(mockContext as unknown as AudioContext);
      controller.setVolume(-100);

      expect(controller.getVolume()).toBe(0);
    });
  });
});
