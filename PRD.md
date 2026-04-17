# 📌 PinDrop  — 产品需求文档 (PRD)

## 0. 产品标识

| 项目 | 值 |
|------|-----|
| **产品名** | PinDrop |
| **Slogan** | 点击地图，听见世界 |
| **Logo 概念** | 📌 大头针落地，激起声波涟漪 |

---

## 1. 产品概述

### 1.1 一句话描述

点击世界地图上任意一点，即刻听到那个地方此刻真实的声音——用耳朵旅行。

### 1.2 产品愿景

让每一个人闭上眼就能"抵达"世界任何角落。不是看旅行博主的视频，不是读维基百科，而是**直接用耳朵站在那里**——感受当地的语言、市声、天气和节律。

### 1.3 MVP 核心原则

| 原则 | 含义 |
|------|------|
| **零后端依赖** | 没有数据库、没有用户系统、没有服务器端状态。所有数据存用户浏览器本地 |
| **全地图可点击** | 不限于预置城市，地图上任意一点都能生成声景 |
| **真实时间映射** | 声景随目标地点的真实当地时间连续变化 |
| **用户自有 API Key** | ElevenLabs API Key 由用户自行提供，存 localStorage |
| **本地缓存优先** | 听过的声景缓存到 IndexedDB，减少 API 调用 |

---

## 2. 目标用户

| 用户画像 | 场景 |
|----------|------|
| 旅行爱好者 | 出发前"预听"目的地氛围 |
| 远程工作者 | 工作时用异国声景做白噪音 |
| 语言学习者 | 沉浸在当地语言环境中磨耳朵 |
| 写作者/创作者 | 为小说/剧本寻找场景灵感 |
| 失眠/焦虑人群 | 用远方安静角落的声景助眠 |
| 好奇心驱动者 | "漠河凌晨 3 点是什么声音？" |

---

## 3. 功能范围

### 3.1 MVP 包含 ✅

| 功能 | 描述 |
|------|------|
| 全地图任意点击 | 点击地图任意坐标，生成该位置声景 |
| 声景实时生成 | 根据坐标 → 反向地理编码 → AI 编排 → 5 层声音合成 |
| 时间连续变化 | 4 档基础配方 + 连续参数插值，映射真实当地时间 |
| 悬停预览 | 鼠标悬停时播放 2 秒声音碎片 |
| 声景信息面板 | 显示地名、当地时间、场景描述 |
| 本地收藏 | 收藏声景到 localStorage 列表 |
| 本地缓存 | IndexedDB 缓存已生成的声景音频和配方 |
| 手动重新生成 | 用户可强制重新生成声景（覆盖缓存）|
| API Key 本地管理 | 设置页面输入/修改 ElevenLabs API Key |
| 音量分层控制 | 5 层声音各自音量滑块 |

### 3.2 MVP 不包含 ❌

| 功能 | 原因 |
|------|------|
| 语音对话（和当地人聊天） | V2 功能，MVP 聚焦听觉体验 |
| 分享/社区 | V2 功能 |
| 用户账号系统 | 无后端，无需账号 |
| 城市内多街区切换 | 点击精度决定，不做额外街区 UI |
| 天气 API 集成 | 天气信息作为声景参数的硬编码映射，不调外部天气 API |
| 移动端适配 | 仅网页端，桌面优先 |

---

## 4. 详细功能规格

### 4.1 地图模块

#### 4.1.1 地图渲染

- **地图库：** Leaflet.js (v1.9+)
- **瓦片源：** OpenStreetMap 免费瓦片
- **初始视图：** 世界级别，中心 `[20, 0]`，缩放 `zoom: 3`
- **交互：** 拖拽平移、滚轮缩放、双击放大、点击选点

#### 4.1.2 点击行为

```
用户点击地图任意位置
    ↓
获取点击坐标 (lat, lng)
    ↓
显示加载指示器（声景脉冲动画）
    ↓
调用 Nominatim 反向地理编码
    ↓ 超时 3s
    ↓
┌─ 成功 ─────────────────────────────────┐
│ 返回地理信息：                          │
│   - 城市/城镇/村落名                    │
│   - 国家                               │
│   - 行政区划                           │
│   - 语言/时区（从国家推断）             │
│                                        │
│ → 传入声景编排引擎                      │
└────────────────────────────────────────┘

┌─ 失败（海洋/极地/无数据）─────────────┐
│ 根据坐标推断：                          │
│   - 海洋 → 生成海浪声景                 │
│   - 极地 → 生成极地风声景               │
│   - 其他 → 用最近陆地区域推断生成       │
└────────────────────────────────────────┘
```

#### 4.1.3 悬停预览

- 鼠标悬停在地图上 **停留 > 500ms** 时，触发预览
- 预览内容：快速反向编码 → 播放 2 秒该区域环境音片段（仅 ambient 层，低音量）
- 鼠标移开 → 预览音淡出 300ms
- **节流：** 同一坐标 5° 范围内不重复触发预览

#### 4.1.4 地图标记

- 已缓存声景的位置显示**脉动光圈标记**（CSS 动画）
- 光圈颜色表示时间档：🔵 夜晚 / 🟢 白天 / 🟡 黄昏 / 🟠 早晨
- 点击已标记位置 → 直接播放缓存声景（除非用户点"重新生成"）

---

### 4.2 声景生成引擎

#### 4.2.1 管道流程

```
输入：坐标 (lat, lng)
    ↓
Step 1: 地理反向编码 (Nominatim)
    → 原始地理信息
    ↓
Step 2: 语境推断引擎
    → 结构化位置语境（见 4.2.2）
    ↓
Step 3: 声景配方生成
    → JSON 配方（5 层声音参数）
    ↓
Step 4: ElevenLabs 并行合成
    → TTS + SFX + Music → 音频流
    ↓
Step 5: 混音 + 播放
    → Web Audio API 5 层混音输出
    ↓
Step 6: 缓存
    → 音频 + 配方写入 IndexedDB
```

