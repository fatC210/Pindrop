# Requirements Document: Time System

## Introduction

Time System 是 PinDrop 声景生成管道的时间维度核心模块，负责将目标地点的真实当地时间映射为连续变化的声景参数。该系统由三个紧密协作的子系统构成：

1. **时间档定义**：将 24 小时划分为 4 个时间档（dawn/day/dusk/night），每个时间档定义 5 个声景关键帧参数
2. **连续参数插值**：基于逐小时线性插值算法，在相邻关键帧之间平滑过渡 5 个声景参数（activity、traffic、nature、humanVoice、music），正确处理午夜跨越
3. **时区计算**：将目标地点的国家名称和坐标映射为真实当地时间，支持 IANA 时区查询和经度估算降级

### 已有实现

项目中已存在以下相关模块：
- `src/utils/timeSlot.ts` — TimeSlot 类型定义、getTimeSlot()、generateCacheKey() 等基础工具
- `src/utils/soundscape/timeInterpolator.ts` — TIME_KEYFRAMES 常量、KEYFRAME_HOURS、lerp()、interpolate() 函数
- `src/utils/geocoding/timezoneCalculator.ts` — calculateTimezone()、国家→时区映射、经度估算降级
- `src/types/locationContext.ts` — LocationContext 接口（含 TimezoneInfo）
- `src/types/soundscapeRecipe.ts` — TimeParams、TimeInterpolation 接口定义

### 设计目标

1. **时间真实性**：声景参数精确反映目标地点的真实当地时间
2. **连续平滑**：相邻小时之间的参数过渡无跳变，通过线性插值实现
3. **午夜正确性**：night(20:00) → dawn(5:00) 的跨午夜区间正确处理
4. **降级容错**：时区计算在国家名称缺失时自动降级到经度估算
5. **100% 测试覆盖**：时间插值模块为 Critical 优先级，要求完整的属性测试覆盖

## Glossary

- **Time_Interpolator**: 时间插值组件，基于 4 档关键帧和当前小时计算连续的声景参数，实现文件为 `src/utils/soundscape/timeInterpolator.ts`
- **Timezone_Calculator**: 时区计算组件，从国家名称和坐标计算 IANA 时区、当地小时和时间档，实现文件为 `src/utils/geocoding/timezoneCalculator.ts`
- **TimeSlot**: 时间档枚举类型，取值为 "dawn" | "day" | "dusk" | "night"，定义在 `src/utils/timeSlot.ts`
- **TimeParams**: 时间参数对象，包含 activity、traffic、nature、humanVoice、music 五个 [0, 1] 范围的数值
- **TimeInterpolation**: 时间插值结果对象，包含 sourceSlot、targetSlot、progress 和插值后的 appliedParams
- **TIME_KEYFRAMES**: 4 档时间关键帧常量，Record<TimeSlot, TimeParams> 类型，定义每个时间档的 5 个声景参数锚点
- **KEYFRAME_HOURS**: 关键帧起始小时数组，按时间顺序排列：dawn=5、day=9、dusk=17、night=20
- **lerp**: 线性插值辅助函数，公式为 `a + (b - a) * t`，其中 t ∈ [0, 1]
- **TimezoneInfo**: 时区信息接口，包含 timezone（IANA 或 UTC±N 格式）、currentLocalHour（0-23）、timeSlot
- **IANA_Timezone**: IANA 时区标识符，如 "Asia/Tokyo"、"Europe/Paris"，用于 Intl.DateTimeFormat 解析当地时间
- **COUNTRY_TIMEZONE_MAP**: 国家名称到 IANA 时区的映射表，覆盖 60+ 主要国家

## Requirements

### Requirement 1: 时间档定义与小时范围映射

**User Story:** As a developer, I want 4 time slots with clearly defined hour ranges, so that any hour of the day maps to exactly one time slot for soundscape generation.

#### Acceptance Criteria

1. THE TimeSlot type SHALL define exactly 4 values: "dawn", "day", "dusk", "night"
2. THE getTimeSlot function SHALL map hours 5-8 (inclusive) to "dawn"
3. THE getTimeSlot function SHALL map hours 9-16 (inclusive) to "day"
4. THE getTimeSlot function SHALL map hours 17-19 (inclusive) to "dusk"
5. THE getTimeSlot function SHALL map hours 20-23 and 0-4 (inclusive) to "night", correctly handling the midnight rollover
6. WHEN the getTimeSlot function receives an hour value outside the range [0, 23], THE getTimeSlot function SHALL normalize the hour to the [0, 23] range using modular arithmetic `((hour % 24) + 24) % 24`
7. FOR ALL integer hour values in [0, 23], THE getTimeSlot function SHALL return exactly one of the 4 TimeSlot values, with no gaps or overlaps in the hour ranges

