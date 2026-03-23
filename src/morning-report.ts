// Entry point: send daily morning price report
import 'dotenv/config'; // Load .env for local development (no-op in CI)

import { config } from './config.js';
import { AmadeusProvider } from './providers/amadeus.js';
import { TequilaProvider } from './providers/tequila.js';
import { SerpApiProvider } from './providers/serpapi.js';
import { registerProvider, getProviders } from './providers/provider-registry.js';
import { scanAllRoutes } from './scanner/scanner.js';
import { sendMorningReport } from './notifier/line.js';
import { logger } from './utils/logger.js';
import type { FlightOffer } from './providers/types.js';

async function main(): Promise<void> {
  logger.info({ module: 'morning-report', action: 'start' });

  registerProvider(new AmadeusProvider());
  registerProvider(new TequilaProvider());
  registerProvider(new SerpApiProvider());
  const providers = getProviders();

  const scanResults = await scanAllRoutes(config.routes, providers, config.passengers);

  const summary = scanResults.map((result) => {
    const bestOffer: FlightOffer | null =
      result.allOffers.length > 0
        ? result.allOffers.reduce((a, b) => (a.totalPriceTWD < b.totalPriceTWD ? a : b))
        : null;

    return {
      route: result.route,
      lowestPrice: result.lowestPrice,
      bestOffer,
    };
  });

  await sendMorningReport(summary);

  logger.info({ module: 'morning-report', action: 'complete', routes: summary.length });
}

main().catch((error) => {
  logger.error({
    module: 'morning-report',
    action: 'fatal',
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
