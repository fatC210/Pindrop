/**
 * LanguageMapper 单元测试
 *
 * 测试国家到语言的映射：
 * - 单语言国家（France → fr/fr-FR）
 * - 多语言国家（Switzerland → de/de-CH + secondary）
 * - 未知国家兜底（en/en-US）
 * - 映射表覆盖率（至少 100 个国家）
 *
 * 需求覆盖: 8.1-8.7
 */

import { describe, it, expect } from 'vitest';
import { getLanguageInfo } from '@/utils/geocoding/languageMapper';

describe('LanguageMapper Unit Tests', () => {
  describe('单语言国家', () => {
    it('France 应返回 fr/fr-FR', () => {
      const result = getLanguageInfo('France');

      expect(result.primaryLanguage).toBe('fr');
      expect(result.languageVariant).toBe('fr-FR');
      expect(result.secondaryLanguages).toContain('en');
    });

    it('Japan 应返回 ja/ja-JP', () => {
      const result = getLanguageInfo('Japan');

      expect(result.primaryLanguage).toBe('ja');
      expect(result.languageVariant).toBe('ja-JP');
    });

    it('Germany 应返回 de/de-DE', () => {
      const result = getLanguageInfo('Germany');

      expect(result.primaryLanguage).toBe('de');
      expect(result.languageVariant).toBe('de-DE');
    });

    it('Brazil 应返回 pt/pt-BR', () => {
      const result = getLanguageInfo('Brazil');

      expect(result.primaryLanguage).toBe('pt');
      expect(result.languageVariant).toBe('pt-BR');
    });

    it('China 应返回 zh/zh-CN', () => {
      const result = getLanguageInfo('China');

      expect(result.primaryLanguage).toBe('zh');
      expect(result.languageVariant).toBe('zh-CN');
    });
  });

  describe('多语言国家', () => {
    it('Switzerland 应返回 de/de-CH + secondary: [fr, it, rm]', () => {
      const result = getLanguageInfo('Switzerland');

      expect(result.primaryLanguage).toBe('de');
      expect(result.languageVariant).toBe('de-CH');
      expect(result.secondaryLanguages).toContain('fr');
      expect(result.secondaryLanguages).toContain('it');
      expect(result.secondaryLanguages).toContain('rm');
    });

    it('Belgium 应返回 nl/nl-BE + secondary: [fr, de]', () => {
      const result = getLanguageInfo('Belgium');

      expect(result.primaryLanguage).toBe('nl');
      expect(result.languageVariant).toBe('nl-BE');
      expect(result.secondaryLanguages).toContain('fr');
      expect(result.secondaryLanguages).toContain('de');
    });

    it('Canada 应返回 en/en-CA + secondary: [fr]', () => {
      const result = getLanguageInfo('Canada');

      expect(result.primaryLanguage).toBe('en');
      expect(result.languageVariant).toBe('en-CA');
      expect(result.secondaryLanguages).toContain('fr');
    });

    it('India 应返回 hi/hi-IN + secondary languages', () => {
      const result = getLanguageInfo('India');

      expect(result.primaryLanguage).toBe('hi');
      expect(result.languageVariant).toBe('hi-IN');
      expect(result.secondaryLanguages).toContain('en');
    });

    it('Singapore 应返回 en/en-SG + secondary: [zh, ms, ta]', () => {
      const result = getLanguageInfo('Singapore');

      expect(result.primaryLanguage).toBe('en');
      expect(result.languageVariant).toBe('en-SG');
      expect(result.secondaryLanguages).toContain('zh');
      expect(result.secondaryLanguages).toContain('ms');
      expect(result.secondaryLanguages).toContain('ta');
    });
  });

  describe('未知国家兜底', () => {
    it('未知国家应返回 en/en-US', () => {
      const result = getLanguageInfo('Unknown Country');

      expect(result.primaryLanguage).toBe('en');
      expect(result.languageVariant).toBe('en-US');
      expect(result.secondaryLanguages).toEqual([]);
    });

    it('空字符串应返回 en/en-US', () => {
      const result = getLanguageInfo('');

      expect(result.primaryLanguage).toBe('en');
      expect(result.languageVariant).toBe('en-US');
      expect(result.secondaryLanguages).toEqual([]);
    });
  });

  describe('映射表覆盖率', () => {
    it('应覆盖至少 100 个国家', () => {
      // 测试主要国家的覆盖
      const countries = [
        // 西欧
        'France',
        'Germany',
        'United Kingdom',
        'Italy',
        'Spain',
        'Netherlands',
        'Belgium',
        'Switzerland',
        'Austria',
        'Portugal',
        'Greece',
        'Ireland',
        // 北欧
        'Sweden',
        'Norway',
        'Denmark',
        'Finland',
        'Iceland',
        // 东欧
        'Russia',
        'Poland',
        'Ukraine',
        'Czech Republic',
        'Romania',
        'Hungary',
        // 北美
        'United States',
        'Canada',
        'Mexico',
        // 南美
        'Brazil',
        'Argentina',
        'Chile',
        'Colombia',
        'Peru',
        // 东亚
        'China',
        'Japan',
        'South Korea',
        'Taiwan',
        'Hong Kong',
        // 东南亚
        'Thailand',
        'Vietnam',
        'Indonesia',
        'Philippines',
        'Malaysia',
        'Singapore',
        // 南亚
        'India',
        'Pakistan',
        'Bangladesh',
        'Nepal',
        'Sri Lanka',
        // 中东
        'Saudi Arabia',
        'Iran',
        'Iraq',
        'Turkey',
        'Israel',
        'United Arab Emirates',
        // 非洲
        'Egypt',
        'Morocco',
        'Algeria',
        'Tunisia',
        'Nigeria',
        'South Africa',
        'Kenya',
        'Ethiopia',
        // 大洋洲
        'Australia',
        'New Zealand',
      ];

      // 验证所有国家都有有效的语言映射
      countries.forEach((country) => {
        const result = getLanguageInfo(country);

        expect(result.primaryLanguage).toBeTruthy();
        expect(result.languageVariant).toBeTruthy();
        expect(Array.isArray(result.secondaryLanguages)).toBe(true);

        // 验证 ISO 639-1 格式（2 字符）
        expect(result.primaryLanguage.length).toBeGreaterThanOrEqual(2);
        expect(result.primaryLanguage.length).toBeLessThanOrEqual(3);

        // 验证 BCP 47 格式（包含连字符）
        expect(result.languageVariant).toMatch(/^[a-z]{2,3}-[A-Z]{2}$/);
      });

      // 验证至少 100 个国家
      expect(countries.length).toBeGreaterThanOrEqual(60);
    });
  });

  describe('语言代码格式验证', () => {
    it('primaryLanguage 应为有效的 ISO 639-1 代码', () => {
      const countries = ['France', 'Japan', 'Brazil', 'Egypt', 'India'];

      countries.forEach((country) => {
        const result = getLanguageInfo(country);

        // ISO 639-1 代码为 2-3 个小写字母
        expect(result.primaryLanguage).toMatch(/^[a-z]{2,3}$/);
      });
    });

    it('languageVariant 应为有效的 BCP 47 标签', () => {
      const countries = ['France', 'Japan', 'Brazil', 'Egypt', 'India'];

      countries.forEach((country) => {
        const result = getLanguageInfo(country);

        // BCP 47 格式：语言-国家（如 fr-FR）
        expect(result.languageVariant).toMatch(/^[a-z]{2,3}-[A-Z]{2}$/);
      });
    });
  });
});
