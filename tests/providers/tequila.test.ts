import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FlightOffer } from '../../src/providers/types.js';

describe('formatDateForTequila', () => {
  it('將 ISO date 轉換成 dd/mm/yyyy', async () => {
    const { formatDateForTequila } = await import('../../src/providers/tequila.js');
    expect(formatDateForTequila('2026-07-25')).toBe('25/07/2026');
  });

  it('正確處理單位數月日', async () => {
    const { formatDateForTequila } = await import('../../src/providers/tequila.js');
    expect(formatDateForTequila('2026-01-05')).toBe('05/01/2026');
  });
});

describe('Tequila Provider - transformOffer', () => {
  const mockOffer = {
    id: 'offer-1',
    flyFrom: 'TPE',
    flyTo: 'NRT',
    local_departure: '2026-07-25T09:15:00.000Z',
    local_arrival: '2026-07-25T13:30:00.000Z',
    price: 18900.5,
    airlines: ['IT'],
    route: [
      {
        flyFrom: 'TPE',
        flyTo: 'NRT',
        local_departure: '2026-07-25T09:15:00.000Z',
        local_arrival: '2026-07-25T13:30:00.000Z',
        airline: 'IT',
        flight_no: 201,
        operating_carrier: 'IT',
        return: 0,
      },
    ],
    deep_link: 'https://www.kiwi.com/deep?token=abc123',
  };

  it('正確轉換 departure date 和 time', async () => {
    const { transformOffer } = await import('../../src/providers/tequila.js');
    const result = transformOffer(mockOffer);
    expect(result?.departureDate).toBe('2026-07-25');
    expect(result?.departureTime).toBe('09:15');
  });

  it('正確轉換 arrival time', async () => {
    const { transformOffer } = await import('../../src/providers/tequila.js');
    const result = transformOffer(mockOffer);
    expect(result?.arrivalTime).toBe('13:30');
  });

  it('四捨五入 totalPriceTWD', async () => {
    const { transformOffer } = await import('../../src/providers/tequila.js');
    const result = transformOffer(mockOffer);
    expect(result?.totalPriceTWD).toBe(18901);
  });

  it('flightNumber 格式為 airline+flight_no', async () => {
    const { transformOffer } = await import('../../src/providers/tequila.js');
    const result = transformOffer(mockOffer);
    expect(result?.flightNumber).toBe('IT201');
  });

  it('stops 為 0（直飛）', async () => {
    const { transformOffer } = await import('../../src/providers/tequila.js');
    const result = transformOffer(mockOffer);
    expect(result?.stops).toBe(0);
  });

  it('stops 為 1（一次轉機）', async () => {
    const { transformOffer } = await import('../../src/providers/tequila.js');
    const twoSegmentOffer = {
      ...mockOffer,
      route: [
        {
          flyFrom: 'TPE', flyTo: 'HND',
          local_departure: '2026-07-25T09:15:00.000Z',
          local_arrival: '2026-07-25T13:00:00.000Z',
          airline: 'JL', flight_no: 100, operating_carrier: 'JL', return: 0,
        },
        {
          flyFrom: 'HND', flyTo: 'NRT',
          local_departure: '2026-07-25T15:00:00.000Z',
          local_arrival: '2026-07-25T16:00:00.000Z',
          airline: 'JL', flight_no: 200, operating_carrier: 'JL', return: 0,
        },
      ],
    };
    const result = transformOffer(twoSegmentOffer);
    expect(result?.stops).toBe(1);
  });

  it('source 為 tequila', async () => {
    const { transformOffer } = await import('../../src/providers/tequila.js');
    const result = transformOffer(mockOffer);
    expect(result?.source).toBe('tequila');
  });

  it('bookingUrl 使用 deep_link', async () => {
    const { transformOffer } = await import('../../src/providers/tequila.js');
    const result = transformOffer(mockOffer);
    expect(result?.bookingUrl).toBe('https://www.kiwi.com/deep?token=abc123');
  });

  it('來回票正確解析回程航段', async () => {
    const { transformOffer } = await import('../../src/providers/tequila.js');
    const roundTripOffer = {
      ...mockOffer,
      route: [
        ...mockOffer.route,
        {
          flyFrom: 'NRT', flyTo: 'TPE',
          local_departure: '2026-07-28T14:00:00.000Z',
          local_arrival: '2026-07-28T17:30:00.000Z',
          airline: 'IT', flight_no: 202, operating_carrier: 'IT', return: 1,
        },
      ],
    };
    const result = transformOffer(roundTripOffer);
    expect(result?.returnDate).toBe('2026-07-28');
    expect(result?.returnDepartureTime).toBe('14:00');
    expect(result?.returnArrivalTime).toBe('17:30');
    expect(result?.returnAirline).toBe('IT');
    expect(result?.returnFlightNumber).toBe('IT202');
    expect(result?.returnStops).toBe(0);
  });

  it('單程票無回程欄位', async () => {
    const { transformOffer } = await import('../../src/providers/tequila.js');
    const result = transformOffer(mockOffer);
    expect(result?.returnDate).toBeUndefined();
    expect(result?.returnDepartureTime).toBeUndefined();
  });

  it('空 route 回傳 null', async () => {
    const { transformOffer } = await import('../../src/providers/tequila.js');
    const emptyOffer = { ...mockOffer, route: [] };
    expect(transformOffer(emptyOffer)).toBeNull();
  });

  it('只有回程航段（無去程）回傳 null', async () => {
    const { transformOffer } = await import('../../src/providers/tequila.js');
    const returnOnlyOffer = {
      ...mockOffer,
      route: [
        {
          flyFrom: 'NRT', flyTo: 'TPE',
          local_departure: '2026-07-28T14:00:00.000Z',
          local_arrival: '2026-07-28T17:30:00.000Z',
          airline: 'IT', flight_no: 202, operating_carrier: 'IT', return: 1,
        },
      ],
    };
    expect(transformOffer(returnOnlyOffer)).toBeNull();
  });

  it('結果符合 FlightOffer 型別', async () => {
    const { transformOffer } = await import('../../src/providers/tequila.js');
    const result = transformOffer(mockOffer) as FlightOffer;
    expect(result.source).toBeDefined();
    expect(result.origin).toBeDefined();
    expect(result.destination).toBeDefined();
    expect(result.departureDate).toBeDefined();
    expect(result.totalPriceTWD).toBeTypeOf('number');
  });
});

