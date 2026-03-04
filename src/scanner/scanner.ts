import type { RouteConfig } from '../config.js';
import type { FlightOffer, FlightProvider, Passengers } from '../providers/types.js';
import { logger } from '../utils/logger.js';


export interface ScanResult {
  route: string; // "TPE-NRT"
  cheapOffers: FlightOffer[]; // below priceThreshold
  allOffers: FlightOffer[]; // all offers (for morning report)
  lowestPrice: number | null; // null if no offers
  isRoundTrip: boolean; // whether this scan was for round-trip flights
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

export function filterByExcludedAirlines(offers: FlightOffer[], excludeList: string[]): FlightOffer[] {
  const excluded = new Set(excludeList);
  return offers.filter((o) => !excluded.has(o.airline));
}

export function filterByReturnWindow(offers: FlightOffer[], route: RouteConfig): FlightOffer[] {
  if (!route.returnWindowDays || !route.returnDateRange) {
    return offers;
  }

  const minDays = route.returnWindowDays.min ?? 3;
  const maxDays = route.returnWindowDays.max ?? 5;

  return offers.filter((offer) => {
    if (!offer.returnDate) {
      // Not a round-trip offer, keep it
      return true;
    }

    const departureDate = new Date(offer.departureDate);
    const returnDate = new Date(offer.returnDate);

    // Calculate days difference
    const timeDiff = returnDate.getTime() - departureDate.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);

    // Return true if within the configured window
    return daysDiff >= minDays && daysDiff <= maxDays;
  });
}

export async function scanRoute(
  route: RouteConfig,
  providers: FlightProvider[],
  passengers: Passengers,
): Promise<ScanResult> {
  const routeKey = `${route.origin}-${route.destination}`;
  const allOffers: FlightOffer[] = [];

  const effectivePassengers = route.passengers ?? passengers;
  const isRoundTrip = !!route.returnDateRange;

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
  const airlineFiltered = route.excludeAirlines?.length
    ? filterByExcludedAirlines(directFiltered, route.excludeAirlines)
    : directFiltered;
  const returnWindowFiltered = filterByReturnWindow(airlineFiltered, route);
  const cheapOffers = filterByPrice(returnWindowFiltered, route.priceThreshold);

  const lowestPrice =
    airlineFiltered.length > 0
      ? Math.min(...airlineFiltered.map((o) => o.totalPriceTWD))
      : null;

  logger.info({
    module: 'scanner',
    action: 'scanRoute',
    route: routeKey,
    totalFound: allOffers.length,
    afterTimeFilter: timeFiltered.length,
    directOnly: route.directFlightOnly ?? false,
    afterDirectFilter: directFiltered.length,
    excludeAirlines: route.excludeAirlines ?? [],
    afterAirlineFilter: airlineFiltered.length,
    returnWindowDays: route.returnWindowDays,
    afterReturnWindowFilter: returnWindowFiltered.length,
    belowThreshold: cheapOffers.length,
    lowestPrice,
    isRoundTrip,
  });

  return { route: routeKey, cheapOffers, allOffers: airlineFiltered, lowestPrice, isRoundTrip };
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

  logger.info({
    module: 'scanner',
    action: 'scanAllRoutes',
    totalRoutes: enabledRoutes.length,
    roundTripRoutes: enabledRoutes.filter(r => r.returnDateRange).length,
    oneWayRoutes: enabledRoutes.filter(r => !r.returnDateRange).length,
  });

  return results;
}
