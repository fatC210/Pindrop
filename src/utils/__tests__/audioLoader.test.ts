/**
 * AudioLoader 单元测试
 *
 * 测试音频加载器的三种解码模式：
 * - decodeBlob: 单层解码（成功/失败）
 * - decodeAllProgressive: 渐进式解码（ambient 优先）
 * - decodeParallel: 并行解码所有层
 *
 * Requirements: 11.1, 11.2, 11.4, 11.5, 12.1, 12.2, 12.3, 22.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioLoader } from '../audio/audioLoader';
import { MockAudioContext, MockAudioBuffer } from './webAudioMock';
import type { LayerType, AudioBlobMap } from '../audio/types';

/** 创建模拟 Blob（带 arrayBuffer 方法） */
function createMockBlob(content: string = 'audio-data'): Blob {
  const data = new TextEncoder().encode(content);
  const blob = {
    size: data.byteLength,
    type: 'audio/mpeg',
    arrayBuffer: async () => data.buffer as ArrayBuffer,
    slice: () => blob,
    text: async () => content,
    stream: () => new ReadableStream(),
  } as unknown as Blob;
  return blob;
}

/** 创建包含所有 5 层的 AudioBlobMap */
function createFullBlobMap(): AudioBlobMap {
  return {
    ambient: createMockBlob('ambient'),
    signature: createMockBlob('signature'),
    dialogue: createMockBlob('dialogue'),
    secondaryDialogue: createMockBlob('secondary'),
    atmosphere: createMockBlob('atmosphere'),
  };
}

