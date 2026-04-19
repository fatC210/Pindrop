/**
 * FadeController 单元测试
 *
 * 测试淡入淡出的时间和目标值。
 *
 * Requirements: 4.1, 4.2, 5.1, 5.3, 22.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FadeController } from '@/utils/audio/fadeController';
import { FiveLayerMixer } from '@/utils/audio/fiveLayerMixer';
import {
  MockAudioContext,
  MockGainNode,
} from './webAudioMock';
import { FADE_IN_DURATION_S, FADE_OUT_DURATION_S, ALL_LAYER_TYPES } from '@/utils/audio/types';

describe('FadeController', () => {
  let fadeController: FadeController;
  let mockGainNode: MockGainNode;

  beforeEach(() => {
    fadeController = new FadeController();
    mockGainNode = new MockGainNode(0.5);
  });

  describe('fadeIn()', () => {
    it('应该调用 cancelScheduledValues', () => {
      const currentTime = 0;
      fadeController.fadeIn(mockGainNode as unknown as GainNode, 0.8, currentTime);

      const cancelCall = mockGainNode.gain.calls.find(
        (call) => call.method === 'cancelScheduledValues'
      );
      expect(cancelCall).toBeDefined();
    });

    it('应该调用 setValueAtTime(0, currentTime)', () => {
      const currentTime = 0;
      fadeController.fadeIn(mockGainNode as unknown as GainNode, 0.8, currentTime);

      const setValueCall = mockGainNode.gain.calls.find(
        (call) => call.method === 'setValueAtTime' && call.args[0] === 0
      );
      expect(setValueCall).toBeDefined();
      expect(setValueCall?.args[1]).toBe(currentTime);
    });

    it('应该调用 linearRampToValueAtTime(targetVolume, currentTime + 1.5)', () => {
      const currentTime = 0;
      const targetVolume = 0.8;
      fadeController.fadeIn(mockGainNode as unknown as GainNode, targetVolume, currentTime);

      const rampCall = mockGainNode.gain.calls.find(
        (call) => call.method === 'linearRampToValueAtTime'
      );
      expect(rampCall).toBeDefined();
      expect(rampCall?.args[0]).toBe(targetVolume);
      expect(rampCall?.args[1]).toBe(currentTime + FADE_IN_DURATION_S);
    });

    it('应该设置最终音量值为目标值', () => {
      const targetVolume = 0.7;
      fadeController.fadeIn(mockGainNode as unknown as GainNode, targetVolume, 0);

      expect(mockGainNode.gain.value).toBe(targetVolume);
    });
  });

  describe('fadeOut()', () => {
    it('应该调用 cancelScheduledValues', () => {
      const currentTime = 0;
      fadeController.fadeOut(mockGainNode as unknown as GainNode, currentTime);

      const cancelCall = mockGainNode.gain.calls.find(
        (call) => call.method === 'cancelScheduledValues'
      );
      expect(cancelCall).toBeDefined();
    });

    it('应该调用 setValueAtTime(currentValue, currentTime)', () => {
      const currentTime = 0;
      const initialValue = mockGainNode.gain.value;
      fadeController.fadeOut(mockGainNode as unknown as GainNode, currentTime);

      const setValueCall = mockGainNode.gain.calls.find(
        (call) => call.method === 'setValueAtTime' && call.args[0] === initialValue
      );
      expect(setValueCall).toBeDefined();
      expect(setValueCall?.args[1]).toBe(currentTime);
    });

    it('应该调用 linearRampToValueAtTime(0, currentTime + 0.8)', () => {
      const currentTime = 0;
      fadeController.fadeOut(mockGainNode as unknown as GainNode, currentTime);

      const rampCall = mockGainNode.gain.calls.find(
        (call) => call.method === 'linearRampToValueAtTime'
      );
      expect(rampCall).toBeDefined();
      expect(rampCall?.args[0]).toBe(0);
      expect(rampCall?.args[1]).toBe(currentTime + FADE_OUT_DURATION_S);
    });

    it('应该设置最终音量值为 0', () => {
      fadeController.fadeOut(mockGainNode as unknown as GainNode, 0);

      expect(mockGainNode.gain.value).toBe(0);
    });
  });

  describe('fadeInAll()', () => {
    it('应该对所有层执行淡入', () => {
      const mixer = new FiveLayerMixer();
      const mockContext = new MockAudioContext();
      const masterGainNode = mockContext.createGain();

      mixer.initialize(mockContext as unknown as AudioContext, masterGainNode as unknown as GainNode);

      const mixerState = mixer.getMixerState();
      fadeController.fadeInAll(mixerState, 0);

      // 验证所有层的 GainNode 都被调用了 linearRampToValueAtTime
      for (const layerType of ALL_LAYER_TYPES) {
        const layerState = mixerState.layers[layerType];
        const gainNode = layerState.gainNode as unknown as MockGainNode;
        const rampCall = gainNode.gain.calls.find(
          (call) => call.method === 'linearRampToValueAtTime'
        );
        expect(rampCall).toBeDefined();
      }
    });
  });

  describe('fadeOutAll()', () => {
    it('应该对所有层执行淡出', () => {
      const mixer = new FiveLayerMixer();
      const mockContext = new MockAudioContext();
      const masterGainNode = mockContext.createGain();

      mixer.initialize(mockContext as unknown as AudioContext, masterGainNode as unknown as GainNode);

      const mixerState = mixer.getMixerState();
      fadeController.fadeOutAll(mixerState, 0);

      // 验证所有层的 GainNode 都被调用了 linearRampToValueAtTime(0, ...)
      for (const layerType of ALL_LAYER_TYPES) {
        const layerState = mixerState.layers[layerType];
        const gainNode = layerState.gainNode as unknown as MockGainNode;
        const rampCall = gainNode.gain.calls.find(
          (call) => call.method === 'linearRampToValueAtTime' && call.args[0] === 0
        );
        expect(rampCall).toBeDefined();
      }
    });
  });

  describe('cancelFade()', () => {
    it('应该调用 cancelScheduledValues', () => {
      const currentTime = 0;
      fadeController.cancelFade(mockGainNode as unknown as GainNode, currentTime);

      const cancelCall = mockGainNode.gain.calls.find(
        (call) => call.method === 'cancelScheduledValues'
      );
      expect(cancelCall).toBeDefined();
      expect(cancelCall?.args[0]).toBe(currentTime);
    });
  });

  describe('淡入淡出时间精度', () => {
    it('淡入持续时间应该是 1.5 秒', () => {
      expect(FADE_IN_DURATION_S).toBe(1.5);
    });

    it('淡出持续时间应该是 0.8 秒', () => {
      expect(FADE_OUT_DURATION_S).toBe(0.8);
    });
  });
});
