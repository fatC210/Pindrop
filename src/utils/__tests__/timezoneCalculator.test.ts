/**
 * TimezoneCalculator 单元测试
 *
 * 测试时区计算和时间档映射：
 * - 国家名称 → IANA 时区
 * - 经度估算降级
 * - 午夜翻转处理
 * - 时间档映射
 *
 * 需求覆盖: 10.1-10.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateTimezone } from '@/utils/geocoding/timezoneCalculator';

describe('TimezoneCalculator Unit Tests', () => {
  // 保存原始的 Date 对象
  let originalDate: typeof Date;

  beforeEach(() => {
    originalDate = global.Date;
  });

  afterEach(() => {
    // 恢复原始的 Date 对象
    global.Date = originalDate;
  });

  describe('国家名称 → IANA 时区', () => {
    it('France 应返回 Europe/Paris 时区', () => {
      const result = calculateTimezone('France', 48.86, 2.35);

      expect(result.timezone).toBe('Europe/Paris');
      expect(result.currentLocalHour).toBeGreaterThanOrEqual(0);
      expect(result.currentLocalHour).toBeLessThanOrEqual(23);
      expect(['dawn', 'day', 'dusk', 'night']).toContain(result.timeSlot);
    });

    it('Japan 应返回 Asia/Tokyo 时区', () => {
      const result = calculateTimezone('Japan', 35.68, 139.65);

      expect(result.timezone).toBe('Asia/Tokyo');
      expect(result.currentLocalHour).toBeGreaterThanOrEqual(0);
      expect(result.currentLocalHour).toBeLessThanOrEqual(23);
      expect(['dawn', 'day', 'dusk', 'night']).toContain(result.timeSlot);
    });

    it('United States 应返回 America/New_York 时区', () => {
      const result = calculateTimezone('United States', 40.71, -74.01);

      expect(result.timezone).toBe('America/New_York');
      expect(result.currentLocalHour).toBeGreaterThanOrEqual(0);
      expect(result.currentLocalHour).toBeLessThanOrEqual(23);
      expect(['dawn', 'day', 'dusk', 'night']).toContain(result.timeSlot);
    });

    it('Australia 应返回 Australia/Sydney 时区', () => {
      const result = calculateTimezone('Australia', -33.87, 151.21);

      expect(result.timezone).toBe('Australia/Sydney');
      expect(result.currentLocalHour).toBeGreaterThanOrEqual(0);
      expect(result.currentLocalHour).toBeLessThanOrEqual(23);
      expect(['dawn', 'day', 'dusk', 'night']).toContain(result.timeSlot);
    });
  });

  describe('经度估算降级', () => {
    it('无国家名时应使用经度估算：lng=0 → UTC+0', () => {
      const result = calculateTimezone(null, 0, 0);

      expect(result.timezone).toBe('UTC+0');
      expect(result.currentLocalHour).toBeGreaterThanOrEqual(0);
      expect(result.currentLocalHour).toBeLessThanOrEqual(23);
    });

    it('无国家名时应使用经度估算：lng=139 → UTC+9', () => {
      const result = calculateTimezone(null, 35.68, 139);

      expect(result.timezone).toBe('UTC+9');
      expect(result.currentLocalHour).toBeGreaterThanOrEqual(0);
      expect(result.currentLocalHour).toBeLessThanOrEqual(23);
    });

    it('无国家名时应使用经度估算：lng=-75 → UTC-5', () => {
      const result = calculateTimezone(null, 40.71, -75);

      expect(result.timezone).toBe('UTC-5');
      expect(result.currentLocalHour).toBeGreaterThanOrEqual(0);
      expect(result.currentLocalHour).toBeLessThanOrEqual(23);
    });

    it('未知国家名应降级到经度估算', () => {
      const result = calculateTimezone('Unknown Country', 0, 45);

      expect(result.timezone).toBe('UTC+3');
      expect(result.currentLocalHour).toBeGreaterThanOrEqual(0);
      expect(result.currentLocalHour).toBeLessThanOrEqual(23);
    });
  });

  describe('时间档映射', () => {
    it('应正确映射时间档', () => {
      // 使用固定时间测试
      const mockDate = new Date('2024-01-01T12:00:00Z');
      vi.setSystemTime(mockDate);

      const result = calculateTimezone(null, 0, 0);

      // UTC 12:00 应映射到 day
      expect(result.currentLocalHour).toBe(12);
      expect(result.timeSlot).toBe('day');

      vi.useRealTimers();
    });

    it('dawn: 5-8 点', () => {
      const mockDate = new Date('2024-01-01T07:00:00Z');
      vi.setSystemTime(mockDate);

      const result = calculateTimezone(null, 0, 0);

      expect(result.currentLocalHour).toBe(7);
      expect(result.timeSlot).toBe('dawn');

      vi.useRealTimers();
    });

    it('day: 9-16 点', () => {
      const mockDate = new Date('2024-01-01T14:00:00Z');
      vi.setSystemTime(mockDate);

      const result = calculateTimezone(null, 0, 0);

      expect(result.currentLocalHour).toBe(14);
      expect(result.timeSlot).toBe('day');

      vi.useRealTimers();
    });

    it('dusk: 17-19 点', () => {
      const mockDate = new Date('2024-01-01T18:00:00Z');
      vi.setSystemTime(mockDate);

      const result = calculateTimezone(null, 0, 0);

      expect(result.currentLocalHour).toBe(18);
      expect(result.timeSlot).toBe('dusk');

      vi.useRealTimers();
    });

    it('night: 20-4 点', () => {
      const mockDate = new Date('2024-01-01T22:00:00Z');
      vi.setSystemTime(mockDate);

      const result = calculateTimezone(null, 0, 0);

      expect(result.currentLocalHour).toBe(22);
      expect(result.timeSlot).toBe('night');

      vi.useRealTimers();
    });

    it('午夜翻转：2 点应归类为 night', () => {
      const mockDate = new Date('2024-01-01T02:00:00Z');
      vi.setSystemTime(mockDate);

      const result = calculateTimezone(null, 0, 0);

      expect(result.currentLocalHour).toBe(2);
      expect(result.timeSlot).toBe('night');

      vi.useRealTimers();
    });
  });

  describe('边界值测试', () => {
    it('hour=0 应归类为 night', () => {
      const mockDate = new Date('2024-01-01T00:00:00Z');
      vi.setSystemTime(mockDate);

      const result = calculateTimezone(null, 0, 0);

      expect(result.currentLocalHour).toBe(0);
      expect(result.timeSlot).toBe('night');

      vi.useRealTimers();
    });

    it('hour=4 应归类为 night', () => {
      const mockDate = new Date('2024-01-01T04:00:00Z');
      vi.setSystemTime(mockDate);

      const result = calculateTimezone(null, 0, 0);

      expect(result.currentLocalHour).toBe(4);
      expect(result.timeSlot).toBe('night');

      vi.useRealTimers();
    });

    it('hour=5 应归类为 dawn', () => {
      const mockDate = new Date('2024-01-01T05:00:00Z');
      vi.setSystemTime(mockDate);

      const result = calculateTimezone(null, 0, 0);

      expect(result.currentLocalHour).toBe(5);
      expect(result.timeSlot).toBe('dawn');

      vi.useRealTimers();
    });

    it('hour=8 应归类为 dawn', () => {
      const mockDate = new Date('2024-01-01T08:00:00Z');
      vi.setSystemTime(mockDate);

      const result = calculateTimezone(null, 0, 0);

      expect(result.currentLocalHour).toBe(8);
      expect(result.timeSlot).toBe('dawn');

      vi.useRealTimers();
    });

    it('hour=9 应归类为 day', () => {
      const mockDate = new Date('2024-01-01T09:00:00Z');
      vi.setSystemTime(mockDate);

      const result = calculateTimezone(null, 0, 0);

      expect(result.currentLocalHour).toBe(9);
      expect(result.timeSlot).toBe('day');

      vi.useRealTimers();
    });
  });

  describe('currentLocalHour 范围验证', () => {
    it('currentLocalHour 应始终在 0-23 范围内', () => {
      const countries = [
        'France',
        'Japan',
        'United States',
        'Australia',
        'Brazil',
        'Egypt',
      ];

      countries.forEach((country) => {
        const result = calculateTimezone(country, 0, 0);

        expect(result.currentLocalHour).toBeGreaterThanOrEqual(0);
        expect(result.currentLocalHour).toBeLessThanOrEqual(23);
        expect(Number.isInteger(result.currentLocalHour)).toBe(true);
      });
    });
  });

  describe('IANA 解析失败降级', () => {
    it('当 IANA 时区解析失败时应降级到 UTC 小时', () => {
      // 保存原始的 Intl.DateTimeFormat
      const originalDateTimeFormat = Intl.DateTimeFormat;

      // Mock Intl.DateTimeFormat 使其抛出错误
      const mockDateTimeFormat = vi.fn().mockImplementation(() => {
        throw new Error('Invalid timezone');
      });
      (global.Intl as any).DateTimeFormat = mockDateTimeFormat;

      // Mock console.error 以验证日志
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // 设置固定的 UTC 时间
      const mockDate = new Date('2024-01-01T14:00:00Z');
      vi.setSystemTime(mockDate);

      try {
        // 使用已知国家触发 IANA 时区查询
        const result = calculateTimezone('France', 48.86, 2.35);

        // 验证 console.error 被调用
        expect(consoleErrorSpy).toHaveBeenCalled();

        // 验证日志格式包含 [PinDrop Error] TimezoneCalculator:
        const errorCall = consoleErrorSpy.mock.calls[0];
        expect(errorCall[0]).toContain('[PinDrop Error] TimezoneCalculator:');
        expect(errorCall[0]).toContain('Failed to parse timezone');
        expect(errorCall[0]).toContain('Europe/Paris');

        // 验证降级后返回的 TimezoneInfo 仍然有效
        expect(result.timezone).toBe('Europe/Paris'); // 时区字符串保持不变
        expect(result.currentLocalHour).toBe(14); // 降级到 UTC 小时
        expect(result.currentLocalHour).toBeGreaterThanOrEqual(0);
        expect(result.currentLocalHour).toBeLessThanOrEqual(23);
        expect(Number.isInteger(result.currentLocalHour)).toBe(true);
        expect(['dawn', 'day', 'dusk', 'night']).toContain(result.timeSlot);
        expect(result.timeSlot).toBe('day'); // 14:00 应映射到 day
      } finally {
        // 恢复原始的 Intl.DateTimeFormat
        (global.Intl as any).DateTimeFormat = originalDateTimeFormat;
        consoleErrorSpy.mockRestore();
        vi.useRealTimers();
      }
    });

    it('IANA 解析失败后 timeSlot 应与 currentLocalHour 一致', () => {
      // 保存原始的 Intl.DateTimeFormat
      const originalDateTimeFormat = Intl.DateTimeFormat;

      // Mock Intl.DateTimeFormat 使其抛出错误
      const mockDateTimeFormat = vi.fn().mockImplementation(() => {
        throw new Error('Invalid timezone');
      });
      (global.Intl as any).DateTimeFormat = mockDateTimeFormat;

      // Mock console.error 以抑制日志输出
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // 测试不同的 UTC 小时
      const testCases = [
        { utcHour: 2, expectedSlot: 'night' },
        { utcHour: 7, expectedSlot: 'dawn' },
        { utcHour: 12, expectedSlot: 'day' },
        { utcHour: 18, expectedSlot: 'dusk' },
        { utcHour: 22, expectedSlot: 'night' },
      ];

      try {
        testCases.forEach(({ utcHour, expectedSlot }) => {
          const mockDate = new Date(`2024-01-01T${utcHour.toString().padStart(2, '0')}:00:00Z`);
          vi.setSystemTime(mockDate);

          const result = calculateTimezone('Japan', 35.68, 139.65);

          expect(result.currentLocalHour).toBe(utcHour);
          expect(result.timeSlot).toBe(expectedSlot);
        });
      } finally {
        // 恢复原始的 Intl.DateTimeFormat
        (global.Intl as any).DateTimeFormat = originalDateTimeFormat;
        consoleErrorSpy.mockRestore();
        vi.useRealTimers();
      }
    });
  });
});
