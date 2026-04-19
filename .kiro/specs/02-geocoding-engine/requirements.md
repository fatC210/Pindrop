# Requirements Document: Geocoding Engine

## Introduction

Geocoding Engine 是 PinDrop 声景生成管道的第二阶段核心模块，负责将用户点击的地图坐标转换为结构化的 `LocationContext` 对象。该模块封装 Nominatim 反向地理编码 API（含 1 req/s 速率限制、User-Agent Header、3s 超时降级），实现海洋/极地/荒野等无数据区域的坐标推断降级，并通过一系列推断规则（国家→语言、区域类型、时区、地形、气候、文化、经济水平）生成完整的 `LocationContext`，为下游声景配方生成器提供所有必要的语境信息。

## Glossary

- **Geocoding_Engine**: 反向地理编码与语境推断的顶层协调模块，接收坐标输入并输出完整的 LocationContext
- **Nominatim_Client**: 封装 Nominatim 反向地理编码 API 调用的客户端组件，负责 HTTP 请求、超时控制和响应解析
- **Rate_Limiter**: 速率限制组件，确保 Nominatim API 请求不超过 1 req/s
- **Geocode_Cache**: IndexedDB 中存储反向编码结果的缓存层，使用 0.01° 坐标精度作为缓存键
- **Coordinate_Inferrer**: 当 Nominatim 无结果或超时时，根据坐标推断地理信息的降级组件
- **LocationContext**: 结构化的位置语境对象，包含基础地理、语言、时间、文化、地形、经济等全部推断字段
- **Language_Mapper**: 国家名称到主要语言及语言变体的映射组件，覆盖 100+ 国家
- **Region_Classifier**: 根据 Nominatim 返回的 address 字段推断 RegionType 的分类组件
- **Timezone_Calculator**: 使用 Intl.DateTimeFormat 从国家/坐标计算时区和当地时间的组件
- **Terrain_Inferrer**: 根据地理位置和区域特征推断地形类型的组件
- **Climate_Inferrer**: 根据纬度和地理区域推断气候类型的组件
- **Culture_Inferrer**: 根据国家和区域推断文化圈、主要宗教和城市密度的组件
- **Economy_Inferrer**: 根据国家推断经济水平（0-1 数值）的组件
- **RegionType**: 区域类型枚举，取值为 "city_center" | "city_suburb" | "town" | "village" | "rural" | "wilderness" | "ocean" | "polar"
- **TerrainType**: 地形类型枚举，取值为 "mountain" | "plain" | "coast" | "desert" | "forest" | "tundra" | "jungle" | "river" | "lake"
- **ClimateType**: 气候类型枚举，取值为 "tropical" | "temperate" | "subarctic" | "arid" | "mediterranean"
- **WaterType**: 水体类型枚举，取值为 "sea" | "river" | "lake" | "canal"
- **TimeSlot**: 时间档枚举，取值为 "dawn" | "day" | "dusk" | "night"

## Requirements

### Requirement 1: Nominatim 反向地理编码封装

**User Story:** As a developer, I want to call the Nominatim reverse geocoding API with proper rate limiting and timeout handling, so that the system can convert coordinates into geographic information reliably.

#### Acceptance Criteria

1. WHEN coordinates are provided, THE Nominatim_Client SHALL send a GET request to `https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}&zoom=10&accept-language=en`
2. THE Nominatim_Client SHALL include a User-Agent header with value `PinDrop/1.0 (https://github.com/pindrop/pindrop)` in every request
3. THE Nominatim_Client SHALL set a request timeout of 3000 milliseconds using AbortController
4. WHEN the request exceeds 3000 milliseconds, THE Nominatim_Client SHALL abort the request and return null
5. WHEN the Nominatim API returns HTTP status code outside 200-299 range, THE Nominatim_Client SHALL log the error with format `[PinDrop Error] Nominatim API error: {status}` and return null
6. WHEN the Nominatim API returns a valid JSON response, THE Nominatim_Client SHALL extract the `address` object containing city, town, village, country, state, and county fields
7. THE Nominatim_Client SHALL use HTTPS protocol for all requests

### Requirement 2: Nominatim 速率限制