### Requirement 2: 4 档时间关键帧参数定义

**User Story:** As a developer, I want each time slot to have 5 defined parameter values, so that the interpolation system has precise anchor points for calculating continuous soundscape parameters.

#### Acceptance Criteria

1. THE TIME_KEYFRAMES constant SHALL define exactly 4 entries corresponding to TimeSlot values: dawn, day, dusk, night
2. THE dawn keyframe SHALL define parameters: activity=0.3, traffic=0.4, nature=0.7, humanVoice=0.3, music=0.15
3. THE day keyframe SHALL define parameters: activity=0.9, traffic=0.8, nature=0.2, humanVoice=0.8, music=0.25
4. THE dusk keyframe SHALL define parameters: activity=0.5, traffic=0.5, nature=0.4, humanVoice=0.4, music=0.3
5. THE night keyframe SHALL define parameters: activity=0.1, traffic=0.15, nature=0.6, humanVoice=0.1, music=0.2
6. FOR ALL keyframes, each of the 5 parameter values SHALL be a number in the range [0, 1]
7. THE KEYFRAME_HOURS constant SHALL associate start hours: dawn=5, day=9, dusk=17, night=20

### Requirement 3: 逐小时线性插值算法

**User Story:** As a developer, I want to interpolate soundscape parameters between adjacent keyframes based on the current hour, so that the soundscape transitions smoothly across time of day without abrupt changes.

#### Acceptance Criteria

1. WHEN a currentLocalHour value is provided, THE Time_Interpolator SHALL identify the two adjacent keyframes that bracket the given hour and calculate a linear interpolation progress value between 0 and 1
2. THE Time_Interpolator SHALL apply linear interpolation to each of the 5 parameters (activity, traffic, nature, humanVoice, music) using the formula `result = source + (target - source) * progress`
3. THE Time_Interpolator SHALL define the following interpolation intervals: dawn(5)→day(9) spanning 4 hours, day(9)→dusk(17) spanning 8 hours, dusk(17)→night(20) spanning 3 hours, night(20)→dawn(5) spanning 9 hours across midnight
4. WHEN the currentLocalHour falls exactly on a keyframe start hour (5, 9, 17, or 20), THE Time_Interpolator SHALL return that keyframe's exact parameters with progress=0
5. THE Time_Interpolator SHALL handle the midnight rollover correctly: hours 20-23 and 0-4 SHALL interpolate between the night keyframe and the dawn keyframe, with elapsed time calculated as `hour >= 20 ? hour - 20 : hour + 4`
6. FOR ALL valid hour inputs (any number, normalized to 0-23 via modular arithmetic), each interpolated parameter value SHALL remain in the range [0, 1] by clamping the result
7. THE Time_Interpolator SHALL return a TimeInterpolation object containing sourceSlot, targetSlot, progress (0-1), and appliedParams with all 5 interpolated parameter values

### Requirement 4: 插值参数对声景层的影响映射

**User Story:** As a developer, I want each interpolated parameter to map to specific soundscape layer properties, so that the time-based parameter changes produce audible differences in the generated soundscape.

#### Acceptance Criteria

1. THE interpolated `activity` parameter SHALL influence the ambient layer volume and the signature layer trigger interval (higher activity results in higher volume and shorter intervals)
2. THE interpolated `traffic` parameter SHALL influence the volume of traffic-related SFX sounds in the ambient and signature layers
3. THE interpolated `nature` parameter SHALL influence the volume of natural sounds (birds, insects, wind) in the ambient layer
4. THE interpolated `humanVoice` parameter SHALL influence the dialogue layer volume and the dialogue repeat interval (higher humanVoice results in higher volume and shorter intervals)
5. THE interpolated `music` parameter SHALL influence the atmosphere (music) layer volume

### Requirement 5: 时区计算 — IANA 时区查询

**User Story:** As a developer, I want to calculate the local time at a target location using IANA timezone data, so that the soundscape accurately reflects the real-world time at that location.

#### Acceptance Criteria

