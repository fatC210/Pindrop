# Implementation Plan: 缓存与存储系统

## 概述

本实现计划基于已有代码进行增量开发。项目中 IndexedDB 初始化（`db.ts`）、声景缓存 CRUD（`soundscapeCache.ts`）、地理编码缓存（`geocodeCache.ts`）、缓存键生成（`cacheKey.ts`、`timeSlot.ts`）、坐标工具（`coordinates.ts`）、缓存统计（`cacheUtils.ts`）和偏好设置（`preferencesStore.ts`）已基本实现。

本计划聚焦以下差距：
1. **FavoritesStore** — 收藏列表存储模块（全新实现）
2. **位置历史 CRUD** — DB schema 已有但缺少操作函数
3. **缓存键生成去重** — `cacheKey.ts` 和 `timeSlot.ts` 中存在重复的 `generateCacheKey`，需整合
4. **11 个正确性属性的属性测试** — 设计文档定义的 Property 1-11
5. **单元测试补充** — 错误处理、边界条件、降级场景

所有代码使用 TypeScript strict 模式，测试使用 Vitest + fast-check。

## Tasks

- [x] 1. 整合重复的缓存键生成函数
  - [x] 1.1 统一 `cacheKey.ts` 为唯一的缓存键入口模块
    - 确认 `cacheKey.ts` 中的 `generateCacheKey(lat, lng, hour)` 内部调用 `timeSlot.ts` 的 `getTimeSlot` 和 `coordinates.ts` 的 `roundCoordinates`
    - 确认 `cacheKey.ts` 中的 `generateCacheKeyNow(lat, lng)` 正常工作
    - 检查项目中所有对 `timeSlot.ts` 中 `generateCacheKey` 的导入，将需要 `(lat, lng, hour)` 签名的调用迁移到 `cacheKey.ts`
    - 保留 `timeSlot.ts` 中的 `generateCacheKey(lat, lng, timeSlot)` 供内部使用（已有属性测试依赖）
    - 在 `cacheKey.ts` 中添加 JSDoc 注释说明其为主入口
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 1.2 为 `cacheKey.ts` 编写单元测试
    - 创建 `src/utils/__tests__/cacheKey.test.ts`
    - 测试具体示例：巴黎坐标 (48.8566, 2.3522, hour=7) → `"48.86,2.35-dawn"`
    - 测试负数坐标：(-33.8688, 151.2093, hour=22) → `"-33.87,151.21-night"`
    - 测试零坐标：(0, 0, hour=12) → `"0.00,0.00-day"`
    - 测试 `generateCacheKeyNow` 返回格式正确
    - _Requirements: 2.3, 2.4, 2.5_

- [x] 2. 实现 FavoritesStore 收藏列表模块
  - [x] 2.1 创建 `src/utils/favoritesStore.ts`
    - 定义 `FAVORITES_KEY = 'pindrop_favorites'` 常量
    - 实现 `loadFavorites(): string[]` — 从 localStorage 读取并解析 JSON 数组，失败时返回空数组
    - 实现 `saveFavorites(favorites: string[]): void` — 序列化为 JSON 写入 localStorage
    - 实现 `addFavorite(cacheKey: string): void` — 添加收藏（去重），若已存在则不重复添加
    - 实现 `removeFavorite(cacheKey: string): void` — 移除收藏
    - 实现 `isFavorite(cacheKey: string): boolean` — 查询是否已收藏
    - 实现 `getFavoritesCount(): number` — 返回收藏数量
    - 所有操作在 localStorage 不可用时优雅降级（使用空数组，记录警告日志）
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ]* 2.2 为 FavoritesStore 编写单元测试
    - 创建 `src/utils/__tests__/favoritesStore.test.ts`
    - 测试添加/移除/查询基本流程
    - 测试重复添加同一键不会产生重复条目
    - 测试 localStorage 不可用时的降级行为
    - 测试 localStorage 中存储无效 JSON 时返回空数组
    - 测试空收藏列表的边界情况
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 3. 实现位置历史记录 CRUD 操作
  - [x] 3.1 创建 `src/utils/locationHistory.ts`
    - 实现 `addLocationHistory(coordinates: [number, number], soundscapeId: string): Promise<number>` — 写入新记录，返回自增 ID
    - 实现 `getLocationHistory(limit?: number): Promise<LocationHistoryEntry[]>` — 按 `visitedAt` 降序查询历史记录，支持可选的数量限制
    - 实现 `getHistoryBySoundscapeId(soundscapeId: string): Promise<LocationHistoryEntry[]>` — 按声景 ID 查询关联历史
    - 实现 `clearLocationHistory(): Promise<void>` — 清除所有历史记录
    - 定义 `LocationHistoryEntry` 接口（id, coordinates, visitedAt, soundscapeId）
    - 所有操作包含 try/catch 错误处理，记录 `[PinDrop Error]` 格式日志
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 3.2 为位置历史模块编写单元测试
    - 创建 `src/utils/__tests__/locationHistory.test.ts`
    - Mock `getDB` 返回带有 `add`/`getAll`/`getAllFromIndex`/`clear` 方法的 mock 对象
    - 测试写入记录返回自增 ID
    - 测试按时间排序查询
    - 测试按声景 ID 查询
    - 测试清除操作
    - 测试 IndexedDB 操作失败时的错误处理
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4. Checkpoint — 确保核心模块实现完整
  - 确保所有测试通过，如有疑问请询问用户。

