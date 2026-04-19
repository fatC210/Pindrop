# Requirements Document: Soundscape Recipe Engine

## Introduction

Soundscape Recipe Engine 是 PinDrop 声景生成管道的第三阶段核心模块，负责将上游 Geocoding Engine 输出的 `LocationContext` 对象转换为结构化的 `SoundscapeRecipe` JSON 配方。该模块是连接"位置语境"与"ElevenLabs 音频合成"的桥梁——上游接收完整的 LocationContext，下游输出包含 5 层声音参数的配方供音频合成器消费。

系统由以下核心组件构成：

- **Recipe_Generator**：顶层配方生成协调器，接收 LocationContext 并输出完整的 SoundscapeRecipe
- **Region_Template_Mapper**：8 种区域类型到声景模板的映射，提供 ambientPrompt、signaturePool、dialogueTopics、atmosphereStyle、dynamicEventPool
- **Terrain_Sound_Mapper**：9 种地形类型到自然声音 prompt 的映射
- **Time_Interpolator**：4 档时间关键帧定义 + 连续参数插值算法，计算任意小时的声景参数
- **Dynamic_Event_Scheduler**：区域类型到动态事件池的映射 + 随机间隔调度逻辑
- **Layer_Builder**：5 层声音配方构建器，分别生成 ambient、signature、dialogue、secondaryDialogue、atmosphere 层参数

### 设计目标

1. **全覆盖**：任意有效的 LocationContext 都能产出完整的 SoundscapeRecipe
2. **时间连续性**：通过 4 档关键帧 + 线性插值实现声景参数的平滑过渡
3. **文化适配**：根据区域类型、地形、语言、文化等维度生成差异化的声景配方
4. **确定性**：相同的 LocationContext 输入产出结构一致的配方（随机元素仅限动态事件调度）
5. **可测试性**：纯函数设计，所有映射和插值逻辑可独立测试

## Glossary

- **Recipe_Generator**: 声景配方生成的顶层协调模块，接收 LocationContext 输入并输出完整的 SoundscapeRecipe
- **SoundscapeRecipe**: 声景配方对象，包含 5 层声音参数、时间插值信息和位置语境，是 ElevenLabs 音频合成的输入规格
- **Region_Template_Mapper**: 区域类型到声景模板的映射组件，为 8 种 RegionType 提供对应的声音模板
- **Terrain_Sound_Mapper**: 地形类型到自然声音描述的映射组件，为 9 种 TerrainType 提供对应的自然音 prompt
- **Time_Interpolator**: 时间插值组件，基于 4 档关键帧（dawn/day/dusk/night）和当前小时计算连续的声景参数
- **Dynamic_Event_Scheduler**: 动态事件调度组件，根据区域类型从事件池中随机选取事件并按 30-90 秒间隔调度
- **Layer_Builder**: 5 层声音配方构建器，分别生成 AmbientLayer、SignatureLayer、DialogueLayer、AtmosphereLayer
- **AmbientLayer**: 环境音层，类型为 SFX，loop=true，时长 30 秒，持续循环播放
- **SignatureLayer**: 标志性声音层，类型为 SFX，loop=false，按 intervalSeconds 间隔触发
- **DialogueLayer**: 对话层，类型为 TTS，使用 eleven_v3 模型，主要语言对话
- **SecondaryDialogueLayer**: 次要对话层，类型为 TTS，使用 eleven_flash_v2_5 模型，背景对话
- **AtmosphereLayer**: 氛围音乐层，类型为 Music，loop=true，时长 60 秒
- **TimeInterpolation**: 时间插值结果对象，包含 sourceSlot、targetSlot、progress 和 5 个插值后的声景参数
- **TimeParams**: 时间参数对象，包含 activity、traffic、nature、humanVoice、music 五个 0-1 范围的数值
- **DynamicEvent**: 动态事件对象，包含 prompt、音量范围、声像移动方向、持续时间和触发间隔
- **LocationContext**: 上游 Geocoding Engine 输出的结构化位置语境对象，包含 17 个字段（已在 src/types/locationContext.ts 中定义）
- **RegionType**: 区域类型枚举，取值为 "city_center" | "city_suburb" | "town" | "village" | "rural" | "wilderness" | "ocean" | "polar"
- **TerrainType**: 地形类型枚举，取值为 "mountain" | "plain" | "coast" | "desert" | "forest" | "tundra" | "jungle" | "river" | "lake"
- **TimeSlot**: 时间档枚举，取值为 "dawn" | "day" | "dusk" | "night"
- **SoundscapeTemplate**: 声景模板对象，包含 ambientPrompt、signaturePool、dialogueTopics、atmosphereStyle、dynamicEventPool