#### 4.2.2 语境推断引擎

从反向编码结果推断声景所需的结构化语境：

```typescript
interface LocationContext {
  // === 基础地理 ===
  cityName: string;          // "乌兰巴托"
  countryName: string;       // "蒙古"
  regionType: RegionType;    // 城市 | 小镇 | 乡村 | 荒野 | 海洋 | 极地
  coordinates: [number, number];

  // === 语言 ===
  primaryLanguage: string;   // "mn" (蒙古语)
  languageVariant: string;   // "mn-MN"
  secondaryLanguages: string[]; // 可能听到的其他语言

  // === 时间 ===
  timezone: string;          // "Asia/Ulaanbaatar"
  currentLocalHour: number;  // 22 (实时计算)
  timeSlot: TimeSlot;        // dawn | day | dusk | night

  // === 文化推断 ===
  cultureRegion: string;     // "central_asia"
  dominantReligion: string;  // "buddhism" → 影响宗教声音元素
  urbanDensity: number;      // 0-1 → 影响人声密度

  // === 地理特征 ===
  terrain: TerrainType;      // 山地 | 平原 | 海岸 | 沙漠 | 森林 | ...
  nearWater: WaterType | null; // 海 | 河 | 湖 | null
  climate: ClimateType;      // 热带 | 温带 | 寒带 | 干旱

  // === 经济水平推断 ===
  economicLevel: number;     // 0-1 → 影响交通声、建筑声、市集声
}

type RegionType = "city_center" | "city_suburb" | "town" | "village" | "rural" | "wilderness" | "ocean" | "polar";
type TimeSlot = "dawn" | "day" | "dusk" | "night";
type TerrainType = "mountain" | "plain" | "coast" | "desert" | "forest" | "tundra" | "jungle" | "river" | "lake";
type WaterType = "sea" | "river" | "lake" | "canal";
type ClimateType = "tropical" | "temperate" | "subarctic" | "arid" | "mediterranean";
```

**推断规则示例：**

| 输入信号 | 推断逻辑 | 影响声景 |
|----------|----------|----------|
| Nominatim 返回 `city: "巴黎"` | `regionType: city_center`, `urbanDensity: 0.9` | 高密度人声、交通声、咖啡馆声 |
| 人口 < 10,000 的小镇 | `regionType: town`, `urbanDensity: 0.3` | 稀疏人声、自然环境音更强 |
| `country: "沙特阿拉伯"` | `dominantReligion: islam`, `climate: arid` | 可能听到唤拜声、风沙声 |
| 坐标在海洋上（无 Nominatim 结果） | `regionType: ocean` | 海浪、海鸥、远处船笛 |
| 坐标在北极圈内 | `regionType: polar`, `climate: subarctic` | 极地风、冰裂声、极静 |

#### 4.2.3 声景配方生成

从 `LocationContext` 生成 5 层声音配方：

```typescript
interface SoundscapeRecipe {
  id: string;                // "48.86,2.36-dawn"
  location: LocationContext;
  generatedAt: number;       // Unix timestamp
  localTimeAtGeneration: string; // "07:20"

  layers: {
    ambient: AmbientLayer;
    signature: SignatureLayer;
    dialogue: DialogueLayer;
    secondaryDialogue: DialogueLayer;
    atmosphere: AtmosphereLayer;
  };

  timeInterpolation: TimeInterpolation;
}

interface AmbientLayer {
  type: "sfx";
  prompt: string;           // SFX 生成 prompt
  volume: number;           // 0-1
  loop: boolean;            // true
}

interface SignatureLayer {
  type: "sfx";
  prompt: string;           // 城市标志性声音 prompt
  volume: number;
  loop: boolean;
  intervalSeconds: number;  // 每隔多少秒触发一次
}

interface DialogueLayer {
  type: "tts";
  model: string;            // "eleven_v3"
  voiceId: string;          // ElevenLabs voice ID 或 voice 配置
  language: string;         // "fr-FR"
  text: string;             // TTS 文本内容
  emotionTags: string[];    // ["warm", "cheerful"]
  volume: number;
  pan: number;              // -1(左) ~ 1(右)，空间定位
  repeatIntervalSeconds: number; // 每隔多少秒说一次
}

interface AtmosphereLayer {
  type: "music";
  prompt: string;           // Music 生成 prompt
  volume: number;
  loop: boolean;
}

interface TimeInterpolation {
  sourceSlot: TimeSlot;     // 前一个关键帧
  targetSlot: TimeSlot;     // 后一个关键帧
  progress: number;         // 0-1 插值进度
  appliedParams: {          // 插值后的实际参数
    activity: number;
    traffic: number;
    nature: number;
    humanVoice: number;
    music: number;
  };
}
```

#### 4.2.4 ElevenLabs API 调用策略

**并行调用：**

```
                ┌→ POST /v1/text-to-speech (dialogue)
                │   model: eleven_v3
                │   voice_id: 根据语言/口音选择
                │
请求 ───────────┼→ POST /v1/sound-generation (ambient)
                │   prompt: 环境音描述
                │
                ├→ POST /v1/sound-generation (signature)
                │   prompt: 标志性声音描述
                │
                ├→ POST /v1/text-to-speech (secondaryDialogue)
                │   model: eleven_flash_v2_5
                │
                └→ POST /v1/music-generation (atmosphere)
                    prompt: 氛围描述
```

**API Key 传递：** 前端请求携带 Header `x-elevenlabs-api-key`，API 代理路由转发为 `xi-api-key`

**调用时序：**

```
T=0ms     发起所有并行请求
T=300ms   第一段音频流开始返回（Flash v2.5 优先用于对话层）
T=800ms   开始播放已有音频层（渐进式加载）
T=2000ms  所有层音频就绪，完整声景播放中
```

---

### 4.3 时间系统

#### 4.3.1 时间档定义

