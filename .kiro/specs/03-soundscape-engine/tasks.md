# Implementation Plan: Soundscape Recipe Engine（声景配方生成引擎）

## 概述

本实现计划将设计文档中的 Soundscape Recipe Engine 转化为可执行的编码任务。该引擎负责将上游 Geocoding Engine 输出的 `LocationContext` 转换为结构化的 `SoundscapeRecipe` JSON 配方，包含 5 层声音参数供 ElevenLabs 音频合成消费。

实现按依赖顺序组织：类型定义 → 映射器（区域模板、地形声音）→ 时间插值器 → 动态事件调度器 → 5 层构建器 → 顶层协调器 → 序列化 → 模块导出与集成。

### 已有依赖

- `LocationContext` 接口及所有枚举类型：`src/types/locationContext.ts`
- `TimeSlot` + `generateCacheKey`：`src/utils/timeSlot.ts`
- `GeocodingEngine`：`src/utils/geocoding/geocodingEngine.ts`

### 测试框架

- Vitest + fast-check
- 属性测试最少 100 次迭代
- 覆盖率目标：timeInterpolator 100%, recipeGenerator 90%, layerBuilder 90%

## Tasks

- [x] 1. SoundscapeRecipe 类型定义
  - [x] 1.1 创建 `src/types/soundscapeRecipe.ts` 类型定义文件
    - 定义 `AmbientLayer` 接口：`type: 'sfx'`, `prompt: string`, `volume: number (0-1)`, `loop: true`
    - 定义 `SignatureLayer` 接口：`type: 'sfx'`, `prompt: string`, `volume: number (0-1)`, `loop: false`, `intervalSeconds: number (30-90)`
    - 定义 `DialogueLayer` 接口：`type: 'tts'`, `model: string`, `voiceId: string`, `language: string (BCP 47)`, `text: string`, `emotionTags: string[]`, `volume: number (0-1)`, `pan: number (-1 到 1)`, `repeatIntervalSeconds: number (30-120)`
    - 定义 `AtmosphereLayer` 接口：`type: 'music'`, `prompt: string`, `volume: number (0-1)`, `loop: true`
    - 定义 `TimeParams` 接口：`activity`, `traffic`, `nature`, `humanVoice`, `music`，各为 0-1 范围的 number
    - 定义 `TimeInterpolation` 接口：`sourceSlot: TimeSlot`, `targetSlot: TimeSlot`, `progress: number (0-1)`, `appliedParams: TimeParams`
    - 定义 `SoundscapeLayers` 接口：包含 `ambient`, `signature`, `dialogue`, `secondaryDialogue`, `atmosphere` 五个键
    - 定义 `SoundscapeRecipe` 接口：`id: string`, `location: LocationContext`, `generatedAt: number`, `localTimeAtGeneration: string`, `layers: SoundscapeLayers`, `timeInterpolation: TimeInterpolation`
    - 定义 `SoundscapeTemplate` 接口：`ambientPrompt: string`, `signaturePool: string[]`, `dialogueTopics: string[]`, `atmosphereStyle: string`, `dynamicEventPool: string[]`
    - 定义 `DynamicEvent` 接口：`id: string`, `prompt: string`, `volumeRange: [number, number]`, `panFromTo: [number, number]`, `durationMs: number`, `minIntervalMs: number`, `maxIntervalMs: number`
    - 导出所有接口和类型
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 12.3_

- [x] 2. 区域模板映射器
  - [x] 2.1 创建 `src/utils/soundscape/regionTemplateMapper.ts`
    - 实现 `getTemplate(regionType: RegionType): SoundscapeTemplate` 函数
    - 创建 `REGION_TEMPLATES` 映射表，覆盖全部 8 种 RegionType
    - 每个模板的 `ambientPrompt` 包含 `{weather}` 占位符
    - 每个模板的 `atmosphereStyle` 包含 `{culture}` 占位符
    - 每个模板的 `signaturePool` 至少 3 个条目
    - `rural`、`wilderness`、`polar` 的 `dialogueTopics` 为空数组
    - `city_center` 的 `signaturePool` 包含 street_musician, market_vendor, construction, tram_bell, cafe_chatter
    - `ocean` 的 `signaturePool` 包含 ship_horn, buoy_bell, fishing_boat
    - 未识别的 RegionType 降级到 "rural" 模板，并输出 `[PinDrop Error]` 日志
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 16.1_

  - [ ]* 2.2 编写 regionTemplateMapper 单元测试
    - 创建 `src/utils/__tests__/regionTemplateMapper.test.ts`
    - 测试全部 8 种 RegionType 返回有效的 SoundscapeTemplate
    - 测试 city_center signaturePool 包含指定的城市声音
    - 测试 ocean signaturePool 包含指定的海洋声音
    - 测试 rural/wilderness/polar 的 dialogueTopics 为空数组
    - 测试未识别 RegionType 降级到 rural 模板
    - **Property 5: 区域模板完备性**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**

