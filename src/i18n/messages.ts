import type { LayerType } from '@/utils/audio/types';
import type { ClimateType, RegionType } from '@/types/locationContext';
import type { TimeSlot } from '@/utils/timeSlot';
import type { AppLocale } from './types';

export interface AppMessages {
  metadata: {
    title: string;
    description: string;
  };
  common: {
    appName: string;
    loading: string;
    cancel: string;
    confirm: string;
  };
  home: {
    title: string;
    settings: string;
    openSettingsAria: string;
    currentLocation: string;
    locationMetaEmpty: string;
    apiKeyRequiredTitle: string;
    apiKeyRequiredCopy: string;
    audioUnavailableTitle: string;
    audioUnavailableCopy: string;
    generatingTitle: string;
    somethingWentWrong: string;
    layerMix: string;
    master: string;
    favorites: string;
    emptyFavorites: string;
    actions: {
      play: string;
      resume: string;
      pause: string;
      stop: string;
      delete: string;
      regenerate: string;
      saveFavorite: string;
      removeFavorite: string;
    };
    playbackStatus: {
      playing: string;
      paused: string;
      ready: string;
    };
    volumeAria: (label: string) => string;
    favoriteLabel: (cityName: string, timeSlotLabel: string) => string;
    locationMeta: (localTime: string, timezone: string) => string;
  };
  map: {
    toolbarLabel: string;
    zoomIn: string;
    zoomOut: string;
    interactiveMapAria: string;
  };
  settings: {
    panelTitle: string;
    closeAria: string;
    storageUnavailable: string;
    openedAnnouncement: string;
    closedAnnouncement: string;
    cacheStatsUnavailable: string;
    cacheClearedSuccess: string;
    cacheClearedFailure: string;
    apiKeyVerificationFailure: string;
    sections: {
      language: {
        header: string;
        label: string;
        options: Record<AppLocale, string>;
      };
      apiKey: {
        header: string;
        inputAria: string;
        maskedAria: string;
        empty: string;
        edit: string;
        cancel: string;
        verify: string;
        show: string;
        hide: string;
        verifying: string;
        valid: string;
      };
      llm: {
        header: string;
        description: string;
        baseUrlLabel: string;
        baseUrlPlaceholder: string;
        modelLabel: string;
        modelPlaceholder: string;
        apiKeyLabel: string;
        apiKeyPlaceholder: string;
        show: string;
        hide: string;
        verifying: string;
        valid: string;
        invalid: string;
        connectionFailed: string;
        inactiveHint: string;
        activeHint: string;
      };
      map: {
        header: string;
        theme: string;
        light: string;
        dark: string;
      };
      playback: {
        header: string;
        autoPlay: string;
        autoPlayDescription: string;
        fadeInDuration: string;
        dynamicEvents: string;
        dynamicEventsDescription: string;
      };
      cache: {
        header: string;
        loading: string;
        unavailable: string;
        clearAll: string;
        clearing: string;
        confirmTitle: string;
        confirmMessage: string;
        formatStats: (count: number, totalSizeMB: number) => string;
      };
      about: {
        versionLabel: (version: string) => string;
        attribution: string;
      };
    };
  };
  session: {
    idleLocation: string;
    idleScene: string;
    apiKeyRequiredError: string;
    apiKeyRequiredStatus: string;
    llmRequiredError: string;
    generating: string;
    noAudioLayers: string;
    generationFailed: string;
    readyToPlay: string;
    cacheMissing: string;
    cacheMissingStatus: string;
    playbackFailed: string;
    locationLabel: (cityName: string, countryName: string) => string;
    sceneDescription: (timeSlot: string, region: string, climate: string) => string;
  };
  apiKeyErrors: {
    INVALID_FORMAT: string;
    INVALID_OR_EXPIRED: string;
    CONNECTION_FAILED: string;
  };
  enums: {
    layers: Record<LayerType, string>;
    timeSlots: Record<TimeSlot, string>;
    regions: Record<RegionType, string>;
    climates: Record<ClimateType, string>;
  };
}

const SHARED_LANGUAGE_OPTIONS: Record<AppLocale, string> = {
  en: 'en',
  'zh-CN': 'zh',
};

