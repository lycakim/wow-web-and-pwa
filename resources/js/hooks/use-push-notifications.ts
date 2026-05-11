import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

// Public VAPID key — safe to expose in frontend
const VAPID_PUBLIC_KEY = 'BBY_gW9Fa0TfleGFmp-iC8Cu1ISjbWn1gap9ssrBmeGN9KNAXkv5U6RRXxkmiFz1x3zAPbAFuQbuejzEDdCAWHI';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

const isPushSupported = (): boolean =>
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

export function usePushNotifications(tripId: string, memberName?: string) {
    const [permission, setPermission] = useState<NotificationPermission>(
        isPushSupported() ? Notification.permission : 'denied',
    );
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Check current subscription state on mount
    useEffect(() => {
        if (!isPushSupported()) return;
        navigator.serviceWorker.ready.then(async (reg) => {
            const sub = await reg.pushManager.getSubscription();
            setIsSubscribed(!!sub);
        });
    }, []);

    const subscribe = async (): Promise<void> => {
        if (!isPushSupported()) return;
        setIsLoading(true);
        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result !== 'granted') return;

            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
            await supabase.from('push_subscriptions').upsert(
                {
                    trip_id: tripId,
                    member_name: memberName ?? '',
                    endpoint: json.endpoint,
                    p256dh: json.keys.p256dh,
                    auth: json.keys.auth,
                },
                { onConflict: 'trip_id,endpoint' },
            );
            setIsSubscribed(true);
        } finally {
            setIsLoading(false);
        }
    };

    const unsubscribe = async (): Promise<void> => {
        if (!isPushSupported()) return;
        setIsLoading(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await supabase
                    .from('push_subscriptions')
                    .delete()
                    .eq('trip_id', tripId)
                    .eq('endpoint', sub.endpoint);
                await sub.unsubscribe();
            }
            setIsSubscribed(false);
        } finally {
            setIsLoading(false);
        }
    };

    return { permission, isSubscribed, isLoading, isSupported: isPushSupported(), subscribe, unsubscribe };
}