## Requirements

### Requirement 1: SoundscapeRecipe 完整类型定义

**User Story:** As a developer, I want a comprehensive TypeScript type definition for SoundscapeRecipe and all related layer types, so that all downstream modules have a consistent and complete data contract for soundscape generation.

#### Acceptance Criteria

1. THE SoundscapeRecipe interface SHALL include fields: `id` (string), `location` (LocationContext), `generatedAt` (number, Unix timestamp), `localTimeAtGeneration` (string, "HH:MM" format), `layers` (object containing 5 layer types), and `timeInterpolation` (TimeInterpolation)
2. THE SoundscapeRecipe `id` field SHALL follow the format `{lat},{lng}-{timeSlot}` where coordinates are rounded to 0.01 degree precision (2 decimal places)
3. THE AmbientLayer interface SHALL include fields: `type` (literal "sfx"), `prompt` (string), `volume` (number, 0-1), `loop` (boolean, always true)
4. THE SignatureLayer interface SHALL include fields: `type` (literal "sfx"), `prompt` (string), `volume` (number, 0-1), `loop` (boolean, always false), `intervalSeconds` (number)
5. THE DialogueLayer interface SHALL include fields: `type` (literal "tts"), `model` (string), `voiceId` (string), `language` (string, BCP 47 tag), `text` (string), `emotionTags` (string[]), `volume` (number, 0-1), `pan` (number, -1 to 1), `repeatIntervalSeconds` (number)
6. THE AtmosphereLayer interface SHALL include fields: `type` (literal "music"), `prompt` (string), `volume` (number, 0-1), `loop` (boolean, always true)
7. THE TimeInterpolation interface SHALL include fields: `sourceSlot` (TimeSlot), `targetSlot` (TimeSlot), `progress` (number, 0-1), `appliedParams` (object with activity, traffic, nature, humanVoice, music fields, each number 0-1)
8. THE `layers` object SHALL contain exactly 5 keys: `ambient` (AmbientLayer), `signature` (SignatureLayer), `dialogue` (DialogueLayer), `secondaryDialogue` (DialogueLayer), `atmosphere` (AtmosphereLayer)

### Requirement 2: 区域类型到声景模板映射

**User Story:** As a developer, I want a mapping from each RegionType to a soundscape template, so that the recipe generator can produce location-appropriate sound prompts and dialogue topics.

#### Acceptance Criteria

1. THE Region_Template_Mapper SHALL maintain a mapping for all 8 RegionType values: city_center, city_suburb, town, village, rural, wilderness, ocean, polar
2. WHEN a RegionType is provided, THE Region_Template_Mapper SHALL return a SoundscapeTemplate containing `ambientPrompt` (string), `signaturePool` (string[]), `dialogueTopics` (string[]), `atmosphereStyle` (string), and `dynamicEventPool` (string[])
3. THE Region_Template_Mapper SHALL provide `ambientPrompt` templates that include a `{weather}` placeholder for weather-related sound injection based on climate
4. THE Region_Template_Mapper SHALL provide `atmosphereStyle` templates that include a `{culture}` placeholder for culture-specific music style injection
5. FOR ALL RegionType values, THE Region_Template_Mapper SHALL return a non-empty `signaturePool` array with at least 3 entries
6. WHEN the RegionType is "rural", "wilderness", or "polar", THE Region_Template_Mapper SHALL return an empty `dialogueTopics` array
7. WHEN the RegionType is "city_center", THE Region_Template_Mapper SHALL return a `signaturePool` containing urban-specific sounds such as street_musician, market_vendor, construction, tram_bell, and cafe_chatter
8. WHEN the RegionType is "ocean", THE Region_Template_Mapper SHALL return a `signaturePool` containing maritime-specific sounds such as ship_horn, buoy_bell, and fishing_boat

### Requirement 3: 地形到自然声音映射

**User Story:** As a developer, I want a mapping from each TerrainType to natural sound descriptions, so that the ambient layer prompt includes terrain-appropriate nature sounds.

#### Acceptance Criteria

