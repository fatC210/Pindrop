# Implementation Plan: Time System（时间系统）

## 概述

本实现计划针对已有代码的验证和测试补充。Time System 的三个核心模块（TimeSlot 工具层、Time Interpolator 插值层、Timezone Calculator 时区层）已完成实现，任务聚焦于：

1. **验证已有实现**：确认现有代码符合 requirements.md 中的 9 个需求（R1-R9）
2. **新增属性测试**：为 design.md 中的 7 个正确性属性（P1-P7）编写 fast-check 属性测试
3. **新增单元测试**：为 timeInterpolator 编写常量验证和插值示例测试
4. **补充已有测试**：扩展 timeSlot.property.test.ts 和 timezoneCalculator.test.ts 的覆盖范围

### 已有实现文件

- `src/utils/timeSlot.ts` — TimeSlot 类型、getTimeSlot()、generateCacheKey()、parseCacheKey()
- `src/utils/soundscape/timeInterpolator.ts` — TIME_KEYFRAMES、KEYFRAME_HOURS、lerp()、interpolate()
- `src/utils/geocoding/timezoneCalculator.ts` — calculateTimezone()、COUNTRY_TIMEZONE_MAP
- `src/types/locationContext.ts` — LocationContext、TimezoneInfo 接口
- `src/types/soundscapeRecipe.ts` — TimeParams、TimeInterpolation 接口

### 已有测试文件

- `src/utils/__tests__/timeSlot.property.test.ts` — 缓存键属性测试、小时映射测试
- `src/utils/__tests__/timezoneCalculator.test.ts` — 国家→IANA、经度估算、时间档映射

### 测试框架

- Vitest + fast-check
- 属性测试最少 100 次迭代（`{ numRuns: 100 }`）
- 覆盖率目标：时间插值 100%（Critical）
- 运行命令：`npm run test`

## Tasks

- [x] 1. 验证已有实现符合需求
  - [x] 1.1 验证 timeSlot.ts 实现
    - 确认 TimeSlot 类型定义恰好 4 个值：dawn、day、dusk、night
    - 确认 TIME_SLOTS 常量定义了正确的小时范围：dawn(5-8)、day(9-16)、dusk(17-19)、night(20-4)
    - 确认 getTimeSlot() 使用模运算 `((hour % 24) + 24) % 24` 规范化超范围输入
    - 确认 generateCacheKey() 格式为 `{lat},{lng}-{timeSlot}`，坐标精度 0.01°
    - 确认 parseCacheKey() 能正确解析缓存键并验证 TimeSlot 有效性
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 1.2 验证 timeInterpolator.ts 实现
    - 确认 TIME_KEYFRAMES 常量值：dawn(0.3, 0.4, 0.7, 0.3, 0.15)、day(0.9, 0.8, 0.2, 0.8, 0.25)、dusk(0.5, 0.5, 0.4, 0.4, 0.3)、night(0.1, 0.15, 0.6, 0.1, 0.2)
    - 确认 KEYFRAME_HOURS 起始小时：dawn=5、day=9、dusk=17、night=20
    - 确认 lerp() 实现公式 `a + (b - a) * t`
    - 确认 interpolate() 正确处理 4 个插值区间和午夜跨越
    - 确认所有插值结果通过 clamp 限制在 [0, 1] 范围
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 1.3 验证 timezoneCalculator.ts 实现
    - 确认 COUNTRY_TIMEZONE_MAP 覆盖 60+ 国家（欧洲、亚洲、美洲、非洲、大洋洲）
    - 确认 calculateTimezone() 优先使用国家名称查询 IANA 时区
    - 确认国家名称缺失或未匹配时降级到经度估算 `Math.round(lng / 15)`
    - 确认 UTC±N 格式正确：正偏移 "UTC+N"、负偏移 "UTC-N"、零偏移 "UTC+0"
    - 确认 IANA 解析失败时降级到 UTC 小时并输出 `[PinDrop Error]` 日志
    - 确认返回的 TimezoneInfo 三个字段始终有效且 timeSlot 与 currentLocalHour 一致
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Checkpoint - 验证已有实现
  - 确保已有实现符合所有需求，ask the user if questions arise.