- [x] 3. 地形声音映射器
  - [x] 3.1 创建 `src/utils/soundscape/terrainSoundMapper.ts`
    - 实现 `getTerrainSound(terrain: TerrainType): string` 函数
    - 创建 `TERRAIN_SOUNDS` 映射表，覆盖全部 9 种 TerrainType
    - mountain 描述包含 wind、echo、rock 相关声音
    - desert 描述包含 wind over sand、silence 相关声音
    - jungle 描述包含 dense insect、monkey、rain on canopy、frog 相关声音
    - coast 描述包含 waves、seabirds、wind 相关声音
    - 每种地形的描述字符串长度 ≥ 20 字符
    - 未识别的 TerrainType 降级到 "plain" 声音，并输出 `[PinDrop Error]` 日志
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 16.2_

  - [ ]* 3.2 编写 terrainSoundMapper 单元测试
    - 创建 `src/utils/__tests__/terrainSoundMapper.test.ts`
    - 测试全部 9 种 TerrainType 返回非空字符串（≥ 20 字符）
    - 测试 mountain、desert、jungle、coast 的具体声音内容
    - 测试未识别 TerrainType 降级到 plain 声音
    - **Property 6: 地形声音完备性**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 16.2**

- [x] 4. 时间插值器
  - [x] 4.1 创建 `src/utils/soundscape/timeInterpolator.ts`
    - 定义 `TIME_KEYFRAMES` 常量：dawn (activity=0.3, traffic=0.4, nature=0.7, humanVoice=0.3, music=0.15)、day (0.9, 0.8, 0.2, 0.8, 0.25)、dusk (0.5, 0.5, 0.4, 0.4, 0.3)、night (0.1, 0.15, 0.6, 0.1, 0.2)
    - 定义 `KEYFRAME_HOURS` 常量：dawn=5, day=9, dusk=17, night=20
    - 实现 `lerp(a: number, b: number, t: number): number` 辅助函数
    - 实现 `interpolate(currentLocalHour: number): TimeInterpolation` 函数
    - 正确处理午夜跨越：hours 0-4 在 night(20) 和 dawn(5) 之间插值，区间长度 9 小时
    - 小时值超出 [0, 23] 时使用模运算规范化
    - 关键帧起始小时（5, 9, 17, 20）返回 progress=0
    - 所有插值参数值 clamp 到 [0, 1] 范围
    - 导出 `interpolate`、`lerp`、`TIME_KEYFRAMES`、`KEYFRAME_HOURS`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 16.3_

  - [ ]* 4.2 编写 timeInterpolator 单元测试
    - 创建 `src/utils/__tests__/timeInterpolator.test.ts`
    - 测试 4 个关键帧定义的参数值正确
    - 测试关键帧起始小时（5, 9, 17, 20）返回 progress=0 和对应参数
    - 测试中间小时的插值结果（如 hour=7 → dawn→day, progress=0.5）
    - 测试午夜跨越：hour=0, hour=3 在 night→dawn 之间插值
    - 测试超出范围的小时值（如 -1, 24, 25）被正确规范化
    - _Requirements: 4.1-4.7, 5.4_

  - [ ]* 4.3 编写 timeInterpolator 属性测试
    - 创建 `src/utils/__tests__/timeInterpolator.property.test.ts`
    - **Property 4: 时间插值正确性**
    - 使用 `fc.integer({ min: 0, max: 23 })` 生成任意小时
    - 验证 sourceSlot 和 targetSlot 为有效 TimeSlot 且互不相同
    - 验证 progress ∈ [0, 1]
    - 验证 appliedParams 的 5 个参数均 ∈ [0, 1]
    - 验证每个参数值位于 sourceSlot 和 targetSlot 关键帧参数值之间（含端点）
    - 验证关键帧起始小时 progress === 0
    - 验证 hours 0-4 的 sourceSlot === "night" 且 targetSlot === "dawn"
    - 最少 100 次迭代
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**

- [x] 5. Checkpoint - 确保映射器和插值器测试通过
  - 确保所有测试通过，ask the user if questions arise.