| 时间档 | 小时范围 | 标签 | 声景特征 |
|--------|----------|------|----------|
| **dawn** | 05:00 - 08:59 | 🌅 早晨 | 鸟鸣渐起、市集开张、通勤声浪上升、晨祷 |
| **day** | 09:00 - 16:59 | ☀️ 白天 | 交通高峰、人声鼎沸、施工声、儿童嬉戏 |
| **dusk** | 17:00 - 19:59 | 🌇 黄昏 | 交通渐弱、归家脚步、晚祷/晚钟、酒吧预热 |
| **night** | 20:00 - 04:59 | 🌙 夜晚 | 稀疏人声、虫鸣/蛙鸣、远处车声、酒吧/夜店声 |

#### 4.3.2 连续参数插值

4 档基础配方提供关键帧，中间小时通过插值平滑过渡：

```typescript
const TIME_KEYFRAMES: Record<<TimeSlot, TimeParams> = {
  dawn:  { activity: 0.3, traffic: 0.4, nature: 0.7, humanVoice: 0.3, music: 0.15 },
  day:   { activity: 0.9, traffic: 0.8, nature: 0.2, humanVoice: 0.8, music: 0.25 },
  dusk:  { activity: 0.5, traffic: 0.5, nature: 0.4, humanVoice: 0.4, music: 0.3  },
  night: { activity: 0.1, traffic: 0.15, nature: 0.6, humanVoice: 0.1, music: 0.2 },
};

function interpolateTimeParams(hour: number): TimeInterpolation {
  const slots: Array<{ start: number; key: TimeSlot }> = [
    { start: 5,  key: "dawn"  },
    { start: 9,  key: "day"   },
    { start: 17, key: "dusk"  },
    { start: 20, key: "night" },
  ];

  // 找到当前处于哪两个 keyframe 之间
  // 计算插值比例 t
  // lerp 两个 keyframe 的参数

  // 例: hour=18.5 → dusk(17) 和 night(20) 之间
  // progress = (18.5 - 17) / (20 - 17) = 0.5
  // traffic = lerp(0.5, 0.15, 0.5) = 0.325
}
```

**插值影响：**
- `activity` → 环境音总量
- `traffic` → 交通相关 SFX 音量
- `nature` → 自然声（鸟/虫/风）音量
- `humanVoice` → 人声对话层音量 + 触发频率
- `music` → 氛围音乐音量

---

### 4.4 声景播放器

#### 4.4.1 五层混音架构

```
                 ╔═══════════════════════════╗
                 ║     Web Audio API         ║
                 ║     AudioContext          ║
                 ╠═══════════════════════════╣
                 ║                           ║
   Layer 5 ──────╣  🎵 Atmosphere (Music)   ║──→ GainNode ─┐
                 ║     volume: 0.0 - 1.0    ║              │
                 ║                           ║              │
   Layer 4 ──────╣  🗣️ Dialogue (TTS)      ║──→ GainNode ─┤
                 ║     + PanNode (空间定位)  ║              │
                 ║                           ║              │
   Layer 3 ──────╣  🗣️ Sec. Dialogue       ║──→ GainNode ─┤
                 ║     + PanNode             ║              │
                 ║                           ║              │
   Layer 2 ──────╣  🔊 Signature SFX        ║──→ GainNode ─┤
                 ║     间隔触发              ║              │
                 ║                           ║              │
   Layer 1 ──────╣  🌍 Ambient SFX          ║──→ GainNode ─┤
                 ║     持续循环              ║              │
                 ║                           ║              │
                 ╠═══════════════════════════╣              │
                 ║     Master GainNode       ║◄─────────────┘
                 ║     → Audio Destination   ║────→ 🎧
                 ╚═══════════════════════════╝
```

#### 4.4.2 播放行为

| 行为 | 描述 |
|------|------|
| **淡入** | 点击后声景 1.5s 淡入（ambient 先入，对话后入） |
| **淡出** | 切换新声景时旧声景 0.8s 淡出 |
| **循环** | ambient 层无限循环；dialogue 按间隔重复 |
| **动态事件** | 每 30-90s 随机插入一个动态音效（车经过/狗叫/飞机） |
| **音量控制** | 5 个独立滑块 + 1 个总音量滑块 |

#### 4.4.3 动态事件系统

```typescript
interface DynamicEvent {
  id: string;
  prompt: string;           // "A scooter passes quickly from left to right"
  volumeRange: [number, number]; // [0.3, 0.7]
  panFromTo: [number, number];   // [-1, 1] 移动方向
  durationMs: number;       // 2000
  minIntervalMs: number;    // 30000
  maxIntervalMs: number;    // 90000
}

const DYNAMIC_EVENTS: Record<<RegionType, DynamicEvent[]> = {
  city_center: [
    { id: "scooter", prompt: "A scooter passes quickly from left to right", ... },
    { id: "horn",    prompt: "A car horn honks once in the distance", ... },
    { id: "coins",   prompt: "Someone drops coins on the ground", ... },
    { id: "bell",    prompt: "A bicycle bell rings twice", ... },
    { id: "musician",prompt: "A street musician starts playing nearby", ... },
  ],
  ocean: [
    { id: "ship",    prompt: "A distant ship horn sounds", ... },
    { id: "gull",    prompt: "Seagulls cry overhead", ... },
    { id: "wave",    prompt: "A wave crashes harder than usual", ... },
  ],
  wilderness: [
    { id: "wolf",    prompt: "A wolf howls in the far distance", ... },
    { id: "gust",    prompt: "Wind gusts through trees", ... },
    { id: "bird",    prompt: "A bird takes flight nearby", ... },
  ],
  // ... 每种区域类型
};
```

---

### 4.5 数据存储

#### 4.5.1 存储架构

