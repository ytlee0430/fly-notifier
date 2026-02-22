import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getDedupKey, getRouteCacheKey, isAlreadyNotified, markAsNotified, filterNewOffers, markAllAsNotified } from '../../src/utils/dedup.js';
import type { FlightOffer } from '../../src/providers/types.js';

const TEST_CACHE_DIR = join(process.cwd(), '.cache-test');

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
  totalPriceTWD: 18900,
  currency: 'TWD',
  bookingUrl: 'https://example.com',
  ...overrides,
});

describe('Story 3.2: 去重機制 - getDedupKey', () => {
  it('key 格式為 flightNumber-date-price', () => {
    const offer = makeOffer();
    expect(getDedupKey(offer)).toBe('IT201-2026-04-01-18900');
  });

  it('不同 flightNumber 產生不同 key', () => {
    expect(getDedupKey(makeOffer({ flightNumber: 'IT201' }))).not.toBe(
      getDedupKey(makeOffer({ flightNumber: 'BR100' })),
    );
  });

  it('不同 departureDate 產生不同 key', () => {
    expect(getDedupKey(makeOffer({ departureDate: '2026-04-01' }))).not.toBe(
      getDedupKey(makeOffer({ departureDate: '2026-04-02' })),
    );
  });

  it('不同 totalPriceTWD 產生不同 key', () => {
    expect(getDedupKey(makeOffer({ totalPriceTWD: 18900 }))).not.toBe(
      getDedupKey(makeOffer({ totalPriceTWD: 19000 })),
    );
  });
});

describe('Story 3.2: 去重機制 - getRouteCacheKey', () => {
  it('格式為 dedup-routeKey', () => {
    expect(getRouteCacheKey('TPE-NRT')).toBe('dedup-TPE-NRT');
  });
});

describe('Story 3.2: 去重機制 - isAlreadyNotified / markAsNotified', () => {
  // These tests use the actual .cache directory; clean up after each test
  afterEach(() => {
    // Clean up test cache files
    const cacheDir = join(process.cwd(), '.cache');
    if (existsSync(cacheDir)) {
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it('未通知的航班回傳 false', () => {
    const offer = makeOffer({ flightNumber: 'DEDUP_TEST_001' });
    expect(isAlreadyNotified(offer, 'TPE-NRT-TEST')).toBe(false);
  });

  it('markAsNotified 後 isAlreadyNotified 回傳 true', () => {
    const offer = makeOffer({ flightNumber: 'DEDUP_TEST_002' });
    const routeKey = 'TPE-NRT-TEST2';
    markAsNotified(offer, routeKey);
    expect(isAlreadyNotified(offer, routeKey)).toBe(true);
  });

  it('不同 routeKey 的 cache 互相隔離', () => {
    const offer = makeOffer({ flightNumber: 'DEDUP_ISOLATE_003' });
    markAsNotified(offer, 'TPE-NRT-A');
    expect(isAlreadyNotified(offer, 'TPE-KIX-B')).toBe(false);
  });
});

describe('Story 3.2: 去重機制 - filterNewOffers / markAllAsNotified', () => {
  afterEach(() => {
    const cacheDir = join(process.cwd(), '.cache');
    if (existsSync(cacheDir)) {
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it('filterNewOffers 過濾已通知的航班', () => {
    const notified = makeOffer({ flightNumber: 'FILTER_001' });
    const fresh = makeOffer({ flightNumber: 'FILTER_002' });
    markAsNotified(notified, 'TPE-NRT-FILTER');

    const result = filterNewOffers([notified, fresh], 'TPE-NRT-FILTER');
    expect(result).toHaveLength(1);
    expect(result[0]!.flightNumber).toBe('FILTER_002');
  });

  it('markAllAsNotified 一次標記多筆', () => {
    const offers = [
      makeOffer({ flightNumber: 'BATCH_001' }),
      makeOffer({ flightNumber: 'BATCH_002' }),
    ];
    markAllAsNotified(offers, 'TPE-NRT-BATCH');
    for (const offer of offers) {
      expect(isAlreadyNotified(offer, 'TPE-NRT-BATCH')).toBe(true);
    }
  });

  it('空陣列 markAllAsNotified 不報錯', () => {
    expect(() => markAllAsNotified([], 'TPE-NRT-EMPTY')).not.toThrow();
  });
});
