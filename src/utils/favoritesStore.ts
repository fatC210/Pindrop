/**
 * 收藏列表存储模块，管理用户声景收藏的持久化。
 * 使用 localStorage 存储收藏的声景缓存键数组。
 *
 * 当 localStorage 不可用时，所有操作优雅降级为使用空数组，
 * 不会阻塞应用运行。
 *
 * @module favoritesStore
 *
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

/** localStorage 中收藏列表的存储键 */
export const FAVORITES_KEY = 'pindrop_favorites';

// ---------------------------------------------------------------------------
// 内部辅助函数
// ---------------------------------------------------------------------------

/**
 * 检测 localStorage 是否可用。
 * 通过执行测试写入/读取/删除循环来确认读写权限。
 *
 * @returns 如果 localStorage 可用返回 true，否则返回 false
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__pindrop_fav_test__';
    localStorage.setItem(testKey, testKey);
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    return retrieved === testKey;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 核心操作函数
// ---------------------------------------------------------------------------

/**
 * 从 localStorage 读取并解析收藏列表。
 * 如果 localStorage 不可用、键不存在或 JSON 解析失败，返回空数组。
 *
 * @returns 收藏的声景缓存键数组
 *
 * Validates: Requirements 11.1, 11.6
 */
export function loadFavorites(): string[] {
  if (!isLocalStorageAvailable()) {
    console.warn('[PinDrop] localStorage unavailable, using empty favorites');
    return [];
  }

  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    // 验证解析结果为字符串数组
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === 'string');
  } catch (error) {
    console.error('[PinDrop Error] Failed to load favorites:', error);
    return [];
  }
}

/**
 * 将收藏列表序列化为 JSON 并写入 localStorage。
 * 如果 localStorage 不可用或写入失败，记录警告/错误日志。
 *
 * @param favorites - 要保存的收藏缓存键数组
 *
 * Validates: Requirements 11.1, 11.6
 */
export function saveFavorites(favorites: string[]): void {
  if (!isLocalStorageAvailable()) {
    console.warn('[PinDrop] localStorage unavailable, cannot save favorites');
    return;
  }

  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error('[PinDrop Error] Failed to save favorites:', error);
  }
}

/**
 * 添加声景缓存键到收藏列表。
 * 如果该键已存在，不会重复添加（去重）。
 *
 * @param cacheKey - 要添加的声景缓存键
 *
 * Validates: Requirements 11.2, 11.4
 */
export function addFavorite(cacheKey: string): void {
  const favorites = loadFavorites();

  if (favorites.includes(cacheKey)) {
    return;
  }

  favorites.push(cacheKey);
  saveFavorites(favorites);
}

/**
 * 从收藏列表中移除指定的声景缓存键。
 *
 * @param cacheKey - 要移除的声景缓存键
 *
 * Validates: Requirements 11.3
 */
export function removeFavorite(cacheKey: string): void {
  const favorites = loadFavorites();
  const updated = favorites.filter((key) => key !== cacheKey);
  saveFavorites(updated);
}

/**
 * 查询指定的声景缓存键是否已被收藏。
 *
 * @param cacheKey - 要查询的声景缓存键
 * @returns 如果已收藏返回 true，否则返回 false
 *
 * Validates: Requirements 11.5
 */
export function isFavorite(cacheKey: string): boolean {
  const favorites = loadFavorites();
  return favorites.includes(cacheKey);
}

/**
 * 返回当前收藏列表中的条目数量。
 *
 * @returns 收藏数量
 */
export function getFavoritesCount(): number {
  const favorites = loadFavorites();
  return favorites.length;
}
