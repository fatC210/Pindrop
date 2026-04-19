/**
 * 声景缓存单元测试
 * Feature: 06-caching-storage, Task 10.1
 *
 * 测试 soundscapeCache.ts 中所有函数的错误处理、边界条件和正常流程。
 * 通过 vi.mock 模拟 IndexedDB 操作。
 *
 * Validates: Requirements 3.6, 4.4, 4.6, 5.1, 5.3, 5.4, 5.5, 5.6, 14.2, 14.3
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CachedSoundscape } from '../soundscapeCache';

// ─── Mock IndexedDB ──────────────────────────────────────────────────────────

let mockGet: ReturnType<typeof vi.fn>;
let mockPut: ReturnType<typeof vi.fn>;
let mockDelete: ReturnType<typeof vi.fn>;
let mockGetAll: ReturnType<typeof vi.fn>;
let mockTransaction: ReturnType<typeof vi.fn>;

function createMockDB() {
  return {
    get: mockGet,
    put: mockPut,
    delete: mockDelete,
    getAll: mockGetAll,
    transaction: mockTransaction,
  };
}

vi.mock('@/utils/db', () => ({
  getDB: vi.fn(),
  isIndexedDBAvailable: vi.fn(() => true),
}));

// ─── 测试数据 ────────────────────────────────────────────────────────────────

const sampleSoundscape: CachedSoundscape = {
  id: '48.86,2.35-dawn',
  coordinates: [48.86, 2.35],
  timeSlot: 'dawn',
  cityName: 'Paris',
  countryName: 'France',
  generatedAt: 1700000000000,
  playCount: 3,
  lastPlayedAt: 1700000050000,
  sizeBytes: 500000,
};

const sampleData: Omit<CachedSoundscape, 'id'> = {
  coordinates: [48.86, 2.35],
  timeSlot: 'dawn',
  cityName: 'Paris',
  countryName: 'France',
  generatedAt: 1700000000000,
  playCount: 0,
  lastPlayedAt: 1700000000000,
  sizeBytes: 500000,
};

// ─── 测试 ────────────────────────────────────────────────────────────────────

describe('Soundscape Cache - Unit Tests', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();

    mockGet = vi.fn();
    mockPut = vi.fn();
    mockDelete = vi.fn();
    mockGetAll = vi.fn();
    mockTransaction = vi.fn();

    const { getDB } = await import('@/utils/db');
    vi.mocked(getDB).mockResolvedValue(createMockDB() as never);
  });

  // ─── getCachedSoundscape ─────────────────────────────────────────────────

  describe('getCachedSoundscape', () => {
    // Validates: Requirement 4.4 — 缓存未命中返回 null
    test('缓存未命中时返回 null', async () => {
      const { getCachedSoundscape } = await import('../soundscapeCache');
      mockGet.mockResolvedValue(undefined);

      const result = await getCachedSoundscape('nonexistent-key');

      expect(result).toBeNull();
      expect(mockGet).toHaveBeenCalledWith('soundscape_cache', 'nonexistent-key');
    });

    test('缓存命中时返回完整声景数据', async () => {
      const { getCachedSoundscape } = await import('../soundscapeCache');
      mockGet.mockResolvedValue(sampleSoundscape);

      const result = await getCachedSoundscape('48.86,2.35-dawn');

      expect(result).toEqual(sampleSoundscape);
      expect(result!.id).toBe('48.86,2.35-dawn');
      expect(result!.cityName).toBe('Paris');
    });

    // Validates: Requirements 4.6, 14.3 — 读取失败记录错误日志并返回 null
    test('读取失败时记录 [PinDrop Error] 日志并返回 null', async () => {
      const { getCachedSoundscape } = await import('../soundscapeCache');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const dbError = new Error('IndexedDB read failed');
      mockGet.mockRejectedValue(dbError);

      const result = await getCachedSoundscape('48.86,2.35-dawn');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PinDrop Error] Failed to get cached soundscape:',
        dbError
      );
    });
  });

  // ─── cacheSoundscape ─────────────────────────────────────────────────────

  describe('cacheSoundscape', () => {
    test('成功写入声景数据', async () => {
      const { cacheSoundscape } = await import('../soundscapeCache');
      mockPut.mockResolvedValue(undefined);

      await cacheSoundscape('48.86,2.35-dawn', sampleData);

      expect(mockPut).toHaveBeenCalledWith('soundscape_cache', {
        ...sampleData,
        id: '48.86,2.35-dawn',
      });
    });

    // Validates: Requirement 14.2 — 写入失败记录错误日志但不抛出异常
    test('写入失败时记录 [PinDrop Error] 日志但不抛出异常', async () => {
      const { cacheSoundscape } = await import('../soundscapeCache');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const dbError = new Error('Write failed');
      mockPut.mockRejectedValue(dbError);

      // 不应抛出异常
      await expect(cacheSoundscape('key', sampleData)).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PinDrop Error] Failed to cache soundscape:',
        dbError
      );
    });
  });

  // ─── checkCacheExists ────────────────────────────────────────────────────

  describe('checkCacheExists', () => {
    test('缓存存在时返回 true', async () => {
      const { checkCacheExists } = await import('../soundscapeCache');
      mockGet.mockResolvedValue(sampleSoundscape);

      const result = await checkCacheExists('48.86,2.35-dawn');

      expect(result).toBe(true);
    });

    test('缓存不存在时返回 false', async () => {
      const { checkCacheExists } = await import('../soundscapeCache');
      mockGet.mockResolvedValue(undefined);

      const result = await checkCacheExists('nonexistent-key');

      expect(result).toBe(false);
    });

    test('操作失败时返回 false 并记录错误日志', async () => {
      const { checkCacheExists } = await import('../soundscapeCache');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGet.mockRejectedValue(new Error('DB error'));

      const result = await checkCacheExists('key');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PinDrop Error] Failed to check cache existence:',
        expect.any(Error)
      );
    });
  });

  // ─── getCachedMarkers ────────────────────────────────────────────────────

  describe('getCachedMarkers', () => {
    test('返回所有缓存条目', async () => {
      const { getCachedMarkers } = await import('../soundscapeCache');
      const entries = [
        sampleSoundscape,
        { ...sampleSoundscape, id: '35.68,139.65-night', cityName: 'Tokyo' },
      ];
      mockGetAll.mockResolvedValue(entries);

      const result = await getCachedMarkers();

      expect(result).toEqual(entries);
      expect(result).toHaveLength(2);
      expect(mockGetAll).toHaveBeenCalledWith('soundscape_cache');
    });

    test('无缓存时返回空数组', async () => {
      const { getCachedMarkers } = await import('../soundscapeCache');
      mockGetAll.mockResolvedValue([]);

      const result = await getCachedMarkers();

      expect(result).toEqual([]);
    });

    test('操作失败时返回空数组并记录错误日志', async () => {
      const { getCachedMarkers } = await import('../soundscapeCache');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetAll.mockRejectedValue(new Error('DB error'));

      const result = await getCachedMarkers();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PinDrop Error] Failed to get cached markers:',
        expect.any(Error)
      );
    });
  });

  // ─── updatePlayStats ─────────────────────────────────────────────────────

  describe('updatePlayStats', () => {
    test('更新 playCount 和 lastPlayedAt', async () => {
      const { updatePlayStats } = await import('../soundscapeCache');
      const cached = { ...sampleSoundscape, playCount: 3, lastPlayedAt: 1000 };
      mockGet.mockResolvedValue(cached);
      mockPut.mockResolvedValue(undefined);

      const beforeTime = Date.now();
      await updatePlayStats('48.86,2.35-dawn');

      expect(mockPut).toHaveBeenCalledWith(
        'soundscape_cache',
        expect.objectContaining({
          playCount: 4,
        })
      );
      // lastPlayedAt 应该被更新为当前时间
      const putArg = mockPut.mock.calls[0][1];
      expect(putArg.lastPlayedAt).toBeGreaterThanOrEqual(beforeTime);
    });

    test('缓存不存在时不执行更新', async () => {
      const { updatePlayStats } = await import('../soundscapeCache');
      mockGet.mockResolvedValue(undefined);

      await updatePlayStats('nonexistent-key');

      expect(mockPut).not.toHaveBeenCalled();
    });

    test('操作失败时记录错误日志但不抛出异常', async () => {
      const { updatePlayStats } = await import('../soundscapeCache');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGet.mockRejectedValue(new Error('DB error'));

      await expect(updatePlayStats('key')).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PinDrop Error] Failed to update play stats:',
        expect.any(Error)
      );
    });
  });

  // ─── evictLRU ────────────────────────────────────────────────────────────

  describe('evictLRU', () => {
    // Validates: Requirements 5.1, 5.6 — 删除最旧条目并记录日志
    test('删除 lastPlayedAt 最小的条目并记录 [PinDrop] 日志', async () => {
      const { evictLRU } = await import('../soundscapeCache');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const oldestEntry = { ...sampleSoundscape, id: 'oldest-key', lastPlayedAt: 100 };
      const mockCursor = { value: oldestEntry };
      const mockIndex = { openCursor: vi.fn().mockResolvedValue(mockCursor) };
      const mockStore = { index: vi.fn().mockReturnValue(mockIndex) };
      mockTransaction.mockReturnValue({
        store: mockStore,
        done: Promise.resolve(),
      });
      mockDelete.mockResolvedValue(undefined);

      await evictLRU();

      expect(mockStore.index).toHaveBeenCalledWith('by-lastPlayedAt');
      expect(mockDelete).toHaveBeenCalledWith('soundscape_cache', 'oldest-key');
      expect(consoleSpy).toHaveBeenCalledWith('[PinDrop] Evicted LRU soundscape: oldest-key');
    });

    test('无条目可淘汰时不执行删除', async () => {
      const { evictLRU } = await import('../soundscapeCache');

      const mockIndex = { openCursor: vi.fn().mockResolvedValue(null) };
      const mockStore = { index: vi.fn().mockReturnValue(mockIndex) };
      mockTransaction.mockReturnValue({
        store: mockStore,
        done: Promise.resolve(),
      });

      await evictLRU();

      expect(mockDelete).not.toHaveBeenCalled();
    });

    // Validates: Requirement 5.5 — 淘汰失败时抛出异常
    test('操作失败时记录错误日志并抛出异常', async () => {
      const { evictLRU } = await import('../soundscapeCache');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const dbError = new Error('Transaction failed');
      mockTransaction.mockImplementation(() => { throw dbError; });

      await expect(evictLRU()).rejects.toThrow('Transaction failed');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PinDrop Error] Failed to evict LRU:',
        dbError
      );
    });
  });

  // ─── handleStorageQuotaExceeded ──────────────────────────────────────────

  describe('handleStorageQuotaExceeded', () => {
    // Validates: Requirements 3.6, 5.3, 5.4 — 淘汰后重试写入
    test('先淘汰 LRU 条目再重试写入', async () => {
      const { handleStorageQuotaExceeded } = await import('../soundscapeCache');
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const oldestEntry = { ...sampleSoundscape, id: 'old-entry', lastPlayedAt: 100 };
      const mockCursor = { value: oldestEntry };
      const mockIndex = { openCursor: vi.fn().mockResolvedValue(mockCursor) };
      const mockStore = { index: vi.fn().mockReturnValue(mockIndex) };
      mockTransaction.mockReturnValue({
        store: mockStore,
        done: Promise.resolve(),
      });
      mockDelete.mockResolvedValue(undefined);
      mockPut.mockResolvedValue(undefined);

      await handleStorageQuotaExceeded('new-key', sampleData);

      // 验证先删除旧条目
      expect(mockDelete).toHaveBeenCalledWith('soundscape_cache', 'old-entry');
      // 验证重试写入新数据
      expect(mockPut).toHaveBeenCalledWith('soundscape_cache', {
        ...sampleData,
        id: 'new-key',
      });
    });

    // Validates: Requirement 5.5 — 淘汰后重试仍失败时抛出异常
    test('淘汰失败时记录错误日志并抛出异常', async () => {
      const { handleStorageQuotaExceeded } = await import('../soundscapeCache');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const dbError = new Error('Eviction failed');
      mockTransaction.mockImplementation(() => { throw dbError; });

      await expect(
        handleStorageQuotaExceeded('key', sampleData)
      ).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PinDrop Error] Failed to handle storage quota:',
        expect.any(Error)
      );
    });
  });
});