const EN_MESSAGES: AppMessages = {
  metadata: {
    title: 'PinDrop',
    description: 'Click the map and hear a local soundscape generated for that place in real time.',
  },
  common: {
    appName: 'PinDrop',
    loading: 'Loading',
    cancel: 'Cancel',
    confirm: 'Confirm',
  },
  home: {
    title: 'PinDrop',
    settings: 'Settings',
    openSettingsAria: 'Open settings',
    currentLocation: 'Current location',
    locationMetaEmpty: 'Choose any point on the map',
    apiKeyRequiredTitle: 'Generation setup required',
    apiKeyRequiredCopy:
      'Open Settings and complete both the ElevenLabs key and the required LLM configuration before generating soundscapes.',
    audioUnavailableTitle: 'Audio unavailable',
    audioUnavailableCopy:
      'This browser does not expose the Web Audio APIs required for playback.',
    generatingTitle: 'Generating soundscape',
    somethingWentWrong: 'Something went wrong',
    layerMix: 'Layer mix',
    master: 'Master',
    favorites: 'Favorites',
    emptyFavorites: 'Save favorite soundscapes to revisit them here.',
    actions: {
      play: 'Play',
      resume: 'Resume',
      pause: 'Pause',
      stop: 'Stop',
      delete: 'Delete',
      regenerate: 'Regenerate',
      saveFavorite: 'Save favorite',
      removeFavorite: 'Remove favorite',
    },
    playbackStatus: {
      playing: 'Playing',
      paused: 'Paused',
      ready: 'Ready',
    },
    volumeAria: (label) => `${label} volume`,
    favoriteLabel: (cityName, timeSlotLabel) => `${cityName} · ${timeSlotLabel}`,
    locationMeta: (localTime, timezone) => `${localTime} · ${timezone}`,
  },
  map: {
    toolbarLabel: 'Map controls',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    interactiveMapAria: 'Interactive world map for soundscape exploration',
  },
  settings: {
    panelTitle: 'Settings',
    closeAria: 'Close settings',
    storageUnavailable: 'Settings cannot be saved',
    openedAnnouncement: 'Settings panel opened',
    closedAnnouncement: 'Settings panel closed',
    cacheStatsUnavailable: 'Cache statistics unavailable',
    cacheClearedSuccess: 'Cache cleared successfully',
    cacheClearedFailure: 'Failed to clear cache',
    apiKeyVerificationFailure: 'Verification failed. Check connection.',
    sections: {
      language: {
        header: 'Language',
        label: 'Interface language',
        options: SHARED_LANGUAGE_OPTIONS,
      },
      apiKey: {
        header: 'ElevenLabs API Key',
        inputAria: 'ElevenLabs API Key',
        maskedAria: 'Masked ElevenLabs API Key',
        empty: 'No ElevenLabs API key set',
        edit: 'Edit',
        cancel: 'Cancel',
        verify: 'Verify key',
        show: 'Show key',
        hide: 'Hide key',
        verifying: 'Verifying...',
        valid: 'Key valid',
      },
      llm: {
        header: 'Required LLM Prompting',
        description: '',
        baseUrlLabel: 'Request address',
        baseUrlPlaceholder: 'https://api.openai.com/v1',
        modelLabel: 'Model',
        modelPlaceholder: 'gpt-4.1-mini',
        apiKeyLabel: 'LLM API Key',
        apiKeyPlaceholder: 'sk-...',
        show: 'Show key',
        hide: 'Hide key',
        verifying: 'Checking connection...',
        valid: 'Connection verified.',
        invalid: 'Request failed. Check the base URL, model, and API key.',
        connectionFailed: 'Connection failed. Check the network and request address.',
        inactiveHint: 'All three fields are required. Audio generation stays disabled until the LLM configuration is complete.',
        activeHint: 'PinDrop will request one concrete place-specific scene from your LLM before generating audio.',
      },
      map: {
        header: 'Appearance',
        theme: 'App theme',
        light: 'Light',
        dark: 'Dark',
      },
      playback: {
        header: 'Playback',
        autoPlay: 'Auto-play',
        autoPlayDescription: 'Play immediately after click',
        fadeInDuration: 'Fade-in duration',
        dynamicEvents: 'Dynamic events',
        dynamicEventsDescription: 'Random ambient sound effects',
      },
      cache: {
        header: 'Cache',
        loading: 'Loading statistics...',
        unavailable: 'Cache unavailable',
        clearAll: 'Clear all cache',
        clearing: 'Clearing...',
        confirmTitle: 'Clear cache',
        confirmMessage: 'Clear all cached soundscapes? This cannot be undone.',
        formatStats: (count, totalSizeMB) => `${count} soundscapes · ${totalSizeMB} MB`,
      },
      about: {
        versionLabel: (version) => `Version ${version}`,
        attribution: 'ElevenLabs · Leaflet · Next.js',
      },
    },
  },
  session: {
    idleLocation: 'Click anywhere on the map to hear this place',
    idleScene: 'Pin the map and generate a live local soundscape.',
    apiKeyRequiredError:
      'Configure both your ElevenLabs API key and the required LLM settings in Settings before generating soundscapes.',
    apiKeyRequiredStatus: 'Generation setup required',
    llmRequiredError:
      'PinDrop could not get a concrete place-specific scene from the LLM, so generation was stopped.',
    generating: 'Locating this place and generating its soundscape...',
    noAudioLayers: 'No audio layers could be generated for this location.',
    generationFailed: 'Generation failed',
    readyToPlay: 'Soundscape ready. Press play to listen.',
    cacheMissing: 'The selected cached soundscape is no longer available.',
    cacheMissingStatus: 'Missing cached soundscape',
    playbackFailed: 'Playback failed',
    locationLabel: (cityName, countryName) => `${cityName}, ${countryName}`,
    sceneDescription: (timeSlot, region, climate) => `${timeSlot} · ${region} · ${climate}`,
  },
  apiKeyErrors: {
    INVALID_FORMAT: 'Invalid ElevenLabs API key format',
    INVALID_OR_EXPIRED: 'Key invalid or expired',
    CONNECTION_FAILED: 'Verification failed. Check connection.',
  },
  enums: {
    layers: {
      ambient: 'Ambient',
      signature: 'Signature',
      dialogue: 'Dialogue',
      secondaryDialogue: 'Secondary dialogue',
      atmosphere: 'Atmosphere',
    },
    timeSlots: {
      dawn: 'Dawn',
      day: 'Day',
      dusk: 'Dusk',
      night: 'Night',
    },
    regions: {
      city_center: 'City center',
      city_suburb: 'City suburb',
      town: 'Town',
      village: 'Village',
      rural: 'Rural',
      wilderness: 'Wilderness',
      ocean: 'Ocean',
      polar: 'Polar',
    },
    climates: {
      tropical: 'Tropical',
      temperate: 'Temperate',
      subarctic: 'Subarctic',
      arid: 'Arid',
      mediterranean: 'Mediterranean',
    },
  },
};

