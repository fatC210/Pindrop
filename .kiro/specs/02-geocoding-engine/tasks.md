# Implementation Plan: Geocoding Engine（反向地理编码与语境推断引擎）

## 概述

本实现计划基于已有代码进行增量开发。项目中 Nominatim 客户端（`nominatim.ts`）、速率限制器（`throttle.ts`）、地理编码缓存（`geocodeCache.ts`）、坐标工具（`coordinates.ts`）、时间档工具（`timeSlot.ts`）和 IndexedDB 初始化（`db.ts`）已基本实现。

本计划聚焦以下差距：
1. **LocationContext 类型定义** — 完整接口 + 所有枚举类型（全新）
2. **推断器集群** — RegionClassifier、LanguageMapper、TimezoneCalculator、TerrainInferrer、ClimateInferrer、CultureInferrer、EconomyInferrer（全新）
3. **CoordinateInferrer** — 三级降级推断：极地 → 海洋 → 荒野（扩展现有 `nominatim.ts` 中的简化版本）
4. **GeocodingEngine 协调器** — 编排 cache → Nominatim → infer → build 的完整流程（全新）
5. **Nominatim 客户端扩展** — 扩展 NominatimResponse 接口，增加 suburb/hamlet/country_code 字段
6. **10 个正确性属性的属性测试** — 设计文档定义的 Property 1-10
7. **单元测试** — 每个推断器的具体示例和边界条件

所有代码使用 TypeScript strict 模式，测试使用 Vitest + fast-check。

## Tasks

- [x] 1. LocationContext 类型定义与枚举类型
  - [x] 1.1 创建 `src/types/locationContext.ts` 类型定义文件
    - 定义 `RegionType` 类型：`"city_center" | "city_suburb" | "town" | "village" | "rural" | "wilderness" | "ocean" | "polar"`
    - 定义 `TerrainType` 类型：`"mountain" | "plain" | "coast" | "desert" | "forest" | "tundra" | "jungle" | "river" | "lake"`
    - 定义 `ClimateType` 类型：`"tropical" | "temperate" | "subarctic" | "arid" | "mediterranean"`
    - 定义 `WaterType` 类型：`"sea" | "river" | "lake" | "canal"`
    - 重新导出已有的 `TimeSlot` 类型（从 `timeSlot.ts`）
    - 定义 `LocationContext` 接口，包含全部 17 个字段（基础地理、语言、时间、文化推断、地理特征、经济水平）
    - 定义辅助类型：`LanguageInfo`、`CultureInfo`、`TimezoneInfo`
    - 实现 `serializeLocationContext(ctx: LocationContext): string` 函数
    - 实现 `parseLocationContext(json: string): LocationContext | null` 函数，含类型验证
    - 导出所有类型和函数
    - _Requirements: 7.1-7.11, 17.1-17.5_

  - [x] 1.2 扩展 `src/utils/nominatim.ts` 中的 NominatimResponse 接口
    - 在 `NominatimResponse.address` 中添加 `suburb?: string` 字段
    - 在 `NominatimResponse.address` 中添加 `hamlet?: string` 字段
    - 在 `NominatimResponse.address` 中添加 `country_code?: string` 字段
    - 确保现有代码不受影响（新字段均为可选）
    - _Requirements: 1.6, 9.1_

