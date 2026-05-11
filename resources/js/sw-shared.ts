// SW version — bump to force update on all clients
const SW_VERSION = '2';
console.log('[SW] version', SW_VERSION);

import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

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
            // @ts-expect-error - vibrate is not in the TS types but is supported
            vibrate: [200, 100, 200],
        }),
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