```
┌─────────────────────────────────────────┐
│              localStorage               │
│                                         │
│  pindrop_api_key: string                │
│  pindrop_favorites: string[]            │
│  pindrop_preferences: {                 │
│    masterVolume: number,                │
│    layerVolumes: Record<<Layer, number>,  │
│    mapStyle: "light" | "dark",          │
│    autoPlay: boolean                    │
│  }                                      │
│                                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│              IndexedDB                   │
│           Database: pindrop             │
│                                         │
│  Object Store: soundscape_cache         │
│  ┌──────────────────────────────────┐   │
│  │ key: 声景 ID (string)            │   │
│  │ location: LocationContext        │   │
│  │ recipe: SoundscapeRecipe         │   │
│  │ audioBlobs: {                    │   │
│  │   ambient: Blob,                │   │
│  │   signature: Blob,              │   │
│  │   dialogue: Blob,                │   │
│  │   secondaryDialogue: Blob,       │   │
│  │   atmosphere: Blob               │   │
│  │ }                                │   │
│  │ generatedAt: number (timestamp)  │   │
│  │ playCount: number               │   │
│  │ lastPlayedAt: number            │   │
│  └──────────────────────────────────┘   │
│                                         │
│  Object Store: geocode_cache           │
│  ┌──────────────────────────────────┐   │
│  │ key: "lat,lng" (精度 0.01°)     │   │
│  │ result: NominatimResponse       │   │
│  │ cachedAt: number                │   │
│  └──────────────────────────────────┘   │
│                                         │
│  Object Store: location_history        │
│  ┌──────────────────────────────────┐   │
│  │ key: auto-increment             │   │
│  │ coordinates: [lat, lng]         │   │
│  │ visitedAt: number               │   │
│  │ soundscapeId: string            │   │
│  └──────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

#### 4.5.2 缓存键生成规则

```typescript
function generateSoundscapeId(lat: number, lng: number, localHour: number): string {
  const latRound = Math.round(lat * 100) / 100;
  const lngRound = Math.round(lng * 100) / 100;
  const timeSlot = getTimeSlot(localHour);
  return `${latRound},${lngRound}-${timeSlot}`;
}
// 例: "48.86,2.36-dawn" → 巴黎早晨
```

同一坐标同一时间档的声景共享缓存。用户点击"重新生成"会覆盖该缓存。

---

### 4.6 用户界面规格

#### 4.6.1 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─ 顶栏 ───────────────────────────────────────────────┐  │
│  │  📌 PinDrop                    ⚙️ 设置        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────┐ ┌─ 侧面板 ─────────┐│
│  │                                 │ │                    ││
│  │                                 │ │ 📍 当前位置        ││
│  │         地图区域                 │ │ 巴黎·玛黑区        ││
│  │      (Leaflet Canvas)           │ │                    ││
│  │                                 │ │ 🕐 当地时间        ││
│  │    ●  ●     ●                  │ │ 07:32 CET         ││
│  │       ●        ●               │ │                    ││
│  │  ●       ●                     │ │ 🌤️ 场景           ││
│  │          ●    ●                │ │ 早市 · 微雨        ││
│  │                                 │ │                    ││
│  │                                 │ │ ── 音量控制 ──     ││
│  │                                 │ │ 🌍 环境  ═══●═══  ││
│  │                                 │ │ 🔊 特色  ══●════  ││
│  │                                 │ │ 🗣️ 对话  ═══●═══  ││
│  │                                 │ │ 🗣️ 副对  ═●═════  ││
│  │                                 │ │ 🎵 氛围  ═●═════  ││
│  │                                 │ │ ─────────────      ││
│  │                                 │ │ 🔊 总音量 ═══●═══ ││
│  │                                 │ │                    ││
│  │                                 │ │ [🔄 重新生成]      ││
│  │                                 │ │ [🔖 收藏]          ││
│  │                                 │ │                    ││
│  └─────────────────────────────────┘ └────────────────────┘│
│                                                             │
│  ┌─ 底部收藏栏 ──────────────────────────────────────────┐│
│  │ 🔖 巴黎·晨 | 🏙️ 东京·夜 | 🕌 开罗·昏 | 🌊 威尼斯·午 ││
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 4.6.2 状态与视图

| 状态 | 地图 | 侧面板 | 音频 |
|------|------|--------|------|
| **初始** | 世界视图，无标记 | 提示："点击地图任意位置，针落有声" | 静默 |
| **加载中** | 点击位置显示脉冲动画 | 加载指示 + "定位中..." | 静默 |
| **播放中** | 该位置显示脉动光圈 | 完整信息面板 + 音量控制 | 5 层声景播放 |
| **收藏列表** | 不变 | 切换到收藏列表视图 | 继续播放当前 |
| **设置** | 不变 | 切换到设置视图 | 继续播放当前 |

#### 4.6.3 设置页面

```
┌─ 设置 ──────────────────────────────┐
│                                      │
│  🔑 ElevenLabs API Key              │
│  ┌──────────────────────────────┐   │
│  │ xi-••••••••••••••••••••     │   │
│  └──────────────────────────────┘   │
│  [验证 Key]                         │
│  ✅ Key 有效 · 剩余额度: $12.45     │
│                                      │
│  ── 地图 ──                          │
│  主题: 🌑 暗色 | ☀️ 亮色            │
│                                      │
│  ── 播放 ──                          │
│  自动播放: [✓] 点击后立即播放        │
│  淡入时长: [1.5s ▼]                 │
│  动态事件: [✓] 随机插入环境音效      │
│                                      │
│  ── 缓存 ──                          │
│  已缓存声景: 47 个 · 128MB          │
│  [清除所有缓存]                      │
│                                      │
│  ── 关于 ──                          │
│  PinDrop v1.0 · 针落                │
│  ElevenLabs · Leaflet · Next.js     │
│                                      │
└──────────────────────────────────────┘
```

---

## 5. 技术架构

### 5.1 整体架构

```
┌──────────────────────────────────────────────────────┐
│                    Next.js 16 App                     │
│                   (Deployed on Railway)               │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │              前端 (Client-Side Only)          │    │
│  │                                              │    │
│  │  ┌─────────┐  ┌──────────┐  ┌────────────┐  │    │
│  │  │  地图    │  │ 声景引擎 │  │  播放器     │  │    │
│  │  │ Leaflet │  │  编排器   │  │ Web Audio  │  │    │
│  │  └────┬────┘  └────┬─────┘  └─────┬──────┘  │    │
│  │       │            │              │          │    │
│  │       ▼            ▼              │          │    │
│  │  ┌─────────────────────────┐      │          │    │
│  │  │   声景生成协调器          │      │          │    │
│  │  │   (Orchestrator)        │──────┘          │    │
│  │  └──────────┬──────────────┘                 │    │
│  │             │                                │    │
│  │    ┌────────┴────────┐                       │    │
│  │    ▼                 ▼                       │    │
│  │  ┌──────────┐  ┌───────────┐                 │    │
│  │  │ Nominatim│  │ElevenLabs │                 │    │
│  │  │ 反向编码  │  │   API     │                 │    │
│  │  │ (免费)   │  │(用户 Key) │                 │    │
│  │  └──────────┘  └─────┬─────┘                 │    │
│  │                      │                       │    │
│  │               ┌──────┴──────┐                │    │
│  │               ▼             ▼                │    │
│  │         ┌──────────┐  ┌───────────┐          │    │
│  │         │IndexedDB │  │localStorage│          │    │
│  │         │ 声景缓存  │  │ 设置/收藏  │          │    │
│  │         └──────────┘  └───────────┘          │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │       Next.js API Routes (仅代理)            │    │
│  │       /api/elevenlabs/[...path]               │    │
│  │       (解决 CORS，不存储任何数据)             │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 5.2 API 代理路由

