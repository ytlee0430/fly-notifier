import type { RouteConfig } from '../config.js';
import type { FlightOffer, FlightProvider, Passengers } from './types.js';
import { logger } from '../utils/logger.js';

const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

// ---- SerpApi Google Flights response type wrappers ----
interface SerpApiFlight {
  departure_airport: { name: string; id: string; time: string };
  arrival_airport: { name: string; id: string; time: string };
  duration: number;
  airplane: string;
  airline: string;
  airline_logo: string;
  flight_number: string;
  travel_class: string;
  legroom: string;
  extensions: string[];
}

interface SerpApiFlightResult {
  flights: SerpApiFlight[];
  total_duration: number;
  price: number;
  type: string;
  airline_logo: string;
  departure_token?: string;
  extensions?: string[];
  layovers?: { name: string; duration: number }[];
}

interface SerpApiResponse {
  best_flights?: SerpApiFlightResult[];
  other_flights?: SerpApiFlightResult[];
  search_metadata?: { status: string };
  error?: string;
}
// ----------------------------------------

function parseTime(datetime: string): string {
  // "2026-07-25 09:15" or "2026-07-25T09:15" → "09:15"
  const match = datetime.match(/(\d{2}:\d{2})/);
  return match ? match[1]! : '';
}

function parseDate(datetime: string): string {
  // "2026-07-25 09:15" → "2026-07-25"
  return datetime.split(/[T ]/)[0] ?? datetime;
}

function buildBookingUrl(origin: string, destination: string, departureDate: string, returnDate?: string): string {
  if (returnDate) {
    return `https://www.google.com/travel/flights?q=Flights+${origin}+to+${destination}+on+${departureDate}+return+on+${returnDate}`;
  }
  return `https://www.google.com/travel/flights?q=Flights+${origin}+to+${destination}+on+${departureDate}`;
}

export function transformFlightResult(
  result: SerpApiFlightResult,
  origin: string,
  destination: string,
  returnResult?: SerpApiFlightResult,
): FlightOffer | null {
  if (!result.flights || result.flights.length === 0) return null;

  const firstFlight = result.flights[0]!;
  const lastFlight = result.flights[result.flights.length - 1]!;

  const departureDate = parseDate(firstFlight.departure_airport.time);
  const departureTime = parseTime(firstFlight.departure_airport.time);
  const arrivalTime = parseTime(lastFlight.arrival_airport.time);

  const offer: FlightOffer = {
    source: 'serpapi',
    origin,
    destination,
    departureDate,
    departureTime,
    arrivalTime,
    airline: firstFlight.airline,
    flightNumber: firstFlight.flight_number,
    stops: result.flights.length - 1,
    totalPriceTWD: Math.round(result.price),
    currency: 'TWD',
    bookingUrl: buildBookingUrl(origin, destination, departureDate),
  };

  // 解析回程航班
  if (returnResult && returnResult.flights && returnResult.flights.length > 0) {
    const retFirst = returnResult.flights[0]!;
    const retLast = returnResult.flights[returnResult.flights.length - 1]!;
    offer.returnDate = parseDate(retFirst.departure_airport.time);
    offer.returnDepartureTime = parseTime(retFirst.departure_airport.time);
    offer.returnArrivalTime = parseTime(retLast.arrival_airport.time);
    offer.returnAirline = retFirst.airline;
    offer.returnFlightNumber = retFirst.flight_number;
    offer.returnStops = returnResult.flights.length - 1;
    offer.bookingUrl = buildBookingUrl(origin, destination, departureDate, offer.returnDate);
  }

  return offer;
}

export class SerpApiProvider implements FlightProvider {
  private apiKey: string | null;

  constructor() {
    const apiKey = process.env['SERPAPI_KEY'] ?? '';

    if (!apiKey) {
      logger.warn({ module: 'serpapi-provider', action: 'init', message: 'Missing SERPAPI_KEY — provider disabled' });
      this.apiKey = null;
      return;
    }

    this.apiKey = apiKey;
    logger.info({ module: 'serpapi-provider', action: 'init' });
  }

  async search(route: RouteConfig, passengers: Passengers): Promise<FlightOffer[]> {
    if (!this.apiKey) {
      logger.warn({ module: 'serpapi-provider', action: 'search', message: 'No API key — skipping' });
      return [];
    }

    const effectivePassengers = route.passengers ?? passengers;
    const isRoundTrip = !!route.returnDateRange;

    // SerpApi Google Flights 支援日期範圍搜尋，每個出發日需要一次 API call
    // 為了節省 API 額度，只搜尋日期範圍的起始日
    const departureDate = route.dateRange.start;

    try {
      const params = new URLSearchParams({
        engine: 'google_flights',
        departure_id: route.origin,
        arrival_id: route.destination,
        outbound_date: departureDate,
        adults: String(effectivePassengers.adults),
        children: String(effectivePassengers.children),
        currency: 'TWD',
        hl: 'zh-TW',
        api_key: this.apiKey,
        type: isRoundTrip ? '1' : '2', // 1=round trip, 2=one way
      });

      if (isRoundTrip && route.returnDateRange) {
        params.set('return_date', route.returnDateRange.start);
      }

      if (route.directFlightOnly) {
        params.set('stops', '0'); // 0=nonstop
      }

      const url = `${SERPAPI_BASE_URL}?${params.toString()}`;

      logger.info({ module: 'serpapi-provider', action: 'apiCall', route: `${route.origin}-${route.destination}`, date: departureDate });

      const response = await fetch(url);

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`HTTP ${response.status}: ${body}`);
      }

      const json = (await response.json()) as SerpApiResponse;

      if (json.error) {
        throw new Error(json.error);
      }

      const allResults = [...(json.best_flights ?? []), ...(json.other_flights ?? [])];
      const offers: FlightOffer[] = [];

      for (const result of allResults) {
        const offer = transformFlightResult(result, route.origin, route.destination);
        if (offer) offers.push(offer);
      }

      logger.info({
        module: 'serpapi-provider',
        action: 'search',
        route: `${route.origin}-${route.destination}`,
        found: offers.length,
        bestFlights: json.best_flights?.length ?? 0,
        otherFlights: json.other_flights?.length ?? 0,
      });

      return offers;
    } catch (error) {
      logger.error({
        module: 'serpapi-provider',
        action: 'search',
        route: `${route.origin}-${route.destination}`,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}
