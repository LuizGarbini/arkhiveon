import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./docs/drizzle-reference/schema/index.ts",
	out: "./docs/drizzle-reference/migrations",
	dialect: "postgresql",
});