**User Story:** As a developer, I want to enforce a 1 request per second rate limit for Nominatim API calls, so that the application complies with OpenStreetMap usage policy.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL enforce a minimum interval of 1000 milliseconds between consecutive Nominatim API requests
2. WHEN multiple geocoding requests arrive within 1000 milliseconds, THE Rate_Limiter SHALL queue subsequent requests and process them sequentially with 1000 milliseconds spacing
3. WHEN a request is queued, THE Rate_Limiter SHALL preserve the request order (FIFO)
4. THE Rate_Limiter SHALL maintain a 10-second cooldown period for the same coordinate at 0.01 degree precision
5. WHEN a request targets coordinates within 0.01 degrees of a recently requested coordinate within the cooldown period, THE Rate_Limiter SHALL skip the API call and use the cached result

### Requirement 3: 反向编码结果缓存

**User Story:** As a developer, I want to cache Nominatim results in IndexedDB, so that repeated requests for nearby coordinates avoid unnecessary API calls.

#### Acceptance Criteria

1. WHEN the Nominatim_Client returns a successful result, THE Geocode_Cache SHALL store the result in the IndexedDB `geocode_cache` object store
2. THE Geocode_Cache SHALL use a cache key formatted as `{roundedLat},{roundedLng}` where coordinates are rounded to 0.01 degree precision (2 decimal places)
3. THE Geocode_Cache SHALL store a `cachedAt` timestamp alongside each cached result
4. WHEN coordinates are provided for geocoding, THE Geocoding_Engine SHALL check the Geocode_Cache before calling the Nominatim_Client
5. WHEN a cached result exists for coordinates within 0.01 degree precision, THE Geocoding_Engine SHALL return the cached result without calling the Nominatim_Client
6. IF the Geocode_Cache write operation fails, THEN THE Geocoding_Engine SHALL log the error with format `[PinDrop Error] Failed to cache geocode: {error}` and continue without caching
7. IF IndexedDB is unavailable, THEN THE Geocoding_Engine SHALL proceed with direct API calls without caching

### Requirement 4: 坐标推断降级 — 海洋检测

**User Story:** As a user, I want to click on ocean areas and still get a soundscape, so that the entire map is explorable without dead zones.

#### Acceptance Criteria

1. WHEN the Nominatim_Client returns null (no result) for given coordinates, THE Coordinate_Inferrer SHALL evaluate whether the coordinates are over ocean
2. WHEN coordinates have no Nominatim result and are not in a polar region, THE Coordinate_Inferrer SHALL classify the location as `regionType: "ocean"`
3. WHEN a location is classified as ocean, THE Coordinate_Inferrer SHALL set `cityName` to "Ocean" and `countryName` to "International Waters"
4. WHEN a location is classified as ocean, THE Coordinate_Inferrer SHALL set `terrain` to "coast", `nearWater` to "sea", and `climate` to "temperate"
5. WHEN a location is classified as ocean, THE Coordinate_Inferrer SHALL set `primaryLanguage` to "en" and `languageVariant` to "en-US"
6. WHEN a location is classified as ocean, THE Coordinate_Inferrer SHALL set `urbanDensity` to 0 and `economicLevel` to 0

### Requirement 5: 坐标推断降级 — 极地检测

**User Story:** As a user, I want to click on polar regions and hear polar soundscapes, so that extreme latitudes produce appropriate audio experiences.

#### Acceptance Criteria

1. WHEN the absolute value of latitude exceeds 66.5 degrees, THE Coordinate_Inferrer SHALL classify the location as `regionType: "polar"`
2. WHEN latitude is greater than 66.5 degrees, THE Coordinate_Inferrer SHALL set `cityName` to "Arctic"
3. WHEN latitude is less than -66.5 degrees, THE Coordinate_Inferrer SHALL set `cityName` to "Antarctic"
4. WHEN a location is classified as polar, THE Coordinate_Inferrer SHALL set `countryName` to "Polar Region"
5. WHEN a location is classified as polar, THE Coordinate_Inferrer SHALL set `climate` to "subarctic" and `terrain` to "tundra"
6. WHEN a location is classified as polar, THE Coordinate_Inferrer SHALL set `urbanDensity` to 0 and `economicLevel` to 0
7. THE Coordinate_Inferrer SHALL evaluate polar classification before ocean classification, so that polar ocean areas are classified as polar rather than ocean

### Requirement 6: 坐标推断降级 — 荒野/无数据区域

**User Story:** As a developer, I want a fallback for coordinates that are neither ocean nor polar but have no Nominatim data, so that the system always produces a valid LocationContext.

#### Acceptance Criteria

