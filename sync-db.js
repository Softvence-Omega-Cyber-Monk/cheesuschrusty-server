const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Try to find .env file
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found in root directory');
  process.exit(1);
}

// Read .env manually to find DATABASE_URL
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/^DATABASE_URL=["']?(.*?)["']?$/m);

if (!match || !match[1]) {
  console.error('Error: DATABASE_URL not found in .env');
  process.exit(1);
}

const databaseUrl = match[1];
console.log('🚀 Synchronizing database with Prisma...');

try {
  // Run prisma db push with the DATABASE_URL injected
  execSync(`npx prisma db push --schema=prisma/schema/schema.prisma`, {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit'
  });
  console.log('✅ Database synchronized successfully!');
} catch (error) {
  console.error('❌ Failed to synchronize database.');
  process.exit(1);
}
