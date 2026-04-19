# 需求文档：缓存与存储系统

## 简介

缓存与存储系统是 PinDrop 应用的数据持久化核心模块，负责管理所有客户端数据的存储、检索和生命周期。该系统遵循"零后端"架构原则，所有用户数据仅存储在浏览器本地。系统包含两大存储引擎：IndexedDB 用于存储声景音频缓存（5 层 audioBlobs + SoundscapeRecipe）、地理编码缓存和位置历史；localStorage 用于存储用户偏好设置、API Key 和收藏列表。系统实现 LRU（最近最少使用）淘汰策略以管理存储配额，并通过坐标精度 0.01° + 时间档的缓存键生成规则实现高效的缓存命中。

## 术语表

- **Cache_Key_Generator**: 缓存键生成子系统，根据坐标精度 0.01° 和时间档生成格式为 `"{lat},{lng}-{timeSlot}"` 的唯一标识符
- **Soundscape_Cache**: IndexedDB 中的 `soundscape_cache` Object Store，存储声景音频 Blob 和配方数据
- **Geocode_Cache**: IndexedDB 中的 `geocode_cache` Object Store，存储 Nominatim 反向地理编码结果
- **Location_History**: IndexedDB 中的 `location_history` Object Store，存储用户访问位置的自增历史记录
- **LRU_Evictor**: 最近最少使用淘汰子系统，当存储配额不足时删除最久未播放的缓存条目
- **Preferences_Store**: localStorage 偏好设置存储子系统，管理 `pindrop_preferences` 键下的用户配置
- **API_Key_Store**: localStorage API Key 存储子系统，管理 `pindrop_api_key` 键下的 ElevenLabs API Key
- **Favorites_Store**: localStorage 收藏存储子系统，管理 `pindrop_favorites` 键下的声景收藏列表
- **Cache_Statistics_Calculator**: 缓存统计计算子系统，汇总各 Object Store 的条目数量和总大小
- **PinDrop_Database**: IndexedDB 数据库实例，数据库名称为 `pindrop`，版本号为 1
- **TimeSlot**: 时间档类型，取值为 `dawn`（05:00-08:59）、`day`（09:00-16:59）、`dusk`（17:00-19:59）、`night`（20:00-04:59）
- **AudioBlobs**: 声景的 5 层音频 Blob 对象集合，包含 ambient、signature、dialogue、secondaryDialogue、atmosphere

## 需求

### 需求 1：IndexedDB 数据库初始化

**用户故事：** 作为开发者，我希望应用启动时自动初始化 IndexedDB 数据库并创建所需的 Object Store，以便缓存系统可以正常读写数据。

#### 验收标准

1. THE PinDrop_Database SHALL 使用数据库名称 `pindrop` 和版本号 1 进行初始化
2. THE PinDrop_Database SHALL 创建 `soundscape_cache` Object Store，使用 `id` 作为 keyPath
3. THE PinDrop_Database SHALL 在 `soundscape_cache` 上创建 `by-lastPlayedAt` 索引（基于 `lastPlayedAt` 字段）
4. THE PinDrop_Database SHALL 在 `soundscape_cache` 上创建 `by-coordinates` 索引（基于 `coordinates` 字段）
5. THE PinDrop_Database SHALL 创建 `geocode_cache` Object Store，使用 `key` 作为 keyPath
6. THE PinDrop_Database SHALL 在 `geocode_cache` 上创建 `by-cachedAt` 索引（基于 `cachedAt` 字段）
7. THE PinDrop_Database SHALL 创建 `location_history` Object Store，使用 `id` 作为 keyPath 并启用 autoIncrement
8. THE PinDrop_Database SHALL 在 `location_history` 上创建 `by-visitedAt` 索引和 `by-soundscapeId` 索引
9. THE PinDrop_Database SHALL 采用单例模式，多次调用 `getDB()` 返回同一数据库实例
10. WHEN 数据库已初始化时, THE PinDrop_Database SHALL 直接返回已有实例而不重新打开连接

### 需求 2：缓存键生成

**用户故事：** 作为开发者，我希望根据坐标和时间档生成一致的缓存键，以便同一位置同一时间段的声景可以共享缓存。

#### 验收标准

