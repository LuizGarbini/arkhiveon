import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Connection Pool configured via DATABASE_URL or Supabase Postgres Connection String
export const pool = new Pool({
	connectionString:
		process.env.DATABASE_URL ||
		"postgresql://postgres:postgres@127.0.0.1:54322/postgres",
});

// Initialized Type-safe Drizzle Client with full schema & relations
export const db = drizzle(pool, { schema });

export * from "./schema";