1. THE Terrain_Sound_Mapper SHALL maintain a mapping for all 9 TerrainType values: mountain, plain, coast, desert, forest, tundra, jungle, river, lake
2. WHEN a TerrainType is provided, THE Terrain_Sound_Mapper SHALL return a non-empty string describing the characteristic natural sounds of that terrain
3. THE Terrain_Sound_Mapper SHALL return a description for "mountain" that includes wind, echo, and rock-related sounds
4. THE Terrain_Sound_Mapper SHALL return a description for "desert" that includes wind over sand and silence-related sounds
5. THE Terrain_Sound_Mapper SHALL return a description for "jungle" that includes dense insect, monkey, rain on canopy, and frog-related sounds
6. THE Terrain_Sound_Mapper SHALL return a description for "coast" that includes waves, seabirds, and wind-related sounds
7. FOR ALL TerrainType values, THE Terrain_Sound_Mapper SHALL return a string of at least 20 characters describing the natural soundscape

### Requirement 4: 时间关键帧定义

**User Story:** As a developer, I want 4 time keyframes with defined parameter values, so that the time interpolation system has anchor points for calculating continuous soundscape parameters.

#### Acceptance Criteria

1. THE Time_Interpolator SHALL define exactly 4 time keyframes corresponding to TimeSlot values: dawn, day, dusk, night
2. THE dawn keyframe SHALL define parameters: activity=0.3, traffic=0.4, nature=0.7, humanVoice=0.3, music=0.15
3. THE day keyframe SHALL define parameters: activity=0.9, traffic=0.8, nature=0.2, humanVoice=0.8, music=0.25
4. THE dusk keyframe SHALL define parameters: activity=0.5, traffic=0.5, nature=0.4, humanVoice=0.4, music=0.3
5. THE night keyframe SHALL define parameters: activity=0.1, traffic=0.15, nature=0.6, humanVoice=0.1, music=0.2
6. FOR ALL keyframes, each parameter value SHALL be a number in the range [0, 1]
7. THE keyframes SHALL be associated with start hours: dawn=5, day=9, dusk=17, night=20

### Requirement 5: 连续时间参数插值

**User Story:** As a developer, I want to interpolate soundscape parameters between time keyframes based on the current hour, so that the soundscape transitions smoothly across time of day.

#### Acceptance Criteria

1. WHEN a currentLocalHour value (0-23) is provided, THE Time_Interpolator SHALL identify the two adjacent keyframes that bracket the given hour
2. THE Time_Interpolator SHALL calculate a linear interpolation progress value between 0 and 1 based on the hour's position between the two keyframes
3. THE Time_Interpolator SHALL apply linear interpolation (lerp) to each of the 5 parameters (activity, traffic, nature, humanVoice, music) using the formula `result = source + (target - source) * progress`
4. WHEN the currentLocalHour falls exactly on a keyframe start hour, THE Time_Interpolator SHALL return that keyframe's parameters with progress=0
5. THE Time_Interpolator SHALL handle the midnight rollover correctly: hours 0-4 SHALL interpolate between the night keyframe (hour 20) and the dawn keyframe (hour 5), treating the interval as spanning midnight
6. THE Time_Interpolator SHALL return a TimeInterpolation object containing sourceSlot, targetSlot, progress, and the 5 interpolated parameter values in appliedParams
7. FOR ALL valid hour inputs (0-23), each interpolated parameter value SHALL remain in the range [0, 1]

### Requirement 6: 配方生成协调流程

**User Story:** As a developer, I want a single entry point that orchestrates the full recipe generation pipeline, so that callers receive a complete SoundscapeRecipe from just a LocationContext.

#### Acceptance Criteria

1. WHEN a LocationContext is provided, THE Recipe_Generator SHALL produce a complete SoundscapeRecipe with all fields populated
2. THE Recipe_Generator SHALL generate the recipe `id` using the format `{lat},{lng}-{timeSlot}` where coordinates are taken from LocationContext.coordinates rounded to 0.01 degree precision
3. THE Recipe_Generator SHALL set `generatedAt` to the current Unix timestamp at the time of generation
4. THE Recipe_Generator SHALL set `localTimeAtGeneration` to the current local time at the target location in "HH:MM" format, derived from LocationContext.currentLocalHour
5. THE Recipe_Generator SHALL query the Region_Template_Mapper using LocationContext.regionType to obtain the base soundscape template
6. THE Recipe_Generator SHALL query the Terrain_Sound_Mapper using LocationContext.terrain to obtain terrain-specific natural sound descriptions
7. THE Recipe_Generator SHALL query the Time_Interpolator using LocationContext.currentLocalHour to obtain interpolated time parameters
8. THE Recipe_Generator SHALL build all 5 layers by combining the region template, terrain sounds, time parameters, and LocationContext fields (language, culture, climate, urbanDensity, economicLevel)

