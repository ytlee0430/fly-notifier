import type { FlightProvider } from './types.js';

const providers: FlightProvider[] = [];

export function registerProvider(provider: FlightProvider): void {
  providers.push(provider);
}

export function getProviders(): FlightProvider[] {
  return [...providers];
}