1. WHEN the Nominatim_Client returns null and the coordinates are neither polar nor ocean, THE Coordinate_Inferrer SHALL classify the location as `regionType: "wilderness"`
2. WHEN a location is classified as wilderness, THE Coordinate_Inferrer SHALL set `cityName` to a formatted string `Location at {lat}°, {lng}°` using 2 decimal places
3. WHEN a location is classified as wilderness, THE Coordinate_Inferrer SHALL set `countryName` to "Unknown"
4. WHEN a location is classified as wilderness, THE Coordinate_Inferrer SHALL infer `climate` from latitude: tropical for |lat| < 23.5, arid for 23.5 ≤ |lat| < 35, temperate for 35 ≤ |lat| < 55, subarctic for |lat| ≥ 55
5. WHEN a location is classified as wilderness, THE Coordinate_Inferrer SHALL set `primaryLanguage` to "en" and `languageVariant` to "en-US"

### Requirement 7: LocationContext 完整类型定义

**User Story:** As a developer, I want a comprehensive TypeScript type definition for LocationContext, so that all downstream modules have a consistent and complete data contract.

#### Acceptance Criteria

1. THE LocationContext interface SHALL include basic geography fields: `cityName` (string), `countryName` (string), `regionType` (RegionType), `coordinates` ([number, number])
2. THE LocationContext interface SHALL include language fields: `primaryLanguage` (string), `languageVariant` (string), `secondaryLanguages` (string[])
3. THE LocationContext interface SHALL include time fields: `timezone` (string), `currentLocalHour` (number, 0-23), `timeSlot` (TimeSlot)
4. THE LocationContext interface SHALL include culture inference fields: `cultureRegion` (string), `dominantReligion` (string), `urbanDensity` (number, 0-1)
5. THE LocationContext interface SHALL include geographic feature fields: `terrain` (TerrainType), `nearWater` (WaterType | null), `climate` (ClimateType)
6. THE LocationContext interface SHALL include economic inference field: `economicLevel` (number, 0-1)
7. THE RegionType type SHALL be defined as `"city_center" | "city_suburb" | "town" | "village" | "rural" | "wilderness" | "ocean" | "polar"`
8. THE TerrainType type SHALL be defined as `"mountain" | "plain" | "coast" | "desert" | "forest" | "tundra" | "jungle" | "river" | "lake"`
9. THE ClimateType type SHALL be defined as `"tropical" | "temperate" | "subarctic" | "arid" | "mediterranean"`
10. THE WaterType type SHALL be defined as `"sea" | "river" | "lake" | "canal"`
11. THE TimeSlot type SHALL be defined as `"dawn" | "day" | "dusk" | "night"`

### Requirement 8: 国家到语言映射推断

**User Story:** As a developer, I want to infer the primary language from the country name, so that the dialogue layers use the correct language for TTS generation.

#### Acceptance Criteria

1. THE Language_Mapper SHALL maintain a mapping of at least 100 countries to their primary language code and language variant
2. WHEN a country name is provided, THE Language_Mapper SHALL return the corresponding `primaryLanguage` (ISO 639-1 code) and `languageVariant` (BCP 47 tag)
3. WHEN a country name is not found in the mapping, THE Language_Mapper SHALL return `primaryLanguage: "en"` and `languageVariant: "en-US"` as fallback
4. THE Language_Mapper SHALL provide `secondaryLanguages` as an array of additional language codes commonly heard in the country
5. FOR ALL countries in the mapping, THE Language_Mapper SHALL use valid ISO 639-1 language codes for `primaryLanguage`
6. FOR ALL countries in the mapping, THE Language_Mapper SHALL use valid BCP 47 language tags for `languageVariant`
7. WHEN the country is multilingual (e.g., Switzerland, Belgium, Canada), THE Language_Mapper SHALL select the most widely spoken language as `primaryLanguage` and include others in `secondaryLanguages`

### Requirement 9: 区域类型推断

**User Story:** As a developer, I want to classify locations into region types based on Nominatim address data, so that the soundscape recipe generator can select appropriate sound templates.

#### Acceptance Criteria

