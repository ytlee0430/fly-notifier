export interface RouteConfig {
  origin: string;
  destination: string;
  enabled: boolean;
  priceThreshold: number;          // TWD，含稅總價
  dateRange: { start: string; end: string }; // 去程日期範圍
  returnDateRange?: { start: string; end: string }; // 來回機票的回程日期範圍
  departureTimeRange?: { earliest: string; latest: string };
  arrivalTimeRange?: { earliest: string; latest: string };
  directFlightOnly?: boolean;      // true = 只搜尋直飛航班
  excludeAirlines?: string[];      // 排除指定航空公司 IATA 代碼，例如 ['CI', 'BR']
  passengers?: { adults: number; children: number }; // 覆蓋全域預設（未設定時使用 AppConfig.passengers）
  returnWindowDays?: { min: number; max: number }; // 回程必須在去程之後的天數範圍（例如 { min: 3, max: 5 }）
}

export interface AppConfig {
  passengers: { adults: number; children: number }; // 全域預設：2大1小
  routes: RouteConfig[];
}

export const config: AppConfig = {
  // 全域預設乘客：2大1小（可被各航線的 passengers 覆蓋）
  passengers: { adults: 2, children: 1 },
  routes: [
    {
      origin: 'TPE',
      destination: 'NRT',
      enabled: true,
      priceThreshold: 25000,
      dateRange: { start: '2026-07-25', end: '2026-08-02' },
      returnDateRange: { start: '2026-07-25', end: '2026-08-02' },
      departureTimeRange: { earliest: '06:00', latest: '22:00' },
      arrivalTimeRange: { earliest: '06:00', latest: '23:59' },
      directFlightOnly: true,
      excludeAirlines: ['CI'],
      returnWindowDays: { min: 3, max: 5 }, // 回程必須在去程之後的3-5天內
    },
    {
      origin: 'TPE',
      destination: 'KIX',
      enabled: true,
      priceThreshold: 22000,
      dateRange: { start: '2026-07-25', end: '2026-08-02' },
      returnDateRange: { start: '2026-07-25', end: '2026-08-02' },
      departureTimeRange: { earliest: '06:00', latest: '22:00' },
      arrivalTimeRange: { earliest: '06:00', latest: '23:59' },
      directFlightOnly: true,
      excludeAirlines: ['CI'],
      returnWindowDays: { min: 2, max: 7 }, // 回程必須在去程之後的2-7天內
    },
    {
      origin: 'TPE',
      destination: 'FUK',
      enabled: true,
      priceThreshold: 18000,
      dateRange: { start: '2026-07-25', end: '2026-08-02' },
      returnDateRange: { start: '2026-07-25', end: '2026-08-02' },
      departureTimeRange: { earliest: '06:00', latest: '22:00' },
      arrivalTimeRange: { earliest: '06:00', latest: '23:59' },
      directFlightOnly: true,
      excludeAirlines: ['CI'],
    },
    {
      origin: 'TPE',
      destination: 'OKA',
      enabled: true,
      priceThreshold: 16000,
      dateRange: { start: '2026-07-25', end: '2026-08-02' },
      returnDateRange: { start: '2026-07-25', end: '2026-08-02' },
      departureTimeRange: { earliest: '06:00', latest: '22:00' },
      arrivalTimeRange: { earliest: '06:00', latest: '23:59' },
      directFlightOnly: true,
      excludeAirlines: ['CI'],
    },
    {
      origin: 'TPE',
      destination: 'CTS',
      enabled: true,
      priceThreshold: 24000,
      dateRange: { start: '2026-07-25', end: '2026-08-02' },
      returnDateRange: { start: '2026-07-25', end: '2026-08-02' },
      departureTimeRange: { earliest: '06:00', latest: '20:00' },
      arrivalTimeRange: { earliest: '06:00', latest: '23:59' },
      directFlightOnly: true,
      excludeAirlines: ['CI'],
    },
  ],
};