describe('AudioLoader', () => {
  let loader: AudioLoader;
  let mockContext: MockAudioContext;

  beforeEach(() => {
    loader = new AudioLoader();
    mockContext = new MockAudioContext();
    vi.restoreAllMocks();
  });

  describe('decodeBlob', () => {
    it('成功解码 Blob 为 AudioBuffer', async () => {
      const blob = createMockBlob();
      const result = await loader.decodeBlob(
        blob,
        'ambient',
        mockContext as unknown as AudioContext
      );

      expect(result.layerType).toBe('ambient');
      expect(result.success).toBe(true);
      expect(result.buffer).toBeInstanceOf(MockAudioBuffer);
      expect(result.decodeTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeNull();
    });

    it('解码失败时返回错误结果', async () => {
      mockContext.decodeAudioDataShouldFail = true;
      mockContext.decodeAudioDataError = 'Invalid audio format';

      const blob = createMockBlob();
      const result = await loader.decodeBlob(
        blob,
        'signature',
        mockContext as unknown as AudioContext
      );

      expect(result.layerType).toBe('signature');
      expect(result.success).toBe(false);
      expect(result.buffer).toBeNull();
      expect(result.error).toBe('Invalid audio format');
      expect(result.decodeTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('调用 AudioContext.decodeAudioData 进行解码', async () => {
      const blob = createMockBlob();
      await loader.decodeBlob(
        blob,
        'dialogue',
        mockContext as unknown as AudioContext
      );

      // 验证 decodeAudioData 被调用
      const decodeCalls = mockContext.calls.filter(
        (c) => c.method === 'decodeAudioData'
      );
      expect(decodeCalls).toHaveLength(1);
    });

    it('记录性能日志（成功时）', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const blob = createMockBlob();

      await loader.decodeBlob(
        blob,
        'atmosphere',
        mockContext as unknown as AudioContext
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[PinDrop Audio\] Decoded atmosphere in \d+ms/
        )
      );
    });

    it('记录错误日志（失败时）', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockContext.decodeAudioDataShouldFail = true;
      mockContext.decodeAudioDataError = 'Corrupt data';

      const blob = createMockBlob();
      await loader.decodeBlob(
        blob,
        'dialogue',
        mockContext as unknown as AudioContext
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PinDrop Audio] Failed to decode dialogue audio: Corrupt data'
      );
    });

    it('记录解码耗时', async () => {
      const blob = createMockBlob();
      const result = await loader.decodeBlob(
        blob,
        'ambient',
        mockContext as unknown as AudioContext
      );

      expect(typeof result.decodeTimeMs).toBe('number');
      expect(result.decodeTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('decodeAllProgressive', () => {
    it('优先解码 ambient 层', async () => {
      const blobs = createFullBlobMap();
      const readyOrder: LayerType[] = [];
      const onLayerReady = vi.fn((layerType: LayerType) => {
        readyOrder.push(layerType);
      });

      await loader.decodeAllProgressive(
        blobs,
        mockContext as unknown as AudioContext,
        onLayerReady
      );

      // ambient 应该是第一个就绪的层
      expect(readyOrder[0]).toBe('ambient');
    });

    it('ambient 就绪后立即调用 onLayerReady 回调', async () => {
      const blobs: AudioBlobMap = { ambient: createMockBlob() };
      const onLayerReady = vi.fn();

      await loader.decodeAllProgressive(
        blobs,
        mockContext as unknown as AudioContext,
        onLayerReady
      );

      expect(onLayerReady).toHaveBeenCalledWith(
        'ambient',
        expect.any(MockAudioBuffer)
      );
    });

    it('并行解码剩余 4 层', async () => {
      const blobs = createFullBlobMap();
      const onLayerReady = vi.fn();

      const result = await loader.decodeAllProgressive(
        blobs,
        mockContext as unknown as AudioContext,
        onLayerReady
      );

      // 所有 5 层都应该成功
      expect(result.successCount).toBe(5);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(5);

      // onLayerReady 应该被调用 5 次
      expect(onLayerReady).toHaveBeenCalledTimes(5);
    });

    it('没有 ambient 层时直接解码剩余层', async () => {
      const blobs: AudioBlobMap = {
        signature: createMockBlob(),
        dialogue: createMockBlob(),
      };
      const onLayerReady = vi.fn();

      const result = await loader.decodeAllProgressive(
        blobs,
        mockContext as unknown as AudioContext,
        onLayerReady
      );

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(onLayerReady).toHaveBeenCalledTimes(2);
    });

    it('部分层解码失败时继续处理其他层', async () => {
      // 创建一个会在第二次调用时失败的 context
      let callCount = 0;
      const customContext = new MockAudioContext();
      const originalDecode = customContext.decodeAudioData.bind(customContext);
      customContext.decodeAudioData = async (data: ArrayBuffer) => {
        callCount++;
        // 第二次调用失败（模拟 signature 层失败）
        if (callCount === 2) {
          throw new Error('Decode error');
        }
        return originalDecode(data);
      };

      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const blobs: AudioBlobMap = {
        ambient: createMockBlob(),
        signature: createMockBlob(),
        dialogue: createMockBlob(),
      };
      const onLayerReady = vi.fn();

      const result = await loader.decodeAllProgressive(
        blobs,
        customContext as unknown as AudioContext,
        onLayerReady
      );

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      // onLayerReady 只对成功的层调用
      expect(onLayerReady).toHaveBeenCalledTimes(2);
    });

    it('ambient 解码失败时不调用 onLayerReady', async () => {
      mockContext.decodeAudioDataShouldFail = true;
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const blobs: AudioBlobMap = { ambient: createMockBlob() };
      const onLayerReady = vi.fn();

      const result = await loader.decodeAllProgressive(
        blobs,
        mockContext as unknown as AudioContext,
        onLayerReady
      );

      expect(result.failureCount).toBe(1);
      expect(onLayerReady).not.toHaveBeenCalled();
    });

    it('空 blobs 映射返回空结果', async () => {
      const onLayerReady = vi.fn();

      const result = await loader.decodeAllProgressive(
        {},
        mockContext as unknown as AudioContext,
        onLayerReady
      );

      expect(result.results).toHaveLength(0);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(onLayerReady).not.toHaveBeenCalled();
    });

    it('返回正确的结果统计', async () => {
      const blobs = createFullBlobMap();
      const onLayerReady = vi.fn();

      const result = await loader.decodeAllProgressive(
        blobs,
        mockContext as unknown as AudioContext,
        onLayerReady
      );

      expect(result.successCount + result.failureCount).toBe(
        result.results.length
      );

      // 验证每个结果都有正确的层类型
      const layerTypes = result.results.map((r) => r.layerType);
      expect(layerTypes).toContain('ambient');
      expect(layerTypes).toContain('signature');
      expect(layerTypes).toContain('dialogue');
      expect(layerTypes).toContain('secondaryDialogue');
      expect(layerTypes).toContain('atmosphere');
    });
  });

  describe('decodeParallel', () => {
    it('并行解码所有层', async () => {
      const blobs = createFullBlobMap();

      const result = await loader.decodeParallel(
        blobs,
        mockContext as unknown as AudioContext
      );

      expect(result.results).toHaveLength(5);
      expect(result.successCount).toBe(5);
      expect(result.failureCount).toBe(0);
    });

    it('使用 Promise.allSettled 处理部分失败', async () => {
      // 让特定层失败
      let callCount = 0;
      const customContext = new MockAudioContext();
      const originalDecode = customContext.decodeAudioData.bind(customContext);
      customContext.decodeAudioData = async (data: ArrayBuffer) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Parallel decode error');
        }
        return originalDecode(data);
      };

      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const blobs: AudioBlobMap = {
        ambient: createMockBlob(),
        signature: createMockBlob(),
        dialogue: createMockBlob(),
      };

      const result = await loader.decodeParallel(
        blobs,
        customContext as unknown as AudioContext
      );

      expect(result.results).toHaveLength(3);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
    });

    it('空 blobs 映射返回空结果', async () => {
      const result = await loader.decodeParallel(
        {},
        mockContext as unknown as AudioContext
      );

      expect(result.results).toHaveLength(0);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
    });

    it('每个结果包含正确的层类型', async () => {
      const blobs: AudioBlobMap = {
        ambient: createMockBlob(),
        atmosphere: createMockBlob(),
      };

      const result = await loader.decodeParallel(
        blobs,
        mockContext as unknown as AudioContext
      );

      const layerTypes = result.results.map((r) => r.layerType);
      expect(layerTypes).toContain('ambient');
      expect(layerTypes).toContain('atmosphere');
      expect(result.results).toHaveLength(2);
    });

    it('所有层失败时 failureCount 等于总数', async () => {
      mockContext.decodeAudioDataShouldFail = true;
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const blobs: AudioBlobMap = {
        ambient: createMockBlob(),
        signature: createMockBlob(),
      };

      const result = await loader.decodeParallel(
        blobs,
        mockContext as unknown as AudioContext
      );

      expect(result.failureCount).toBe(2);
      expect(result.successCount).toBe(0);
    });

    it('成功结果包含有效的 AudioBuffer', async () => {
      const blobs: AudioBlobMap = {
        ambient: createMockBlob(),
      };

      const result = await loader.decodeParallel(
        blobs,
        mockContext as unknown as AudioContext
      );

      const ambientResult = result.results.find(
        (r) => r.layerType === 'ambient'
      );
      expect(ambientResult).toBeDefined();
      expect(ambientResult!.success).toBe(true);
      expect(ambientResult!.buffer).toBeInstanceOf(MockAudioBuffer);
    });
  });
});
