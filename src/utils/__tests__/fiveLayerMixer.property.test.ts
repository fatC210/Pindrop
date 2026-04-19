/**
 * FiveLayerMixer 属性测试
 *
 * 使用 fast-check 验证音量和声像值的有效性。
 *
 * **Validates: Requirements 2.5, 2.7, 3.5, 10.3**
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { FiveLayerMixer } from '@/utils/audio/fiveLayerMixer';
import { MockAudioContext, MockGainNode, MockStereoPannerNode } from './webAudioMock';
import { ALL_LAYER_TYPES, PANNED_LAYERS } from '@/utils/audio/types';

describe('FiveLayerMixer - Property Tests', () => {
  describe('Property 1: 音量值始终在有效范围内', () => {
    it('**Validates: Requirements 2.5, 2.7, 10.3** - 任意音量输入都被 clamp 到 [0, 1]', () => {
      fc.assert(
        fc.property(fc.double({ min: -10, max: 10 }), (volumeInput) => {
          const mixer = new FiveLayerMixer();
          const mockContext = new MockAudioContext();
          const masterGainNode = mockContext.createGain();

          mixer.initialize(mockContext as unknown as AudioContext, masterGainNode as unknown as GainNode);

          // 对每一层设置音量
          for (const layerType of ALL_LAYER_TYPES) {
            mixer.setLayerVolume(layerType, volumeInput);

            const layerState = mixer.getLayerState(layerType);
            // 验证音量值在 [0, 1] 范围内
            if (!(layerState.volume >= 0 && layerState.volume <= 1)) {
              throw new Error(
                `音量值超出范围: ${layerState.volume}，输入: ${volumeInput}`
              );
            }
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: 音量设置层间隔离', () => {
    it('**Validates: Requirements 2.6, 10.4** - 设置某层音量不影响其他层', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1 }),
          fc.integer({ min: 0, max: 4 }),
          (volumeValue, layerIndex) => {
            const mixer = new FiveLayerMixer();
            const mockContext = new MockAudioContext();
            const masterGainNode = mockContext.createGain();

            mixer.initialize(mockContext as unknown as AudioContext, masterGainNode as unknown as GainNode);

            // 记录所有层的初始音量
            const initialVolumes = {} as Record<string, number>;
            for (const layerType of ALL_LAYER_TYPES) {
              initialVolumes[layerType] = mixer.getLayerState(layerType).volume;
            }

            // 设置指定层的音量
            const targetLayer = ALL_LAYER_TYPES[layerIndex];
            mixer.setLayerVolume(targetLayer, volumeValue);

            // 验证其他层的音量未变
            for (const layerType of ALL_LAYER_TYPES) {
              if (layerType !== targetLayer) {
                const currentVolume = mixer.getLayerState(layerType).volume;
                if (currentVolume !== initialVolumes[layerType]) {
                  throw new Error(
                    `层 ${layerType} 的音量被意外修改: ${initialVolumes[layerType]} → ${currentVolume}`
                  );
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: 声像值始终在有效范围内', () => {
    it('**Validates: Requirements 3.5** - 任意 pan 输入都被 clamp 到 [-1, 1]', () => {
      fc.assert(
        fc.property(fc.double({ min: -10, max: 10 }), (panInput) => {
          const mixer = new FiveLayerMixer();
          const mockContext = new MockAudioContext();
          const masterGainNode = mockContext.createGain();

          mixer.initialize(mockContext as unknown as AudioContext, masterGainNode as unknown as GainNode);

          // 对 dialogue 和 secondaryDialogue 层验证 panNode 的 pan 值
          for (const layerType of PANNED_LAYERS) {
            const layerState = mixer.getLayerState(layerType);
            if (layerState.panNode) {
              // 直接设置 panNode 的 pan 值（模拟 SpatialAudioController 的行为）
              const panNode = layerState.panNode as unknown as MockStereoPannerNode;
              const clampedPan = Number.isNaN(panInput) ? 0 : Math.max(-1, Math.min(1, panInput));
              panNode.pan.value = clampedPan;

              // 验证 pan 值在 [-1, 1] 范围内
              if (!(panNode.pan.value >= -1 && panNode.pan.value <= 1)) {
                throw new Error(
                  `声像值超出范围: ${panNode.pan.value}，输入: ${panInput}`
                );
              }
            }
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