- [x] 2. 推断器集群实现
  - [x] 2.1 创建 `src/utils/geocoding/regionClassifier.ts`
    - 实现 `classifyRegion(address: NominatimResponse['address']): RegionClassification` 函数
    - 分类逻辑按优先级：city + suburb → city_suburb (0.6)，city → city_center (0.9)，town → town (0.3)，village/hamlet → village (0.15)，仅 county/state → rural (0.05)
    - 定义 `RegionClassification` 接口：`{ regionType: RegionType; urbanDensity: number }`
    - _Requirements: 9.1-9.6_

  - [x] 2.2 创建 `src/utils/geocoding/languageMapper.ts`
    - 实现 `getLanguageInfo(countryName: string): LanguageInfo` 函数
    - 创建 `COUNTRY_LANGUAGE_MAP` 映射表，覆盖 100+ 国家
    - 每个条目包含 `lang`（ISO 639-1）、`variant`（BCP 47）、`secondary`（其他常见语言数组）
    - 多语言国家（Switzerland、Belgium、Canada 等）选择最广泛使用的语言为 primary，其他放入 secondary
    - 未匹配国家兜底返回 `{ primaryLanguage: "en", languageVariant: "en-US", secondaryLanguages: [] }`
    - _Requirements: 8.1-8.7_

  - [x] 2.3 创建 `src/utils/geocoding/timezoneCalculator.ts`
    - 实现 `calculateTimezone(countryName: string | null, lat: number, lng: number): TimezoneInfo` 函数
    - 优先使用 `Intl.DateTimeFormat` 解析国家对应的 IANA 时区
    - 创建 `COUNTRY_TIMEZONE_MAP` 映射表（国家名 → IANA 时区）
    - 降级：无国家名时使用经度估算 `offset = Math.round(lng / 15)`，返回 `"UTC±N"` 格式
    - 使用 `new Date().toLocaleString('en-US', { timeZone, hour: 'numeric', hour12: false })` 获取当前小时
    - 调用已有的 `getTimeSlot(hour)` 计算 timeSlot
    - 正确处理午夜翻转（0-4 点归类为 night）
    - _Requirements: 10.1-10.6_

  - [x] 2.4 创建 `src/utils/geocoding/terrainInferrer.ts`
    - 实现 `inferTerrain(lat: number, lng: number, address: NominatimResponse['address'] | null): TerrainResult` 函数
    - 定义 `DESERT_REGIONS` 坐标范围数组（Sahara、Arabian、Gobi、Kalahari、Atacama、Sonoran）
    - 按优先级推断：沙漠区域 → 热带丛林（|lat| < 15）→ 冻原（|lat| ≥ 60）→ 海岸线 → 默认 plain
    - 设置 `nearWater` 字段：海洋/海岸 → "sea"，其他 → null
    - _Requirements: 11.1-11.6_

  - [x] 2.5 创建 `src/utils/geocoding/climateInferrer.ts`
    - 实现 `inferClimate(lat: number, lng: number): ClimateType` 函数
    - 定义 `MEDITERRANEAN_REGIONS` 坐标范围数组（地中海盆地、加州、智利、南非、澳大利亚西南）
    - 按优先级推断：subarctic（|lat| ≥ 55）→ mediterranean → arid（已知干旱区域 + 23.5 ≤ |lat| < 35）→ tropical（|lat| < 23.5）→ 默认 temperate
    - _Requirements: 12.1-12.5_

  - [x] 2.6 创建 `src/utils/geocoding/cultureInferrer.ts`
    - 实现 `inferCulture(countryName: string): CultureInfo` 函数
    - 创建 `COUNTRY_CULTURE_MAP` 映射表，覆盖主要国家
    - cultureRegion 分类：western_europe、eastern_europe、east_asia、south_asia、southeast_asia、middle_east、sub_saharan_africa、north_africa、latin_america、north_america、central_asia、oceania
    - dominantReligion 分类：christianity、islam、buddhism、hinduism、shinto、judaism、folk_religion、none
    - 未匹配国家兜底返回 `{ cultureRegion: "unknown", dominantReligion: "none" }`
    - _Requirements: 13.1-13.5_

  - [x] 2.7 创建 `src/utils/geocoding/economyInferrer.ts`
    - 实现 `inferEconomicLevel(countryName: string): number` 函数
    - 创建 `COUNTRY_ECONOMY_MAP` 映射表，基于相对 GDP per capita 排名
    - 分档：0.8-1.0（高收入）、0.6-0.79（中高收入）、0.4-0.59（中等收入）、0.2-0.39（中低收入）、0.0-0.19（低收入）
    - 未匹配国家兜底返回 0.5
    - 返回值始终在 [0, 1] 范围内
    - _Requirements: 14.1-14.5_

  - [x] 2.8 创建 `src/utils/geocoding/index.ts` 模块导出
    - 导出所有推断器函数
    - 导出 GeocodingEngine 协调器
    - _Requirements: 15.1_

- [x] 3. CoordinateInferrer 三级降级推断
  - [x] 3.1 创建 `src/utils/geocoding/coordinateInferrer.ts`
    - 实现 `isPolar(lat: number): boolean` — 判断 |lat| > 66.5
    - 实现 `isOcean(lat: number, lng: number): boolean` — 扩展现有 `nominatim.ts` 中的简化版本
    - 实现 `inferFromCoordinates(lat: number, lng: number): LocationContext` — 三级降级入口
    - 实现 `buildPolarContext(lat: number, lng: number): LocationContext` — 极地：cityName="Arctic"/"Antarctic"，regionType="polar"，climate="subarctic"，terrain="tundra"，urbanDensity=0，economicLevel=0
    - 实现 `buildOceanContext(lat: number, lng: number): LocationContext` — 海洋：cityName="Ocean"，regionType="ocean"，terrain="coast"，nearWater="sea"，urbanDensity=0，economicLevel=0
    - 实现 `buildWildernessContext(lat: number, lng: number): LocationContext` — 荒野：cityName="Location at {lat}°, {lng}°"，regionType="wilderness"，climate 基于纬度推断
    - 降级优先级：极地检测 → 海洋检测 → 荒野兜底
    - 所有降级路径调用 TimezoneCalculator 计算时区和时间档
    - _Requirements: 4.1-4.6, 5.1-5.7, 6.1-6.5_