- [x] 6. 动态事件调度器
  - [x] 6.1 创建 `src/utils/soundscape/dynamicEventScheduler.ts`
    - 定义 `ScheduledEvent` 接口：`event: DynamicEvent`, `volume: number`, `nextIntervalMs: number`
    - 创建 `EVENT_POOLS` 映射表，覆盖全部 8 种 RegionType 的 DynamicEvent 数组
    - city_center 事件池包含 scooter_pass, car_horn, bicycle_bell, coin_drop, street_musician
    - ocean 事件池包含 ship_horn, seagull_cry, wave_crash
    - wilderness 事件池包含 animal_sound, wind_gust, bird_call
    - 所有事件的 minIntervalMs=30000, maxIntervalMs=90000
    - 所有事件的 volumeRange[0] ≤ volumeRange[1]，均在 [0, 1] 范围
    - 实现 `getEventPool(regionType: RegionType): DynamicEvent[]` 函数
    - 实现 `scheduleNextEvent(eventPool: DynamicEvent[], random?: () => number): ScheduledEvent` 纯函数
    - scheduleNextEvent 从事件池随机选取事件，在 volumeRange 内随机分配音量，在 [30000, 90000] 内随机分配间隔
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 13.1, 13.2, 13.3, 13.4_

  - [ ]* 6.2 编写 dynamicEventScheduler 单元测试和属性测试
    - 创建 `src/utils/__tests__/dynamicEventScheduler.test.ts`
    - 测试 city_center 事件池包含指定事件
    - 测试 ocean 事件池包含指定事件
    - 测试 wilderness 事件池包含指定事件
    - 测试使用确定性随机函数的调度结果可预测
    - **Property 10: 动态事件池完备性** — 验证所有 RegionType 返回非空事件数组，每个事件满足约束
    - **Property 11: 动态事件调度输出有效性** — 验证 scheduleNextEvent 输出的 volume 和 nextIntervalMs 在有效范围内
    - 最少 100 次迭代
    - **Validates: Requirements 12.1-12.8, 13.1-13.4**

- [x] 7. 5 层构建器
  - [x] 7.1 创建 `src/utils/soundscape/layerBuilder.ts`
    - 实现 `clamp(value: number, min: number, max: number): number` 辅助函数
    - 实现 `getWeatherDescription(climate: ClimateType): string` — 5 种气候类型到天气描述的映射
    - 实现 `getWaterSoundDescription(waterType: WaterType): string` — 4 种水体类型到水声描述的映射
    - 实现 `getTimeMoodDescription(timeSlot: TimeSlot): string` — 4 种时间档到氛围描述的映射
    - 实现 `buildAmbientLayer(template, terrainSound, interpolation, context): AmbientLayer`
      - 组合 ambientPrompt + terrainSound + weatherDescription
      - 替换 `{weather}` 占位符为气候天气描述
      - nearWater 非 null 时追加水体声音描述
      - volume = baseVolume * activity，clamp 到 [0, 1]
      - type="sfx", loop=true
    - 实现 `buildSignatureLayer(template, interpolation): SignatureLayer`
      - 从 signaturePool 选取声音 prompt
      - intervalSeconds = 90 - (60 * activity)，clamp 到 [30, 90]
      - volume 由 activity 参数调节，clamp 到 [0, 1]
      - type="sfx", loop=false
    - 实现 `buildDialogueLayer(template, interpolation, context): DialogueLayer`
      - model="eleven_v3", language=context.languageVariant
      - dialogueTopics 为空时 volume=0, text=""
      - repeatIntervalSeconds = 120 - (90 * humanVoice)，clamp 到 [30, 120]
      - 根据时间和区域类型设置 emotionTags
      - pan 在 [-1, 1] 范围内
    - 实现 `buildSecondaryDialogueLayer(template, interpolation, context, primaryDialogue): DialogueLayer`
      - model="eleven_flash_v2_5"
      - volume 低于主对话层
      - pan 与主对话层空间分离
      - repeatIntervalSeconds 大于主对话层
      - dialogueTopics 为空时 volume=0, text=""
    - 实现 `buildAtmosphereLayer(template, interpolation, context): AtmosphereLayer`
      - 替换 `{culture}` 占位符为 context.cultureRegion
      - prompt 反映时间段特征（morning feeling / night mood 等）
      - volume 由 music 参数调节，clamp 到 [0, 1]
      - type="music", loop=true
    - 定义静默默认层常量：SILENT_AMBIENT, SILENT_SIGNATURE, SILENT_DIALOGUE, SILENT_ATMOSPHERE
    - 导出所有构建函数和辅助函数
    - _Requirements: 7.1-7.6, 8.1-8.6, 9.1-9.8, 10.1-10.6, 11.1-11.5, 14.1-14.9, 16.4, 16.5_

  - [ ]* 7.2 编写 layerBuilder 单元测试
    - 创建 `src/utils/__tests__/layerBuilder.test.ts`
    - 测试 buildAmbientLayer：prompt 组合正确、{weather} 占位符被替换、nearWater 追加水声、volume 在 [0,1]、type="sfx"、loop=true
    - 测试 buildSignatureLayer：intervalSeconds 在 [30,90]、volume 在 [0,1]、type="sfx"、loop=false
    - 测试 buildDialogueLayer：model="eleven_v3"、language 匹配 languageVariant、dialogueTopics 为空时 volume=0 和 text=""、repeatIntervalSeconds 在 [30,120]
    - 测试 buildSecondaryDialogueLayer：model="eleven_flash_v2_5"、volume ≤ 主对话层、pan 与主对话层分离、repeatIntervalSeconds ≥ 主对话层
    - 测试 buildAtmosphereLayer：{culture} 占位符被替换、prompt 包含时间氛围描述、volume 在 [0,1]、type="music"、loop=true
    - 使用 PARIS_CONTEXT、TOKYO_CONTEXT、OCEAN_CONTEXT、ARCTIC_CONTEXT 等 mock 数据
    - _Requirements: 7.1-7.6, 8.1-8.6, 9.1-9.8, 10.1-10.6, 11.1-11.5_

