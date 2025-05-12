// We won't import Config for a moment to see if we can bypass the problematic inference
// import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite', 
  dbCredentials: {
    url: './database.db',    // The value is correct
  },
  verbose: true,
  strict: true,
}; // Remove "satisfies Config" for now