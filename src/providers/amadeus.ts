// amadeus SDK v11 has no official TypeScript types; we define minimal wrappers below
import { createRequire } from 'node:module';
import type { RouteConfig } from '../config.js';
import type { FlightOffer, FlightProvider, Passengers } from './types.js';
import { logger } from '../utils/logger.js';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const AmadeusSDK = require('amadeus');

// ---- Amadeus response type wrappers ----
interface AmadeusSegment {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
  carrierCode: string;
  number: string;
  numberOfStops: number;
}

interface AmadeusItinerary {
  segments: AmadeusSegment[];
}

interface AmadeusRawOffer {
  id: string;
  itineraries: AmadeusItinerary[];
  price: { currency: string; grandTotal: string };
  validatingAirlineCodes: string[];
}

interface AmadeusResponse {
  data: AmadeusRawOffer[];
}

interface AmadeusClient {
  shopping: {
    flightOffersSearch: {
      get(params: Record<string, unknown>): Promise<AmadeusResponse>;
    };
  };
}
// ----------------------------------------

function parseTime(isoDateTime: string): string {
  const parts = isoDateTime.split('T');
  if (parts.length < 2) return '';
  return parts[1]!.slice(0, 5);
}

function parseDate(isoDateTime: string): string {
  return isoDateTime.split('T')[0] ?? isoDateTime;
}

function buildBookingUrl(origin: string, destination: string, departureDate: string): string {
  return `https://www.google.com/travel/flights?q=Flights+${origin}+to+${destination}+on+${departureDate}`;
}

export function transformOffer(offer: AmadeusRawOffer, origin: string, destination: string): FlightOffer | null {
  const itinerary = offer.itineraries[0];
  if (!itinerary || itinerary.segments.length === 0) return null;

  const firstSegment = itinerary.segments[0]!;
  const lastSegment = itinerary.segments[itinerary.segments.length - 1]!;
  const stops = itinerary.segments.length - 1;

  const departureDate = parseDate(firstSegment.departure.at);
  const departureTime = parseTime(firstSegment.departure.at);
  const arrivalTime = parseTime(lastSegment.arrival.at);
  const airline = offer.validatingAirlineCodes[0] ?? firstSegment.carrierCode;
  const flightNumber = `${firstSegment.carrierCode}${firstSegment.number}`;
  const totalPriceTWD = Math.round(parseFloat(offer.price.grandTotal));

  const result: FlightOffer = {
    source: 'amadeus',
    origin,
    destination,
    departureDate,
    departureTime,
    arrivalTime,
    airline,
    flightNumber,
    stops,
    totalPriceTWD,
    currency: offer.price.currency,
    bookingUrl: buildBookingUrl(origin, destination, departureDate),
  };

  // 解析回程 itinerary（來回票時 itineraries[1] 為回程）
  const returnItinerary = offer.itineraries[1];
  if (returnItinerary && returnItinerary.segments.length > 0) {
    const retFirstSeg = returnItinerary.segments[0]!;
    const retLastSeg = returnItinerary.segments[returnItinerary.segments.length - 1]!;
    result.returnDate = parseDate(retFirstSeg.departure.at);
    result.returnDepartureTime = parseTime(retFirstSeg.departure.at);
    result.returnArrivalTime = parseTime(retLastSeg.arrival.at);
    result.returnAirline = retFirstSeg.carrierCode;
    result.returnFlightNumber = `${retFirstSeg.carrierCode}${retFirstSeg.number}`;
    result.returnStops = returnItinerary.segments.length - 1;
  }

  return result;
}

export class AmadeusProvider implements FlightProvider {
  private client: AmadeusClient | null;

  constructor() {
    const clientId = process.env['AMADEUS_CLIENT_ID'] ?? '';
    const clientSecret = process.env['AMADEUS_CLIENT_SECRET'] ?? '';

    if (!clientId || !clientSecret) {
      logger.warn({ module: 'amadeus-provider', action: 'init', message: 'Missing credentials — provider disabled' });
      this.client = null;
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      this.client = new AmadeusSDK({ clientId, clientSecret }) as AmadeusClient;
    } catch (error) {
      logger.error({
        module: 'amadeus-provider',
        action: 'init',
        error: error instanceof Error ? error.message : String(error),
      });
      this.client = null;
    }
  }

  async search(route: RouteConfig, passengers: Passengers): Promise<FlightOffer[]> {
    if (!this.client) {
      logger.warn({ module: 'amadeus-provider', action: 'search', message: 'No client — skipping' });
      return [];
    }

    try {
      const effectivePassengers = route.passengers ?? passengers;
      const params: Record<string, unknown> = {
        originLocationCode: route.origin,
        destinationLocationCode: route.destination,
        departureDate: route.dateRange.start,
        adults: effectivePassengers.adults,
        children: effectivePassengers.children,
        currencyCode: 'TWD',
        max: 10,
      };
      if (route.returnDateRange) {
        params['returnDate'] = route.returnDateRange.start;
      }
      if (route.directFlightOnly) params['nonStop'] = 'true';

      const response = await this.client.shopping.flightOffersSearch.get(params);

      const offers: FlightOffer[] = [];
      for (const raw of response.data) {
        const offer = transformOffer(raw, route.origin, route.destination);
        if (offer) offers.push(offer);
      }

      logger.info({
        module: 'amadeus-provider',
        action: 'search',
        route: `${route.origin}-${route.destination}`,
        found: offers.length,
      });

      return offers;
    } catch (error) {
      logger.error({
        module: 'amadeus-provider',
        action: 'search',
        route: `${route.origin}-${route.destination}`,
        error: error instanceof Error ? error.message : String(error),
        statusCode: (error as { response?: { statusCode?: number } })?.response?.statusCode,
      });
      return [];
    }
  }
}
