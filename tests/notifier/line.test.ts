import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FlightOffer } from '../../src/providers/types.js';
import { formatOffer, formatMorningReportItem, sendLowPriceAlert, sendMorningReport } from '../../src/notifier/line.js';

let mockPushMessage: ReturnType<typeof vi.fn>;

vi.mock('@line/bot-sdk', () => {
  // Use a module-level variable to hold the pushMessage mock
  return {
    messagingApi: {
      MessagingApiClient: vi.fn(function () {
        return {
          get pushMessage() {
            return mockPushMessage;
          },
        };
      }),
    },
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
  totalPriceTWD: 18900,
  currency: 'TWD',
  bookingUrl: 'https://example.com',
  ...overrides,
});

describe('Story 3.1: LINE 通知模組 - formatOffer', () => {
  it('包含 origin → destination', () => {
    expect(formatOffer(makeOffer())).toContain('TPE → NRT');
  });

  it('包含出發日期', () => {
    expect(formatOffer(makeOffer())).toContain('2026-04-01');
  });

  it('包含出發/抵達時間', () => {
    const result = formatOffer(makeOffer());
    expect(result).toContain('09:00');
    expect(result).toContain('13:00');
  });

  it('包含航空公司和航班號', () => {
    expect(formatOffer(makeOffer())).toContain('IT201');
  });

  it('stops=0 顯示直飛', () => {
    expect(formatOffer(makeOffer({ stops: 0 }))).toContain('直飛');
  });

  it('stops=1 顯示轉機 1 次', () => {
    expect(formatOffer(makeOffer({ stops: 1 }))).toContain('轉機 1 次');
  });

  it('包含含稅總價格式化', () => {
    expect(formatOffer(makeOffer({ totalPriceTWD: 18900 }))).toContain('18,900');
  });

  it('包含 bookingUrl', () => {
    expect(formatOffer(makeOffer())).toContain('https://example.com');
  });
});

describe('Story 3.1: LINE 通知模組 - sendLowPriceAlert', () => {
  beforeEach(() => {
    vi.stubEnv('LINE_CHANNEL_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('LINE_USER_ID', 'test-user');
    mockPushMessage = vi.fn().mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('offers 為空時不發送，回傳 success:true sent:0', async () => {
    const result = await sendLowPriceAlert([]);
    expect(result).toEqual({ success: true, sent: 0 });
    expect(mockPushMessage).not.toHaveBeenCalled();
  });

  it('成功發送時回傳 success:true 和 sent 數量', async () => {
    const offers = [makeOffer(), makeOffer({ destination: 'KIX' })];
    const result = await sendLowPriceAlert(offers);
    expect(result.success).toBe(true);
    expect(result.sent).toBe(2);
    expect(mockPushMessage).toHaveBeenCalledOnce();
  });

  it('API 失敗時回傳 success:false，不 throw', async () => {
    mockPushMessage = vi.fn().mockRejectedValue(new Error('LINE API error'));
    const result = await sendLowPriceAlert([makeOffer()]);
    expect(result.success).toBe(false);
    expect(result.sent).toBe(0);
  });
});

describe('Story 4.1: sendMorningReport', () => {
  beforeEach(() => {
    vi.stubEnv('LINE_CHANNEL_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('LINE_USER_ID', 'test-user');
    mockPushMessage = vi.fn().mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('彙整摘要包含各航線資訊並成功發送', async () => {
    const summary = [
      { route: 'TPE-NRT', lowestPrice: 17491, bestOffer: makeOffer({ destination: 'NRT', totalPriceTWD: 17491, airline: 'CI', flightNumber: 'CI001', departureTime: '09:00', stops: 0 }) },
      { route: 'TPE-KIX', lowestPrice: 15071, bestOffer: makeOffer({ destination: 'KIX', totalPriceTWD: 15071, airline: 'IT', flightNumber: 'IT202', departureTime: '10:30', stops: 0 }) },
    ];
    const result = await sendMorningReport(summary);
    expect(result.success).toBe(true);
    expect(result.sent).toBe(1);
    expect(mockPushMessage).toHaveBeenCalledOnce();
    const callArg = mockPushMessage.mock.calls[0]![0] as {
      to: string;
      messages: Array<{ type: string; text: string }>;
    };
    expect(callArg.to).toBe('test-user');
    expect(callArg.messages[0]!.type).toBe('text');
    const text = callArg.messages[0]!.text;
    expect(text).toContain('早報');
    expect(text).toContain('17,491');
    expect(text).toContain('CI001');
  });

  it('有航線無資料時仍發送，顯示無資料', async () => {
    const summary = [
      { route: 'TPE-NRT', lowestPrice: 17491, bestOffer: makeOffer({ totalPriceTWD: 17491 }) },
      { route: 'TPE-FUK', lowestPrice: null, bestOffer: null },
    ];
    const result = await sendMorningReport(summary);
    expect(result.success).toBe(true);
    const callArg = mockPushMessage.mock.calls[0]![0] as { messages: Array<{ text: string }> };
    expect(callArg.messages[0]!.text).toContain('無資料');
  });

  it('LINE API 失敗時回傳 success:false，不 throw', async () => {
    mockPushMessage = vi.fn().mockRejectedValue(new Error('LINE error'));
    const result = await sendMorningReport([{ route: 'TPE-NRT', lowestPrice: 17491, bestOffer: makeOffer() }]);
    expect(result.success).toBe(false);
    expect(result.sent).toBe(0);
  });

  it('來回票摘要包含去程和回程資訊', async () => {
    const roundTripOffer = makeOffer({
      departureDate: '2026-07-25',
      departureTime: '09:00',
      arrivalTime: '13:30',
      airline: 'JL',
      flightNumber: 'JL802',
      returnDate: '2026-07-28',
      returnDepartureTime: '14:00',
      returnArrivalTime: '17:30',
      returnAirline: 'JL',
      returnFlightNumber: 'JL803',
      returnStops: 0,
    });
    const summary = [{ route: 'TPE-NRT', lowestPrice: 17491, bestOffer: roundTripOffer }];
    const result = await sendMorningReport(summary);
    expect(result.success).toBe(true);
    const callArg = mockPushMessage.mock.calls[0]![0] as { messages: Array<{ text: string }> };
    const text = callArg.messages[0]!.text;
    expect(text).toContain('來回');
    expect(text).toContain('去 07-25 09:00→13:30');
    expect(text).toContain('回 07-28 14:00→17:30');
    expect(text).toContain('17,491');
  });
});

describe('formatMorningReportItem', () => {
  it('來回票顯示去回程資訊', () => {
    const offer = makeOffer({
      departureDate: '2026-07-25',
      returnDate: '2026-07-28',
      returnDepartureTime: '14:00',
      returnArrivalTime: '17:30',
      returnAirline: 'JL',
      returnFlightNumber: 'JL803',
      returnStops: 0,
    });
    const result = formatMorningReportItem({ route: 'TPE-NRT', lowestPrice: 18900, bestOffer: offer });
    expect(result).toContain('來回');
    expect(result).toContain('去');
    expect(result).toContain('回');
  });

  it('單程票顯示單行格式', () => {
    const result = formatMorningReportItem({ route: 'TPE-NRT', lowestPrice: 18900, bestOffer: makeOffer() });
    expect(result).not.toContain('來回');
    expect(result).toContain('18,900');
  });

  it('無資料顯示無資料', () => {
    const result = formatMorningReportItem({ route: 'TPE-FUK', lowestPrice: null, bestOffer: null });
    expect(result).toContain('無資料');
  });
});
