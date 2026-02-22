// Entry point: scan flight prices and send notifications
import 'dotenv/config'; // Load .env for local development (no-op in CI)

import { config } from './config.js';
import { AmadeusProvider } from './providers/amadeus.js';
import { registerProvider, getProviders } from './providers/provider-registry.js';
import { scanAllRoutes } from './scanner/scanner.js';
import { filterNewOffers, markAllAsNotified } from './utils/dedup.js';
import { sendLowPriceAlert } from './notifier/line.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  logger.info({ module: 'index', action: 'start', routes: config.routes.filter((r) => r.enabled).length });

  // Register providers
  registerProvider(new AmadeusProvider());
  const providers = getProviders();

  // Scan all enabled routes
  const scanResults = await scanAllRoutes(config.routes, providers, config.passengers);

  let totalNewAlerts = 0;

  for (const result of scanResults) {
    if (result.cheapOffers.length === 0) {
      logger.info({ module: 'index', action: 'noDeals', route: result.route });
      continue;
    }

    // Filter already-notified offers
    const newOffers = filterNewOffers(result.cheapOffers, result.route);

    if (newOffers.length === 0) {
      logger.info({ module: 'index', action: 'allDuped', route: result.route, skipped: result.cheapOffers.length });
      continue;
    }

    // Send LINE notification
    const notifyResult = await sendLowPriceAlert(newOffers);

    if (notifyResult.success) {
      markAllAsNotified(newOffers, result.route);
      totalNewAlerts += newOffers.length;
    }
  }

  logger.info({ module: 'index', action: 'complete', totalNewAlerts });
}

main().catch((error) => {
  logger.error({ module: 'index', action: 'fatal', error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
