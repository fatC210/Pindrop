/**
 * 数据库初始化单元测试
 * Feature: 06-caching-storage, Task 11.2
 *
 * 测试 db.ts 中 isIndexedDBAvailable、getDB（单例模式）和 initDB 的行为。
 * 通过 vi.mock 模拟 idb 库的 openDB 函数。
 *
 * Validates: Requirements 1.1, 1.9, 1.10, 12.1, 12.2, 12.3, 14.1
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// ─── Mock idb 库 ─────────────────────────────────────────────────────────────

const mockOpenDB = vi.fn();

vi.mock('idb', () => ({
  openDB: mockOpenDB,
}));

// ─── 辅助函数 ────────────────────────────────────────────────────────────────

/**
 * 每次测试前重置模块状态（清除单例缓存）
 * 通过 vi.resetModules 确保 dbInstance 被重置为 null
 */
async function freshImport() {
  vi.resetModules();
  // 重新注册 mock（resetModules 会清除 mock 注册）
  vi.doMock('idb', () => ({
    openDB: mockOpenDB,
  }));
  return await import('../db');
}

// ─── 测试 ────────────────────────────────────────────────────────────────────

describe('Database Module - Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockOpenDB.mockReset();
  });

  // ─── isIndexedDBAvailable ──────────────────────────────────────────────

  describe('isIndexedDBAvailable', () => {
    // Validates: Requirement 12.3 — 正常环境返回 true
    test('indexedDB 已定义时返回 true', async () => {
      const { isIndexedDBAvailable } = await freshImport();

      // jsdom 环境中 indexedDB 可能未定义，手动设置以模拟正常浏览器环境
      const originalIndexedDB = globalThis.indexedDB;
      const hasOriginal = 'indexedDB' in globalThis && originalIndexedDB !== undefined;

      if (!hasOriginal) {
        Object.defineProperty(globalThis, 'indexedDB', {
          value: {} as IDBFactory,
          writable: true,
          configurable: true,
        });
      }

      try {
        const result = isIndexedDBAvailable();
        expect(result).toBe(true);
      } finally {
        if (!hasOriginal) {
          Object.defineProperty(globalThis, 'indexedDB', {
            value: originalIndexedDB,
            writable: true,
            configurable: true,
          });
        }
      }
    });

    // Validates: Requirement 12.2 — indexedDB 未定义时返回 false
    test('indexedDB 未定义时返回 false', async () => {
      const { isIndexedDBAvailable } = await freshImport();

      // 临时移除 indexedDB
      const originalIndexedDB = globalThis.indexedDB;
      Object.defineProperty(globalThis, 'indexedDB', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      try {
        const result = isIndexedDBAvailable();
        expect(result).toBe(false);
      } finally {
        // 恢复 indexedDB
        Object.defineProperty(globalThis, 'indexedDB', {
          value: originalIndexedDB,
          writable: true,
          configurable: true,
        });
      }
    });
  });

  // ─── getDB 单例模式 ───────────────────────────────────────────────────

  describe('getDB 单例模式', () => {
    // Validates: Requirements 1.9, 1.10 — 多次调用返回同一实例
    test('多次调用 getDB 返回同一数据库实例', async () => {
      const mockDBInstance = {
        name: 'pindrop',
        version: 1,
        objectStoreNames: { contains: vi.fn() },
      };
      mockOpenDB.mockResolvedValue(mockDBInstance);

      const { getDB } = await freshImport();

      const db1 = await getDB();
      const db2 = await getDB();

      expect(db1).toBe(db2);
      // openDB 只应被调用一次（单例模式）
      expect(mockOpenDB).toHaveBeenCalledTimes(1);
    });

    // Validates: Requirement 1.1 — 使用正确的数据库名称和版本号
    test('使用数据库名称 pindrop 和版本号 1 初始化', async () => {
      const mockDBInstance = { name: 'pindrop', version: 1 };
      mockOpenDB.mockResolvedValue(mockDBInstance);

      const { getDB } = await freshImport();

      await getDB();

      expect(mockOpenDB).toHaveBeenCalledWith('pindrop', 1, expect.any(Object));
    });
  });

  // ─── initDB 错误处理 ──────────────────────────────────────────────────

  describe('initDB 错误处理', () => {
    // Validates: Requirement 14.1 — 初始化失败时记录错误日志并抛出异常
    test('初始化失败时记录 [PinDrop Error] 日志并抛出异常', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const dbError = new Error('IndexedDB open failed');
      mockOpenDB.mockRejectedValue(dbError);

      const { initDB } = await freshImport();

      await expect(initDB()).rejects.toThrow('IndexedDB open failed');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PinDrop Error] IndexedDB initialization failed:',
        dbError
      );
    });
  });
});
