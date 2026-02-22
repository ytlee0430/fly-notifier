export interface RouteConfig {
  origin: string;
  destination: string;
  enabled: boolean;
  priceThreshold: number; // TWD，家庭含稅總價（2大1小）
  dateRange: { start: string; end: string };
  departureTimeRange?: { earliest: string; latest: string };
  arrivalTimeRange?: { earliest: string; latest: string };
}

export interface AppConfig {
  passengers: { adults: number; children: number };
  routes: RouteConfig[];
}

export const config: AppConfig = {
  passengers: { adults: 2, children: 1 },
  routes: [
    {
      origin: 'TPE',
      destination: 'NRT',
      enabled: true,
      priceThreshold: 25000,
      dateRange: { start: '2026-04-01', end: '2026-06-30' },
      departureTimeRange: { earliest: '06:00', latest: '22:00' },
      arrivalTimeRange: { earliest: '06:00', latest: '23:59' },
    },
    {
      origin: 'TPE',
      destination: 'KIX',
      enabled: true,
      priceThreshold: 22000,
      dateRange: { start: '2026-04-01', end: '2026-06-30' },
      departureTimeRange: { earliest: '06:00', latest: '22:00' },
    },
    {
      origin: 'TPE',
      destination: 'FUK',
      enabled: true,
      priceThreshold: 18000,
      dateRange: { start: '2026-04-01', end: '2026-06-30' },
    },
    {
      origin: 'TPE',
      destination: 'OKA',
      enabled: true,
      priceThreshold: 16000,
      dateRange: { start: '2026-04-01', end: '2026-06-30' },
    },
    {
      origin: 'TPE',
      destination: 'CTS',
      enabled: true,
      priceThreshold: 24000,
      dateRange: { start: '2026-04-01', end: '2026-06-30' },
      departureTimeRange: { earliest: '06:00', latest: '20:00' },
    },
  ],
};