### Requirement 7: Ambient 层构建

**User Story:** As a developer, I want the ambient layer to combine region template, terrain sounds, and time parameters into a rich environmental sound prompt, so that the generated SFX reflects the location's overall atmosphere.

#### Acceptance Criteria

1. THE Layer_Builder SHALL construct the ambient layer `prompt` by combining the region template's `ambientPrompt` with the terrain sound description from Terrain_Sound_Mapper
2. THE Layer_Builder SHALL replace the `{weather}` placeholder in the ambientPrompt with a climate-appropriate weather description derived from LocationContext.climate
3. THE Layer_Builder SHALL set the ambient layer `volume` by multiplying a base volume with the interpolated `activity` parameter from TimeInterpolation.appliedParams
4. THE Layer_Builder SHALL set the ambient layer `type` to "sfx" and `loop` to true
5. THE Layer_Builder SHALL ensure the ambient layer `volume` remains in the range [0, 1] after applying time interpolation adjustments
6. WHEN LocationContext.nearWater is not null, THE Layer_Builder SHALL append water-related sound descriptions to the ambient prompt

### Requirement 8: Signature 层构建

**User Story:** As a developer, I want the signature layer to select a characteristic sound from the region's signature pool, so that the soundscape includes location-specific iconic sounds.

#### Acceptance Criteria

1. THE Layer_Builder SHALL select a sound prompt from the region template's `signaturePool` for the signature layer
2. THE Layer_Builder SHALL set the signature layer `type` to "sfx" and `loop` to false
3. THE Layer_Builder SHALL set the signature layer `intervalSeconds` to a value between 30 and 90 seconds, adjusted by the interpolated `activity` parameter (higher activity results in shorter intervals)
4. THE Layer_Builder SHALL set the signature layer `volume` adjusted by the interpolated `activity` parameter from TimeInterpolation.appliedParams
5. THE Layer_Builder SHALL ensure the signature layer `volume` remains in the range [0, 1]
6. THE Layer_Builder SHALL ensure the signature layer `intervalSeconds` remains in the range [30, 90]

### Requirement 9: Dialogue 层构建

**User Story:** As a developer, I want the dialogue layer to generate culturally and linguistically appropriate TTS parameters, so that the soundscape includes realistic local speech.

#### Acceptance Criteria

1. THE Layer_Builder SHALL set the dialogue layer `model` to "eleven_v3"
2. THE Layer_Builder SHALL set the dialogue layer `language` to LocationContext.languageVariant (BCP 47 tag)
3. THE Layer_Builder SHALL select a dialogue topic from the region template's `dialogueTopics` array and generate a `text` field in the target language
4. THE Layer_Builder SHALL set the dialogue layer `volume` adjusted by the interpolated `humanVoice` parameter from TimeInterpolation.appliedParams
5. THE Layer_Builder SHALL set the dialogue layer `pan` to a value between -1 and 1 for spatial positioning
6. THE Layer_Builder SHALL set the dialogue layer `repeatIntervalSeconds` to a value between 30 and 120 seconds, adjusted by the interpolated `humanVoice` parameter (higher humanVoice results in shorter intervals)
7. THE Layer_Builder SHALL include appropriate `emotionTags` based on the time of day and region type
8. WHEN the region template's `dialogueTopics` array is empty (rural, wilderness, polar), THE Layer_Builder SHALL set the dialogue layer `volume` to 0 and `text` to an empty string

### Requirement 10: Secondary Dialogue 层构建

**User Story:** As a developer, I want a secondary dialogue layer using a faster TTS model, so that the soundscape has layered conversational depth with spatial separation.

#### Acceptance Criteria

