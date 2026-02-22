import type { RouteConfig } from '../config.js';
import type { FlightOffer, FlightProvider, Passengers } from '../providers/types.js';
import { logger } from '../utils/logger.js';

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
  const cheapOffers = filterByPrice(directFiltered, route.priceThreshold);

  const lowestPrice =
    directFiltered.length > 0
      ? Math.min(...directFiltered.map((o) => o.totalPriceTWD))
      : null;

  logger.info({
    module: 'scanner',
    action: 'scanRoute',
    route: routeKey,
    totalFound: allOffers.length,
    afterTimeFilter: timeFiltered.length,
    directOnly: route.directFlightOnly ?? false,
    afterDirectFilter: directFiltered.length,
    belowThreshold: cheapOffers.length,
    lowestPrice,
  });

  return { route: routeKey, cheapOffers, allOffers: directFiltered, lowestPrice };
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
