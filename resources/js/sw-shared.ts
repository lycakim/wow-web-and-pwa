/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

// Force immediate activation — skip waiting for old SW to die
self.addEventListener('install', () => { self.skipWaiting(); });

// Claim all open tabs immediately after activation
self.addEventListener('activate', (event: ExtendableEvent) => {
    event.waitUntil(self.clients.claim());
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// SPA navigation fallback
const handler = createHandlerBoundToURL('/index-shared.html');
const navigationRoute = new NavigationRoute(handler, {
    denylist: [/^\/api\//],
});
registerRoute(navigationRoute);

// ── Push notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
    if (!event.data) return;

    let data: { title: string; body: string; icon?: string; tag?: string };
    try {
        data = event.data.json();
    } catch {
        return;
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon ?? '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: data.tag ?? 'barkada',
            renotify: true,
            vibrate: [200, 100, 200],
        } as NotificationOptions),
    );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) return (client as WindowClient).focus();
            }
            return self.clients.openWindow('/');
        }),
    );
});