1. THE Layer_Builder SHALL set the secondaryDialogue layer `model` to "eleven_flash_v2_5"
2. THE Layer_Builder SHALL set the secondaryDialogue layer `language` to LocationContext.languageVariant or a language from LocationContext.secondaryLanguages when available
3. THE Layer_Builder SHALL set the secondaryDialogue layer `volume` to a value lower than the primary dialogue layer volume
4. THE Layer_Builder SHALL set the secondaryDialogue layer `pan` to a value spatially separated from the primary dialogue layer (opposite side or different position)
5. THE Layer_Builder SHALL set the secondaryDialogue layer `repeatIntervalSeconds` to a value greater than the primary dialogue layer's repeatIntervalSeconds
6. WHEN the region template's `dialogueTopics` array is empty, THE Layer_Builder SHALL set the secondaryDialogue layer `volume` to 0 and `text` to an empty string

### Requirement 11: Atmosphere 层构建

**User Story:** As a developer, I want the atmosphere layer to generate a culture-influenced ambient music prompt, so that the soundscape has an appropriate musical backdrop.

#### Acceptance Criteria

1. THE Layer_Builder SHALL construct the atmosphere layer `prompt` by using the region template's `atmosphereStyle` with the `{culture}` placeholder replaced by LocationContext.cultureRegion
2. THE Layer_Builder SHALL set the atmosphere layer `type` to "music" and `loop` to true
3. THE Layer_Builder SHALL set the atmosphere layer `volume` adjusted by the interpolated `music` parameter from TimeInterpolation.appliedParams
4. THE Layer_Builder SHALL ensure the atmosphere layer `volume` remains in the range [0, 1]
5. THE Layer_Builder SHALL ensure the atmosphere `prompt` reflects the time of day (e.g., "morning feeling" for dawn, "night mood" for night)

### Requirement 12: 动态事件池映射

**User Story:** As a developer, I want each RegionType to have a pool of dynamic events, so that the soundscape can periodically inject random environmental sounds for realism.

#### Acceptance Criteria

1. THE Dynamic_Event_Scheduler SHALL maintain a mapping of all 8 RegionType values to arrays of DynamicEvent objects
2. WHEN a RegionType is provided, THE Dynamic_Event_Scheduler SHALL return a non-empty array of DynamicEvent objects
3. THE DynamicEvent interface SHALL include fields: `id` (string), `prompt` (string), `volumeRange` ([number, number], each 0-1), `panFromTo` ([number, number], each -1 to 1), `durationMs` (number), `minIntervalMs` (number), `maxIntervalMs` (number)
4. FOR ALL DynamicEvent objects, `minIntervalMs` SHALL be 30000 (30 seconds) and `maxIntervalMs` SHALL be 90000 (90 seconds)
5. WHEN the RegionType is "city_center", THE Dynamic_Event_Scheduler SHALL provide events including scooter_pass, car_horn, bicycle_bell, coin_drop, and street_musician
6. WHEN the RegionType is "ocean", THE Dynamic_Event_Scheduler SHALL provide events including ship_horn, seagull_cry, and wave_crash
7. WHEN the RegionType is "wilderness", THE Dynamic_Event_Scheduler SHALL provide events including animal_sound, wind_gust, and bird_call
8. FOR ALL DynamicEvent objects, `volumeRange[0]` SHALL be less than or equal to `volumeRange[1]`

### Requirement 13: 动态事件调度逻辑

**User Story:** As a developer, I want a scheduling mechanism that triggers dynamic events at random intervals, so that the soundscape feels alive and unpredictable.

#### Acceptance Criteria

1. THE Dynamic_Event_Scheduler SHALL select the next event trigger interval randomly between `minIntervalMs` (30000) and `maxIntervalMs` (90000) for each scheduling cycle
2. WHEN a dynamic event is triggered, THE Dynamic_Event_Scheduler SHALL randomly select one event from the RegionType's event pool
3. WHEN a dynamic event is triggered, THE Dynamic_Event_Scheduler SHALL assign a random volume within the event's `volumeRange`
4. THE Dynamic_Event_Scheduler SHALL provide a function to compute the next event's parameters (event selection, volume, timing) without side effects, enabling testability
5. THE Dynamic_Event_Scheduler SHALL support starting and stopping the scheduling cycle

### Requirement 14: 配方层参数范围约束

**User Story:** As a developer, I want all layer parameters to be validated within their defined ranges, so that the generated recipe produces valid inputs for the ElevenLabs API.

#### Acceptance Criteria