- [x] 8. Checkpoint - 确保构建器和调度器测试通过
  - 确保所有测试通过，ask the user if questions arise.

- [x] 9. 顶层配方生成协调器
  - [x] 9.1 创建 `src/utils/soundscape/recipeGenerator.ts`
    - 实现 `generateRecipe(context: LocationContext): SoundscapeRecipe` 函数
    - 使用 `generateCacheKey(lat, lng, timeSlot)` 生成 recipe.id
    - 设置 `generatedAt` 为 `Date.now()`
    - 设置 `localTimeAtGeneration` 为 `HH:MM` 格式（从 context.currentLocalHour 派生）
    - 调用 `getTemplate(context.regionType)` 获取区域模板
    - 调用 `getTerrainSound(context.terrain)` 获取地形声音
    - 调用 `interpolate(context.currentLocalHour)` 获取时间插值参数
    - 依次调用 LayerBuilder 的 5 个构建函数构建所有层
    - 组装完整 SoundscapeRecipe 并返回
    - 单层构建失败时使用静默默认层继续构建，输出 `[PinDrop Error] LayerBuilder: Failed to build {layerName}: {error}` 日志
    - 所有 volume 值 clamp 到 [0, 1]，所有 pan 值 clamp 到 [-1, 1]
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 15.1, 15.2, 15.3, 15.4, 15.5, 16.1, 16.2, 16.4, 16.5, 16.6, 18.1, 18.2_

  - [ ]* 9.2 编写 recipeGenerator 单元测试
    - 创建 `src/utils/__tests__/recipeGenerator.test.ts`
    - 测试 PARIS_CONTEXT 生成完整的 SoundscapeRecipe，所有字段正确
    - 测试 recipe.id 格式为 `{lat},{lng}-{timeSlot}`
    - 测试 generatedAt 为正整数
    - 测试 localTimeAtGeneration 匹配 `HH:MM` 格式
    - 测试 layers 包含恰好 5 个键
    - 测试 API 端点映射：ambient/signature → sound-generation, dialogue → text-to-speech (eleven_v3), secondaryDialogue → text-to-speech (eleven_flash_v2_5), atmosphere → music-generation
    - 测试错误处理：未识别 RegionType 降级到 rural、未识别 TerrainType 降级到 plain
    - 测试单层构建失败时使用静默默认层
    - 使用 `vi.useFakeTimers()` 控制时间戳
    - _Requirements: 6.1-6.8, 15.1-15.5, 16.1-16.6_

  - [ ]* 9.3 编写 recipeGenerator 属性测试
    - 创建 `src/utils/__tests__/recipeGenerator.property.test.ts`
    - 使用设计文档中的 `locationContextArb` 生成器生成任意有效 LocationContext
    - **Property 1: 配方结构完整性** — 验证 generateRecipe 返回完整的 SoundscapeRecipe 结构
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 6.1, 6.4**
    - **Property 2: 层参数范围约束** — 验证所有 volume ∈ [0,1]、pan ∈ [-1,1]、intervalSeconds ∈ [30,90]、repeatIntervalSeconds ∈ [30,120]
    - **Validates: Requirements 14.1-14.9, 5.7**
    - **Property 3: 配方 ID 与缓存键一致性** — 验证 recipe.id === generateCacheKey(lat, lng, timeSlot)
    - **Validates: Requirements 1.2, 18.1, 18.2, 18.3, 18.4**
    - **Property 7: 占位符替换完整性** — 验证 ambient.prompt 不含 `{weather}`、atmosphere.prompt 不含 `{culture}`
    - **Validates: Requirements 7.2, 11.1**
    - **Property 8: 无对话区域静默规则** — 验证 rural/wilderness/polar 的 dialogue 和 secondaryDialogue volume=0, text=""
    - **Validates: Requirements 9.8, 10.6**
    - **Property 9: 次要对话层约束** — 验证 secondaryDialogue.volume ≤ dialogue.volume 且 secondaryDialogue.repeatIntervalSeconds ≥ dialogue.repeatIntervalSeconds
    - **Validates: Requirements 10.3, 10.5**
    - **Property 14: 对话层语言匹配** — 验证 dialogue.language === context.languageVariant，secondaryDialogue.language 为 languageVariant 或 secondaryLanguages 之一
    - **Validates: Requirements 9.2, 10.2**
    - 每个属性最少 100 次迭代
    - _Requirements: 1.1-1.8, 6.1, 6.4, 7.2, 9.2, 9.8, 10.2, 10.3, 10.5, 10.6, 11.1, 14.1-14.9, 18.1-18.4_