```typescript
// app/api/elevenlabs/[...path]/route.ts

export async function POST(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const apiKey = request.headers.get('x-elevenlabs-api-key');
  if (!apiKey) {
    return Response.json({ error: 'API key required' }, { status: 401 });
  }

  const elevenLabsPath = params.path.join('/');
  const body = await request.arrayBuffer();

  const response = await fetch(
    `https://api.elevenlabs.io/v1/${elevenLabsPath}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
      },
      body,
    }
  );

  return new Response(response.body, {
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
    },
  });
}
```

**关键原则：** 代理路由 **不存储、不记录、不缓存** 任何用户数据或 API Key。仅做请求转发。

### 5.3 技术栈详情

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Next.js | 16 | App Router + API Routes |
| 地图 | Leaflet | 1.9+ | 地图渲染与交互 |
| 瓦片 | OpenStreetMap | - | 免费地图瓦片 |
| 音频 | Web Audio API | - | 5 层混音、音量控制、空间定位 |
| 反向编码 | Nominatim | - | 坐标 → 地理信息（免费） |
| AI 声音 | ElevenLabs API | v1 | TTS / SFX / Music |
| 缓存 | IndexedDB (idb) | - | 声景音频与配方缓存 |
| 设置 | localStorage | - | API Key、收藏、偏好 |
| 样式 | Tailwind CSS | 4 | UI 样式 |
| 部署 | Railway | - | 托管 Next.js 应用 |
| 语言 | TypeScript | 5+ | 全栈类型安全 |

---

## 6. 语境推断规则表

### 6.1 国家 → 语言映射

```typescript
const COUNTRY_LANG_MAP: Record<string, { lang: string; variant: string }> = {
  "France":         { lang: "fr", variant: "fr-FR" },
  "Japan":          { lang: "ja", variant: "ja-JP" },
  "Brazil":         { lang: "pt", variant: "pt-BR" },
  "Mexico":         { lang: "es", variant: "es-MX" },
  "Egypt":          { lang: "ar", variant: "ar-EG" },
  "India":          { lang: "hi", variant: "hi-IN" },
  "Turkey":         { lang: "tr", variant: "tr-TR" },
  "Italy":          { lang: "it", variant: "it-IT" },
  "Germany":        { lang: "de", variant: "de-DE" },
  "South Korea":    { lang: "ko", variant: "ko-KR" },
  "Vietnam":        { lang: "vi", variant: "vi-VN" },
  "Thailand":       { lang: "th", variant: "th-TH" },
  "Russia":         { lang: "ru", variant: "ru-RU" },
  "Nigeria":        { lang: "en", variant: "en-NG" },
  "Morocco":        { lang: "ar", variant: "ar-MA" },
  "China":          { lang: "zh", variant: "zh-CN" },
  "Argentina":      { lang: "es", variant: "es-AR" },
  "United Kingdom": { lang: "en", variant: "en-GB" },
  "Australia":      { lang: "en", variant: "en-AU" },
  "Iran":           { lang: "fa", variant: "fa-IR" },
  "Indonesia":      { lang: "id", variant: "id-ID" },
  "Ethiopia":       { lang: "am", variant: "am-ET" },
  "Peru":           { lang: "es", variant: "es-PE" },
  "Colombia":       { lang: "es", variant: "es-CO" },
  "Cuba":           { lang: "es", variant: "es-CU" },
  // ... 100+ 国家
  // 兜底：未匹配国家 → "en", "en-US"
};
```

### 6.2 区域类型 → 声景模板

```typescript
const REGION_TEMPLATES: Record<<RegionType, SoundscapeTemplate> = {
  city_center: {
    ambientPrompt: "Urban ambient: steady traffic hum, distant siren, pedestrian noise, {weather} sound",
    signaturePool: ["street_musician", "market_vendor", "construction", "tram_bell", "cafe_chatter"],
    dialogueTopics: ["greeting", "ordering_food", "asking_directions", "small_talk", "phone_call"],
    atmosphereStyle: "lo-fi urban ambient, minimal, {culture} influence",
    dynamicEventPool: ["scooter_pass", "car_horn", "bicycle_bell", "coin_drop", "street_musician"],
  },
  city_suburb: {
    ambientPrompt: "Quiet residential street ambient, occasional car, dog barking, {weather} sound",
    signaturePool: ["lawn_mower", "ice_cream_truck", "school_bell", "neighbor_greeting"],
    dialogueTopics: ["neighbor_chat", "dog_walking", "coming_home"],
    atmosphereStyle: "gentle ambient, suburban peaceful, {culture} influence",
    dynamicEventPool: ["car_pass", "dog_bark", "door_close", "bird_chirp"],
  },
  town: {
    ambientPrompt: "Small town ambient, sparse traffic, birds, wind, {weather} sound",
    signaturePool: ["church_bell", "market_bell", "local_announcement", "train_whistle"],
    dialogueTopics: ["greeting", "local_news", "weather_comment"],
    atmosphereStyle: "minimal ambient, small town feel, {culture} influence",
    dynamicEventPool: ["car_pass", "dog_bark", "wind_gust", "tractor_distant"],
  },
  village: {
    ambientPrompt: "Rural village ambient, very sparse human activity, nature dominant, {weather} sound",
    signaturePool: ["rooster", "temple_bell", "well_bucket", "children_playing"],
    dialogueTopics: ["greeting", "farming_talk", "seasonal_comment"],
    atmosphereStyle: "very sparse ambient, rural, {culture} influence",
    dynamicEventPool: ["rooster_crow", "animal_sound", "wind_gust", "footstep_gravel"],
  },
  rural: {
    ambientPrompt: "Open rural landscape, wind, insects, distant animals, {weather} sound",
    signaturePool: ["tractor_distant", "cow_bell", "sheep_bleating", "river_trickle"],
    dialogueTopics: [],
    atmosphereStyle: "nature soundscape, very minimal, spacious",
    dynamicEventPool: ["bird_call", "animal_sound", "wind_gust", "distant_vehicle"],
  },
  wilderness: {
    ambientPrompt: "Remote wilderness, wind, birds, natural silence, {weather} sound",
    signaturePool: ["eagle_cry", "wolf_howl", "stream", "crackling_twigs"],
    dialogueTopics: [],
    atmosphereStyle: "wilderness soundscape, very sparse, ancient feel",
    dynamicEventPool: ["animal_sound", "wind_gust", "bird_call", "rock_fall"],
  },
  ocean: {
    ambientPrompt: "Ocean waves rolling steadily, wind over water, distant ship engine",
    signaturePool: ["ship_horn", "buoy_bell", "fishing_boat", "ferry_arrival"],
    dialogueTopics: ["fisherman_chat", "harbor_master"],
    atmosphereStyle: "ocean soundscape, peaceful, vast",
    dynamicEventPool: ["ship_horn", "seagull_cry", "wave_crash", "dolphin_click"],
  },
  polar: {
    ambientPrompt: "Arctic wind, ice cracking, absolute quiet between gusts",
    signaturePool: ["ice_crack", "aurora_hum", "polar_bird", "whale_blow"],
    dialogueTopics: [],
    atmosphereStyle: "polar soundscape, extreme minimal, crystalline",
    dynamicEventPool: ["ice_crack", "wind_gust", "bird_call", "whale_blow"],
  },
};
```

### 6.3 地形 → 自然声音映射

```typescript
const TERRAIN_NATURE_MAP: Record<TerrainType, string> = {
  mountain: "wind through mountain pass, distant eagle cry, rock crunching, echo",
  plain:    "grasshoppers, gentle wind through grass, distant cowbell, open sky silence",
  coast:    "waves, seabirds, wind, shell crunching underfoot, salt air hiss",
  desert:   "wind over sand, absolute silence with occasional sand rustle, heat shimmer hum",
  forest:   "birdsong variety, leaves rustling, woodpecker, stream trickle, twig snap",
  tundra:   "arctic wind, ice cracking, absolute quiet, wolf howl distant, snow crunch",
  jungle:   "dense insect hum, monkey calls, rain on canopy, frog chorus, bird screech",
  river:    "flowing water, riverside birds, reed rustling, fish splash, dragonfly buzz",
  lake:     "loons, gentle lapping, dragonfly buzz, stillness, occasional splash",
};
```

---

## 7. 用户故事

### 7.1 核心流程

```
US-01: 首次体验
  当 [用户] 首次访问 PinDrop 时,
  系统 [应] 显示世界地图和提示"点击地图任意位置，针落有声"，
  同时提示用户在设置中输入 ElevenLabs API Key,
  以便 [用户] 知道如何开始使用。

