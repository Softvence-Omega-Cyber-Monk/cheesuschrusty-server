import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

const algorithm = 'aes-256-gcm';
const masterKey = process.env.CREDENTIAL_ENCRYPTION_KEY;

if (!masterKey || masterKey.length !== 64) {
  console.error('CREDENTIAL_ENCRYPTION_KEY must be a 64-character hex string');
  process.exit(1);
}

const key = Buffer.from(masterKey, 'hex');

function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

async function upsertCredential(provider: string, payload: any) {
  const normalizedPayload = JSON.stringify(
    Object.keys(payload)
      .sort()
      .reduce((acc, k) => ({ ...acc, [k]: payload[k] }), {}),
  );
  
  const payloadHash = createHash('sha256').update(normalizedPayload).digest('hex');
  const encryptedPayload = encrypt(normalizedPayload);

  await prisma.integrationCredential.upsert({
    where: { provider: provider as any },
    update: {
      encryptedPayload,
      payloadHash,
      fieldNames: Object.keys(payload).sort(),
      isActive: true,
      lastRotatedAt: new Date(),
    },
    create: {
      provider: provider as any,
      encryptedPayload,
      payloadHash,
      fieldNames: Object.keys(payload).sort(),
      isActive: true,
      lastRotatedAt: new Date(),
    },
  });
  console.log(`✅ Upserted ${provider}`);
}

async function main() {
  // 1. OPENAI
  await upsertCredential('OPENAI', {
    api_key: process.env.OPENAI_API_KEY || 'sk-proj-placeholder-key-for-testing',
    model_name: process.env.OPENAI_MODEL || 'gpt-4o',
    organization_id: process.env.OPENAI_ORG_ID || 'org-placeholder',
  });

  // 2. GEMINI
  await upsertCredential('GEMINI', {
    api_key: process.env.GEMINI_API_KEY || 'AIza-placeholder-key-for-testing',
    model_name: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
  });

  // 3. GROK
  await upsertCredential('GROK', {
    api_key: process.env.GROK_API_KEY || 'xai-placeholder-key-for-testing',
    model_name: process.env.GROK_MODEL || 'grok-1',
  });

  // 4. STRIPE
  await upsertCredential('STRIPE', {
    secret_key: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
    publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder',
    webhook_secret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder',
  });

  // 5. LEMONSQUEEZY
  await upsertCredential('LEMONSQUEEZY', {
    api_key: process.env.LEMON_SQUEEZY_API_KEY || 'eyJ-placeholder',
    store_id: process.env.LEMON_SQUEEZY_STORE_ID || '259513',
    webhook_secret: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || '123456',
    variant_id: process.env.LEMON_VARIANT_ID_MONTHLY || '1164228',
  });

  // 6. CLOUDINARY
  await upsertCredential('CLOUDINARY', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'placeholder-cloud',
    api_key: process.env.CLOUDINARY_API_KEY || 'placeholder-key',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'placeholder-secret',
  });

  // 7. OPENROUTER
  await upsertCredential('OPENROUTER', {
    api_key: process.env.OPENROUTER_API_KEY || 'sk-or-v1-placeholder',
    model_name: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-opus',
  });

  console.log('🚀 All credentials seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