- [x] 3. 新增 timeInterpolator 属性测试
  - [x]* 3.1 编写 Property 4: lerp 数学正确性属性测试
    - 创建 `src/utils/__tests__/timeInterpolator.property.test.ts`
    - **Property 4: lerp 数学正确性与有界性**
    - 使用 `fc.float({ min: 0, max: 1, noNaN: true })` 生成 a、b、t
    - 验证 `lerp(a, b, t)` 等于 `a + (b - a) * t`（浮点精度容差 1e-10）
    - 验证返回值 ∈ [min(a, b), max(a, b)]（浮点精度容差 1e-10）
    - 最少 100 次迭代
    - **Validates: Requirements 8.1, 8.5**

  - [x]* 3.2 编写 Property 2: interpolate 输出有效性属性测试
    - 在 `src/utils/__tests__/timeInterpolator.property.test.ts` 中追加
    - **Property 2: interpolate() 输出有效性与范围不变量**
    - 使用 `fc.float({ min: 0, max: 23.99, noNaN: true })` 生成任意小时（含浮点）
    - 验证 sourceSlot 和 targetSlot 均为有效 TimeSlot 且互不相同
    - 验证 sourceSlot → targetSlot 在循环序列 dawn→day→dusk→night→dawn 中相邻
    - 验证 progress ∈ [0, 1]
    - 验证 appliedParams 的 5 个参数（activity、traffic、nature、humanVoice、music）均 ∈ [0, 1]
    - 最少 100 次迭代
    - **Validates: Requirements 3.1, 3.5, 3.6, 3.7, 9.2**

  - [x]* 3.3 编写 Property 3: interpolate 代数正确性属性测试
    - 在 `src/utils/__tests__/timeInterpolator.property.test.ts` 中追加
    - **Property 3: interpolate() 代数正确性**
    - 使用 `fc.float({ min: 0, max: 23.99, noNaN: true })` 生成任意小时
    - 对返回的 appliedParams 中每个参数，验证其值等于 `clamp(lerp(TIME_KEYFRAMES[sourceSlot][param], TIME_KEYFRAMES[targetSlot][param], progress), 0, 1)`（浮点精度容差 1e-10）
    - 最少 100 次迭代
    - **Validates: Requirements 3.2**

- [x] 4. 新增 timeInterpolator 单元测试
  - [x]* 4.1 编写 timeInterpolator 常量验证和插值示例单元测试
    - 创建 `src/utils/__tests__/timeInterpolator.test.ts`
    - 测试 TIME_KEYFRAMES 恰好包含 4 个键（dawn、day、dusk、night）
    - 测试每个关键帧的 5 个参数值与设计文档一致
    - 测试所有关键帧参数值均在 [0, 1] 范围内
    - 测试 KEYFRAME_HOURS 包含 4 个条目，起始小时分别为 5、9、17、20
    - 测试关键帧起始小时（5, 9, 17, 20）返回 progress=0 和对应的 sourceSlot/targetSlot
    - 测试设计文档中的插值示例值：hour=7 → dawn→day, progress=0.5; hour=13 → day→dusk, progress=0.5; hour=0 → night→dawn, progress≈0.444
    - 测试午夜跨越：hour=20 → night→dawn, progress=0; hour=3 → night→dawn, progress≈0.778
    - 测试超范围小时规范化：hour=-1 → 等价于 hour=23; hour=24 → 等价于 hour=0; hour=25 → 等价于 hour=1
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.3, 3.4, 3.5_

- [x] 5. Checkpoint - 确保 timeInterpolator 测试通过
  - 确保所有测试通过，ask the user if questions arise.