US-02: 点击探索
  当 [用户] 点击地图上任意位置时,
  系统 [应] 在 3 秒内开始播放该位置的声景,
  以便 [用户] 立即沉浸在声音体验中。

US-03: 时间真实感
  当 [用户] 点击一个处于当地时间 22:00 的城市时,
  系统 [应] 生成夜晚声景（稀疏人声、虫鸣、远处车声），
  以便 [用户] 体验该地点此刻的真实氛围。

US-04: 连续时间过渡
  当 [用户] 收藏的声景被重新播放，且目标地点的当地时间已从白天变为黄昏时,
  系统 [应] 使用黄昏时间参数生成声景,
  以便 [用户] 感受到时间的流逝。

US-05: 悬停预览
  当 [用户] 在地图上悬停超过 500ms 时,
  系统 [应] 播放 2 秒的环境音预览,
  以便 [用户] 在点击前有初步感受。

US-06: 声景信息
  当 [声景] 正在播放时,
  系统 [应] 在侧面板显示地名、当地时间、时间档、场景描述,
  以便 [用户] 理解正在听到的内容。

US-07: 分层音量控制
  当 [用户] 拖动某层音量滑块时,
  系统 [应] 实时调整该层声音的音量,
  以便 [用户] 自定义声景层次。

US-08: 收藏声景
  当 [用户] 点击收藏按钮时,
  系统 [应] 将声景 ID 添加到 localStorage 的收藏列表,
  以便 [用户] 可以从底部收藏栏快速重新访问。

US-09: 缓存复用
  当 [用户] 再次点击已缓存声景的位置（同一坐标精度、同一时间档）时,
  系统 [应] 直接从 IndexedDB 播放缓存的音频,
  以便 [用户] 立即听到声景且不消耗 API 额度。