describe('TequilaProvider - search', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('無 TEQUILA_API_KEY 時回傳空陣列', async () => {
    vi.stubEnv('TEQUILA_API_KEY', '');
    const { TequilaProvider } = await import('../../src/providers/tequila.js');
    const provider = new TequilaProvider();
    const result = await provider.search(
      { origin: 'TPE', destination: 'NRT', enabled: true, priceThreshold: 25000, dateRange: { start: '2026-07-25', end: '2026-07-25' } },
      { adults: 2, children: 1 },
    );
    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('API 回傳資料時正確轉換', async () => {
    vi.stubEnv('TEQUILA_API_KEY', 'test-key');
    const { TequilaProvider } = await import('../../src/providers/tequila.js');
    const provider = new TequilaProvider();

    const mockResponse = {
      data: [
        {
          id: 'offer-1',
          flyFrom: 'TPE', flyTo: 'NRT',
          local_departure: '2026-07-25T09:00:00.000Z',
          local_arrival: '2026-07-25T13:00:00.000Z',
          price: 15000,
          airlines: ['MM'],
          route: [
            {
              flyFrom: 'TPE', flyTo: 'NRT',
              local_departure: '2026-07-25T09:00:00.000Z',
              local_arrival: '2026-07-25T13:00:00.000Z',
              airline: 'MM', flight_no: 101, operating_carrier: 'MM', return: 0,
            },
          ],
          deep_link: 'https://www.kiwi.com/deep?token=abc',
        },
      ],
      currency: 'TWD',
      _results: 1,
    };

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), { status: 200 }));

    const result = await provider.search(
      { origin: 'TPE', destination: 'NRT', enabled: true, priceThreshold: 25000, dateRange: { start: '2026-07-25', end: '2026-08-02' } },
      { adults: 2, children: 1 },
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe('tequila');
    expect(result[0]?.totalPriceTWD).toBe(15000);
    expect(result[0]?.flightNumber).toBe('MM101');
  });

  it('directFlightOnly:true 時 URL 包含 max_stopovers=0', async () => {
    vi.stubEnv('TEQUILA_API_KEY', 'test-key');
    const { TequilaProvider } = await import('../../src/providers/tequila.js');
    const provider = new TequilaProvider();

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ data: [], _results: 0, currency: 'TWD' }), { status: 200 }));

    await provider.search(
      { origin: 'TPE', destination: 'NRT', enabled: true, priceThreshold: 25000, dateRange: { start: '2026-07-25', end: '2026-07-25' }, directFlightOnly: true },
      { adults: 2, children: 1 },
    );

    const calledUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('max_stopovers=0');
  });

  it('有 returnDateRange 時 URL 包含 return_from/return_to 和 flight_type=round', async () => {
    vi.stubEnv('TEQUILA_API_KEY', 'test-key');
    const { TequilaProvider } = await import('../../src/providers/tequila.js');
    const provider = new TequilaProvider();

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ data: [], _results: 0, currency: 'TWD' }), { status: 200 }));

    await provider.search(
      {
        origin: 'TPE', destination: 'NRT', enabled: true, priceThreshold: 25000,
        dateRange: { start: '2026-07-25', end: '2026-08-02' },
        returnDateRange: { start: '2026-07-28', end: '2026-08-07' },
      },
      { adults: 2, children: 1 },
    );

    const calledUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('flight_type=round');
    expect(calledUrl).toContain('return_from=28%2F07%2F2026');
    expect(calledUrl).toContain('return_to=07%2F08%2F2026');
  });

  it('無 returnDateRange 時 flight_type=oneway', async () => {
    vi.stubEnv('TEQUILA_API_KEY', 'test-key');
    const { TequilaProvider } = await import('../../src/providers/tequila.js');
    const provider = new TequilaProvider();

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ data: [], _results: 0, currency: 'TWD' }), { status: 200 }));

    await provider.search(
      { origin: 'TPE', destination: 'NRT', enabled: true, priceThreshold: 25000, dateRange: { start: '2026-07-25', end: '2026-07-25' } },
      { adults: 2, children: 1 },
    );

    const calledUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('flight_type=oneway');
    expect(calledUrl).not.toContain('return_from');
  });

  it('per-route passengers 優先於全域', async () => {
    vi.stubEnv('TEQUILA_API_KEY', 'test-key');
    const { TequilaProvider } = await import('../../src/providers/tequila.js');
    const provider = new TequilaProvider();

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ data: [], _results: 0, currency: 'TWD' }), { status: 200 }));

    await provider.search(
      {
        origin: 'TPE', destination: 'NRT', enabled: true, priceThreshold: 25000,
        dateRange: { start: '2026-07-25', end: '2026-07-25' },
        passengers: { adults: 1, children: 0 },
      },
      { adults: 2, children: 1 },
    );

    const calledUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('adults=1');
    expect(calledUrl).toContain('children=0');
  });

  it('API 錯誤時回傳空陣列不拋出', async () => {
    vi.stubEnv('TEQUILA_API_KEY', 'test-key');
    const { TequilaProvider } = await import('../../src/providers/tequila.js');
    const provider = new TequilaProvider();

    fetchSpy.mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }));

    const result = await provider.search(
      { origin: 'TPE', destination: 'NRT', enabled: true, priceThreshold: 25000, dateRange: { start: '2026-07-25', end: '2026-07-25' } },
      { adults: 2, children: 1 },
    );

    expect(result).toEqual([]);
  });

  it('只發一次 API call（不像 Amadeus 逐天呼叫）', async () => {
    vi.stubEnv('TEQUILA_API_KEY', 'test-key');
    const { TequilaProvider } = await import('../../src/providers/tequila.js');
    const provider = new TequilaProvider();

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ data: [], _results: 0, currency: 'TWD' }), { status: 200 }));

    await provider.search(
      { origin: 'TPE', destination: 'NRT', enabled: true, priceThreshold: 25000, dateRange: { start: '2026-07-25', end: '2026-08-02' } },
      { adults: 2, children: 1 },
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('日期格式正確傳給 API（dd/mm/yyyy）', async () => {
    vi.stubEnv('TEQUILA_API_KEY', 'test-key');
    const { TequilaProvider } = await import('../../src/providers/tequila.js');
    const provider = new TequilaProvider();

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ data: [], _results: 0, currency: 'TWD' }), { status: 200 }));

    await provider.search(
      { origin: 'TPE', destination: 'NRT', enabled: true, priceThreshold: 25000, dateRange: { start: '2026-07-25', end: '2026-08-02' } },
      { adults: 2, children: 1 },
    );

    const calledUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('date_from=25%2F07%2F2026');
    expect(calledUrl).toContain('date_to=02%2F08%2F2026');
  });
});
