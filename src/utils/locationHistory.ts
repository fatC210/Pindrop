// 位置历史记录 CRUD 操作
import { getDB } from './db';

/**
 * 位置历史记录条目接口
 */
export interface LocationHistoryEntry {
  /** 自增主键 ID */
  id: number;
  /** 坐标元组 [lat, lng] */
  coordinates: [number, number];
  /** 访问时间戳（Unix ms） */
  visitedAt: number;
  /** 关联的声景缓存键 */
  soundscapeId: string;
}

/**
 * 添加位置历史记录
 * 写入新记录到 location_history Object Store，返回自增 ID
 */
export async function addLocationHistory(
  coordinates: [number, number],
  soundscapeId: string
): Promise<number> {
  try {
    const db = await getDB();
    const id = await db.add('location_history', {
      coordinates,
      visitedAt: Date.now(),
      soundscapeId,
    });
    return id;
  } catch (error) {
    console.error('[PinDrop Error] Failed to add location history:', error);
    throw error;
  }
}

/**
 * 获取位置历史记录
 * 按 visitedAt 降序查询历史记录，支持可选的数量限制
 */
export async function getLocationHistory(
  limit?: number
): Promise<LocationHistoryEntry[]> {
  try {
    const db = await getDB();
    const tx = db.transaction('location_history', 'readonly');
    const index = tx.store.index('by-visitedAt');

    const entries: LocationHistoryEntry[] = [];
    let cursor = await index.openCursor(null, 'prev');

    while (cursor) {
      entries.push(cursor.value as LocationHistoryEntry);
      if (limit !== undefined && entries.length >= limit) {
        break;
      }
      cursor = await cursor.continue();
    }

    await tx.done;
    return entries;
  } catch (error) {
    console.error('[PinDrop Error] Failed to get location history:', error);
    return [];
  }
}

/**
 * 按声景 ID 查询关联的位置历史记录
 */
export async function getHistoryBySoundscapeId(
  soundscapeId: string
): Promise<LocationHistoryEntry[]> {
  try {
    const db = await getDB();
    const entries = await db.getAllFromIndex(
      'location_history',
      'by-soundscapeId',
      soundscapeId
    );
    return entries as LocationHistoryEntry[];
  } catch (error) {
    console.error(
      '[PinDrop Error] Failed to get history by soundscape ID:',
      error
    );
    return [];
  }
}

/**
 * 清除所有位置历史记录
 */
export async function clearLocationHistory(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear('location_history');
  } catch (error) {
    console.error('[PinDrop Error] Failed to clear location history:', error);
    throw error;
  }
}