- [x] 4. GeocodingEngine 协调器
  - [x] 4.1 创建 `src/utils/geocoding/geocodingEngine.ts`
    - 实现 `resolveLocation(lat: number, lng: number): Promise<LocationContext>` — 顶层入口
    - 步骤 1：验证坐标（lat ∈ [-90, 90]，lng ∈ [-180, 180]），无效时返回错误
    - 步骤 2：检查 GeocodeCache（调用已有的 `getCachedGeocode`）
    - 步骤 3：缓存未命中时通过 RateLimiter 调用 Nominatim（调用已有的 `reverseGeocode`）
    - 步骤 4：Nominatim 成功时调用 `buildLocationContext` 构建完整 LocationContext
    - 步骤 5：Nominatim 失败时调用 `CoordinateInferrer.inferFromCoordinates` 降级
    - 步骤 6：缓存 Nominatim 响应（成功时）到 GeocodeCache
    - 实现 `buildLocationContext(response: NominatimResponse, lat: number, lng: number): LocationContext`
    - 内部依次调用：RegionClassifier → LanguageMapper → TimezoneCalculator → TerrainInferrer → ClimateInferrer → CultureInferrer → EconomyInferrer
    - 任何单个推断步骤失败时使用默认值继续构建
    - 所有错误使用 `[PinDrop Error] {component}: {message}` 格式记录
    - _Requirements: 15.1-15.7, 16.1-16.6_

- [x] 5. Checkpoint — 确保核心模块编译通过
  - 运行 TypeScript 编译检查，确保无类型错误
  - 验证所有模块导入/导出正确
  - 确保现有测试不受影响
  - 如有疑问请询问用户

- [x] 6. 编写 CoordinateInferrer 属性测试与单元测试
  - [x] 6.1 编写 Property 2 和 Property 3 属性测试
    - 创建 `src/utils/__tests__/coordinateInferrer.property.test.ts`
    - **Property 2: 极地检测阈值一致性** — 使用 fast-check 生成随机纬度，验证 |lat| > 66.5 时返回 true，|lat| ≤ 66.5 时返回 false
    - **Property 3: 降级优先级正确性** — 生成 |lat| > 66.5 的坐标，验证 inferFromCoordinates 返回 regionType: "polar"（而非 "ocean"）
    - 最少 100 次迭代
    - **Validates: Requirements 5.1, 5.7**

  - [x] 6.2 编写 CoordinateInferrer 单元测试
    - 创建 `src/utils/__tests__/coordinateInferrer.test.ts`
    - 测试海洋坐标 (0, -30) → regionType: "ocean"，cityName: "Ocean"
    - 测试北极坐标 (85, 0) → regionType: "polar"，cityName: "Arctic"
    - 测试南极坐标 (-85, 0) → regionType: "polar"，cityName: "Antarctic"
    - 测试荒野坐标 (45, 90) → regionType: "wilderness"
    - 测试极地边界值 (66.5, 0) → 非极地；(66.6, 0) → 极地
    - 测试荒野气候推断：热带（|lat| < 23.5）、干旱（23.5-35）、温带（35-55）、亚寒带（≥ 55）
    - _Requirements: 4.1-4.6, 5.1-5.7, 6.1-6.5_