- [x] 5. 编写声景缓存属性测试
  - [ ]* 5.1 编写 Property 1: 声景缓存写入/读取往返一致性
    - 创建 `src/utils/__tests__/soundscapeCache.property.test.ts`
    - **Property 1: 声景缓存写入/读取往返一致性**
    - 使用 fast-check 生成随机声景数据（coordinates、timeSlot、cityName、countryName、sizeBytes 等）
    - Mock IndexedDB 的 `put` 和 `get` 操作
    - 验证写入后读取的数据在所有非时间戳字段上与写入数据等价
    - 最少 100 次迭代
    - **Validates: Requirements 3.2, 3.3, 3.4, 4.1, 4.3**

  - [ ]* 5.2 编写 Property 2: 声景缓存覆盖写入
    - 在同一测试文件 `soundscapeCache.property.test.ts` 中添加
    - **Property 2: 声景缓存覆盖写入**
    - 生成同一缓存键和两组不同的声景数据
    - 先写入第一组再写入第二组，验证读取返回第二组数据
    - 最少 100 次迭代
    - **Validates: Requirements 3.5**

  - [ ]* 5.3 编写 Property 3: 播放统计单调递增
    - 在同一测试文件 `soundscapeCache.property.test.ts` 中添加
    - **Property 3: 播放统计单调递增**
    - 生成随机初始 playCount 和 lastPlayedAt
    - 调用 `updatePlayStats` 后验证 playCount 严格递增 1，lastPlayedAt 不小于调用前的值
    - 最少 100 次迭代
    - **Validates: Requirements 4.5**

  - [ ]* 5.4 编写 Property 4: LRU 淘汰最旧条目
    - 在同一测试文件 `soundscapeCache.property.test.ts` 中添加
    - **Property 4: LRU 淘汰最旧条目**
    - 生成多个缓存条目，各自有不同的 lastPlayedAt 值
    - 触发 `evictLRU` 后验证被删除的是 lastPlayedAt 最小的条目
    - 最少 100 次迭代
    - **Validates: Requirements 5.1**

- [x] 6. 编写地理编码缓存属性测试
  - [ ]* 6.1 编写 Property 5: 地理编码缓存往返一致性
    - 创建 `src/utils/__tests__/geocodeCache.property.test.ts`
    - **Property 5: 地理编码缓存往返一致性**
    - 使用 fast-check 生成随机坐标对和地理编码结果（cityName、countryName、administrativeRegion、timezone、language、isInferred）
    - Mock IndexedDB 的 `put` 和 `get` 操作
    - 验证写入后使用相同坐标（0.01° 精度内）查询返回等价的地理编码结果
    - 最少 100 次迭代
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 7. 编写缓存工具属性测试
  - [ ]* 7.1 编写 Property 6: calculateTotalSizeMB 计算正确性
    - 创建 `src/components/settings/__tests__/cacheUtils.property.test.ts`
    - **Property 6: calculateTotalSizeMB 计算正确性**
    - 使用 fast-check 生成非负整数数组
    - 验证 `calculateTotalSizeMB(blobSizes)` 等于 `Math.round(sum(blobSizes) / (1024 * 1024) * 100) / 100`
    - 验证结果始终非负
    - 最少 100 次迭代
    - **Validates: Requirements 8.2**

  - [ ]* 7.2 编写 Property 7: formatCacheStats 格式一致性
    - 在同一测试文件 `cacheUtils.property.test.ts` 中添加
    - **Property 7: formatCacheStats 格式一致性**
    - 使用 fast-check 生成随机 CacheStatistics 对象
    - 验证返回格式为 `"{soundscapeCount} soundscapes · {totalSizeMB} MB"`
    - 验证 null/undefined 输入返回 `"Cache unavailable"`
    - 最少 100 次迭代
    - **Validates: Requirements 8.3, 8.6**