const ZH_CN_MESSAGES: AppMessages = {
  metadata: {
    title: 'PinDrop',
    description: '点击地图，实时收听该地点生成的本地声音景观。',
  },
  common: {
    appName: 'PinDrop',
    loading: '加载中',
    cancel: '取消',
    confirm: '确认',
  },
  home: {
    title: 'PinDrop',
    settings: '设置',
    openSettingsAria: '打开设置',
    currentLocation: '当前位置',
    locationMetaEmpty: '在地图上选择任意一点',
    apiKeyRequiredTitle: '需要完整生成配置',
    apiKeyRequiredCopy:
      '请先在设置中同时配置 ElevenLabs API Key 和必填的 LLM 参数，再生成声音景观。',
    audioUnavailableTitle: '音频不可用',
    audioUnavailableCopy: '当前浏览器不支持播放所需的 Web Audio API。',
    generatingTitle: '正在生成声音景观',
    somethingWentWrong: '出现错误',
    layerMix: '层级混音',
    master: '总音量',
    favorites: '收藏',
    emptyFavorites: '收藏声音景观后，可以在这里快速再次收听。',
    actions: {
      play: '播放',
      resume: '继续',
      pause: '暂停',
      stop: '停止',
      delete: '删除',
      regenerate: '重新生成',
      saveFavorite: '加入收藏',
      removeFavorite: '取消收藏',
    },
    playbackStatus: {
      playing: '播放中',
      paused: '已暂停',
      ready: '已就绪',
    },
    volumeAria: (label) => `${label} 音量`,
    favoriteLabel: (cityName, timeSlotLabel) => `${cityName} · ${timeSlotLabel}`,
    locationMeta: (localTime, timezone) => `${localTime} · ${timezone}`,
  },
  map: {
    toolbarLabel: '地图控件',
    zoomIn: '放大',
    zoomOut: '缩小',
    interactiveMapAria: '用于探索声音景观的交互式世界地图',
  },
  settings: {
    panelTitle: '设置',
    closeAria: '关闭设置',
    storageUnavailable: '当前无法保存设置',
    openedAnnouncement: '设置面板已打开',
    closedAnnouncement: '设置面板已关闭',
    cacheStatsUnavailable: '无法读取缓存统计信息',
    cacheClearedSuccess: '缓存已清除',
    cacheClearedFailure: '清除缓存失败',
    apiKeyVerificationFailure: '验证失败，请检查网络连接。',
    sections: {
      language: {
        header: '语言',
        label: '界面语言',
        options: SHARED_LANGUAGE_OPTIONS,
      },
      apiKey: {
        header: 'ElevenLabs API 密钥',
        inputAria: 'ElevenLabs API 密钥',
        maskedAria: '已隐藏的 ElevenLabs API 密钥',
        empty: '尚未设置 ElevenLabs API 密钥',
        edit: '编辑',
        cancel: '取消',
        verify: '验证密钥',
        show: '显示',
        hide: '隐藏',
        verifying: '验证中...',
        valid: '密钥有效',
      },
      llm: {
        header: '必填 LLM 场景生成',
        description: '',
        baseUrlLabel: '请求地址',
        baseUrlPlaceholder: 'https://api.openai.com/v1',
        modelLabel: '模型名',
        modelPlaceholder: 'gpt-4.1-mini',
        apiKeyLabel: 'LLM API Key',
        apiKeyPlaceholder: 'sk-...',
        show: '显示',
        hide: '隐藏',
        verifying: '正在检测连接...',
        valid: '连接已验证，可正常使用。',
        invalid: '请求失败，请检查请求地址、模型名和 API Key。',
        connectionFailed: '连接失败，请检查网络或请求地址。',
        inactiveHint: '这三项现在都是必填。缺少任意一项时，将禁止生成音频。',
        activeHint: '配置完整后，PinDrop 会先向你的 LLM 请求一个具体的地点场景，再生成声音景观。',
      },
      map: {
        header: '外观',
        theme: '全局主题',
        light: '浅色',
        dark: '深色',
      },
      playback: {
        header: '播放',
        autoPlay: '自动播放',
        autoPlayDescription: '点击后立即开始播放',
        fadeInDuration: '淡入时长',
        dynamicEvents: '动态事件',
        dynamicEventsDescription: '随机环境音效',
      },
      cache: {
        header: '缓存',
        loading: '正在读取统计信息...',
        unavailable: '缓存不可用',
        clearAll: '清除全部缓存',
        clearing: '清除中...',
        confirmTitle: '清除缓存',
        confirmMessage: '确定清除所有已缓存的声音景观吗？此操作无法撤销。',
        formatStats: (count, totalSizeMB) => `${count} 个声音景观 · ${totalSizeMB} MB`,
      },
      about: {
        versionLabel: (version) => `版本 ${version}`,
        attribution: 'ElevenLabs · Leaflet · Next.js',
      },
    },
  },
  session: {
    idleLocation: '点击地图任意位置即可收听该地点',
    idleScene: '在地图上落点，生成当地实时声音景观。',
    apiKeyRequiredError:
      '请先在设置中同时配置 ElevenLabs API Key 和必填的 LLM 参数，再生成声音景观。',
    apiKeyRequiredStatus: '需要完整生成配置',
    llmRequiredError: 'LLM 未能给出这个地点的一件具体事件，因此已停止生成，避免退化成泛化文案。',
    generating: '正在定位该地点并生成对应的声音景观...',
    noAudioLayers: '这个地点未能生成可用的音频层。',
    generationFailed: '生成失败',
    readyToPlay: '声音景观已就绪，点击播放即可收听。',
    cacheMissing: '所选缓存声音景观已不可用。',
    cacheMissingStatus: '缓存声音景观缺失',
    playbackFailed: '播放失败',
    locationLabel: (cityName, countryName) => `${cityName}，${countryName}`,
    sceneDescription: (timeSlot, region, climate) => `${timeSlot} · ${region} · ${climate}`,
  },
  apiKeyErrors: {
    INVALID_FORMAT: 'ElevenLabs API Key 格式无效',
    INVALID_OR_EXPIRED: '密钥无效或已过期',
    CONNECTION_FAILED: '验证失败，请检查网络连接。',
  },
  enums: {
    layers: {
      ambient: '环境层',
      signature: '标志层',
      dialogue: '对话层',
      secondaryDialogue: '次级对话层',
      atmosphere: '氛围层',
    },
    timeSlots: {
      dawn: '黎明',
      day: '白天',
      dusk: '黄昏',
      night: '夜晚',
    },
    regions: {
      city_center: '城市中心',
      city_suburb: '城市郊区',
      town: '城镇',
      village: '村庄',
      rural: '乡野',
      wilderness: '荒野',
      ocean: '海洋',
      polar: '极地',
    },
    climates: {
      tropical: '热带',
      temperate: '温带',
      subarctic: '亚寒带',
      arid: '干旱',
      mediterranean: '地中海',
    },
  },
};

const APP_MESSAGES: Record<AppLocale, AppMessages> = {
  en: EN_MESSAGES,
  'zh-CN': ZH_CN_MESSAGES,
};

export function getMessages(locale: AppLocale): AppMessages {
  return APP_MESSAGES[locale];
}