1. THE Cache_Key_Generator SHALL 将纬度和经度四舍五入到 0.01° 精度（小数点后 2 位）
2. THE Cache_Key_Generator SHALL 生成格式为 `"{lat},{lng}-{timeSlot}"` 的缓存键
3. WHEN 纬度为 48.8566 且经度为 2.3522 且时间档为 dawn 时, THE Cache_Key_Generator SHALL 生成缓存键 `"48.86,2.35-dawn"`
4. THE Cache_Key_Generator SHALL 对负数坐标保留负号（例如 `"-33.87,151.21-night"`）
5. THE Cache_Key_Generator SHALL 始终输出 2 位小数的坐标值（例如 `"0.00,0.00-day"` 而非 `"0,0-day"`）
6. WHEN 使用相同坐标（0.01° 精度内）和相同时间档调用时, THE Cache_Key_Generator SHALL 生成相同的缓存键（幂等性）
7. THE Cache_Key_Generator SHALL 根据小时数映射时间档：dawn（5-8）、day（9-16）、dusk（17-19）、night（20-4）
8. FOR ALL 有效的缓存键, 解析缓存键后重新生成 SHALL 产生等价的缓存键（往返一致性）

### 需求 3：声景缓存写入

**用户故事：** 作为用户，我希望生成的声景被自动缓存到本地，以便下次访问同一位置时无需重新调用 API。

#### 验收标准

1. WHEN 声景生成完成时, THE Soundscape_Cache SHALL 将声景数据写入 IndexedDB 的 `soundscape_cache` Object Store
2. THE Soundscape_Cache SHALL 存储以下字段：id（缓存键）、coordinates（坐标元组）、timeSlot（时间档）、cityName（城市名）、countryName（国家名）、generatedAt（生成时间戳）、playCount（播放次数，初始为 0）、lastPlayedAt（最后播放时间戳）、sizeBytes（数据大小）
3. THE Soundscape_Cache SHALL 存储 audioBlobs 对象，包含 ambient、signature、dialogue、secondaryDialogue、atmosphere 五个 Blob 字段
4. THE Soundscape_Cache SHALL 存储 recipe 字段，包含完整的 SoundscapeRecipe 配方数据
5. WHEN 缓存键已存在时, THE Soundscape_Cache SHALL 覆盖已有条目（用于手动重新生成场景）
6. IF 写入操作抛出 QuotaExceededError, THEN THE Soundscape_Cache SHALL 触发 LRU_Evictor 淘汰最旧条目后重试写入

### 需求 4：声景缓存读取

**用户故事：** 作为用户，我希望再次点击已缓存的位置时能立即播放声景，以便获得即时体验且不消耗 API 额度。

#### 验收标准

1. WHEN 用户点击已缓存声景的位置（同一坐标精度、同一时间档）时, THE Soundscape_Cache SHALL 从 IndexedDB 检索缓存的声景数据
2. THE Soundscape_Cache SHALL 在 500 毫秒内完成缓存读取操作
3. WHEN 缓存命中时, THE Soundscape_Cache SHALL 返回完整的声景数据，包含 audioBlobs 和 recipe
4. WHEN 缓存未命中时, THE Soundscape_Cache SHALL 返回 null
5. WHEN 缓存命中并播放时, THE Soundscape_Cache SHALL 更新 lastPlayedAt 为当前时间戳并将 playCount 加 1
6. IF 读取操作失败, THEN THE Soundscape_Cache SHALL 记录错误日志并返回 null（不阻塞用户操作）

### 需求 5：LRU 淘汰策略

**用户故事：** 作为用户，我希望存储空间不足时系统自动清理最久未使用的缓存，以便新的声景可以正常缓存。

#### 验收标准

1. WHEN 存储配额超出时, THE LRU_Evictor SHALL 删除 `lastPlayedAt` 时间戳最小的缓存条目
2. THE LRU_Evictor SHALL 使用 `by-lastPlayedAt` 索引定位最近最少使用的条目
3. WHEN 淘汰一个条目后仍然空间不足时, THE LRU_Evictor SHALL 继续淘汰下一个最旧条目直到有足够空间
4. THE LRU_Evictor SHALL 在淘汰后重试原始写入操作
5. IF 淘汰后重试仍然失败, THEN THE LRU_Evictor SHALL 记录错误日志并抛出异常
6. THE LRU_Evictor SHALL 在控制台记录被淘汰条目的缓存键，格式为 `[PinDrop] Evicted LRU soundscape: {cacheKey}`

### 需求 6：地理编码缓存

**用户故事：** 作为开发者，我希望缓存 Nominatim 反向地理编码结果，以便减少对外部 API 的重复调用并遵守速率限制。

#### 验收标准

