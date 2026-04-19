/**
 * FadeController 属性测试
 *
 * 使用 fast-check 验证淡入淡出的目标值和时间。
 *
 * **Validates: Requirements 4.2, 4.4, 4.5, 5.1, 5.3**
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { FadeController } from '@/utils/audio/fadeController';
import { MockGainNode } from './webAudioMock';
import { FADE_IN_DURATION_S, FADE_OUT_DURATION_S } from '@/utils/audio/types';

describe('FadeController - Property Tests', () => {
  describe('Property 4: 淡入目标音量正确性', () => {
    it('**Validates: Requirements 4.2, 4.4, 4.5** - 对任意目标音量，linearRampToValueAtTime 被调用正确参数', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 100, noNaN: true }),
          (targetVolume, currentTime) => {
            const fadeController = new FadeController();
            const mockGainNode = new MockGainNode();

            fadeController.fadeIn(mockGainNode as unknown as GainNode, targetVolume, currentTime);

            // 查找 linearRampToValueAtTime 调用
            const rampCall = mockGainNode.gain.calls.find(
              (call) => call.method === 'linearRampToValueAtTime'
            );

            if (!rampCall) {
              throw new Error('linearRampToValueAtTime 未被调用');
            }

            // 验证目标值
            if (rampCall.args[0] !== targetVolume) {
              throw new Error(
                `目标音量不匹配: 期望 ${targetVolume}，实际 ${rampCall.args[0]}`
              );
            }

            // 验证时间
            const expectedEndTime = currentTime + FADE_IN_DURATION_S;
            if (rampCall.args[1] !== expectedEndTime) {
              throw new Error(
                `淡入结束时间不匹配: 期望 ${expectedEndTime}，实际 ${rampCall.args[1]}`
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: 淡出终止音量为零', () => {
    it('**Validates: Requirements 5.1, 5.3** - 对任意当前音量，linearRampToValueAtTime 被调用 (0, currentTime + 0.8)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 100, noNaN: true }),
          (initialVolume, currentTime) => {
            const fadeController = new FadeController();
            const mockGainNode = new MockGainNode(initialVolume);

            fadeController.fadeOut(mockGainNode as unknown as GainNode, currentTime);

            // 查找 linearRampToValueAtTime 调用
            const rampCall = mockGainNode.gain.calls.find(
              (call) => call.method === 'linearRampToValueAtTime'
            );

            if (!rampCall) {
              throw new Error('linearRampToValueAtTime 未被调用');
            }

            // 验证目标值为 0
            if (rampCall.args[0] !== 0) {
              throw new Error(
                `淡出目标音量应为 0，实际 ${rampCall.args[0]}`
              );
            }

            // 验证时间
            const expectedEndTime = currentTime + FADE_OUT_DURATION_S;
            if (rampCall.args[1] !== expectedEndTime) {
              throw new Error(
                `淡出结束时间不匹配: 期望 ${expectedEndTime}，实际 ${rampCall.args[1]}`
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