1. FOR ALL layers in a SoundscapeRecipe, the `volume` field SHALL be a number in the range [0, 1]
2. FOR ALL DialogueLayer objects, the `pan` field SHALL be a number in the range [-1, 1]
3. THE SignatureLayer `intervalSeconds` field SHALL be a number in the range [30, 90]
4. FOR ALL DialogueLayer objects, the `repeatIntervalSeconds` field SHALL be a number in the range [30, 120]
5. THE AmbientLayer `loop` field SHALL always be true
6. THE SignatureLayer `loop` field SHALL always be false
7. THE AtmosphereLayer `loop` field SHALL always be true
8. THE DialogueLayer `model` field SHALL be "eleven_v3" for the primary dialogue layer
9. THE DialogueLayer `model` field SHALL be "eleven_flash_v2_5" for the secondary dialogue layer

### Requirement 15: ElevenLabs API 端点映射

**User Story:** As a developer, I want each layer type to map to the correct ElevenLabs API endpoint, so that the downstream audio synthesis module knows which API to call for each layer.

#### Acceptance Criteria

1. THE Recipe_Generator SHALL map the ambient layer to the `/v1/sound-generation` endpoint
2. THE Recipe_Generator SHALL map the signature layer to the `/v1/sound-generation` endpoint
3. THE Recipe_Generator SHALL map the dialogue layer to the `/v1/text-to-speech` endpoint with model "eleven_v3"
4. THE Recipe_Generator SHALL map the secondaryDialogue layer to the `/v1/text-to-speech` endpoint with model "eleven_flash_v2_5"
5. THE Recipe_Generator SHALL map the atmosphere layer to the `/v1/music-generation` endpoint

### Requirement 16: 配方生成错误处理

**User Story:** As a developer, I want robust error handling in the recipe generation pipeline, so that partial failures produce degraded but valid recipes rather than crashes.

#### Acceptance Criteria

1. IF the Region_Template_Mapper receives an unrecognized RegionType, THEN THE Recipe_Generator SHALL fall back to the "rural" template and log the error with format `[PinDrop Error] RecipeGenerator: Unknown regionType {value}, falling back to rural`
2. IF the Terrain_Sound_Mapper receives an unrecognized TerrainType, THEN THE Recipe_Generator SHALL fall back to the "plain" terrain sound and log the error with format `[PinDrop Error] RecipeGenerator: Unknown terrainType {value}, falling back to plain`
3. IF the Time_Interpolator receives an hour value outside the range [0, 23], THEN THE Time_Interpolator SHALL normalize the hour to the [0, 23] range using modular arithmetic
4. THE Recipe_Generator SHALL clamp all volume values to the range [0, 1] before including them in the recipe
5. THE Recipe_Generator SHALL clamp all pan values to the range [-1, 1] before including them in the recipe
6. IF any individual layer construction fails, THEN THE Recipe_Generator SHALL set that layer to a silent default (volume=0, empty prompt) and continue building the remaining layers

### Requirement 17: SoundscapeRecipe 序列化与反序列化

**User Story:** As a developer, I want to serialize SoundscapeRecipe to JSON and parse it back reliably, so that cached recipes can be stored and retrieved from IndexedDB without data loss.

#### Acceptance Criteria

1. THE Recipe_Generator SHALL provide a function to serialize a SoundscapeRecipe object to a JSON string
2. THE Recipe_Generator SHALL provide a function to parse a JSON string back into a SoundscapeRecipe object
3. FOR ALL valid SoundscapeRecipe objects, serializing then parsing SHALL produce an object equivalent to the original (round-trip property)
4. WHEN parsing an invalid or incomplete JSON string, THE parser SHALL return null rather than throwing an unhandled exception
5. THE serializer SHALL preserve all numeric precision for volume, pan, intervalSeconds, and TimeInterpolation parameter values
6. THE parser SHALL validate that all required fields exist and have correct types before returning a SoundscapeRecipe object

### Requirement 18: 配方 ID 生成与缓存键一致性

**User Story:** As a developer, I want the recipe ID to be consistent with the cache key format, so that recipes can be reliably stored and retrieved from the soundscape cache.

#### Acceptance Criteria

1. THE Recipe_Generator SHALL generate the recipe `id` using the existing `generateCacheKey` function from `src/utils/timeSlot.ts`
2. THE recipe `id` SHALL follow the format `{lat},{lng}-{timeSlot}` where lat and lng are rounded to 2 decimal places
3. FOR ALL LocationContext inputs with the same coordinates (within 0.01 degree precision) and the same timeSlot, THE Recipe_Generator SHALL produce the same recipe `id`
4. THE recipe `id` format SHALL be consistent with the cache key format used by the soundscape cache in IndexedDB

