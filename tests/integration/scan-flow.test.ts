import { describe, it, expect, vi } from 'vitest';
import type { FlightOffer } from '../../src/providers/types.js';
import type { RouteConfig } from '../../src/config.js';
import { scanAllRoutes } from '../../src/scanner/scanner.js';

// Mock dedup filesystem calls to keep integration tests hermetic
vi.mock('../../src/utils/dedup.js', () => {
  const notifiedKeys = new Set<string>();
  return {
    getDedupKey: (offer: FlightOffer) => `${offer.flightNumber}-${offer.departureDate}-${offer.totalPriceTWD}`,
    getRouteCacheKey: (routeKey: string) => `dedup-${routeKey}`,
    isAlreadyNotified: (offer: FlightOffer) => notifiedKeys.has(`${offer.flightNumber}-${offer.departureDate}-${offer.totalPriceTWD}`),
    markAsNotified: (offer: FlightOffer) => { notifiedKeys.add(`${offer.flightNumber}-${offer.departureDate}-${offer.totalPriceTWD}`); },
    filterNewOffers: (offers: FlightOffer[]) => offers.filter(o => !notifiedKeys.has(`${o.flightNumber}-${o.departureDate}-${o.totalPriceTWD}`)),
    markAllAsNotified: (offers: FlightOffer[]) => { for (const o of offers) notifiedKeys.add(`${o.flightNumber}-${o.departureDate}-${o.totalPriceTWD}`); },
  };
});

const makeOffer = (overrides: Partial<FlightOffer> = {}): FlightOffer => ({
  source: 'amadeus',
  origin: 'TPE',
  destination: 'NRT',
  departureDate: '2026-04-01',
  departureTime: '09:00',
  arrivalTime: '13:00',
  airline: 'IT',
  flightNumber: 'IT201',
  stops: 0,
  totalPriceTWD: 20000,
  currency: 'TWD',
  bookingUrl: 'https://example.com',
  ...overrides,
});

const baseRoute: RouteConfig = {
  origin: 'TPE',
  destination: 'NRT',
  enabled: true,
  priceThreshold: 25000,
  dateRange: { start: '2026-04-01', end: '2026-06-30' },
};

describe('Story 3.3: 掃描通知流程整合測試', () => {
  it('完整流程：掃描 → 時間過濾 → 價格過濾（低價找到）', async () => {
    const mockProvider = {
      search: vi.fn().mockResolvedValue([
        makeOffer({ totalPriceTWD: 20000, flightNumber: 'INT_CHEAP' }),
        makeOffer({ totalPriceTWD: 30000, flightNumber: 'INT_EXP' }),
      ]),
    };

    const results = await scanAllRoutes([baseRoute], [mockProvider], { adults: 2, children: 1 });

    expect(results).toHaveLength(1);
    expect(results[0]!.cheapOffers).toHaveLength(1);
    expect(results[0]!.cheapOffers[0]!.flightNumber).toBe('INT_CHEAP');
    expect(results[0]!.lowestPrice).toBe(20000);
  });

  it('有低價航班時 AC: cheapOffers 非空', async () => {
    const mockProvider = {
      search: vi.fn().mockResolvedValue([makeOffer({ totalPriceTWD: 20000 })]),
    };

    const results = await scanAllRoutes([baseRoute], [mockProvider], { adults: 2, children: 1 });
    expect(results[0]!.cheapOffers.length).toBeGreaterThan(0);
  });

  it('無低價航班時 AC: cheapOffers 為空', async () => {
    const mockProvider = {
      search: vi.fn().mockResolvedValue([makeOffer({ totalPriceTWD: 30000 })]),
    };

    const results = await scanAllRoutes([baseRoute], [mockProvider], { adults: 2, children: 1 });
    expect(results[0]!.cheapOffers).toHaveLength(0);
  });

  it('去重 mock：filterNewOffers 在 markAllAsNotified 後回傳空', async () => {
    const { filterNewOffers, markAllAsNotified } = await import('../../src/utils/dedup.js');

    const freshOffer = makeOffer({ flightNumber: 'DEDUP_INT_999', totalPriceTWD: 19000 });

    // Before marking: should be new
    const before = filterNewOffers([freshOffer], 'TPE-NRT');
    expect(before).toHaveLength(1);

    // After marking: should be deduped
    markAllAsNotified([freshOffer], 'TPE-NRT');
    const after = filterNewOffers([freshOffer], 'TPE-NRT');
    expect(after).toHaveLength(0);
  });

  it('某條航線 Provider 失敗，其他航線正常完成', async () => {
    const routes: RouteConfig[] = [
      { ...baseRoute, destination: 'NRT' },
      { ...baseRoute, destination: 'KIX', priceThreshold: 22000 },
    ];

    const failProvider = { search: vi.fn().mockRejectedValue(new Error('API error')) };

    await expect(
      scanAllRoutes(routes, [failProvider], { adults: 2, children: 1 }),
    ).resolves.toHaveLength(2);
  });

  it('多 Provider 結果聚合', async () => {
    const provider1 = {
      search: vi.fn().mockResolvedValue([makeOffer({ flightNumber: 'P1', totalPriceTWD: 20000 })]),
    };
    const provider2 = {
      search: vi.fn().mockResolvedValue([makeOffer({ flightNumber: 'P2', totalPriceTWD: 21000 })]),
    };

    const results = await scanAllRoutes([baseRoute], [provider1, provider2], { adults: 2, children: 1 });
    expect(results[0]!.cheapOffers).toHaveLength(2);
  });

  it('時間過濾：不在範圍內的航班排除，不影響 cheapOffers', async () => {
    const routeWithTimeFilter: RouteConfig = {
      ...baseRoute,
      departureTimeRange: { earliest: '10:00', latest: '20:00' },
    };

    const mockProvider = {
      search: vi.fn().mockResolvedValue([
        makeOffer({ flightNumber: 'EARLY', departureTime: '06:00', totalPriceTWD: 15000 }),
        makeOffer({ flightNumber: 'OK', departureTime: '12:00', totalPriceTWD: 20000 }),
      ]),
    };

    const results = await scanAllRoutes([routeWithTimeFilter], [mockProvider], { adults: 2, children: 1 });
    expect(results[0]!.cheapOffers).toHaveLength(1);
    expect(results[0]!.cheapOffers[0]!.flightNumber).toBe('OK');
  });
});