US-10: 手动重新生成
  当 [用户] 点击"重新生成"按钮时,
  系统 [应] 忽略缓存，重新调用 ElevenLabs API 生成声景，
  并覆盖 IndexedDB 中的缓存,
  以便 [用户] 获得新鲜的声景变体。

US-11: API Key 管理
  当 [用户] 在设置中输入 ElevenLabs API Key 时,
  系统 [应] 验证 Key 有效性并保存到 localStorage,
  以便 [用户] 后续使用无需重复输入。

US-12: 海洋/荒野声景
  当 [用户] 点击海洋中的位置时,
  系统 [应] 生成海洋声景（海浪、海鸥、远处船笛），
  以便 [用户] 即使点击无人区域也能获得声音体验。
```

### 7.2 边界情况

```
US-E01: 无 API Key
  当 [用户] 未设置 API Key 时点击地图,
  系统 [应] 弹出设置面板提示输入 Key,
  以便 [用户] 知道需要 API Key 才能使用。

US-E02: API Key 无效
  当 [用户] 的 API Key 无效或额度用尽时,
  系统 [应] 显示明确的错误信息"API Key 无效或额度不足"，
  以便 [用户] 知道需要更新 Key。

US-E03: 反向编码超时
  当 [Nominatim] 请求超过 3 秒未返回时,
  系统 [应] 根据坐标推断基础信息（国家、时区）并生成声景，
  以便 [用户] 不被技术故障阻塞体验。

US-E04: 音频生成部分失败
  当 [某层] ElevenLabs API 调用失败时,
  系统 [应] 播放其余成功的层，失败层静默，
  并在侧面板标记该层状态为"生成失败"，
  以便 [用户] 仍能获得部分声景体验。

US-E05: IndexedDB 存储满
  当 [浏览器] 存储空间不足时,
  系统 [应] 删除最久未播放的缓存声景，释放空间，
  以便 [用户] 不被存储问题阻塞。

US-E06: 网络断开
  当 [用户] 网络断开时,
  系统 [应] 仍可播放已缓存的声景，
  并在点击新位置时提示"网络不可用，仅可播放已缓存声景"，
  以便 [用户] 知道功能受限原因。
```

---

## 8. 非功能性需求

| 维度 | 要求 |
|------|------|
| **首屏加载** | < 2s（地图 + 壳应用） |
| **声景启动** | 点击后 < 3s 开始播放第一层音频 |
| **完整声景就绪** | 点击后 < 5s 全部 5 层播放 |
| **缓存播放** | < 0.5s 立即播放 |
| **并发 API 调用** | 5 层并行请求，非串行 |
| **浏览器兼容** | Chrome 120+, Firefox 120+, Safari 17+, Edge 120+ |
| **API Key 安全** | Key 不出现在 URL、服务端日志、第三方请求（除 ElevenLabs） |
| **数据隐私** | 零服务端存储，所有用户数据仅存浏览器本地 |
| **可访问性** | 键盘可操作地图、ARIA 标签、高对比度模式 |

---

## 9. 开发计划

### Phase 1: 地图基础 (Day 1-2)

```
☐ T01: Next.js 16 项目初始化 + Tailwind CSS 4 + TypeScript
☐ T02: Leaflet 集成 + OpenStreetMap 瓦片渲染
☐ T03: 全地图点击交互 → 获取坐标
☐ T04: 悬停预览逻辑 (500ms 延迟 + 节流)
☐ T05: 坐标脉动光圈标记 + 缓存状态标记
☐ T06: Nominatim 反向地理编码封装 (含 3s 超时降级)
☐ T07: 地理编码结果缓存到 IndexedDB
```

### Phase 2: 声景引擎 (Day 3-6)

```
☐ T08: LocationContext 推断引擎
        - 国家→语言映射表 (100+ 国家)
        - 区域类型推断 (city_center/suburb/town/village/rural/wilderness/ocean/polar)
        - 时区计算 (Intl.DateTimeFormat)
        - 地形/气候推断
        - 文化/宗教推断
☐ T09: 声景配方生成器
        - 4 档时间关键帧定义
        - 连续参数插值算法
        - 5 层配方 JSON 生成
        - 区域类型→模板映射
☐ T10: ElevenLabs API 封装
        - TTS 调用 (eleven_v3 + eleven_flash_v2_5)
        - Sound Effects 调用
        - Music 调用
        - 并行调用协调器 (Promise.allSettled)
        - 流式音频接收
☐ T11: Next.js API 代理路由
        - /api/elevenlabs/[...path]/route.ts
        - 流式响应转发
        - CORS Header 处理
        - 无日志、无存储
☐ T12: 动态事件系统
        - 区域类型→事件池映射
        - 随机间隔调度器 (30-90s)
        - 事件触发 + 淡入淡出
```

### Phase 3: 播放器 (Day 7-8)

```
☐ T13: Web Audio API 5 层混音器
        - AudioContext 初始化
        - 5 个 GainNode (层音量)
        - 2 个 PanNode (对话空间定位)
        - Master GainNode (总音量)
        - 循环播放 + 间隔触发
        - 淡入淡出控制
☐ T14: 音量控制 UI (5 层独立滑块 + 总音量)
☐ T15: IndexedDB 缓存系统
        - Database: pindrop
        - Object Store: soundscape_cache / geocode_cache / location_history
        - 写入缓存 (audioBlobs + recipe)
        - 读取缓存 (按 ID 查询)
        - LRU 清理策略
☐ T16: 手动重新生成功能 (覆盖缓存)
```

### Phase 4: UI 完善 (Day 9-10)

```
☐ T17: 侧面板组件
        - 空状态提示 ("点击地图任意位置，针落有声")
        - 加载状态 (脉冲动画)
        - 播放状态 (地名/时间/描述/音量控制)
☐ T18: 收藏功能
        - 收藏按钮 → localStorage
        - 底部收藏栏展示
        - 点击收藏 → 快速跳转播放