1. WHEN a recognized country name is provided, THE Timezone_Calculator SHALL look up the corresponding IANA timezone from the COUNTRY_TIMEZONE_MAP (covering 60+ major countries)
2. WHEN a valid IANA timezone is obtained, THE Timezone_Calculator SHALL use Intl.DateTimeFormat to determine the current local hour (0-23) at that timezone
3. THE Timezone_Calculator SHALL return a TimezoneInfo object containing: timezone (IANA string), currentLocalHour (0-23 integer), and timeSlot (derived from currentLocalHour via getTimeSlot)
4. THE COUNTRY_TIMEZONE_MAP SHALL cover major countries across all continents: Europe (France, Germany, UK, Italy, Spain, etc.), Asia (Japan, China, South Korea, India, Thailand, etc.), Americas (United States, Canada, Mexico, Brazil, Argentina, etc.), Africa (Egypt, South Africa, Nigeria, Kenya, Morocco, etc.), Oceania (Australia, New Zealand)

### Requirement 6: 时区计算 — 经度估算降级

**User Story:** As a developer, I want a fallback timezone estimation based on longitude, so that the system can still determine local time when the country name is missing or unrecognized.

#### Acceptance Criteria

1. WHEN the country name is null or not found in COUNTRY_TIMEZONE_MAP, THE Timezone_Calculator SHALL estimate the timezone offset using the formula `offset = Math.round(lng / 15)`
2. THE Timezone_Calculator SHALL format the estimated timezone as "UTC+N" for positive offsets, "UTC-N" for negative offsets, and "UTC+0" for zero offset
3. WHEN a UTC±N format timezone is obtained, THE Timezone_Calculator SHALL calculate the current local hour using `(utcHour + offset + 24) % 24`
4. THE Timezone_Calculator SHALL derive the timeSlot from the calculated currentLocalHour using the getTimeSlot function
5. IF the IANA timezone parsing via Intl.DateTimeFormat fails (e.g., invalid timezone string), THEN THE Timezone_Calculator SHALL fall back to returning the UTC hour and log the error with format `[PinDrop Error] TimezoneCalculator: Failed to parse timezone {timezone}`

### Requirement 7: 时区计算结果的完整性与范围约束

**User Story:** As a developer, I want all timezone calculation outputs to be within valid ranges, so that downstream consumers (time interpolator, cache key generator) receive reliable inputs.

#### Acceptance Criteria

1. FOR ALL inputs (any country name or null, any lat/lng), THE Timezone_Calculator SHALL return a TimezoneInfo object with all 3 fields populated (timezone, currentLocalHour, timeSlot)
2. THE currentLocalHour field SHALL always be an integer in the range [0, 23]
3. THE timeSlot field SHALL always be one of the 4 valid TimeSlot values: "dawn", "day", "dusk", "night"
4. THE timezone field SHALL always be a non-empty string in either IANA format (e.g., "Asia/Tokyo") or UTC±N format (e.g., "UTC+9")
5. THE currentLocalHour and timeSlot fields SHALL be consistent: the timeSlot SHALL match the result of calling getTimeSlot(currentLocalHour)

### Requirement 8: lerp 辅助函数正确性

**User Story:** As a developer, I want the linear interpolation helper function to be mathematically correct, so that all parameter interpolations produce accurate results.

#### Acceptance Criteria

1. THE lerp function SHALL compute `a + (b - a) * t` for inputs a, b, and t
2. WHEN t=0, THE lerp function SHALL return exactly a (the source value)
3. WHEN t=1, THE lerp function SHALL return exactly b (the target value)
4. WHEN t=0.5, THE lerp function SHALL return the arithmetic midpoint `(a + b) / 2`
5. FOR ALL t values in [0, 1] and a, b values in [0, 1], THE lerp function SHALL return a value in the range [min(a, b), max(a, b)]

### Requirement 9: 时间系统端到端集成

**User Story:** As a developer, I want the timezone calculator and time interpolator to work together seamlessly, so that a location's coordinates produce the correct interpolated soundscape parameters for the current real-world time at that location.

#### Acceptance Criteria

1. WHEN coordinates and an optional country name are provided, THE Timezone_Calculator SHALL produce a currentLocalHour that THE Time_Interpolator can consume to produce valid TimeInterpolation results
2. THE Time_Interpolator output's sourceSlot and targetSlot SHALL be adjacent keyframes in the cyclic order: dawn → day → dusk → night → dawn
3. FOR ALL locations at any time of day, the complete pipeline (coordinates → timezone → local hour → interpolation) SHALL produce appliedParams where all 5 values are in [0, 1]
4. WHEN the same coordinates and country name are provided at the same real-world time, THE complete pipeline SHALL produce identical TimeInterpolation results (deterministic behavior)
