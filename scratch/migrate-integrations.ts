import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { IntegrationManagementService } from '../src/module/integration-management/integration-management.service';
import { CredentialProvider } from '@prisma/client';

/**
 * MIGRATION SCRIPT: Standardization of Integration Keys
 * This script ensures all existing DB records use the new snake_case keys
 * and updates the 'fieldNames' metadata accordingly.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const integrationService = app.get(IntegrationManagementService);

  const providers = Object.values(CredentialProvider);
  console.log(`🚀 Starting integration structure migration for ${providers.length} providers...`);

  for (const provider of providers) {
    try {
      const credentials = await integrationService.getDecryptedCredential(provider);
      
      if (!credentials) {
        console.log(`- ${provider}: No database record found. Skipping.`);
        continue;
      }

      // Mapping of old keys to new standardized keys
      const keyMap: Record<string, string> = {
        'apiKey': 'api_key',
        'apiSecret': 'api_secret',
        'cloudName': 'cloud_name',
        'secretKey': 'secret_key',
        'publishableKey': 'publishable_key',
        'webhookSecret': 'webhook_secret',
        'storeId': 'store_id',
        'variantId': 'variant_id',
        'model': 'model_name',
        'organizationId': 'organization_id'
      };

      const newCredentials: Record<string, any> = {};
      let changed = false;

      for (const [key, value] of Object.entries(credentials)) {
        const newKey = keyMap[key] || key;
        if (newKey !== key) {
          changed = true;
          console.log(`  [${provider}] Renaming key: ${key} -> ${newKey}`);
        }
        newCredentials[newKey] = value;
      }

      // Even if no keys changed, we re-save to ensure fieldNames is sorted and correct
      await integrationService.upsertCredential(provider, newCredentials);
      console.log(`✅ ${provider}: Successfully synchronized and updated fieldNames.`);

    } catch (error) {
      console.error(`❌ ${provider}: Migration failed:`, error.message);
    }
  }

  console.log('\n✨ Migration complete!');
  await app.close();
}

bootstrap();
