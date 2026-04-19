/**
 * 声景缓存属性测试
 * Feature: 06-caching-storage
 *
 * 使用 fast-check 对 soundscapeCache 模块进行属性测试，
 * 通过 in-memory Map 模拟 IndexedDB 的 put/get/delete/getAll 操作。
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { CachedSoundscape } from '../soundscapeCache';

// ─── Mock IndexedDB ──────────────────────────────────────────────────────────
// 使用 in-memory Map 模拟 IndexedDB 存储
let store: Map<string, CachedSoundscape>;

function createMockDB() {
  return {
    get: vi.fn(async (_storeName: string, key: string) => {
      return store.get(key) ?? undefined;
    }),
    put: vi.fn(async (_storeName: string, value: CachedSoundscape) => {
      store.set(value.id, { ...value });
    }),
    delete: vi.fn(async (_storeName: string, key: string) => {
      store.delete(key);
    }),
    getAll: vi.fn(async () => {
      return Array.from(store.values());
    }),
    transaction: vi.fn(() => {
      return {
        store: {
          index: () => ({
            openCursor: async () => {
              // 找到 lastPlayedAt 最小的条目（LRU）
              let oldest: CachedSoundscape | null = null;
              for (const entry of store.values()) {
                if (!oldest || entry.lastPlayedAt < oldest.lastPlayedAt) {
                  oldest = entry;
                }
              }
              if (!oldest) return null;
              return { value: oldest };
            },
          }),
        },
        done: Promise.resolve(),
      };
    }),
  };
}

vi.mock('@/utils/db', () => ({
  getDB: vi.fn(),
  isIndexedDBAvailable: vi.fn(() => true),
}));

// ─── fast-check 生成器 ──────────────────────────────────────────────────────

const timeSlotArb = fc.constantFrom<'dawn' | 'day' | 'dusk' | 'night'>(
  'dawn',
  'day',
  'dusk',
  'night'
);

/** 生成随机声景数据（不含 id） */
const soundscapeDataArb = fc.record({
  coordinates: fc.tuple(
    fc.float({ min: -90, max: 90, noNaN: true }),
    fc.float({ min: -180, max: 180, noNaN: true })
  ) as fc.Arbitrary<[number, number]>,
  timeSlot: timeSlotArb,
  cityName: fc.string({ minLength: 1, maxLength: 50 }),
  countryName: fc.string({ minLength: 1, maxLength: 50 }),
  generatedAt: fc.integer({ min: 0, max: 2_000_000_000_000 }),
  playCount: fc.integer({ min: 0, max: 10_000 }),
  lastPlayedAt: fc.integer({ min: 0, max: 2_000_000_000_000 }),
  sizeBytes: fc.integer({ min: 0, max: 100_000_000 }),
});

/** 生成格式合法的缓存键 */
const cacheKeyArb = fc
  .tuple(
    fc.float({ min: -90, max: 90, noNaN: true }),
    fc.float({ min: -180, max: 180, noNaN: true }),
    timeSlotArb
  )
  .map(
    ([lat, lng, ts]) =>
      `${(Math.round(lat * 100) / 100).toFixed(2)},${(Math.round(lng * 100) / 100).toFixed(2)}-${ts}`
  );

// ─── 测试 ────────────────────────────────────────────────────────────────────