1. THE Geocode_Cache SHALL 使用格式为 `"{lat},{lng}"` 的键存储地理编码结果，坐标精度为 0.01°
2. WHEN 缓存地理编码结果时, THE Geocode_Cache SHALL 存储 key（缓存键）、result（包含 cityName、countryName、administrativeRegion、timezone、language、isInferred 字段）和 cachedAt（缓存时间戳）
3. WHEN 查询坐标在 0.01° 精度内已有缓存时, THE Geocode_Cache SHALL 返回缓存的地理编码结果
4. WHEN 缓存未命中时, THE Geocode_Cache SHALL 返回 null
5. IF 缓存写入失败, THEN THE Geocode_Cache SHALL 记录错误日志并继续执行（非关键错误，不阻塞主流程）
6. IF 缓存读取失败, THEN THE Geocode_Cache SHALL 记录错误日志并返回 null

### 需求 7：位置历史记录

**用户故事：** 作为用户，我希望系统记录我访问过的位置，以便将来可以查看探索历史。

#### 验收标准

1. WHEN 用户点击地图生成声景时, THE Location_History SHALL 在 `location_history` Object Store 中创建一条新记录
2. THE Location_History SHALL 使用自增主键（autoIncrement）作为记录 ID
3. THE Location_History SHALL 存储 coordinates（坐标元组）、visitedAt（访问时间戳）和 soundscapeId（关联的声景缓存键）
4. THE Location_History SHALL 支持按 `by-visitedAt` 索引查询历史记录（按时间排序）
5. THE Location_History SHALL 支持按 `by-soundscapeId` 索引查询与特定声景关联的历史记录

### 需求 8：缓存统计与管理

**用户故事：** 作为用户，我希望在设置页面查看缓存使用情况并能手动清除缓存，以便管理浏览器存储空间。

#### 验收标准

1. THE Cache_Statistics_Calculator SHALL 查询并返回 soundscapeCount（声景缓存数量）、totalSizeMB（总大小，单位 MB）、geocodeCount（地理编码缓存数量）和 historyCount（历史记录数量）
2. THE Cache_Statistics_Calculator SHALL 通过汇总所有声景条目的 sizeBytes 字段计算总大小，并转换为 MB（四舍五入到小数点后 2 位）
3. THE Cache_Statistics_Calculator SHALL 将统计信息格式化为 `"{count} soundscapes · {size} MB"` 的可读字符串
4. WHEN 用户点击"清除所有缓存"时, THE Cache_Statistics_Calculator SHALL 依次清除 soundscape_cache、geocode_cache 和 location_history 三个 Object Store
5. WHEN 缓存清除完成后, THE Cache_Statistics_Calculator SHALL 返回清除结果，包含 success 状态和已清除的 store 列表
6. IF IndexedDB 不可用, THEN THE Cache_Statistics_Calculator SHALL 返回 `"Cache unavailable"` 提示信息

### 需求 9：localStorage 偏好设置存储

**用户故事：** 作为用户，我希望我的偏好设置（音量、主题、播放选项）在刷新页面后仍然保留，以便获得一致的使用体验。

#### 验收标准

1. THE Preferences_Store SHALL 使用 `pindrop_preferences` 键在 localStorage 中存储用户偏好设置
2. THE Preferences_Store SHALL 存储以下偏好字段：mapStyle（`light` 或 `dark`）、autoPlay（布尔值）、fadeInDuration（0.5/1.0/1.5/2.0/3.0 秒）、dynamicEvents（布尔值）、masterVolume（0-1）、layerVolumes（5 层各自音量 0-1）
3. WHEN 加载偏好设置时, THE Preferences_Store SHALL 验证每个字段的类型和范围，将无效值替换为默认值
4. WHEN localStorage 中无已存储偏好时, THE Preferences_Store SHALL 返回默认偏好设置（mapStyle: light, autoPlay: true, fadeInDuration: 1.5, dynamicEvents: true, masterVolume: 0.8）
5. WHEN 保存偏好设置时, THE Preferences_Store SHALL 先验证再序列化为 JSON 写入 localStorage
6. IF localStorage 不可用, THEN THE Preferences_Store SHALL 记录警告日志并使用内存中的默认值（不阻塞应用运行）

### 需求 10：API Key 存储

**用户故事：** 作为用户，我希望输入一次 ElevenLabs API Key 后系统自动记住，以便后续使用无需重复输入。

#### 验收标准

