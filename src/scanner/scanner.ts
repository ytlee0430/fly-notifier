import type { RouteConfig } from '../config.js';
import type { FlightOffer, FlightProvider, Passengers } from '../providers/types.js';
import { logger } from '../utils/logger.js';

// 亞太航線主要廉價航空（LCC）IATA 代碼
export const BUDGET_AIRLINES = new Set([
  'IT', // Tigerair Taiwan 台灣虎航
  'TR', // Scoot 酷航
  'MM', // Peach Aviation 樂桃航空
  'GK', // Jetstar Japan 捷星日本
  '3K', // Jetstar Asia 捷星亞洲
  'JW', // Vanilla Air（已併入 Peach）
  '9C', // Spring Airlines 春秋航空
  'HO', // Juneyao Airlines 吉祥航空（部分為 LCC）
  'ZV', // V Air 威航（已停航，保留供歷史資料）
  'AK', // AirAsia
  'FD', // AirAsia Thailand
  'QZ', // AirAsia Indonesia
  'Z2', // AirAsia Philippines
  'D7', // AirAsia X
]);

export interface ScanResult {
  route: string; // "TPE-NRT"
  cheapOffers: FlightOffer[]; // below priceThreshold
  allOffers: FlightOffer[]; // all offers (for morning report)
  lowestPrice: number | null; // null if no offers
}

function isTimeInRange(time: string, range: { earliest: string; latest: string }): boolean {
  if (!time) return false;
  return time >= range.earliest && time <= range.latest;
}

export function filterByTimeRange(offers: FlightOffer[], route: RouteConfig): FlightOffer[] {
  return offers.filter((offer) => {
    if (route.departureTimeRange) {
      if (!isTimeInRange(offer.departureTime, route.departureTimeRange)) return false;
    }
    if (route.arrivalTimeRange) {
      if (!isTimeInRange(offer.arrivalTime, route.arrivalTimeRange)) return false;
    }
    return true;
  });
}

export function filterByPrice(offers: FlightOffer[], priceThreshold: number): FlightOffer[] {
  return offers.filter((o) => o.totalPriceTWD <= priceThreshold);
}

export function filterByDirectFlight(offers: FlightOffer[]): FlightOffer[] {
  return offers.filter((o) => o.stops === 0);
}

export function filterByBudgetAirline(offers: FlightOffer[]): FlightOffer[] {
  return offers.filter((o) => BUDGET_AIRLINES.has(o.airline));
}

export async function scanRoute(
  route: RouteConfig,
  providers: FlightProvider[],
  passengers: Passengers,
): Promise<ScanResult> {
  const routeKey = `${route.origin}-${route.destination}`;
  const allOffers: FlightOffer[] = [];

  const effectivePassengers = route.passengers ?? passengers;

  for (const provider of providers) {
    try {
      const offers = await provider.search(route, effectivePassengers);
      allOffers.push(...offers);
    } catch (error) {
      logger.error({
        module: 'scanner',
        action: 'scanRoute',
        route: routeKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const timeFiltered = filterByTimeRange(allOffers, route);
  const directFiltered = route.directFlightOnly ? filterByDirectFlight(timeFiltered) : timeFiltered;
  const budgetFiltered = route.budgetAirlineOnly ? filterByBudgetAirline(directFiltered) : directFiltered;
  const cheapOffers = filterByPrice(budgetFiltered, route.priceThreshold);

  const lowestPrice =
    budgetFiltered.length > 0
      ? Math.min(...budgetFiltered.map((o) => o.totalPriceTWD))
      : null;

  logger.info({
    module: 'scanner',
    action: 'scanRoute',
    route: routeKey,
    totalFound: allOffers.length,
    afterTimeFilter: timeFiltered.length,
    directOnly: route.directFlightOnly ?? false,
    afterDirectFilter: directFiltered.length,
    budgetOnly: route.budgetAirlineOnly ?? false,
    afterBudgetFilter: budgetFiltered.length,
    belowThreshold: cheapOffers.length,
    lowestPrice,
  });

  return { route: routeKey, cheapOffers, allOffers: budgetFiltered, lowestPrice };
}

export async function scanAllRoutes(
  routes: RouteConfig[],
  providers: FlightProvider[],
  passengers: Passengers,
): Promise<ScanResult[]> {
  const enabledRoutes = routes.filter((r) => r.enabled);
  const results: ScanResult[] = [];

  for (const route of enabledRoutes) {
    try {
      const result = await scanRoute(route, providers, passengers);
      results.push(result);
    } catch (error) {
      logger.error({
        module: 'scanner',
        action: 'scanAllRoutes',
        route: `${route.origin}-${route.destination}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
