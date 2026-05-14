import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

// Load environment variables manually since Prisma config skips automatic loading
dotenv.config();

export default defineConfig({
  schema: './prisma/schema/schema.prisma',
});