1. THE API_Key_Store SHALL 使用 `pindrop_api_key` 键在 localStorage 中存储 ElevenLabs API Key
2. THE API_Key_Store SHALL 提供存储（storeApiKey）、检索（retrieveApiKey）和清除（clearApiKey）三个操作
3. THE API_Key_Store SHALL 验证 API Key 格式以 `xi-` 开头
4. THE API_Key_Store SHALL 在存储和检索过程中不将 API Key 值记录到控制台日志
5. IF localStorage 写入失败, THEN THE API_Key_Store SHALL 记录错误日志（不包含 Key 值）
6. IF localStorage 读取失败, THEN THE API_Key_Store SHALL 返回 null

### 需求 11：收藏列表存储

**用户故事：** 作为用户，我希望收藏喜欢的声景并在底部收藏栏快速访问，以便重复聆听喜爱的声音。

#### 验收标准

1. THE Favorites_Store SHALL 使用 `pindrop_favorites` 键在 localStorage 中存储声景 ID 数组
2. WHEN 用户点击收藏按钮时, THE Favorites_Store SHALL 将声景缓存键添加到收藏数组
3. WHEN 用户取消收藏时, THE Favorites_Store SHALL 从收藏数组中移除对应的声景缓存键
4. THE Favorites_Store SHALL 防止重复添加相同的声景缓存键
5. THE Favorites_Store SHALL 支持查询某个声景缓存键是否已被收藏
6. IF localStorage 不可用, THEN THE Favorites_Store SHALL 使用空数组作为降级方案

### 需求 12：IndexedDB 可用性检测

**用户故事：** 作为开发者，我希望在使用 IndexedDB 前检测其可用性，以便在不支持的环境中优雅降级。

#### 验收标准

1. THE PinDrop_Database SHALL 提供 `isIndexedDBAvailable()` 函数检测 IndexedDB 是否可用
2. WHEN IndexedDB 不可用时, THE PinDrop_Database SHALL 返回 false
3. WHEN IndexedDB 可用时, THE PinDrop_Database SHALL 返回 true
4. IF IndexedDB 不可用, THEN 缓存系统 SHALL 禁用所有 IndexedDB 写入操作并记录错误日志 `[PinDrop Error] INDEXEDDB_UNAVAILABLE: IndexedDB is not available`
5. IF IndexedDB 不可用, THEN 应用 SHALL 继续运行但不缓存声景数据（降级模式）

### 需求 13：localStorage 可用性检测

**用户故事：** 作为开发者，我希望在使用 localStorage 前检测其可用性，以便在隐私模式或存储受限环境中优雅降级。

#### 验收标准

1. THE Preferences_Store SHALL 提供 `isLocalStorageAvailable()` 函数检测 localStorage 是否可用
2. THE `isLocalStorageAvailable()` 函数 SHALL 通过执行测试写入/读取/删除循环来确认读写权限
3. WHEN localStorage 不可用时, THE Preferences_Store SHALL 返回 false
4. WHEN localStorage 可用时, THE Preferences_Store SHALL 返回 true
5. IF localStorage 不可用, THEN 偏好设置系统 SHALL 使用默认值运行并记录警告日志 `[PinDrop] localStorage unavailable, using defaults`

### 需求 14：错误处理与降级策略

**用户故事：** 作为用户，我希望存储系统出现问题时应用仍能正常使用，以便技术故障不会阻断我的体验。

#### 验收标准

1. IF IndexedDB 初始化失败, THEN THE PinDrop_Database SHALL 记录错误日志 `[PinDrop Error] IndexedDB initialization failed:` 并抛出异常
2. IF 声景缓存写入失败（非配额错误）, THEN THE Soundscape_Cache SHALL 记录错误日志并继续执行（不阻塞播放）
3. IF 声景缓存读取失败, THEN THE Soundscape_Cache SHALL 记录错误日志并返回 null（触发重新生成）
4. IF 地理编码缓存操作失败, THEN THE Geocode_Cache SHALL 记录错误日志并继续执行（非关键路径）
5. IF 缓存统计查询失败, THEN THE Cache_Statistics_Calculator SHALL 记录错误日志 `[PinDrop Error] CACHE_STATS_LOAD_FAILED:` 并抛出异常
6. IF 缓存清除操作失败, THEN THE Cache_Statistics_Calculator SHALL 记录错误日志 `[PinDrop Error] CACHE_CLEAR_FAILED:` 并抛出异常
7. THE 缓存系统 SHALL 遵循 5 级降级策略：完全成功 → 部分成功 → 最小成功 → 降级回退 → 硬失败
8. 所有错误日志 SHALL 遵循格式 `[PinDrop Error] {type}: {message}`，不包含敏感数据（如 API Key）
