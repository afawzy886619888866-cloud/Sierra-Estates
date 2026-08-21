import { propertyFinderConnector } from '@sierra-estates/property-finder-api';
import pino from 'pino';

const logger = pino({ name: 'sync-propertyfinder-script' });

async function main() {
  logger.info('Starting PropertyFinder automated catalog synchronization...');
  const start = Date.now();

  try {
    const result = await propertyFinderConnector.syncCatalog({ limit: 20 });
    logger.info({
      msg: 'PropertyFinder catalog sync completed successfully',
      syncId: result.syncId,
      totalFetched: result.totalFetched,
      totalSynced: result.totalSynced,
      durationMs: Date.now() - start,
    });

    console.log(`\n[✓] PropertyFinder sync completed in ${Date.now() - start}ms.`);
    console.log(`[✓] Synced ${result.totalSynced} luxury listings into catalog.`);
  } catch (error) {
    logger.error({ err: error, msg: 'PropertyFinder catalog sync failed' });
    process.exit(1);
  }
}

main();
