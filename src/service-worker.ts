/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key != CACHE) {
				await caches.delete(key);
			}
		}
	}
	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		console.log('url:', url);
		const cache = await caches.open(CACHE);

		if (ASSETS.includes(url.pathname)) {
			const cachedResponse = await cache.match(url.pathname);
			if (cachedResponse) {
				return cachedResponse;
			}
		}
		// try network
		try {
			const res = await fetch(event.request);
			const isNotExtension = url.protocol === 'http:';
			const isSuccess = res.status === 200;

			if (isNotExtension && isSuccess) {
				cache.put(event.request, res.clone());
			}
      return res
		} catch {
			//FAll back to cache
			const cacheRes = await cache.match(url.pathname);
			if (cacheRes) return cacheRes;
		}

		return new Response('Not found in cache', { status: 404 });
	}

	event.respondWith(respond());
});
