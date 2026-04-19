/**
 * ElevenLabs API 请求头工具函数。
 *
 * 从 localStorage 读取 API key 并构造请求头对象，
 * 供任何需要调用 ElevenLabs API 的组件使用。
 *
 * @module apiHeaders
 *
 * Requirements: 1.5, 3.4, 3.5
 */

import { retrieveApiKey } from '@/components/settings/preferencesStore';

/** getApiKeyHeader 返回的请求头类型 */
export interface ApiKeyHeader {
  'x-elevenlabs-api-key': string;
}

/**
 * 从 localStorage 获取 ElevenLabs API key 并返回请求头对象。
 *
 * 如果 API key 不存在或为空，返回空对象。
 * 调用方应检查返回值是否包含 `x-elevenlabs-api-key` 属性。
 *
 * API key 仅通过 `x-elevenlabs-api-key` header 发送，
 * 且仅发送到 `/api/elevenlabs/*` 端点。
 *
 * @returns 包含 API key header 的对象，或空对象
 *
 * @example
 * ```ts
 * const headers = getApiKeyHeader();
 * if ('x-elevenlabs-api-key' in headers) {
 *   const response = await fetch('/api/elevenlabs/sound-generation', {
 *     method: 'POST',
 *     headers: { ...headers, 'Content-Type': 'application/json' },
 *     body: JSON.stringify(payload),
 *   });
 * } else {
 *   // 提示用户设置 API key
 * }
 * ```
 */
export function getApiKeyHeader(): ApiKeyHeader | Record<string, never> {
  const apiKey = retrieveApiKey();

  if (!apiKey) {
    return {};
  }

  return {
    'x-elevenlabs-api-key': apiKey,
  };
}

/**
 * 检查是否已配置 ElevenLabs API key。
 *
 * @returns 如果 API key 存在且非空则返回 true
 */
export function hasApiKey(): boolean {
  const apiKey = retrieveApiKey();
  return !!apiKey;
}
