import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FlightOffer } from '../../src/providers/types.js';

describe('SerpApi Provider - transformFlightResult', () => {
  const mockResult = {
    flights: [
      {
        departure_airport: { name: 'Taoyuan', id: 'TPE', time: '2026-07-25 09:15' },
        arrival_airport: { name: 'Narita', id: 'NRT', time: '2026-07-25 13:30' },
        duration: 195,
        airplane: 'A321',
        airline: 'Peach Aviation',
        airline_logo: 'https://logo.com/mm.png',
        flight_number: 'MM 859',
        travel_class: 'Economy',
        legroom: '29 in',
        extensions: [],
      },
    ],
    total_duration: 195,
    price: 18900,
    type: 'One way',
    airline_logo: 'https://logo.com/mm.png',
  };

  it('正確轉換 departure date 和 time', async () => {
    const { transformFlightResult } = await import('../../src/providers/serpapi.js');
    const result = transformFlightResult(mockResult, 'TPE', 'NRT');
    expect(result?.departureDate).toBe('2026-07-25');
    expect(result?.departureTime).toBe('09:15');
  });

  it('正確轉換 arrival time', async () => {
    const { transformFlightResult } = await import('../../src/providers/serpapi.js');
    const result = transformFlightResult(mockResult, 'TPE', 'NRT');
    expect(result?.arrivalTime).toBe('13:30');
  });

  it('四捨五入 totalPriceTWD', async () => {
    const { transformFlightResult } = await import('../../src/providers/serpapi.js');
    const offerWithDecimal = { ...mockResult, price: 18900.7 };
    const result = transformFlightResult(offerWithDecimal, 'TPE', 'NRT');
    expect(result?.totalPriceTWD).toBe(18901);
  });

  it('flightNumber 來自 flight_number', async () => {
    const { transformFlightResult } = await import('../../src/providers/serpapi.js');
    const result = transformFlightResult(mockResult, 'TPE', 'NRT');
    expect(result?.flightNumber).toBe('MM 859');
  });

  it('stops 為 0（直飛）', async () => {
    const { transformFlightResult } = await import('../../src/providers/serpapi.js');
    const result = transformFlightResult(mockResult, 'TPE', 'NRT');
    expect(result?.stops).toBe(0);
  });

  it('stops 為 1（一次轉機）', async () => {
    const { transformFlightResult } = await import('../../src/providers/serpapi.js');
    const twoFlightResult = {
      ...mockResult,
      flights: [
        mockResult.flights[0]!,
        {
          departure_airport: { name: 'Haneda', id: 'HND', time: '2026-07-25 15:00' },
          arrival_airport: { name: 'Narita', id: 'NRT', time: '2026-07-25 16:00' },
          duration: 60,
          airplane: 'A320',
          airline: 'ANA',
          airline_logo: '',
          flight_number: 'NH 100',
          travel_class: 'Economy',
          legroom: '31 in',
          extensions: [],
        },
      ],
    };
    const result = transformFlightResult(twoFlightResult, 'TPE', 'NRT');
    expect(result?.stops).toBe(1);
  });

  it('source 為 serpapi', async () => {
    const { transformFlightResult } = await import('../../src/providers/serpapi.js');
    const result = transformFlightResult(mockResult, 'TPE', 'NRT');
    expect(result?.source).toBe('serpapi');
  });

  it('bookingUrl 包含 origin 和 destination', async () => {
    const { transformFlightResult } = await import('../../src/providers/serpapi.js');
    const result = transformFlightResult(mockResult, 'TPE', 'NRT');
    expect(result?.bookingUrl).toContain('TPE');
    expect(result?.bookingUrl).toContain('NRT');
  });

  it('來回票正確解析回程', async () => {
    const { transformFlightResult } = await import('../../src/providers/serpapi.js');
    const returnResult = {
      flights: [
        {
          departure_airport: { name: 'Narita', id: 'NRT', time: '2026-07-28 14:00' },
          arrival_airport: { name: 'Taoyuan', id: 'TPE', time: '2026-07-28 17:30' },
          duration: 210,
          airplane: 'A321',
          airline: 'Peach Aviation',
          airline_logo: '',
          flight_number: 'MM 860',
          travel_class: 'Economy',
          legroom: '29 in',
          extensions: [],
        },
      ],
      total_duration: 210,
      price: 18900,
      type: 'Round trip',
      airline_logo: '',
    };
    const result = transformFlightResult(mockResult, 'TPE', 'NRT', returnResult);
    expect(result?.returnDate).toBe('2026-07-28');
    expect(result?.returnDepartureTime).toBe('14:00');
    expect(result?.returnArrivalTime).toBe('17:30');
    expect(result?.returnAirline).toBe('Peach Aviation');
    expect(result?.returnFlightNumber).toBe('MM 860');
    expect(result?.returnStops).toBe(0);
  });

  it('單程票無回程欄位', async () => {
    const { transformFlightResult } = await import('../../src/providers/serpapi.js');
    const result = transformFlightResult(mockResult, 'TPE', 'NRT');
    expect(result?.returnDate).toBeUndefined();
    expect(result?.returnDepartureTime).toBeUndefined();
  });

  it('空 flights 回傳 null', async () => {
    const { transformFlightResult } = await import('../../src/providers/serpapi.js');
    const emptyResult = { ...mockResult, flights: [] };
    expect(transformFlightResult(emptyResult, 'TPE', 'NRT')).toBeNull();
  });

  it('結果符合 FlightOffer 型別', async () => {
    const { transformFlightResult } = await import('../../src/providers/serpapi.js');
    const result = transformFlightResult(mockResult, 'TPE', 'NRT') as FlightOffer;
    expect(result.source).toBeDefined();
    expect(result.origin).toBeDefined();
    expect(result.destination).toBeDefined();
    expect(result.departureDate).toBeDefined();
    expect(result.totalPriceTWD).toBeTypeOf('number');
  });
});

