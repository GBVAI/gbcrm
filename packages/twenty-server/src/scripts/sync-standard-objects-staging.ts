/**
 * One-off script: Sync standard objects (including phoneCall/phoneCallTarget)
 * to an existing workspace.
 *
 * Usage:
 *   PG_DATABASE_URL=... APP_SECRET=... WORKSPACE_ID=... tsx src/scripts/sync-standard-objects-staging.ts
 */
import { NestFactory } from '@nestjs/core';

import { AppModule } from 'src/app.module';
import { TwentyStandardApplicationService } from 'src/engine/workspace-manager/twenty-standard-application/services/twenty-standard-application.service';

const WORKSPACE_ID =
  process.env.WORKSPACE_ID ?? 'db7429ba-9332-4726-812f-a5aade321cf1';

async function syncStandardObjects() {
  console.log(`Syncing standard objects for workspace: ${WORKSPACE_ID}`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const service = app.get(TwentyStandardApplicationService);

    await service.synchronizeTwentyStandardApplicationOrThrow({
      workspaceId: WORKSPACE_ID,
    });

    console.log('✅ Standard objects synced successfully!');
  } finally {
    await app.close();
  }
}

syncStandardObjects().catch((err) => {
  console.error('❌ Sync failed:', err.message);
  process.exit(1);
});
