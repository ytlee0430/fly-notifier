import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FlightOffer } from '../providers/types.js';
import { logger } from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../.cache');

export function getDedupKey(offer: FlightOffer): string {
  return `${offer.flightNumber}-${offer.departureDate}-${offer.totalPriceTWD}`;
}

export function getRouteCacheKey(routeKey: string): string {
  return `dedup-${routeKey}`;
}

function getCacheFilePath(routeKey: string): string {
  return join(CACHE_DIR, `${getRouteCacheKey(routeKey)}.json`);
}

function loadCache(routeKey: string): Set<string> {
  const filePath = getCacheFilePath(routeKey);
  if (!existsSync(filePath)) return new Set();

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as string[];
    return new Set(Array.isArray(data) ? data : []);
  } catch {
    return new Set();
  }
}

function saveCache(routeKey: string, keys: Set<string>): void {
  try {
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true });
    }
    writeFileSync(getCacheFilePath(routeKey), JSON.stringify([...keys]), 'utf-8');
  } catch (error) {
    logger.warn({
      module: 'dedup',
      action: 'saveCache',
      route: routeKey,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function isAlreadyNotified(offer: FlightOffer, routeKey: string): boolean {
  const cache = loadCache(routeKey);
  return cache.has(getDedupKey(offer));
}

export function markAsNotified(offer: FlightOffer, routeKey: string): void {
  const cache = loadCache(routeKey);
  cache.add(getDedupKey(offer));
  saveCache(routeKey, cache);

  logger.info({
    module: 'dedup',
    action: 'markAsNotified',
    route: routeKey,
    key: getDedupKey(offer),
  });
}

export function filterNewOffers(offers: FlightOffer[], routeKey: string): FlightOffer[] {
  return offers.filter((offer) => !isAlreadyNotified(offer, routeKey));
}

export function markAllAsNotified(offers: FlightOffer[], routeKey: string): void {
  if (offers.length === 0) return;

  const cache = loadCache(routeKey);
  for (const offer of offers) {
    cache.add(getDedupKey(offer));
  }
  saveCache(routeKey, cache);

  logger.info({
    module: 'dedup',
    action: 'markAllAsNotified',
    route: routeKey,
    count: offers.length,
  });
}
