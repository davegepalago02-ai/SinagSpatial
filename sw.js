// SinagSpatial Service Worker v1.0
const CACHE_NAME = 'sinagspatial-v1';

// Core shell assets to cache on install
const SHELL_ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './assets/sinagspatial_icon.svg',
    './assets/sinagspatial_logo.svg',
    './assets/icon-192.png',
    './assets/icon-512.png'
];

// INSTALL: Cache the app shell
self.addEventListener('install', event => {
    console.log('[SW] Installing SinagSpatial Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching app shell assets');
            return cache.addAll(SHELL_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// ACTIVATE: Clean up old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then(keyList =>
            Promise.all(keyList.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] Removing old cache:', key);
                    return caches.delete(key);
                }
            }))
        ).then(() => self.clients.claim())
    );
});

// FETCH: Cache-first for shell, network-first for external APIs
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Always go network-first for GEE, CDN scripts, and external APIs
    const isExternal = !url.origin.includes(self.location.origin) ||
        url.hostname.includes('earthengine') ||
        url.hostname.includes('googleapis') ||
        url.hostname.includes('tailwindcss') ||
        url.hostname.includes('fontawesome') ||
        url.hostname.includes('fonts.googleapis');

    if (isExternal) {
        // Network only for external resources — do not cache GEE app
        event.respondWith(fetch(event.request).catch(() => new Response('Offline – external resource unavailable', { status: 503 })));
        return;
    }

    // Cache-first for local shell assets
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;

            return fetch(event.request).then(response => {
                if (!response || response.status !== 200 || response.type === 'opaque') return response;
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            });
        }).catch(() => {
            // Offline fallback for navigation
            if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
        })
    );
});