1. WHEN the Nominatim address contains a `city` field, THE Region_Classifier SHALL classify the location as `regionType: "city_center"` or `"city_suburb"` based on address detail
2. WHEN the Nominatim address contains a `town` field but no `city` field, THE Region_Classifier SHALL classify the location as `regionType: "town"`
3. WHEN the Nominatim address contains a `village` field but no `city` or `town` field, THE Region_Classifier SHALL classify the location as `regionType: "village"`
4. WHEN the Nominatim address contains only `county` or `state` level data without city, town, or village, THE Region_Classifier SHALL classify the location as `regionType: "rural"`
5. THE Region_Classifier SHALL set `urbanDensity` to 0.9 for city_center, 0.6 for city_suburb, 0.3 for town, 0.15 for village, and 0.05 for rural
6. FOR ALL valid Nominatim responses, THE Region_Classifier SHALL produce exactly one RegionType value from the defined enumeration

### Requirement 10: 时区与当地时间计算

**User Story:** As a developer, I want to calculate the local time at any coordinate, so that the soundscape reflects the correct time of day at the target location.

#### Acceptance Criteria

1. WHEN a country name is available, THE Timezone_Calculator SHALL use `Intl.DateTimeFormat` with the resolved timezone to determine the local time
2. WHEN a country name is not available, THE Timezone_Calculator SHALL estimate the timezone offset from longitude using the formula `offset = Math.round(lng / 15)`
3. THE Timezone_Calculator SHALL compute `currentLocalHour` as an integer from 0 to 23 representing the current hour at the target location
4. THE Timezone_Calculator SHALL compute `timeSlot` based on `currentLocalHour`: dawn for hours 5-8, day for hours 9-16, dusk for hours 17-19, night for hours 20-4
5. THE Timezone_Calculator SHALL return a `timezone` string in IANA format (e.g., "Asia/Tokyo") when available, or `UTC±N` format as fallback
6. THE Timezone_Calculator SHALL handle midnight rollover correctly when computing timeSlot for hours 0-4 (classified as night)

### Requirement 11: 地形推断

**User Story:** As a developer, I want to infer terrain type from geographic data, so that the soundscape includes appropriate natural sounds.

#### Acceptance Criteria

1. WHEN the Nominatim address indicates a coastal location or the coordinates are within 50km of a coastline, THE Terrain_Inferrer SHALL set `terrain` to "coast"
2. WHEN the coordinates are at latitude |lat| ≥ 60 and not coastal, THE Terrain_Inferrer SHALL set `terrain` to "tundra"
3. WHEN the coordinates are in known desert regions (e.g., Sahara, Arabian, Gobi latitude/longitude ranges), THE Terrain_Inferrer SHALL set `terrain` to "desert"
4. WHEN the coordinates are in tropical regions (|lat| < 15) with high precipitation likelihood, THE Terrain_Inferrer SHALL set `terrain` to "jungle"
5. WHEN no specific terrain indicator is found, THE Terrain_Inferrer SHALL default `terrain` to "plain"
6. THE Terrain_Inferrer SHALL set `nearWater` to the appropriate WaterType when water features are detected, or null when no water features are present

### Requirement 12: 气候推断

**User Story:** As a developer, I want to infer climate type from coordinates, so that weather-related sounds match the location's climate zone.

#### Acceptance Criteria

1. WHEN the absolute latitude is less than 23.5 degrees, THE Climate_Inferrer SHALL set `climate` to "tropical"
2. WHEN the absolute latitude is between 23.5 and 35 degrees and the location is in a known arid region, THE Climate_Inferrer SHALL set `climate` to "arid"
3. WHEN the coordinates are in Mediterranean climate zones (specific latitude/longitude ranges around Mediterranean Sea, California, Chile, South Africa, Australia), THE Climate_Inferrer SHALL set `climate` to "mediterranean"
4. WHEN the absolute latitude is 55 degrees or greater, THE Climate_Inferrer SHALL set `climate` to "subarctic"
5. WHEN no specific climate indicator matches, THE Climate_Inferrer SHALL default `climate` to "temperate"

### Requirement 13: 文化与宗教推断

**User Story:** As a developer, I want to infer cultural region and dominant religion from the country, so that the soundscape can include culturally appropriate audio elements.

#### Acceptance Criteria

1. THE Culture_Inferrer SHALL maintain a mapping of countries to `cultureRegion` values (e.g., "western_europe", "east_asia", "south_asia", "middle_east", "sub_saharan_africa", "latin_america", "central_asia", "southeast_asia", "oceania", "north_america")
2. THE Culture_Inferrer SHALL maintain a mapping of countries to `dominantReligion` values (e.g., "christianity", "islam", "buddhism", "hinduism", "shinto", "judaism", "folk_religion", "none")
3. WHEN a country name is provided, THE Culture_Inferrer SHALL return the corresponding `cultureRegion` and `dominantReligion`
4. WHEN a country name is not found in the mapping, THE Culture_Inferrer SHALL return `cultureRegion: "unknown"` and `dominantReligion: "none"`
5. THE Culture_Inferrer SHALL use the `dominantReligion` value to influence potential religious sound elements (e.g., call to prayer for islam, temple bells for buddhism, church bells for christianity)

