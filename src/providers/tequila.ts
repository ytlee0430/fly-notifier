import type { RouteConfig } from '../config.js';
import type { FlightOffer, FlightProvider, Passengers } from './types.js';
import { logger } from '../utils/logger.js';

const TEQUILA_BASE_URL = 'https://api.tequila.kiwi.com/v2/search';

// ---- Tequila response type wrappers ----
interface TequilaSegment {
  flyFrom: string;
  flyTo: string;
  local_departure: string;
  local_arrival: string;
  airline: string;
  flight_no: number;
  operating_carrier: string;
  return: number; // 0 = outbound, 1 = return
}

interface TequilaOffer {
  id: string;
  flyFrom: string;
  flyTo: string;
  local_departure: string;
  local_arrival: string;
  price: number;
  airlines: string[];
  route: TequilaSegment[];
  deep_link: string;
}

interface TequilaResponse {
  data: TequilaOffer[];
  currency: string;
  _results: number;
}
// ----------------------------------------

/** Convert "2026-07-25" → "25/07/2026" (Tequila date format) */
export function formatDateForTequila(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function parseTime(localDatetime: string): string {
  const timePart = localDatetime.split('T')[1];
  return timePart ? timePart.slice(0, 5) : '';
}

function parseDate(localDatetime: string): string {
  return localDatetime.split('T')[0] ?? localDatetime;
}

export function transformOffer(offer: TequilaOffer): FlightOffer | null {
  const outbound = offer.route.filter((s) => s.return === 0);
  const inbound = offer.route.filter((s) => s.return === 1);
  if (outbound.length === 0) return null;

  const firstOut = outbound[0]!;
  const lastOut = outbound[outbound.length - 1]!;

  const result: FlightOffer = {
    source: 'tequila',
    origin: offer.flyFrom,
    destination: offer.flyTo,
    departureDate: parseDate(firstOut.local_departure),
    departureTime: parseTime(firstOut.local_departure),
    arrivalTime: parseTime(lastOut.local_arrival),
    airline: firstOut.airline,
    flightNumber: `${firstOut.airline}${firstOut.flight_no}`,
    stops: outbound.length - 1,
    totalPriceTWD: Math.round(offer.price),
    currency: 'TWD',
    bookingUrl: offer.deep_link,
  };

  // 解析回程航段（route[].return === 1）
  if (inbound.length > 0) {
    const firstIn = inbound[0]!;
    const lastIn = inbound[inbound.length - 1]!;
    result.returnDate = parseDate(firstIn.local_departure);
    result.returnDepartureTime = parseTime(firstIn.local_departure);
    result.returnArrivalTime = parseTime(lastIn.local_arrival);
    result.returnAirline = firstIn.airline;
    result.returnFlightNumber = `${firstIn.airline}${firstIn.flight_no}`;
    result.returnStops = inbound.length - 1;
  }

  return result;
}

export class TequilaProvider implements FlightProvider {
  private apiKey: string | null;

  constructor() {
    const apiKey = process.env['TEQUILA_API_KEY'] ?? '';

    if (!apiKey) {
      logger.warn({ module: 'tequila-provider', action: 'init', message: 'Missing TEQUILA_API_KEY — provider disabled' });
      this.apiKey = null;
      return;
    }

    this.apiKey = apiKey;
    logger.info({ module: 'tequila-provider', action: 'init' });
  }

  async search(route: RouteConfig, passengers: Passengers): Promise<FlightOffer[]> {
    if (!this.apiKey) {
      logger.warn({ module: 'tequila-provider', action: 'search', message: 'No API key — skipping' });
      return [];
    }

    const effectivePassengers = route.passengers ?? passengers;

    try {
      const params = new URLSearchParams({
        fly_from: route.origin,
        fly_to: route.destination,
        date_from: formatDateForTequila(route.dateRange.start),
        date_to: formatDateForTequila(route.dateRange.end),
        adults: String(effectivePassengers.adults),
        children: String(effectivePassengers.children),
        curr: 'TWD',
        flight_type: route.returnDateRange ? 'round' : 'oneway',
        limit: '20',
        sort: 'price',
      });

      if (route.returnDateRange) {
        params.set('return_from', formatDateForTequila(route.returnDateRange.start));
        params.set('return_to', formatDateForTequila(route.returnDateRange.end));
      }

      if (route.directFlightOnly) {
        params.set('max_stopovers', '0');
      }

      const url = `${TEQUILA_BASE_URL}?${params.toString()}`;

      logger.info({ module: 'tequila-provider', action: 'apiCall', route: `${route.origin}-${route.destination}`, url });

      const response = await fetch(url, {
        headers: { apikey: this.apiKey },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`HTTP ${response.status}: ${body}`);
      }

      const json = (await response.json()) as TequilaResponse;
      const offers: FlightOffer[] = [];

      for (const raw of json.data ?? []) {
        const offer = transformOffer(raw);
        if (offer) offers.push(offer);
      }

      logger.info({
        module: 'tequila-provider',
        action: 'search',
        route: `${route.origin}-${route.destination}`,
        found: offers.length,
        apiResults: json._results ?? 0,
      });

      return offers;
    } catch (error) {
      logger.error({
        module: 'tequila-provider',
        action: 'search',
        route: `${route.origin}-${route.destination}`,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}