describe('SerpApiProvider - search', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('無 SERPAPI_KEY 時回傳空陣列', async () => {
    vi.stubEnv('SERPAPI_KEY', '');
    const { SerpApiProvider } = await import('../../src/providers/serpapi.js');
    const provider = new SerpApiProvider();
    const result = await provider.search(
      { origin: 'TPE', destination: 'NRT', enabled: true, priceThreshold: 25000, dateRange: { start: '2026-07-25', end: '2026-08-02' } },
      { adults: 2, children: 1 },
    );
    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('API 回傳資料時正確轉換', async () => {
    vi.stubEnv('SERPAPI_KEY', 'test-key');
    const { SerpApiProvider } = await import('../../src/providers/serpapi.js');
    const provider = new SerpApiProvider();

    const mockResponse = {
      best_flights: [
        {
          flights: [
            {
              departure_airport: { name: 'Taoyuan', id: 'TPE', time: '2026-07-25 09:00' },
              arrival_airport: { name: 'Narita', id: 'NRT', time: '2026-07-25 13:00' },
              duration: 180, airplane: 'A321', airline: 'Peach',
              airline_logo: '', flight_number: 'MM 101', travel_class: 'Economy', legroom: '', extensions: [],
            },
          ],
          total_duration: 180, price: 15000, type: 'One way', airline_logo: '',
        },
      ],
      other_flights: [],
    };

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), { status: 200 }));

    const result = await provider.search(
      { origin: 'TPE', destination: 'NRT', enabled: true, priceThreshold: 25000, dateRange: { start: '2026-07-25', end: '2026-08-02' } },
      { adults: 2, children: 1 },
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe('serpapi');
    expect(result[0]?.totalPriceTWD).toBe(15000);
  });

  it('directFlightOnly:true 時 URL 包含 stops=0', async () => {
    vi.stubEnv('SERPAPI_KEY', 'test-key');
    const { SerpApiProvider } = await import('../../src/providers/serpapi.js');
    const provider = new SerpApiProvider();

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ best_flights: [], other_flights: [] }), { status: 200 }));

    await provider.search(
      { origin: 'TPE', destination: 'NRT', enabled: true, priceThreshold: 25000, dateRange: { start: '2026-07-25', end: '2026-07-25' }, directFlightOnly: true },
      { adults: 2, children: 1 },
    );

    const calledUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('stops=0');
  });

  it('有 returnDateRange 時 URL 包含 return_date 和 type=1', async () => {
    vi.stubEnv('SERPAPI_KEY', 'test-key');
    const { SerpApiProvider } = await import('../../src/providers/serpapi.js');
    const provider = new SerpApiProvider();

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ best_flights: [], other_flights: [] }), { status: 200 }));

    await provider.search(
      {
        origin: 'TPE', destination: 'NRT', enabled: true, priceThreshold: 25000,
        dateRange: { start: '2026-07-25', end: '2026-08-02' },
        returnDateRange: { start: '2026-07-28', end: '2026-08-07' },
      },
      { adults: 2, children: 1 },
    );

    const calledUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('type=1');
    expect(calledUrl).toContain('return_date=2026-07-28');
  });

  it('無 returnDateRange 時 type=2（one way）', async () => {
    vi.stubEnv('SERPAPI_KEY', 'test-key');
    const { SerpApiProvider } = await import('../../src/providers/serpapi.js');
    const provider = new SerpApiProvider();

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ best_flights: [], other_flights: [] }), { status: 200 }));

    await provider.search(
      { origin: 'TPE', destination: 'NRT', enabled: true, priceThreshold: 25000, dateRange: { start: '2026-07-25', end: '2026-07-25' } },
      { adults: 2, children: 1 },
    );

    const calledUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('type=2');
    expect(calledUrl).not.toContain('return_date');
  });

  it('API 錯誤時回傳空陣列不拋出', async () => {
    vi.stubEnv('SERPAPI_KEY', 'test-key');
    const { SerpApiProvider } = await import('../../src/providers/serpapi.js');
    const provider = new SerpApiProvider();

    fetchSpy.mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }));

    const result = await provider.search(
      { origin: 'TPE', destination: 'NRT', enabled: true, priceThreshold: 25000, dateRange: { start: '2026-07-25', end: '2026-07-25' } },
      { adults: 2, children: 1 },
    );

    expect(result).toEqual([]);
  });

  it('只發一次 API call', async () => {
    vi.stubEnv('SERPAPI_KEY', 'test-key');
    const { SerpApiProvider } = await import('../../src/providers/serpapi.js');
    const provider = new SerpApiProvider();

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ best_flights: [], other_flights: [] }), { status: 200 }));

    await provider.search(
      { origin: 'TPE', destination: 'NRT', enabled: true, priceThreshold: 25000, dateRange: { start: '2026-07-25', end: '2026-08-02' } },
      { adults: 2, children: 1 },
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('API 回傳 error 欄位時正確處理', async () => {
    vi.stubEnv('SERPAPI_KEY', 'test-key');
    const { SerpApiProvider } = await import('../../src/providers/serpapi.js');
    const provider = new SerpApiProvider();

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Invalid API key' }), { status: 200 }));

    const result = await provider.search(
      { origin: 'TPE', destination: 'NRT', enabled: true, priceThreshold: 25000, dateRange: { start: '2026-07-25', end: '2026-07-25' } },
      { adults: 2, children: 1 },
    );

    expect(result).toEqual([]);
  });
});
