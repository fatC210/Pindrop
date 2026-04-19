/**
 * FiveLayerMixer 单元测试
 *
 * 测试 5 层混音器的节点创建、连接、音量控制和并发管理。
 *
 * Requirements: 2.1, 2.2, 2.3, 20.3, 22.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FiveLayerMixer } from '@/utils/audio/fiveLayerMixer';
import {
  MockAudioContext,
  MockAudioBuffer,
  MockGainNode,
} from './webAudioMock';
import { ALL_LAYER_TYPES, DEFAULT_LAYER_VOLUMES } from '@/utils/audio/types';

describe('FiveLayerMixer', () => {
  let mixer: FiveLayerMixer;
  let mockContext: MockAudioContext;
  let masterGainNode: MockGainNode;

  beforeEach(() => {
    mixer = new FiveLayerMixer();
    mockContext = new MockAudioContext();
    masterGainNode = mockContext.createGain();
  });

  describe('initialize()', () => {
    it('应该为 5 层各创建 GainNode', () => {
      mixer.initialize(mockContext as unknown as AudioContext, masterGainNode as unknown as GainNode);

      expect(mockContext.createdGainNodes.length).toBeGreaterThanOrEqual(5);
    });

    it('应该为 dialogue 和 secondaryDialogue 层创建 StereoPannerNode', () => {
      mixer.initialize(mockContext as unknown as AudioContext, masterGainNode as unknown as GainNode);

      expect(mockContext.createdStereoPanners.length).toBeGreaterThanOrEqual(2);
    });

    it('应该为其他层不创建 StereoPannerNode', () => {
      mixer.initialize(mockContext as unknown as AudioContext, masterGainNode as unknown as GainNode);

      // 只有 2 个 PanNode（dialogue 和 secondaryDialogue）
      expect(mockContext.createdStereoPanners.length).toBe(2);
    });

    it('应该设置默认音量值', () => {
      mixer.initialize(mockContext as unknown as AudioContext, masterGainNode as unknown as GainNode);

      for (const layerType of ALL_LAYER_TYPES) {
        const layerState = mixer.getLayerState(layerType);
        expect(layerState.volume).toBe(DEFAULT_LAYER_VOLUMES[layerType]);
      }
    });
  });

  describe('playLayer()', () => {
    beforeEach(() => {
      mixer.initialize(mockContext as unknown as AudioContext, masterGainNode as unknown as GainNode);
    });

    it('应该创建新的 AudioBufferSourceNode', () => {
      const buffer = new MockAudioBuffer();
      const initialCount = mockContext.createdBufferSources.length;

      mixer.playLayer('ambient', buffer as unknown as AudioBuffer, false);

      expect(mockContext.createdBufferSources.length).toBe(initialCount + 1);
    });

    it('应该设置 buffer 和 loop 属性', () => {
      const buffer = new MockAudioBuffer();

      mixer.playLayer('ambient', buffer as unknown as AudioBuffer, true);

      const sourceNode = mockContext.createdBufferSources[mockContext.createdBufferSources.length - 1];
      expect(sourceNode.buffer).toBe(buffer);
      expect(sourceNode.loop).toBe(true);
    });

    it('应该调用 start() 开始播放', () => {
      const buffer = new MockAudioBuffer();

      mixer.playLayer('ambient', buffer as unknown as AudioBuffer, false);

      const sourceNode = mockContext.createdBufferSources[mockContext.createdBufferSources.length - 1];
      expect(sourceNode.started).toBe(true);
    });

    it('应该更新层状态为 isPlaying=true', () => {
      const buffer = new MockAudioBuffer();

      mixer.playLayer('ambient', buffer as unknown as AudioBuffer, false);

      const layerState = mixer.getLayerState('ambient');
      expect(layerState.isPlaying).toBe(true);
    });

    it('应该停止旧的 SourceNode 再播放新的', () => {
      const buffer = new MockAudioBuffer();

      mixer.playLayer('ambient', buffer as unknown as AudioBuffer, false);
      const firstSourceNode = mockContext.createdBufferSources[mockContext.createdBufferSources.length - 1];

      mixer.playLayer('ambient', buffer as unknown as AudioBuffer, false);
      const secondSourceNode = mockContext.createdBufferSources[mockContext.createdBufferSources.length - 1];

      expect(firstSourceNode.stopped).toBe(true);
      expect(secondSourceNode.started).toBe(true);
      expect(firstSourceNode).not.toBe(secondSourceNode);
    });

    it('应该尊重并发限制', () => {
      const buffer = new MockAudioBuffer();
      const MAX_CONCURRENT = 10;

      // 尝试播放超过限制数量的层
      for (let i = 0; i < MAX_CONCURRENT + 5; i++) {
        const layerType = ALL_LAYER_TYPES[i % ALL_LAYER_TYPES.length];
        mixer.playLayer(layerType, buffer as unknown as AudioBuffer, false);
      }

      // 活跃 SourceNode 数量应该不超过限制
      expect(mixer.getActiveSourceCount()).toBeLessThanOrEqual(MAX_CONCURRENT);
    });
  });

  describe('stopLayer()', () => {
    beforeEach(() => {
      mixer.initialize(mockContext as unknown as AudioContext, masterGainNode as unknown as GainNode);
    });

    it('应该停止指定层的播放', () => {
      const buffer = new MockAudioBuffer();

      mixer.playLayer('ambient', buffer as unknown as AudioBuffer, false);
      mixer.stopLayer('ambient');

      const layerState = mixer.getLayerState('ambient');
      expect(layerState.isPlaying).toBe(false);
    });

    it('应该调用 stop() 和 disconnect()', () => {
      const buffer = new MockAudioBuffer();

      mixer.playLayer('ambient', buffer as unknown as AudioBuffer, false);
      mixer.stopLayer('ambient');

      const sourceNode = mockContext.createdBufferSources[mockContext.createdBufferSources.length - 1];
      expect(sourceNode.stopped).toBe(true);
    });

    it('应该从活跃集合中移除 SourceNode', () => {
      const buffer = new MockAudioBuffer();

      mixer.playLayer('ambient', buffer as unknown as AudioBuffer, false);
      const initialCount = mixer.getActiveSourceCount();

      mixer.stopLayer('ambient');

      expect(mixer.getActiveSourceCount()).toBeLessThan(initialCount);
    });
  });

  describe('stopAll()', () => {
    beforeEach(() => {
      mixer.initialize(mockContext as unknown as AudioContext, masterGainNode as unknown as GainNode);
    });

    it('应该停止所有层的播放', () => {
      const buffer = new MockAudioBuffer();

      for (const layerType of ALL_LAYER_TYPES) {
        mixer.playLayer(layerType, buffer as unknown as AudioBuffer, false);
      }

      mixer.stopAll();

      for (const layerType of ALL_LAYER_TYPES) {
        const layerState = mixer.getLayerState(layerType);
        expect(layerState.isPlaying).toBe(false);
      }
    });

    it('应该清空活跃 SourceNode 集合', () => {
      const buffer = new MockAudioBuffer();

      for (const layerType of ALL_LAYER_TYPES) {
        mixer.playLayer(layerType, buffer as unknown as AudioBuffer, false);
      }

      mixer.stopAll();

      expect(mixer.getActiveSourceCount()).toBe(0);
    });
  });

  describe('setLayerVolume()', () => {
    beforeEach(() => {
      mixer.initialize(mockContext as unknown as AudioContext, masterGainNode as unknown as GainNode);
    });

    it('应该设置层的音量值', () => {
      mixer.setLayerVolume('ambient', 0.5);

      const layerState = mixer.getLayerState('ambient');
      expect(layerState.volume).toBe(0.5);
    });

    it('应该将音量值 clamp 到 [0, 1]', () => {
      mixer.setLayerVolume('ambient', 1.5);
      expect(mixer.getLayerState('ambient').volume).toBe(1);

      mixer.setLayerVolume('ambient', -0.5);
      expect(mixer.getLayerState('ambient').volume).toBe(0);
    });

    it('应该更新 GainNode.gain.value', () => {
      mixer.setLayerVolume('ambient', 0.7);

      const layerState = mixer.getLayerState('ambient');
      expect(layerState.gainNode.gain.value).toBe(0.7);
    });

    it('应该不影响其他层的音量', () => {
      const originalVolumes = {} as Record<string, number>;
      for (const layerType of ALL_LAYER_TYPES) {
        originalVolumes[layerType] = mixer.getLayerState(layerType).volume;
      }

      mixer.setLayerVolume('ambient', 0.2);

      for (const layerType of ALL_LAYER_TYPES) {
        if (layerType !== 'ambient') {
          expect(mixer.getLayerState(layerType).volume).toBe(originalVolumes[layerType]);
        }
      }
    });
  });

  describe('getLayerState()', () => {
    beforeEach(() => {
      mixer.initialize(mockContext as unknown as AudioContext, masterGainNode as unknown as GainNode);
    });

    it('应该返回指定层的状态', () => {
      const layerState = mixer.getLayerState('ambient');

      expect(layerState).toBeDefined();
      expect(layerState.gainNode).toBeDefined();
      expect(layerState.isPlaying).toBe(false);
    });

    it('应该为 dialogue 层返回 panNode', () => {
      const layerState = mixer.getLayerState('dialogue');

      expect(layerState.panNode).toBeDefined();
      expect(layerState.panNode).not.toBeNull();
    });

    it('应该为 ambient 层不返回 panNode', () => {
      const layerState = mixer.getLayerState('ambient');

      expect(layerState.panNode).toBeNull();
    });
  });

  describe('getMixerState()', () => {
    beforeEach(() => {
      mixer.initialize(mockContext as unknown as AudioContext, masterGainNode as unknown as GainNode);
    });

    it('应该返回完整的混音器状态', () => {
      const mixerState = mixer.getMixerState();

      expect(mixerState).toBeDefined();
      expect(mixerState.layers).toBeDefined();
      expect(mixerState.masterGainNode).toBeDefined();
    });

    it('应该包含所有 5 层的状态', () => {
      const mixerState = mixer.getMixerState();

      for (const layerType of ALL_LAYER_TYPES) {
        expect(mixerState.layers[layerType]).toBeDefined();
      }
    });
  });

  describe('getActiveSourceCount()', () => {
    beforeEach(() => {
      mixer.initialize(mockContext as unknown as AudioContext, masterGainNode as unknown as GainNode);
    });

    it('应该返回活跃 SourceNode 的数量', () => {
      const buffer = new MockAudioBuffer();

      expect(mixer.getActiveSourceCount()).toBe(0);

      mixer.playLayer('ambient', buffer as unknown as AudioBuffer, false);
      expect(mixer.getActiveSourceCount()).toBe(1);

      mixer.playLayer('signature', buffer as unknown as AudioBuffer, false);
      expect(mixer.getActiveSourceCount()).toBe(2);
    });
  });

  describe('dispose()', () => {
    beforeEach(() => {
      mixer.initialize(mockContext as unknown as AudioContext, masterGainNode as unknown as GainNode);
    });

    it('应该停止所有播放', () => {
      const buffer = new MockAudioBuffer();

      for (const layerType of ALL_LAYER_TYPES) {
        mixer.playLayer(layerType, buffer as unknown as AudioBuffer, false);
      }

      // 记录所有 SourceNode 引用
      const sourceNodes = mockContext.createdBufferSources.slice();

      mixer.dispose();

      // 验证所有 SourceNode 已停止
      for (const sourceNode of sourceNodes) {
        expect(sourceNode.stopped).toBe(true);
      }
    });

    it('应该清空活跃 SourceNode 集合', () => {
      const buffer = new MockAudioBuffer();

      mixer.playLayer('ambient', buffer as unknown as AudioBuffer, false);
      mixer.dispose();

      expect(mixer.getActiveSourceCount()).toBe(0);
    });

    it('应该释放 buffer 引用', () => {
      const buffer = new MockAudioBuffer();

      mixer.playLayer('ambient', buffer as unknown as AudioBuffer, false);

      // dispose 后 mixerState 被置为 null，getLayerState 会抛出
      mixer.dispose();

      expect(() => mixer.getLayerState('ambient')).toThrow();
    });
  });
});