- [x] 8. 编写偏好设置属性测试
  - [ ]* 8.1 编写 Property 8: 偏好设置验证总是返回有效值
    - 创建 `src/components/settings/__tests__/preferencesStore.property.test.ts`
    - **Property 8: 偏好设置验证总是返回有效值**
    - 使用 fast-check 生成任意 `unknown` 类型输入（字符串、数字、数组、对象、null 等）
    - 验证 `validatePreferences(input)` 返回的对象中：mapStyle 为 `'light'` 或 `'dark'`，masterVolume 在 [0, 1]，fadeInDuration 为允许值之一，所有 layerVolumes 在 [0, 1]
    - 最少 100 次迭代
    - **Validates: Requirements 9.3**

  - [ ]* 8.2 编写 Property 9: 偏好设置往返一致性
    - 在同一测试文件 `preferencesStore.property.test.ts` 中添加
    - **Property 9: 偏好设置往返一致性**
    - 使用 fast-check 生成有效的 UserPreferences 对象
    - 通过 `savePreferences` 保存后再通过 `loadPreferences` 加载
    - 验证返回的偏好设置与原始值等价
    - 最少 100 次迭代
    - **Validates: Requirements 9.2, 9.5**

- [x] 9. 编写收藏列表属性测试
  - [ ]* 9.1 编写 Property 10: 收藏列表添加/移除往返
    - 创建 `src/utils/__tests__/favoritesStore.property.test.ts`
    - **Property 10: 收藏列表添加/移除往返**
    - 使用 fast-check 生成随机声景缓存键字符串
    - 添加到收藏后查询返回 true；移除后查询返回 false
    - 最少 100 次迭代
    - **Validates: Requirements 11.2, 11.3, 11.5**

  - [ ]* 9.2 编写 Property 11: 收藏列表去重幂等性
    - 在同一测试文件 `favoritesStore.property.test.ts` 中添加
    - **Property 11: 收藏列表去重幂等性**
    - 使用 fast-check 生成随机缓存键和随机重复次数 N（1-10）
    - 将同一键添加 N 次后，验证收藏列表中该键仅出现 1 次
    - 最少 100 次迭代
    - **Validates: Requirements 11.4**

- [x] 10. 补充声景缓存单元测试
  - [ ]* 10.1 为 `soundscapeCache.ts` 编写错误处理单元测试
    - 创建 `src/utils/__tests__/soundscapeCache.test.ts`
    - Mock `getDB` 返回带有 `get`/`put`/`delete`/`getAll`/`transaction` 方法的 mock 对象
    - 测试 `getCachedSoundscape` 缓存未命中返回 null
    - 测试 `getCachedSoundscape` 读取失败记录错误日志并返回 null
    - 测试 `cacheSoundscape` 写入失败记录错误日志但不抛出异常
    - 测试 `checkCacheExists` 存在/不存在两种情况
    - 测试 `getCachedMarkers` 返回所有缓存条目
    - 测试 `updatePlayStats` 更新 playCount 和 lastPlayedAt
    - 测试 `evictLRU` 删除最旧条目并记录日志
    - 测试 `handleStorageQuotaExceeded` 淘汰后重试写入
    - _Requirements: 3.6, 4.4, 4.6, 5.1, 5.3, 5.4, 5.5, 5.6, 14.2, 14.3_

- [x] 11. 补充地理编码缓存和数据库单元测试
  - [ ]* 11.1 为 `geocodeCache.ts` 编写单元测试
    - 创建 `src/utils/__tests__/geocodeCache.test.ts`
    - Mock `getDB` 返回 mock 对象
    - 测试缓存命中返回正确的 GeocodingResult
    - 测试缓存未命中返回 null
    - 测试读取失败记录错误日志并返回 null
    - 测试写入失败记录错误日志但不阻塞
    - 测试坐标精度 0.01° 的键生成（相近坐标命中同一缓存）
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 11.2 为 `db.ts` 编写单元测试
    - 创建 `src/utils/__tests__/db.test.ts`
    - 测试 `isIndexedDBAvailable` 在正常环境返回 true
    - 测试 `isIndexedDBAvailable` 在 indexedDB 未定义时返回 false
    - 测试 `getDB` 多次调用返回同一实例（单例模式）
    - 测试 `initDB` 初始化失败时记录错误日志并抛出异常
    - _Requirements: 1.1, 1.9, 1.10, 12.1, 12.2, 12.3, 14.1_

- [x] 12. Final checkpoint — 确保所有测试通过
  - 运行全部单元测试和属性测试
  - 验证所有核心功能正常工作
  - 确认所有需求已被任务覆盖
  - 确保所有测试通过，如有疑问请询问用户。

## Notes

- 标记 `*` 的子任务为可选任务，可跳过以加速 MVP 开发
- 每个任务引用了具体的需求编号以确保可追溯性
- Checkpoint 任务确保在关键节点进行增量验证
- 属性测试验证设计文档中定义的 11 个通用正确性属性
- 单元测试验证具体示例、边界条件和错误处理
- 所有测试使用 Vitest 框架 + fast-check 属性测试库
- 属性测试最少运行 100 次迭代
- IndexedDB 操作通过 `vi.mock('@/utils/db')` 进行 mock
- localStorage 操作通过 `vi.spyOn(Storage.prototype, ...)` 进行 mock
- 测试手动运行：`npm run test`，不自动运行