### Requirement 14: 经济水平推断

**User Story:** As a developer, I want to infer the economic level of a location, so that the soundscape reflects appropriate traffic, construction, and market sounds.

#### Acceptance Criteria

1. THE Economy_Inferrer SHALL maintain a mapping of countries to `economicLevel` values as numbers between 0 and 1
2. WHEN a country name is provided, THE Economy_Inferrer SHALL return the corresponding `economicLevel` value
3. WHEN a country name is not found in the mapping, THE Economy_Inferrer SHALL return `economicLevel: 0.5` as fallback
4. THE Economy_Inferrer SHALL use `economicLevel` to influence traffic sound density, construction sound probability, and market activity level in the downstream recipe generator
5. FOR ALL countries in the mapping, THE Economy_Inferrer SHALL assign `economicLevel` values that reflect relative GDP per capita rankings (higher GDP per capita corresponds to higher economicLevel)

### Requirement 15: Geocoding Engine 协调流程

**User Story:** As a developer, I want a single entry point that orchestrates the full geocoding pipeline, so that callers receive a complete LocationContext from just coordinates.

#### Acceptance Criteria

1. WHEN coordinates (lat, lng) are provided, THE Geocoding_Engine SHALL execute the following steps in order: check cache → call Nominatim (if cache miss) → infer from coordinates (if Nominatim fails) → build LocationContext
2. WHEN the Geocode_Cache contains a result for the given coordinates, THE Geocoding_Engine SHALL skip the Nominatim API call
3. WHEN the Nominatim_Client returns a valid response, THE Geocoding_Engine SHALL pass the response to Region_Classifier, Language_Mapper, Timezone_Calculator, Terrain_Inferrer, Climate_Inferrer, Culture_Inferrer, and Economy_Inferrer to build a complete LocationContext
4. WHEN the Nominatim_Client returns null (timeout, error, or no result), THE Geocoding_Engine SHALL use the Coordinate_Inferrer to build a LocationContext from coordinates alone
5. THE Geocoding_Engine SHALL cache the Nominatim response (when successful) and the inferred result (when falling back) in the Geocode_Cache
6. THE Geocoding_Engine SHALL return a complete LocationContext object with all fields populated for every valid coordinate input
7. IF any individual inference step fails, THEN THE Geocoding_Engine SHALL use the default value for that field and continue building the LocationContext

### Requirement 16: 错误处理与日志

**User Story:** As a developer, I want consistent error handling and logging across the geocoding pipeline, so that issues can be diagnosed without exposing sensitive data.

#### Acceptance Criteria

1. THE Geocoding_Engine SHALL log all errors using the format `[PinDrop Error] {component}: {message}`
2. THE Geocoding_Engine SHALL log Nominatim timeout events using the format `[PinDrop] Nominatim request timed out after 3s`
3. IF the Nominatim_Client encounters a network error, THEN THE Geocoding_Engine SHALL log the error and proceed with coordinate-based inference without blocking the user
4. THE Geocoding_Engine SHALL validate input coordinates: latitude within [-90, 90] and longitude within [-180, 180]
5. WHEN invalid coordinates are provided, THE Geocoding_Engine SHALL return an error result without making any API calls
6. THE Geocoding_Engine SHALL not include raw API responses or user data in log messages

### Requirement 17: LocationContext 序列化与反序列化

**User Story:** As a developer, I want to serialize LocationContext to JSON and parse it back reliably, so that cached contexts can be stored and retrieved from IndexedDB without data loss.

#### Acceptance Criteria

1. THE Geocoding_Engine SHALL provide a function to serialize a LocationContext object to a JSON string
2. THE Geocoding_Engine SHALL provide a function to parse a JSON string back into a LocationContext object
3. FOR ALL valid LocationContext objects, serializing then parsing SHALL produce an object equivalent to the original (round-trip property)
4. WHEN parsing an invalid or incomplete JSON string, THE parser SHALL return null or a descriptive error rather than throwing an unhandled exception
5. THE serializer SHALL preserve all numeric precision for coordinates, urbanDensity, and economicLevel fields