describe('Soundscape Cache - Property Tests', () => {
  beforeEach(async () => {
    store = new Map();
    const mockDB = createMockDB();
    const { getDB } = await import('@/utils/db');
    vi.mocked(getDB).mockResolvedValue(mockDB as never);
  });

  // Feature: 06-caching-storage, Property 1: 声景缓存写入/读取往返一致性
  // **Validates: Requirements 3.2, 3.3, 3.4, 4.1, 4.3**
  describe('Property 1: 声景缓存写入/读取往返一致性', () => {
    test('写入后读取的数据在所有非时间戳字段上与写入数据等价', async () => {
      const { cacheSoundscape, getCachedSoundscape } = await import(
        '../soundscapeCache'
      );

      await fc.assert(
        fc.asyncProperty(cacheKeyArb, soundscapeDataArb, async (key, data) => {
          // 每次迭代重置存储
          store.clear();

          await cacheSoundscape(key, data);
          const result = await getCachedSoundscape(key);

          expect(result).not.toBeNull();
          // 验证非时间戳字段等价
          expect(result!.id).toBe(key);
          expect(result!.coordinates).toEqual(data.coordinates);
          expect(result!.timeSlot).toBe(data.timeSlot);
          expect(result!.cityName).toBe(data.cityName);
          expect(result!.countryName).toBe(data.countryName);
          expect(result!.sizeBytes).toBe(data.sizeBytes);
          expect(result!.playCount).toBe(data.playCount);
        }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: 06-caching-storage, Property 2: 声景缓存覆盖写入
  // **Validates: Requirements 3.5**
  describe('Property 2: 声景缓存覆盖写入', () => {
    test('先写入第一组再写入第二组，读取返回第二组数据', async () => {
      const { cacheSoundscape, getCachedSoundscape } = await import(
        '../soundscapeCache'
      );

      await fc.assert(
        fc.asyncProperty(
          cacheKeyArb,
          soundscapeDataArb,
          soundscapeDataArb,
          async (key, data1, data2) => {
            store.clear();

            // 写入第一组
            await cacheSoundscape(key, data1);
            // 覆盖写入第二组
            await cacheSoundscape(key, data2);

            const result = await getCachedSoundscape(key);

            expect(result).not.toBeNull();
            // 应返回第二组数据
            expect(result!.coordinates).toEqual(data2.coordinates);
            expect(result!.timeSlot).toBe(data2.timeSlot);
            expect(result!.cityName).toBe(data2.cityName);
            expect(result!.countryName).toBe(data2.countryName);
            expect(result!.sizeBytes).toBe(data2.sizeBytes);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: 06-caching-storage, Property 3: 播放统计单调递增
  // **Validates: Requirements 4.5**
  describe('Property 3: 播放统计单调递增', () => {
    test('调用 updatePlayStats 后 playCount 严格递增 1，lastPlayedAt 不小于调用前的值', async () => {
      const { cacheSoundscape, getCachedSoundscape, updatePlayStats } =
        await import('../soundscapeCache');

      // 生成 lastPlayedAt 在过去的声景数据，确保 Date.now() 不会小于初始值
      const pastSoundscapeDataArb = fc.record({
        coordinates: fc.tuple(
          fc.float({ min: -90, max: 90, noNaN: true }),
          fc.float({ min: -180, max: 180, noNaN: true })
        ) as fc.Arbitrary<[number, number]>,
        timeSlot: timeSlotArb,
        cityName: fc.string({ minLength: 1, maxLength: 50 }),
        countryName: fc.string({ minLength: 1, maxLength: 50 }),
        generatedAt: fc.integer({ min: 0, max: Date.now() }),
        playCount: fc.integer({ min: 0, max: 10_000 }),
        lastPlayedAt: fc.integer({ min: 0, max: Date.now() }),
        sizeBytes: fc.integer({ min: 0, max: 100_000_000 }),
      });

      await fc.assert(
        fc.asyncProperty(
          cacheKeyArb,
          pastSoundscapeDataArb,
          async (key, data) => {
            store.clear();

            // 写入初始数据
            await cacheSoundscape(key, data);

            // 记录更新前的状态
            const before = await getCachedSoundscape(key);
            expect(before).not.toBeNull();
            const prevPlayCount = before!.playCount;
            const prevLastPlayedAt = before!.lastPlayedAt;

            // 调用 updatePlayStats
            await updatePlayStats(key);

            // 读取更新后的状态
            const after = await getCachedSoundscape(key);
            expect(after).not.toBeNull();

            // playCount 严格递增 1
            expect(after!.playCount).toBe(prevPlayCount + 1);
            // lastPlayedAt 不小于调用前的值（初始值在过去，Date.now() 必然 >= 初始值）
            expect(after!.lastPlayedAt).toBeGreaterThanOrEqual(
              prevLastPlayedAt
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: 06-caching-storage, Property 4: LRU 淘汰最旧条目
  // **Validates: Requirements 5.1**
  describe('Property 4: LRU 淘汰最旧条目', () => {
    test('触发 evictLRU 后被删除的是 lastPlayedAt 最小的条目', async () => {
      const { evictLRU } = await import('../soundscapeCache');

      // 生成 2-5 个具有不同 lastPlayedAt 的条目
      const entriesArb = fc
        .array(
          fc.record({
            key: cacheKeyArb,
            lastPlayedAt: fc.integer({ min: 1, max: 2_000_000_000_000 }),
          }),
          { minLength: 2, maxLength: 5 }
        )
        .filter((entries) => {
          // 确保所有 key 唯一
          const keys = new Set(entries.map((e) => e.key));
          return keys.size === entries.length;
        })
        .filter((entries) => {
          // 确保所有 lastPlayedAt 唯一，避免歧义
          const times = new Set(entries.map((e) => e.lastPlayedAt));
          return times.size === entries.length;
        });

      await fc.assert(
        fc.asyncProperty(entriesArb, async (entries) => {
          store.clear();

          // 将条目写入 store
          for (const entry of entries) {
            const soundscape: CachedSoundscape = {
              id: entry.key,
              coordinates: [0, 0],
              timeSlot: 'day',
              cityName: 'Test',
              countryName: 'Test',
              generatedAt: Date.now(),
              playCount: 0,
              lastPlayedAt: entry.lastPlayedAt,
              sizeBytes: 1000,
            };
            store.set(entry.key, soundscape);
          }

          // 找到 lastPlayedAt 最小的条目
          const oldestEntry = entries.reduce((min, e) =>
            e.lastPlayedAt < min.lastPlayedAt ? e : min
          );

          const sizeBefore = store.size;

          // 触发 LRU 淘汰
          await evictLRU();

          // 验证被删除的是最旧的条目
          expect(store.size).toBe(sizeBefore - 1);
          expect(store.has(oldestEntry.key)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });
});