☐ T19: 设置页面
        - API Key 输入/验证/余额查询
        - 地图主题 (暗色/亮色)
        - 播放设置 (自动播放/淡入时长/动态事件开关)
        - 缓存管理 (查看用量/清除缓存)
☐ T20: 加载状态 + 错误处理 + Toast 通知系统
☐ T21: 暗色/亮色地图主题切换
```

### Phase 5: 部署 (Day 11)

```
☐ T22: Railway 部署配置
☐ T23: 环境变量设置 (无敏感数据)
☐ T24: 性能验证 + 首屏优化
☐ T25: 域名配置 (如有)
```

---

## 10. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| **ElevenLabs CORS 限制** | 前端无法直调 API | ✅ 已规划 API 代理路由 |
| **Nominatim 速率限制** | 1 req/s，大量点击可能触发 | 前端节流 + 缓存反向编码结果 + 3s 超时降级 |
| **ElevenLabs API 成本** | 5 层并行调用成本较高 | 缓存策略 + 用户自有 Key + 提醒用户关注额度 |
| **IndexedDB 存储上限** | 浏览器通常 50% 磁盘，但可能不足 | LRU 清理 + 设置页显示用量 + 手动清除 |
| **音频生成延迟** | 全部 5 层就绪可能 > 3s | 渐进式播放：ambient 先入，其余陆续加入 |
| **海洋/极地反向编码无结果** | 无法获取地理信息 | 坐标推断降级：海洋→海浪模板，极地→极地模板 |
| **ElevenLabs Music API 延迟** | music-generation 可能较慢 | atmosphere 层最后加入；降级为 SFX ambient music |
| **Next.js API Route 体积限制** | Railway 免费层有响应大小限制 | 音频流式转发，不缓存完整响应体 |

---

## 11. 成功指标

| 指标 | 目标 | 度量方式 |
|------|------|----------|
| **首次声景播放时间** | < 3s | 前端性能计时 |
| **缓存命中率** | > 60%（重复访问） | IndexedDB 查询统计 |
| **平均会话时长** | > 8 分钟 | 本地 analytics（可选） |
| **平均每次会话探索地点** | > 3 个 | 点击计数 |
| **API 调用效率** | 缓存后 < 2 次调用/会话 | 代理路由计数（可选） |

---

## 12. 附录

### A. ElevenLabs API 端点使用

| 层 | 端点 | 模型 | 说明 |
|----|------|------|------|
| dialogue | `POST /v1/text-to-speech` | `eleven_v3` | 70+ 语言，情感标签，高质量 |
| secondaryDialogue | `POST /v1/text-to-speech` | `eleven_flash_v2_5` | 低延迟，辅助对话 |
| ambient | `POST /v1/sound-generation` | - | 环境音效 |
| signature | `POST /v1/sound-generation` | - | 标志性声音 |
| atmosphere | `POST /v1/music-generation` | - | 氛围音乐 |

### B. Nominatim 使用规范

- **速率限制：** 1 请求/秒（需加 User-Agent Header）
- **URL：** `https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}&zoom=10&accept-language=en`
- **降级：** 超时 3s 后使用坐标推断
- **缓存：** 反向编码结果缓存到 IndexedDB（坐标精度 0.01°）

### C. 声景配方示例：巴黎·玛黑区·早晨

```json
{
  "id": "48.86,2.36-dawn",
  "location": {
    "cityName": "Paris",
    "countryName": "France",
    "regionType": "city_center",
    "coordinates": [48.86, 2.36],
    "primaryLanguage": "fr",
    "languageVariant": "fr-FR",
    "secondaryLanguages": ["en", "ar"],
    "timezone": "Europe/Paris",
    "currentLocalHour": 7,
    "timeSlot": "dawn",
    "cultureRegion": "western_europe",
    "dominantReligion": "christianity",
    "urbanDensity": 0.9,
    "terrain": "plain",
    "nearWater": "river",
    "climate": "temperate",
    "economicLevel": 0.8
  },
  "generatedAt": 1713340800000,
  "localTimeAtGeneration": "07:20",
  "layers": {
    "ambient": {
      "type": "sfx",
      "prompt": "Early morning Paris street ambient, light rain on cobblestone, occasional distant scooter, very few pedestrians, river Seine flowing in background",
      "volume": 0.55,
      "loop": true
    },
    "signature": {
      "type": "sfx",
      "prompt": "French bakery door bell 'ding', paper bag rustling, espresso machine hissing and grinding",
      "volume": 0.65,
      "loop": false,
      "intervalSeconds": 45
    },
    "dialogue": {
      "type": "tts",
      "model": "eleven_v3",
      "voiceId": "french_female_30s_warm",
      "language": "fr-FR",
      "text": "Bonjour! Je vous mets les croissants dans un sac? [warm laughter]",
      "emotionTags": ["warm", "cheerful"],
      "volume": 0.75,
      "pan": 0.3,
      "repeatIntervalSeconds": 60
    },
    "secondaryDialogue": {
      "type": "tts",
      "model": "eleven_flash_v2_5",
      "voiceId": "french_male_60s_gruff",
      "language": "fr-FR",
      "text": "[muttering] Encore cette pluie... le parapluie est où?",
      "emotionTags": ["grumpy"],
      "volume": 0.3,
      "pan": -0.6,
      "repeatIntervalSeconds": 90
    },
    "atmosphere": {
      "type": "music",
      "prompt": "Minimal melancholic accordion figure, very quiet, French morning feeling, slow tempo, sparse notes",
      "volume": 0.15,
      "loop": true
    }
  },
  "timeInterpolation": {
    "sourceSlot": "dawn",
    "targetSlot": "day",
    "progress": 0.33,
    "appliedParams": {
      "activity": 0.43,
      "traffic": 0.53,
      "nature": 0.53,
      "humanVoice": 0.47,
      "music": 0.18
    }
  }
}
```

---

**📌 PinDrop · 针落 — 点击地图，听见世界**