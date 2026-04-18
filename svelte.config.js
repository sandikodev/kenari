import adapterNode from '@sveltejs/adapter-node';
import adapterCloudflare from '@sveltejs/adapter-cloudflare';

const isEdge = process.env.DEPLOY_TARGET === 'cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// Self-hosted (Docker/VPS): adapter-node
		// Edge (Cloudflare Pages/Workers): adapter-cloudflare
		// Set DEPLOY_TARGET=cloudflare in build environment to use edge adapter
		adapter: isEdge ? adapterCloudflare() : adapterNode(),

		typescript: {
			config: (config) => ({
				...config,
				include: [...config.include, '../drizzle.config.ts']
			})
		}
	}
};

export default config;
