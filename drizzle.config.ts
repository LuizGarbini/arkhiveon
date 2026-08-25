import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/db/schema/index.ts",
	out: "./drizzle/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url:
			process.env.DATABASE_URL ||
			"postgresql://postgres:postgres@127.0.0.1:54322/postgres",
	},
	verbose: true,
	strict: true,
});
