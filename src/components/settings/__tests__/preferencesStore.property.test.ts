/**
 * 偏好设置模块的属性测试。
 * Feature: 06-caching-storage
 *
 * 使用 fast-check 验证 validatePreferences 和偏好设置往返一致性的通用正确性属性。
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import {
  validatePreferences,
  PreferencesStore,
} from '../preferencesStore';
import type { UserPreferences, FadeInDuration, MapTheme } from '../types';

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const VALID_MAP_STYLES: MapTheme[] = ['light', 'dark'];
const VALID_FADE_IN_DURATIONS: FadeInDuration[] = [0.5, 1.0, 1.5, 2.0, 3.0];
const LAYER_VOLUME_KEYS = [
  'ambient',
  'signature',
  'dialogue',
  'secondaryDialogue',
  'atmosphere',
] as const;

// ---------------------------------------------------------------------------
// Arbitraries（生成器）
// ---------------------------------------------------------------------------

/** 生成有效的 UserPreferences 对象 */
const userPreferencesArb: fc.Arbitrary<UserPreferences> = fc.record({
  mapStyle: fc.constantFrom<MapTheme>('light', 'dark'),
  autoPlay: fc.boolean(),
  fadeInDuration: fc.constantFrom<FadeInDuration>(0.5, 1.0, 1.5, 2.0, 3.0),
  dynamicEvents: fc.boolean(),
  masterVolume: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
  layerVolumes: fc.record({
    ambient: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
    signature: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
    dialogue: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
    secondaryDialogue: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
    atmosphere: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
  }),
});

// ---------------------------------------------------------------------------
// Property 8: 偏好设置验证总是返回有效值
// ---------------------------------------------------------------------------

describe('Property 8: 偏好设置验证总是返回有效值', () => {
  /**
   * **Validates: Requirements 9.3**
   *
   * 对于任意 unknown 类型的输入，validatePreferences(input) 应返回一个完全有效的
   * UserPreferences 对象，其中 mapStyle 为 'light' 或 'dark'，masterVolume 在 [0, 1]，
   * fadeInDuration 为允许值之一，所有 layerVolumes 在 [0, 1]。
   */
  test('任意输入总是返回有效的 mapStyle', () => {
    fc.assert(
      fc.property(
        fc.anything(),
        (input: unknown) => {
          const result = validatePreferences(input);
          expect(VALID_MAP_STYLES).toContain(result.mapStyle);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('任意输入总是返回有效的 masterVolume（[0, 1] 范围内）', () => {
    fc.assert(
      fc.property(
        fc.anything(),
        (input: unknown) => {
          const result = validatePreferences(input);
          expect(result.masterVolume).toBeGreaterThanOrEqual(0);
          expect(result.masterVolume).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('任意输入总是返回有效的 fadeInDuration', () => {
    fc.assert(
      fc.property(
        fc.anything(),
        (input: unknown) => {
          const result = validatePreferences(input);
          expect(VALID_FADE_IN_DURATIONS).toContain(result.fadeInDuration);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('任意输入总是返回有效的 layerVolumes（所有值在 [0, 1] 范围内）', () => {
    fc.assert(
      fc.property(
        fc.anything(),
        (input: unknown) => {
          const result = validatePreferences(input);
          for (const key of LAYER_VOLUME_KEYS) {
            expect(result.layerVolumes[key]).toBeGreaterThanOrEqual(0);
            expect(result.layerVolumes[key]).toBeLessThanOrEqual(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  test('任意输入总是返回有效的布尔字段', () => {
    fc.assert(
      fc.property(
        fc.anything(),
        (input: unknown) => {
          const result = validatePreferences(input);
          expect(typeof result.autoPlay).toBe('boolean');
          expect(typeof result.dynamicEvents).toBe('boolean');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: 偏好设置往返一致性
// ---------------------------------------------------------------------------

describe('Property 9: 偏好设置往返一致性', () => {
  let store: PreferencesStore;

  beforeEach(() => {
    store = new PreferencesStore();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  /**
   * **Validates: Requirements 9.2, 9.5**
   *
   * 对于任意有效的 UserPreferences 对象，通过 savePreferences 保存后再通过
   * loadPreferences 加载，返回的偏好设置应与原始值等价。
   */
  test('保存后加载的偏好设置与原始值等价', () => {
    fc.assert(
      fc.property(
        userPreferencesArb,
        (prefs: UserPreferences) => {
          // 保存偏好设置
          store.savePreferences(prefs);

          // 加载偏好设置
          const loaded = store.loadPreferences();

          // 验证所有字段等价
          expect(loaded.mapStyle).toBe(prefs.mapStyle);
          expect(loaded.autoPlay).toBe(prefs.autoPlay);
          expect(loaded.fadeInDuration).toBe(prefs.fadeInDuration);
          expect(loaded.dynamicEvents).toBe(prefs.dynamicEvents);
          expect(loaded.masterVolume).toBe(prefs.masterVolume);

          for (const key of LAYER_VOLUME_KEYS) {
            expect(loaded.layerVolumes[key]).toBe(prefs.layerVolumes[key]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
