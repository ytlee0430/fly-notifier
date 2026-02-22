import { describe, it, expect } from 'vitest';
import { config, type RouteConfig, type AppConfig } from '../src/config.js';

describe('Story 1.2: 航線設定模組', () => {
  describe('AppConfig 結構', () => {
    it('匯出 config 物件', () => {
      expect(config).toBeDefined();
    });

    it('passengers 設定為 adults:2, children:1', () => {
      expect(config.passengers.adults).toBe(2);
      expect(config.passengers.children).toBe(1);
    });

    it('包含 5 條航線', () => {
      expect(config.routes).toHaveLength(5);
    });
  });

  describe('RouteConfig 結構完整性', () => {
    const requiredDestinations = ['NRT', 'KIX', 'FUK', 'OKA', 'CTS'];

    it('包含所有預期目的地', () => {
      const destinations = config.routes.map((r) => r.destination);
      for (const dest of requiredDestinations) {
        expect(destinations).toContain(dest);
      }
    });

    it('所有航線 origin 為 TPE', () => {
      for (const route of config.routes) {
        expect(route.origin).toBe('TPE');
      }
    });

    it('所有航線包含 enabled 布林值', () => {
      for (const route of config.routes) {
        expect(typeof route.enabled).toBe('boolean');
      }
    });

    it('所有航線包含正數 priceThreshold', () => {
      for (const route of config.routes) {
        expect(route.priceThreshold).toBeGreaterThan(0);
      }
    });

    it('所有航線包含 dateRange（start/end）', () => {
      for (const route of config.routes) {
        expect(route.dateRange.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(route.dateRange.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(route.dateRange.end >= route.dateRange.start).toBe(true);
      }
    });

    it('設有 timeRange 的航線格式為 HH:mm', () => {
      const timeFormat = /^\d{2}:\d{2}$/;
      for (const route of config.routes) {
        if (route.departureTimeRange) {
          expect(route.departureTimeRange.earliest).toMatch(timeFormat);
          expect(route.departureTimeRange.latest).toMatch(timeFormat);
        }
        if (route.arrivalTimeRange) {
          expect(route.arrivalTimeRange.earliest).toMatch(timeFormat);
          expect(route.arrivalTimeRange.latest).toMatch(timeFormat);
        }
      }
    });
  });

  describe('密鑰安全（AC：密鑰不入 config）', () => {
    const configStr = JSON.stringify(config);

    it('不含 AMADEUS_CLIENT_ID 字串', () => {
      expect(configStr).not.toContain('AMADEUS_CLIENT_ID');
    });

    it('不含 LINE_CHANNEL_ACCESS_TOKEN 字串', () => {
      expect(configStr).not.toContain('LINE_CHANNEL_ACCESS_TOKEN');
    });
  });

  describe('型別相容性', () => {
    it('config 可指派給 AppConfig 型別', () => {
      const typed: AppConfig = config;
      expect(typed).toBeDefined();
    });

    it('每條 route 可指派給 RouteConfig 型別', () => {
      for (const route of config.routes) {
        const typed: RouteConfig = route;
        expect(typed).toBeDefined();
      }
    });
  });
});