- [x] 10. SoundscapeRecipe 序列化与反序列化
  - [x] 10.1 在 `src/types/soundscapeRecipe.ts` 中添加序列化函数
    - 实现 `serializeSoundscapeRecipe(recipe: SoundscapeRecipe): string` — 将 SoundscapeRecipe 序列化为 JSON 字符串，保留所有数值精度
    - 实现 `parseSoundscapeRecipe(json: string): SoundscapeRecipe | null` — 解析 JSON 字符串为 SoundscapeRecipe，含完整类型验证
    - 解析失败时返回 null，不抛出未处理异常
    - 验证所有必需字段存在且类型正确
    - 验证 layers 包含恰好 5 个键
    - 验证所有数值范围（volume、pan、intervalSeconds 等）
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

  - [ ]* 10.2 编写序列化属性测试
    - 创建 `src/utils/__tests__/soundscapeRecipe.property.test.ts`
    - **Property 12: SoundscapeRecipe 序列化往返一致性** — 验证 parse(serialize(recipe)) 与原始 recipe 等价，数值精度完整保留
    - **Validates: Requirements 17.3, 17.5**
    - **Property 13: 反序列化鲁棒性** — 使用 `fc.string()` 生成任意字符串，验证 parseSoundscapeRecipe 返回 null 或有效对象，永不抛出异常
    - **Validates: Requirements 17.4, 17.6**
    - 每个属性最少 100 次迭代
    - _Requirements: 17.1-17.6_

- [x] 11. 模块导出与集成
  - [x] 11.1 创建 `src/utils/soundscape/index.ts` 模块导出文件
    - 导出 `generateRecipe` 从 recipeGenerator
    - 导出 `getTemplate` 从 regionTemplateMapper
    - 导出 `getTerrainSound` 从 terrainSoundMapper
    - 导出 `interpolate` 从 timeInterpolator
    - 导出 `getEventPool`、`scheduleNextEvent` 从 dynamicEventScheduler
    - 导出所有 layerBuilder 构建函数
    - 导出 `serializeSoundscapeRecipe`、`parseSoundscapeRecipe` 从 soundscapeRecipe 类型文件
    - _Requirements: 6.1_

- [x] 12. Final checkpoint - 确保所有测试通过
  - 确保所有测试通过，ask the user if questions arise.

## Notes

- 标记 `*` 的子任务为可选任务，可跳过以加速 MVP 开发
- 每个任务引用了具体的需求编号以确保可追溯性
- Checkpoint 任务确保增量验证
- 属性测试验证设计文档中定义的 14 个正确性属性
- 单元测试验证具体示例和边界条件
- 所有代码使用 TypeScript strict 模式，中文注释
