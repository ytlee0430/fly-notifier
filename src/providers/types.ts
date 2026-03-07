import type { RouteConfig } from '../config.js';

export interface FlightOffer {
  source: string; // Provider 名稱 (e.g., "amadeus")
  origin: string; // IATA code (e.g., "TPE")
  destination: string; // IATA code (e.g., "NRT")
  departureDate: string; // ISO date "2026-04-12"
  departureTime: string; // "09:15"
  arrivalTime: string; // "13:30"
  airline: string; // 航空公司名稱
  flightNumber: string; // "IT201"
  stops: number; // 0=直飛, 1=轉機一次
  totalPriceTWD: number; // 含稅總價（TWD）
  currency: string; // 原始幣別
  bookingUrl: string; // 訂票連結
  // 回程資訊（來回票時才有）
  returnDate?: string; // ISO date "2026-04-15"
  returnDepartureTime?: string; // "10:00"
  returnArrivalTime?: string; // "14:30"
  returnAirline?: string;
  returnFlightNumber?: string;
  returnStops?: number;
}

export interface Passengers {
  adults: number;
  children: number;
}

export interface FlightProvider {
  search(route: RouteConfig, passengers: Passengers): Promise<FlightOffer[]>;
}
