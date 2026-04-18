import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const isRemote = url.startsWith('libsql://') || url.startsWith('https://');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	// 'turso' dialect supports both local SQLite file and remote Turso
	dialect: 'turso',
	dbCredentials: {
		url,
		authToken: isRemote ? (process.env.DATABASE_AUTH_TOKEN ?? '') : undefined
	},
	verbose: true,
	strict: true
});
