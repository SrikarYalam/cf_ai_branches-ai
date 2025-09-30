import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Use the Cloudflare adapter
		adapter: adapter()
	},
	preprocess: vitePreprocess()
};

export default config;