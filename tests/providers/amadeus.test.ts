import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FlightOffer } from '../../src/providers/types.js';

// --- Mock amadeus via createRequire (the module uses require('amadeus')) ---
vi.mock('node:module', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:module')>();
  return {
    ...original,
    createRequire: () => (mod: string) => {
      if (mod === 'amadeus') {
        const MockClient = vi.fn().mockImplementation(() => ({
          shopping: {
            flightOffersSearch: {
              get: vi.fn(),
            },
          },
        }));
        return MockClient;
      }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(mod);
    },
  };
});

// --- Isolated transform tests (no SDK needed) ---
describe('Story 2.2: Amadeus Provider - transformOffer', () => {
  // We test the exported transform function directly
  const mockRawOffer = {
    id: 'offer-1',
    itineraries: [
      {
        segments: [
          {
            departure: { iataCode: 'TPE', at: '2026-04-01T09:15:00' },
            arrival: { iataCode: 'NRT', at: '2026-04-01T13:30:00' },
            carrierCode: 'IT',
            number: '201',
            numberOfStops: 0,
          },
        ],
      },
    ],
    price: { currency: 'TWD', grandTotal: '18900.50' },
    validatingAirlineCodes: ['IT'],
  };

  it('正確轉換 departure date 和 time', async () => {
    const { transformOffer } = await import('../../src/providers/amadeus.js');
    const result = transformOffer(mockRawOffer, 'TPE', 'NRT');
    expect(result?.departureDate).toBe('2026-04-01');
    expect(result?.departureTime).toBe('09:15');
  });

  it('正確轉換 arrival time', async () => {
    const { transformOffer } = await import('../../src/providers/amadeus.js');
    const result = transformOffer(mockRawOffer, 'TPE', 'NRT');
    expect(result?.arrivalTime).toBe('13:30');
  });

  it('四捨五入 totalPriceTWD', async () => {
    const { transformOffer } = await import('../../src/providers/amadeus.js');
    const result = transformOffer(mockRawOffer, 'TPE', 'NRT');
    expect(result?.totalPriceTWD).toBe(18901);
  });

  it('flightNumber 格式為 carrierCode+number', async () => {
    const { transformOffer } = await import('../../src/providers/amadeus.js');
    const result = transformOffer(mockRawOffer, 'TPE', 'NRT');
    expect(result?.flightNumber).toBe('IT201');
  });

  it('stops 為 0（直飛）', async () => {
    const { transformOffer } = await import('../../src/providers/amadeus.js');
    const result = transformOffer(mockRawOffer, 'TPE', 'NRT');
    expect(result?.stops).toBe(0);
  });

  it('stops 為 1（一次轉機）', async () => {
    const { transformOffer } = await import('../../src/providers/amadeus.js');
    const twoSegmentOffer = {
      ...mockRawOffer,
      itineraries: [
        {
          segments: [
            {
              departure: { iataCode: 'TPE', at: '2026-04-01T09:15:00' },
              arrival: { iataCode: 'HND', at: '2026-04-01T13:00:00' },
              carrierCode: 'JL',
              number: '100',
              numberOfStops: 0,
            },
            {
              departure: { iataCode: 'HND', at: '2026-04-01T15:00:00' },
              arrival: { iataCode: 'NRT', at: '2026-04-01T16:00:00' },
              carrierCode: 'JL',
              number: '200',
              numberOfStops: 0,
            },
          ],
        },
      ],
    };
    const result = transformOffer(twoSegmentOffer, 'TPE', 'NRT');
    expect(result?.stops).toBe(1);
  });

  it('source 為 amadeus', async () => {
    const { transformOffer } = await import('../../src/providers/amadeus.js');
    const result = transformOffer(mockRawOffer, 'TPE', 'NRT');
    expect(result?.source).toBe('amadeus');
  });

  it('bookingUrl 包含 origin 和 destination', async () => {
    const { transformOffer } = await import('../../src/providers/amadeus.js');
    const result = transformOffer(mockRawOffer, 'TPE', 'NRT');
    expect(result?.bookingUrl).toContain('TPE');
    expect(result?.bookingUrl).toContain('NRT');
  });

  it('空 itineraries 回傳 null', async () => {
    const { transformOffer } = await import('../../src/providers/amadeus.js');
    const emptyOffer = { ...mockRawOffer, itineraries: [] };
    expect(transformOffer(emptyOffer, 'TPE', 'NRT')).toBeNull();
  });

  it('結果符合 FlightOffer 型別', async () => {
    const { transformOffer } = await import('../../src/providers/amadeus.js');
    const result = transformOffer(mockRawOffer, 'TPE', 'NRT') as FlightOffer;
    expect(result.source).toBeDefined();
    expect(result.origin).toBeDefined();
    expect(result.destination).toBeDefined();
    expect(result.departureDate).toBeDefined();
    expect(result.totalPriceTWD).toBeTypeOf('number');
  });
});
