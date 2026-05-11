// Supabase Edge Function — triggered by Database Webhooks
// Sends web push notifications to all subscribed devices on a trip.

import webpush from 'npm:web-push@3';
import { createClient } from 'npm:@supabase/supabase-js@2';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

webpush.setVapidDetails('mailto:barkada@trip.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface WebhookPayload {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    table: string;
    record: Record<string, unknown> | null;
    old_record: Record<string, unknown> | null;
}

interface Notification {
    title: string;
    body: string;
    tag: string;
    tripId: string;
}

function buildNotification(payload: WebhookPayload): Notification | null {
    const { type, table, record, old_record } = payload;
    const rec = record ?? old_record;

    switch (table) {
        case 'grocery_items': {
            const tripId = rec?.trip_id as string;
            if (!tripId) return null;
            if (type === 'INSERT') {
                const section = rec?.section === 'bring' ? 'To Bring' : rec?.section === 'meal' ? 'Meal Plan' : 'To Buy';
                return {
                    title: '🛒 Grocery List Updated',
                    body: `${rec?.added_by_name ?? 'Someone'} added "${rec?.name}" to ${section}`,
                    tag: `grocery-add-${rec?.id}`,
                    tripId,
                };
            }
            if (type === 'UPDATE' && record?.checked && !old_record?.checked) {
                return {
                    title: '✅ Item Checked Off',
                    body: `${record?.checked_by_name ?? 'Someone'} checked off "${record?.name}"`,
                    tag: `grocery-check-${record?.id}`,
                    tripId,
                };
            }
            return null;
        }

        case 'expenses': {
            const tripId = rec?.trip_id as string;
            if (!tripId || type !== 'INSERT') return null;
            const amount = Number(rec?.amount ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
            return {
                title: '💸 New Expense',
                body: `${rec?.logged_by_name ?? 'Someone'} logged ${amount} for ${rec?.description}`,
                tag: `expense-${rec?.id}`,
                tripId,
            };
        }

        case 'members': {
            const tripId = rec?.trip_id as string;
            if (!tripId) return null;
            if (type === 'INSERT') {
                return {
                    title: '👤 New Member',
                    body: `${rec?.name} joined the trip!`,
                    tag: `member-join-${rec?.id}`,
                    tripId,
                };
            }
            if (type === 'DELETE') {
                return {
                    title: '👤 Member Removed',
                    body: `${old_record?.name} was removed from the trip`,
                    tag: `member-remove-${old_record?.id}`,
                    tripId,
                };
            }
            return null;
        }

        case 'trips': {
            if (type !== 'UPDATE') return null;
            const tripId = record?.id as string;
            if (!tripId) return null;
            // Skip code/buffer/contingency updates — only notify on meaningful trip info changes
            const meaningfulChange =
                record?.name !== old_record?.name ||
                record?.destination !== old_record?.destination ||
                record?.start_date !== old_record?.start_date ||
                record?.end_date !== old_record?.end_date;
            if (!meaningfulChange) return null;
            return {
                title: '✏️ Trip Updated',
                body: `Trip details have been updated`,
                tag: `trip-update-${tripId}`,
                tripId,
            };
        }

        default:
            return null;
    }
}

Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    let payload: WebhookPayload;
    try {
        payload = await req.json();
    } catch {
        return new Response('Bad Request', { status: 400 });
    }

    const notification = buildNotification(payload);
    if (!notification) {
        return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('trip_id', notification.tripId);

    if (error || !subscriptions?.length) {
        return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const pushPayload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        tag: notification.tag,
        icon: '/pwa-192x192.png',
    });

    let sent = 0;
    const expired: string[] = [];

    await Promise.allSettled(
        subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    pushPayload,
                );
                sent++;
            } catch (err: unknown) {
                const status = (err as { statusCode?: number }).statusCode;
                if (status === 410 || status === 404) {
                    expired.push(sub.id);
                }
            }
        }),
    );

    // Clean up expired subscriptions
    if (expired.length > 0) {
        await supabase.from('push_subscriptions').delete().in('id', expired);
    }

    return new Response(JSON.stringify({ sent, total: subscriptions.length }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
});