- [x] 6. 新增 timezoneCalculator 属性测试
  - [x]* 6.1 编写 Property 5: calculateTimezone 输出完整性属性测试
    - 创建 `src/utils/__tests__/timezoneCalculator.property.test.ts`
    - **Property 5: calculateTimezone 输出完整性与一致性**
    - 使用混合生成器：`fc.oneof(fc.constantFrom(...已知国家), fc.string(), fc.constant(null))` 生成 countryName
    - 使用 `fc.float({ min: -90, max: 90, noNaN: true })` 生成 lat
    - 使用 `fc.float({ min: -180, max: 180, noNaN: true })` 生成 lng
    - 验证 timezone 为非空字符串
    - 验证 currentLocalHour 为 [0, 23] 范围内的整数
    - 验证 timeSlot 为 4 个有效 TimeSlot 值之一
    - 验证 timeSlot === getTimeSlot(currentLocalHour)（一致性不变量）
    - 最少 100 次迭代
    - **Validates: Requirements 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5**

  - [x]* 6.2 编写 Property 6: 端到端管道有效性属性测试
    - 在 `src/utils/__tests__/timezoneCalculator.property.test.ts` 中追加
    - **Property 6: 端到端管道有效性**
    - 使用坐标和国家名称生成器
    - 将 calculateTimezone() 的 currentLocalHour 传入 interpolate()
    - 验证 interpolate() 返回有效的 TimeInterpolation
    - 验证 appliedParams 的 5 个参数均 ∈ [0, 1]
    - 最少 100 次迭代
    - **Validates: Requirements 9.1, 9.3**

  - [x]* 6.3 编写 Property 7: 管道确定性属性测试
    - 在 `src/utils/__tests__/timezoneCalculator.property.test.ts` 中追加
    - **Property 7: 管道确定性**
    - 使用坐标和国家名称生成器
    - 在相同系统时间下（使用 `vi.useFakeTimers()`），连续两次调用完整管道
    - 验证两次调用的 TimeInterpolation 结果完全相同（sourceSlot、targetSlot、progress、appliedParams）
    - 最少 100 次迭代
    - **Validates: Requirements 9.4**

- [x] 7. 补充已有测试
  - [x]* 7.1 补充 timeSlot.property.test.ts 的 P1 超范围输入测试
    - 在 `src/utils/__tests__/timeSlot.property.test.ts` 中追加 Property 1 测试
    - **Property 1: getTimeSlot 小时映射完备性**
    - 使用 `fc.integer({ min: -100, max: 100 })` 生成超范围小时值
    - 验证 getTimeSlot() 对任意整数输入返回有效 TimeSlot
    - 验证规范化后的小时与返回的 TimeSlot 满足映射关系
    - 最少 100 次迭代
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**

  - [x]* 7.2 补充 timezoneCalculator.test.ts 的 IANA 解析失败降级测试
    - 在 `src/utils/__tests__/timezoneCalculator.test.ts` 中追加测试用例
    - 测试当 IANA 时区解析失败时降级到 UTC 小时
    - 验证 console.error 被调用且日志格式包含 `[PinDrop Error] TimezoneCalculator:`
    - 验证降级后返回的 TimezoneInfo 仍然有效（三个字段均在有效范围内）
    - _Requirements: 6.5_

- [x] 8. Final checkpoint - 确保所有测试通过
  - 确保所有测试通过，ask the user if questions arise.

## Notes

- 标记 `*` 的子任务为可选任务，可跳过以加速 MVP 开发
- 每个任务引用了具体的需求编号以确保可追溯性
- Checkpoint 任务确保增量验证
- 属性测试验证设计文档中定义的 7 个正确性属性（P1-P7）
- 单元测试验证具体常量值、插值示例和边界条件
- 代码实现已存在，任务主要是验证和测试补充
- 所有测试使用 TypeScript strict 模式，中文注释
- 时间插值模块覆盖率目标 100%（Critical 优先级）