- [x] 7. 编写推断器单元测试
  - [x] 7.1 编写 RegionClassifier 单元测试
    - 创建 `src/utils/__tests__/regionClassifier.test.ts`
    - 测试 city 字段 → city_center (urbanDensity: 0.9)
    - 测试 city + suburb → city_suburb (urbanDensity: 0.6)
    - 测试 town → town (urbanDensity: 0.3)
    - 测试 village → village (urbanDensity: 0.15)
    - 测试仅 county/state → rural (urbanDensity: 0.05)
    - 测试空 address → rural 兜底
    - _Requirements: 9.1-9.6_

  - [x] 7.2 编写 LanguageMapper 单元测试
    - 创建 `src/utils/__tests__/languageMapper.test.ts`
    - 测试 France → fr/fr-FR
    - 测试 Japan → ja/ja-JP
    - 测试 Switzerland → de/de-CH + secondary: [fr, it, rm]
    - 测试未知国家 → en/en-US 兜底
    - 测试映射表至少包含 100 个国家
    - _Requirements: 8.1-8.7_

  - [x] 7.3 编写 TimezoneCalculator 单元测试
    - 创建 `src/utils/__tests__/timezoneCalculator.test.ts`
    - 测试 France → Europe/Paris 时区
    - 测试 Japan → Asia/Tokyo 时区
    - 测试无国家名时经度估算：lng=0 → UTC+0，lng=139 → UTC+9
    - 测试午夜翻转：hour=2 → night
    - 测试时间档映射：hour=7 → dawn，hour=12 → day，hour=18 → dusk，hour=22 → night
    - _Requirements: 10.1-10.6_

  - [x] 7.4 编写 ClimateInferrer 属性测试与单元测试
    - 创建 `src/utils/__tests__/climateInferrer.property.test.ts`
    - **Property 7: 气候推断纬度单调性** — |lat| ≥ 55 → subarctic，|lat| < 23.5 且非干旱/地中海 → tropical
    - 创建 `src/utils/__tests__/climateInferrer.test.ts`
    - 测试赤道坐标 (0, 0) → tropical
    - 测试撒哈拉坐标 (25, 10) → arid
    - 测试巴黎坐标 (48.86, 2.35) → temperate
    - 测试北极圈坐标 (65, 25) → subarctic
    - 测试地中海坐标 (38, 15) → mediterranean
    - _Requirements: 12.1-12.5_

  - [x] 7.5 编写 TerrainInferrer、CultureInferrer、EconomyInferrer 单元测试
    - 创建 `src/utils/__tests__/terrainInferrer.test.ts` — 测试沙漠/丛林/冻原/海岸/平原推断
    - 创建 `src/utils/__tests__/cultureInferrer.test.ts` — 测试主要国家的文化区域和宗教映射
    - 创建 `src/utils/__tests__/economyInferrer.test.ts` — 测试高/中/低收入国家的经济水平值
    - **Property 9: 经济水平范围约束** — 在 `economyInferrer.property.test.ts` 中验证任意国家名返回 [0, 1] 范围
    - _Requirements: 11.1-11.6, 13.1-13.5, 14.1-14.5_

- [x] 8. 编写 GeocodingEngine 协调器测试
  - [x] 8.1 编写 GeocodingEngine 属性测试
    - 创建 `src/utils/__tests__/geocodingEngine.property.test.ts`
    - **Property 1: 坐标验证完备性** — 无效坐标返回错误，有效坐标返回 LocationContext
    - **Property 10: resolveLocation 总是返回完整 LocationContext** — 任意有效坐标返回所有字段已填充的 LocationContext
    - Mock Nominatim 返回随机成功/失败结果
    - 最少 100 次迭代
    - **Validates: Requirements 15.6, 15.7, 16.4, 16.5**

  - [x] 8.2 编写 GeocodingEngine 单元测试
    - 创建 `src/utils/__tests__/geocodingEngine.test.ts`
    - Mock `getCachedGeocode`、`reverseGeocode`、`cacheGeocode`
    - 测试缓存命中路径：跳过 Nominatim 调用
    - 测试 Nominatim 成功路径：构建完整 LocationContext 并缓存
    - 测试 Nominatim 超时路径：降级到坐标推断
    - 测试 Nominatim 无结果路径：降级到坐标推断
    - 测试无效坐标：返回错误不发起 API 调用
    - 测试单个推断步骤失败：使用默认值继续
    - 测试巴黎完整示例：验证所有字段值
    - _Requirements: 15.1-15.7, 16.1-16.6_

- [x] 9. 编写 LocationContext 序列化属性测试
  - [x] 9.1 编写 Property 5 和 Property 6 属性测试
    - 创建 `src/utils/__tests__/locationContext.property.test.ts`
    - **Property 5: LocationContext 序列化往返一致性** — 生成随机 LocationContext，serialize → parse 后与原始等价
    - **Property 6: 语言映射兜底保证** — 任意字符串调用 getLanguageInfo 返回有效 LanguageInfo
    - 最少 100 次迭代
    - **Validates: Requirements 8.3, 17.3, 17.5**

- [x] 10. Final checkpoint — 确保所有测试通过
  - 运行全部单元测试和属性测试：`npm run test`
  - 运行 TypeScript 类型检查
  - 验证所有核心功能正常工作
  - 确认所有 17 个需求已被任务覆盖
  - 确保所有测试通过，如有疑问请询问用户

## Notes

- 每个任务引用了具体的需求编号以确保可追溯性
- Checkpoint 任务确保在关键节点进行增量验证
- 属性测试验证设计文档中定义的 10 个通用正确性属性
- 单元测试验证具体示例、边界条件和错误处理
- 所有测试使用 Vitest 框架 + fast-check 属性测试库
- 属性测试最少运行 100 次迭代
- 推断器集群的映射数据（语言、文化、经济）需覆盖 100+ 国家
- 现有代码（nominatim.ts、throttle.ts、geocodeCache.ts 等）仅做扩展，不做破坏性修改
- 测试手动运行：`npm run test`，不自动运行