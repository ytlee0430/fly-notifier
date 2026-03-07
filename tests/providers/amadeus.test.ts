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

describe('generateDateRange', () => {
  it('單天範圍回傳一個日期', async () => {
    const { generateDateRange } = await import('../../src/providers/amadeus.js');
    expect(generateDateRange('2026-04-01', '2026-04-01')).toEqual(['2026-04-01']);
  });

  it('多天範圍回傳所有日期', async () => {
    const { generateDateRange } = await import('../../src/providers/amadeus.js');
    expect(generateDateRange('2026-04-01', '2026-04-03')).toEqual(['2026-04-01', '2026-04-02', '2026-04-03']);
  });

  it('跨月正確', async () => {
    const { generateDateRange } = await import('../../src/providers/amadeus.js');
    const result = generateDateRange('2026-03-30', '2026-04-02');
    expect(result).toEqual(['2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02']);
  });
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

  it('來回票正確解析回程 itinerary', async () => {
    const { transformOffer } = await import('../../src/providers/amadeus.js');
    const roundTripOffer = {
      ...mockRawOffer,
      itineraries: [
        mockRawOffer.itineraries[0]!,
        {
          segments: [
            {
              departure: { iataCode: 'NRT', at: '2026-04-05T14:00:00' },
              arrival: { iataCode: 'TPE', at: '2026-04-05T17:30:00' },
              carrierCode: 'IT',
              number: '202',
              numberOfStops: 0,
            },
          ],
        },
      ],
    };
    const result = transformOffer(roundTripOffer, 'TPE', 'NRT');
    expect(result?.returnDate).toBe('2026-04-05');
    expect(result?.returnDepartureTime).toBe('14:00');
    expect(result?.returnArrivalTime).toBe('17:30');
    expect(result?.returnAirline).toBe('IT');
    expect(result?.returnFlightNumber).toBe('IT202');
    expect(result?.returnStops).toBe(0);
  });

  it('單程票無回程欄位', async () => {
    const { transformOffer } = await import('../../src/providers/amadeus.js');
    const result = transformOffer(mockRawOffer, 'TPE', 'NRT');
    expect(result?.returnDate).toBeUndefined();
    expect(result?.returnDepartureTime).toBeUndefined();
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

describe('AmadeusProvider - search params', () => {
  it('directFlightOnly:true 時 API params 包含 nonStop:true', async () => {
    vi.stubEnv('AMADEUS_CLIENT_ID', 'test-id');
    vi.stubEnv('AMADEUS_CLIENT_SECRET', 'test-secret');

    const { AmadeusProvider } = await import('../../src/providers/amadeus.js');
    const provider = new AmadeusProvider();

    const getMock = vi.fn().mockResolvedValue({ data: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (provider as any).client = { shopping: { flightOffersSearch: { get: getMock } } };

    const route = {
      origin: 'TPE', destination: 'NRT', enabled: true,
      priceThreshold: 25000, dateRange: { start: '2026-04-01', end: '2026-04-01' },
      directFlightOnly: true,
    };
    await provider.search(route, { adults: 2, children: 1 });

    expect(getMock).toHaveBeenCalledWith(expect.objectContaining({ nonStop: 'true' }));

    vi.unstubAllEnvs();
  });

  it('directFlightOnly 未設定時 API params 不含 nonStop', async () => {
    vi.stubEnv('AMADEUS_CLIENT_ID', 'test-id');
    vi.stubEnv('AMADEUS_CLIENT_SECRET', 'test-secret');

    const { AmadeusProvider } = await import('../../src/providers/amadeus.js');
    const provider = new AmadeusProvider();
    const getMock = vi.fn().mockResolvedValue({ data: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (provider as any).client = { shopping: { flightOffersSearch: { get: getMock } } };

    const route = {
      origin: 'TPE', destination: 'NRT', enabled: true,
      priceThreshold: 25000, dateRange: { start: '2026-04-01', end: '2026-04-01' },
    };
    await provider.search(route, { adults: 2, children: 1 });

    const calledWith = getMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(calledWith['nonStop']).toBeUndefined();

    vi.unstubAllEnvs();
  });

  it('有 returnDateRange 時 API params 包含 returnDate', async () => {
    vi.stubEnv('AMADEUS_CLIENT_ID', 'test-id');
    vi.stubEnv('AMADEUS_CLIENT_SECRET', 'test-secret');

    const { AmadeusProvider } = await import('../../src/providers/amadeus.js');
    const provider = new AmadeusProvider();
    const getMock = vi.fn().mockResolvedValue({ data: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (provider as any).client = { shopping: { flightOffersSearch: { get: getMock } } };

    const route = {
      origin: 'TPE', destination: 'NRT', enabled: true,
      priceThreshold: 25000, dateRange: { start: '2026-04-01', end: '2026-04-01' },
      returnDateRange: { start: '2026-04-05', end: '2026-04-10' },
    };
    await provider.search(route, { adults: 2, children: 1 });

    // 無 returnWindowDays 時預設 departure +3 = 04-04，但 returnDateRange.start 是 04-05 取較晚者
    expect(getMock).toHaveBeenCalledWith(expect.objectContaining({ returnDate: '2026-04-05' }));

    vi.unstubAllEnvs();
  });

  it('有 returnWindowDays 時使用 departure + min 作為 returnDate', async () => {
    vi.stubEnv('AMADEUS_CLIENT_ID', 'test-id');
    vi.stubEnv('AMADEUS_CLIENT_SECRET', 'test-secret');

    const { AmadeusProvider } = await import('../../src/providers/amadeus.js');
    const provider = new AmadeusProvider();
    const getMock = vi.fn().mockResolvedValue({ data: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (provider as any).client = { shopping: { flightOffersSearch: { get: getMock } } };

    const route = {
      origin: 'TPE', destination: 'NRT', enabled: true,
      priceThreshold: 25000, dateRange: { start: '2026-04-01', end: '2026-04-01' },
      returnDateRange: { start: '2026-04-01', end: '2026-04-10' },
      returnWindowDays: { min: 3, max: 5 },
    };
    await provider.search(route, { adults: 2, children: 1 });

    expect(getMock).toHaveBeenCalledWith(expect.objectContaining({ returnDate: '2026-04-04' }));

    vi.unstubAllEnvs();
  });

  it('無 returnDateRange 時 API params 不含 returnDate', async () => {
    vi.stubEnv('AMADEUS_CLIENT_ID', 'test-id');
    vi.stubEnv('AMADEUS_CLIENT_SECRET', 'test-secret');

    const { AmadeusProvider } = await import('../../src/providers/amadeus.js');
    const provider = new AmadeusProvider();
    const getMock = vi.fn().mockResolvedValue({ data: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (provider as any).client = { shopping: { flightOffersSearch: { get: getMock } } };

    const route = {
      origin: 'TPE', destination: 'NRT', enabled: true,
      priceThreshold: 25000, dateRange: { start: '2026-04-01', end: '2026-04-01' },
    };
    await provider.search(route, { adults: 2, children: 1 });

    const calledWith = getMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(calledWith['returnDate']).toBeUndefined();

    vi.unstubAllEnvs();
  });

  it('per-route passengers 優先於全域', async () => {
    vi.stubEnv('AMADEUS_CLIENT_ID', 'test-id');
    vi.stubEnv('AMADEUS_CLIENT_SECRET', 'test-secret');

    const { AmadeusProvider } = await import('../../src/providers/amadeus.js');
    const provider = new AmadeusProvider();
    const getMock = vi.fn().mockResolvedValue({ data: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (provider as any).client = { shopping: { flightOffersSearch: { get: getMock } } };

    const route = {
      origin: 'TPE', destination: 'NRT', enabled: true,
      priceThreshold: 25000, dateRange: { start: '2026-04-01', end: '2026-04-01' },
      passengers: { adults: 1, children: 0 },
    };
    await provider.search(route, { adults: 2, children: 1 }); // global=2+1

    expect(getMock).toHaveBeenCalledWith(expect.objectContaining({ adults: 1, children: 0 }));

    vi.unstubAllEnvs();
  });

  it('dateRange 多天時遍歷每天呼叫 API', async () => {
    vi.stubEnv('AMADEUS_CLIENT_ID', 'test-id');
    vi.stubEnv('AMADEUS_CLIENT_SECRET', 'test-secret');

    const { AmadeusProvider } = await import('../../src/providers/amadeus.js');
    const provider = new AmadeusProvider();
    const getMock = vi.fn().mockResolvedValue({ data: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (provider as any).client = { shopping: { flightOffersSearch: { get: getMock } } };

    const route = {
      origin: 'TPE', destination: 'NRT', enabled: true,
      priceThreshold: 25000, dateRange: { start: '2026-04-01', end: '2026-04-03' },
    };
    await provider.search(route, { adults: 2, children: 1 });

    expect(getMock).toHaveBeenCalledTimes(3);
    expect(getMock).toHaveBeenCalledWith(expect.objectContaining({ departureDate: '2026-04-01' }));
    expect(getMock).toHaveBeenCalledWith(expect.objectContaining({ departureDate: '2026-04-02' }));
    expect(getMock).toHaveBeenCalledWith(expect.objectContaining({ departureDate: '2026-04-03' }));

    vi.unstubAllEnvs();
  });
});
