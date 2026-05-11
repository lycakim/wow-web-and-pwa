import { supabase } from '@/lib/supabase';
import { generateTripCode } from '@/lib/trip-code';
import type { BarkadaStore, BudgetItem, Carpool, Category, CategoryMeta, Expense, GroceryItem, GrocerySection, Member, Trip } from '@/types/barkada';
import { CATEGORIES, CATEGORY_KEYS, CUSTOM_CATEGORY_COLORS } from '@/types/barkada';
import { useEffect, useRef, useState } from 'react';

const DEFAULT_STORE: BarkadaStore = {
    trip: { name: '', destination: '', startDate: '', endDate: '' },
    members: [],
    budgetItems: [],
    expenses: [],
    customCategories: {},
    carpools: [],
    budgetBuffer: 0,
    contingency: 0,
    hiddenBuiltInCategories: [],
    inactiveCategories: [],
    groceryItems: [],
};

// ── Pending op types ──────────────────────────────────────────────────────────

type PendingOp =
    | { type: 'updateTrip'; trip: Trip }
    | { type: 'addMember'; id: string; name: string }
    | { type: 'updateMember'; id: string; name: string }
    | { type: 'removeMember'; id: string; affectedCarpools: Array<{ id: string; memberIds: string[] }> }
    | { type: 'addBudgetItem'; id: string; name: string; category: string; amount: number; carpoolId?: string }
    | { type: 'updateBudgetItem'; id: string; name: string; category: string; amount: number; carpoolId?: string }
    | { type: 'removeBudgetItem'; id: string }
    | { type: 'setBudgetBuffer'; value: number }
    | { type: 'setContingency'; value: number }
    | { type: 'addExpense'; expense: Expense }
    | { type: 'removeExpense'; id: string }
    | { type: 'addCategory'; key: string; meta: CategoryMeta }
    | { type: 'updateCategory'; key: string; label: string; shortLabel: string; icon: string }
    | { type: 'toggleCategoryActive'; next: string[] }
    | { type: 'removeCategory'; key: string; isBuiltIn: boolean; hidden?: string[]; deletedBudgetItemIds: string[] }
    | { type: 'addCarpool'; id: string; name: string; memberIds: string[] }
    | { type: 'updateCarpool'; id: string; name: string; memberIds: string[] }
    | { type: 'removeCarpool'; id: string }
    | { type: 'addGroceryItem'; item: GroceryItem }
    | { type: 'toggleGroceryItem'; id: string; checked: boolean; checkedByName: string | null }
    | { type: 'assignGroceryItem'; id: string; assignedToNames: string[] }
    | { type: 'removeGroceryItem'; id: string }
    | { type: 'renameGroceryItem'; id: string; name: string }
    | { type: 'clearCheckedGroceryItems'; ids: string[] }
    | { type: 'regenerateTripCode'; code: string };

// ── Queue / cache helpers ─────────────────────────────────────────────────────

function queueKey(tripId: string): string { return `barkada-pending-${tripId}`; }
function cacheKey(tripId: string): string { return `barkada-cache-${tripId}`; }

function getQueue(tripId: string): PendingOp[] {
    try { return JSON.parse(localStorage.getItem(queueKey(tripId)) ?? '[]'); }
    catch { return []; }
}

function saveQueue(tripId: string, ops: PendingOp[]): void {
    localStorage.setItem(queueKey(tripId), JSON.stringify(ops));
}

function enqueue(tripId: string, op: PendingOp): void {
    saveQueue(tripId, [...getQueue(tripId), op]);
}

function getCached(tripId: string): BarkadaStore | null {
    try {
        const raw = localStorage.getItem(cacheKey(tripId));
        return raw ? (JSON.parse(raw) as BarkadaStore) : null;
    } catch { return null; }
}

function saveCache(tripId: string, store: BarkadaStore): void {
    localStorage.setItem(cacheKey(tripId), JSON.stringify(store));
}

// ── Execute a single queued op against Supabase ───────────────────────────────

async function executeOp(op: PendingOp, tripId: string): Promise<void> {
    switch (op.type) {
        case 'updateTrip':
            await supabase.from('trips').update({ name: op.trip.name, destination: op.trip.destination, start_date: op.trip.startDate, end_date: op.trip.endDate }).eq('id', tripId);
            break;
        case 'addMember':
            await supabase.from('members').insert({ id: op.id, trip_id: tripId, name: op.name });
            break;
        case 'updateMember':
            await supabase.from('members').update({ name: op.name }).eq('id', op.id);
            break;
        case 'removeMember':
            await supabase.from('members').delete().eq('id', op.id);
            await Promise.all(op.affectedCarpools.map((c) => supabase.from('carpools').update({ member_ids: c.memberIds }).eq('id', c.id)));
            break;
        case 'addBudgetItem':
            await supabase.from('budget_items').insert({ id: op.id, trip_id: tripId, name: op.name, category: op.category, amount: op.amount, carpool_id: op.carpoolId ?? null });
            break;
        case 'updateBudgetItem':
            await supabase.from('budget_items').update({ name: op.name, category: op.category, amount: op.amount, carpool_id: op.carpoolId ?? null }).eq('id', op.id);
            break;
        case 'removeBudgetItem':
            await supabase.from('budget_items').delete().eq('id', op.id);
            break;
        case 'setBudgetBuffer':
            await supabase.from('trips').update({ budget_buffer: op.value }).eq('id', tripId);
            break;
        case 'setContingency':
            await supabase.from('trips').update({ contingency: op.value }).eq('id', tripId);
            break;
        case 'addExpense':
            await supabase.from('expenses').insert({
                id: op.expense.id,
                trip_id: tripId,
                description: op.expense.description,
                amount: op.expense.amount,
                category: op.expense.category,
                paid_by_id: op.expense.paidById,
                split_type: op.expense.splitType,
                custom_splits: op.expense.customSplits,
                member_ids: op.expense.memberIds ?? null,
                carpool_id: op.expense.carpoolId ?? null,
                created_at: op.expense.createdAt,
                logged_by_name: op.expense.loggedByName ?? null,
            });
            break;
        case 'removeExpense':
            await supabase.from('expenses').delete().eq('id', op.id);
            break;
        case 'addCategory':
            await supabase.from('custom_categories').insert({
                trip_id: tripId,
                key: op.key,
                label: op.meta.label,
                short_label: op.meta.shortLabel,
                icon: op.meta.icon,
                bg_class: op.meta.bgClass,
                text_class: op.meta.textClass,
                progress_color_class: op.meta.progressColorClass,
            });
            break;
        case 'updateCategory':
            await supabase.from('custom_categories').update({ label: op.label, short_label: op.shortLabel, icon: op.icon }).eq('trip_id', tripId).eq('key', op.key);
            break;
        case 'toggleCategoryActive':
            await supabase.from('trips').update({ inactive_categories: op.next }).eq('id', tripId);
            break;
        case 'removeCategory':
            if (op.isBuiltIn) {
                await supabase.from('trips').update({ hidden_built_in_categories: op.hidden }).eq('id', tripId);
            } else {
                await supabase.from('custom_categories').delete().eq('trip_id', tripId).eq('key', op.key);
            }
            if (op.deletedBudgetItemIds.length > 0) {
                await supabase.from('budget_items').delete().in('id', op.deletedBudgetItemIds);
            }
            break;
        case 'addCarpool':
            await supabase.from('carpools').insert({ id: op.id, trip_id: tripId, name: op.name, member_ids: op.memberIds });
            break;
        case 'updateCarpool':
            await supabase.from('carpools').update({ name: op.name, member_ids: op.memberIds }).eq('id', op.id);
            break;
        case 'removeCarpool':
            await supabase.from('carpools').delete().eq('id', op.id);
            break;
        case 'addGroceryItem':
            await supabase.from('grocery_items').insert({
                id: op.item.id,
                trip_id: tripId,
                name: op.item.name,
                checked: false,
                section: op.item.section,
                added_by_name: op.item.addedByName ?? null,
                created_at: op.item.createdAt,
            });
            break;
        case 'toggleGroceryItem':
            await supabase.from('grocery_items').update({ checked: op.checked, checked_by_name: op.checkedByName }).eq('id', op.id);
            break;
        case 'assignGroceryItem':
            await supabase.from('grocery_items').update({ assigned_to_names: op.assignedToNames }).eq('id', op.id);
            break;
        case 'removeGroceryItem':
            await supabase.from('grocery_items').delete().eq('id', op.id);
            break;
        case 'renameGroceryItem':
            await supabase.from('grocery_items').update({ name: op.name }).eq('id', op.id);
            break;
        case 'clearCheckedGroceryItems':
            if (op.ids.length > 0) {
                await supabase.from('grocery_items').delete().in('id', op.ids);
            }
            break;
        case 'regenerateTripCode':
            await supabase.from('trips').update({ code: op.code }).eq('id', tripId);
            break;
    }
}

// ── Row mappers ───────────────────────────────────────────────────────────────

function mapTrip(row: Record<string, unknown>): Partial<BarkadaStore> {
    return {
        trip: {
            name: (row.name as string) ?? '',
            destination: (row.destination as string) ?? '',
            startDate: (row.start_date as string) ?? '',
            endDate: (row.end_date as string) ?? '',
        },
        budgetBuffer: Number(row.budget_buffer ?? 0),
        contingency: Number(row.contingency ?? 0),
        hiddenBuiltInCategories: (row.hidden_built_in_categories as string[]) ?? [],
        inactiveCategories: (row.inactive_categories as string[]) ?? [],
    };
}

function mapMember(row: Record<string, unknown>): Member {
    return { id: row.id as string, name: row.name as string };
}

function mapBudgetItem(row: Record<string, unknown>): BudgetItem {
    return {
        id: row.id as string,
        name: row.name as string,
        category: row.category as string,
        amount: Number(row.amount),
        ...(row.carpool_id ? { carpoolId: row.carpool_id as string } : {}),
    };
}

function mapExpense(row: Record<string, unknown>): Expense {
    return {
        id: row.id as string,
        description: row.description as string,
        amount: Number(row.amount),
        category: row.category as string,
        paidById: row.paid_by_id as string,
        splitType: row.split_type as Expense['splitType'],
        customSplits: (row.custom_splits as Record<string, number>) ?? {},
        ...(row.member_ids != null ? { memberIds: row.member_ids as string[] } : {}),
        ...(row.carpool_id ? { carpoolId: row.carpool_id as string } : {}),
        createdAt: row.created_at as string,
        ...(row.logged_by_name ? { loggedByName: row.logged_by_name as string } : {}),
    };
}

function mapCarpool(row: Record<string, unknown>): Carpool {
    return {
        id: row.id as string,
        name: row.name as string,
        memberIds: (row.member_ids as string[]) ?? [],
    };
}

function mapGroceryItem(row: Record<string, unknown>): GroceryItem {
    return {
        id: row.id as string,
        name: row.name as string,
        checked: row.checked as boolean,
        section: (row.section as GrocerySection) ?? 'buy',
        createdAt: row.created_at as string,
        ...(row.added_by_name ? { addedByName: row.added_by_name as string } : {}),
        ...(row.checked_by_name ? { checkedByName: row.checked_by_name as string } : {}),
        ...(row.assigned_to_names ? { assignedToNames: row.assigned_to_names as string[] } : {}),
    };
}

function mapCustomCategory(rows: Record<string, unknown>[]): Record<string, CategoryMeta> {
    return Object.fromEntries(
        rows.map((r) => [
            r.key as string,
            {
                label: r.label as string,
                shortLabel: r.short_label as string,
                icon: r.icon as string,
                bgClass: r.bg_class as string,
                textClass: r.text_class as string,
                progressColorClass: r.progress_color_class as string,
                isCustom: true,
            } satisfies CategoryMeta,
        ]),
    );
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchAll(tripId: string): Promise<BarkadaStore> {
    const [tripRes, membersRes, budgetRes, expensesRes, carpoolsRes, catRes, groceryRes] = await Promise.all([
        supabase.from('trips').select('*').eq('id', tripId).single(),
        supabase.from('members').select('*').eq('trip_id', tripId).order('created_at'),
        supabase.from('budget_items').select('*').eq('trip_id', tripId).order('created_at'),
        supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
        supabase.from('carpools').select('*').eq('trip_id', tripId).order('created_at'),
        supabase.from('custom_categories').select('*').eq('trip_id', tripId).order('created_at'),
        supabase.from('grocery_items').select('*').eq('trip_id', tripId).order('created_at'),
    ]);

    return {
        ...DEFAULT_STORE,
        ...(tripRes.data ? mapTrip(tripRes.data) : {}),
        members: (membersRes.data ?? []).map(mapMember),
        budgetItems: (budgetRes.data ?? []).map(mapBudgetItem),
        expenses: (expensesRes.data ?? []).map(mapExpense),
        carpools: (carpoolsRes.data ?? []).map(mapCarpool),
        customCategories: mapCustomCategory(catRes.data ?? []),
        groceryItems: (groceryRes.data ?? []).map(mapGroceryItem),
    };
}

function generateCategoryKey(name: string, usedKeys: string[]): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category';
    if (!usedKeys.includes(base)) return base;
    let i = 2;
    while (usedKeys.includes(`${base}-${i}`)) i++;
    return `${base}-${i}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTripStore(tripId: string) {
    const [store, setStore] = useState<BarkadaStore>(DEFAULT_STORE);
    const [isHydrated, setIsHydrated] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(() => getQueue(tripId).length);
    const [isSyncing, setIsSyncing] = useState(false);
    const hydrated = useRef(false);

    // Use a ref so event handlers always see the latest value without re-registering
    const isOnlineRef = useRef(navigator.onLine);
    const flushQueueRef = useRef<() => Promise<void>>(async () => {});

    // ── Queue helper ──────────────────────────────────────────────────────────

    const trySupabase = async (supabaseOp: () => Promise<void>, op: PendingOp): Promise<void> => {
        if (!isOnlineRef.current) {
            enqueue(tripId, op);
            setPendingCount(getQueue(tripId).length);
            return;
        }
        try {
            await supabaseOp();
        } catch {
            enqueue(tripId, op);
            setPendingCount(getQueue(tripId).length);
        }
    };

    // ── Flush pending queue ───────────────────────────────────────────────────

    const flushQueue = async (): Promise<void> => {
        const queue = getQueue(tripId);
        if (queue.length === 0) return;
        setIsSyncing(true);
        const remaining: PendingOp[] = [];
        for (const op of queue) {
            try {
                await executeOp(op, tripId);
            } catch {
                remaining.push(op);
            }
        }
        saveQueue(tripId, remaining);
        setPendingCount(remaining.length);
        // Re-fetch fresh state from server after flushing
        try {
            const fresh = await fetchAll(tripId);
            setStore(fresh);
            saveCache(tripId, fresh);
        } catch { /* keep current local state */ }
        setIsSyncing(false);
    };

    // Keep the ref pointing to the latest flushQueue
    flushQueueRef.current = flushQueue;

    // ── Persist cache on every store change ───────────────────────────────────

    useEffect(() => {
        if (isHydrated) saveCache(tripId, store);
    }, [store, isHydrated, tripId]);

    // ── Initial load ──────────────────────────────────────────────────────────

    useEffect(() => {
        fetchAll(tripId)
            .then(async (data) => {
                setStore(data);
                saveCache(tripId, data);
                setIsHydrated(true);
                hydrated.current = true;
                // Flush any ops queued while we were offline before loading
                if (getQueue(tripId).length > 0) {
                    await flushQueueRef.current();
                }
            })
            .catch(() => {
                // Offline on first load — use cached data
                const cached = getCached(tripId);
                if (cached) setStore(cached);
                setIsHydrated(true);
                hydrated.current = true;
            });
    }, [tripId]);

    // ── Online / offline events ───────────────────────────────────────────────

    useEffect(() => {
        const handleOnline = async () => {
            setIsOnline(true);
            isOnlineRef.current = true;
            await flushQueueRef.current();
        };
        const handleOffline = () => {
            setIsOnline(false);
            isOnlineRef.current = false;
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // ── Realtime subscriptions ────────────────────────────────────────────────

    useEffect(() => {
        if (!isHydrated) return;

        const tripChannel = supabase
            .channel(`trips:${tripId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` }, () => {
                supabase.from('trips').select('*').eq('id', tripId).single().then(({ data }) => {
                    if (data) setStore((prev) => ({ ...prev, ...mapTrip(data) }));
                });
            })
            .subscribe();

        const membersChannel = supabase
            .channel(`members:${tripId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `trip_id=eq.${tripId}` }, () => {
                supabase.from('members').select('*').eq('trip_id', tripId).order('created_at').then(({ data }) => {
                    setStore((prev) => ({ ...prev, members: (data ?? []).map(mapMember) }));
                });
            })
            .subscribe();

        const budgetChannel = supabase
            .channel(`budget_items:${tripId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_items', filter: `trip_id=eq.${tripId}` }, () => {
                supabase.from('budget_items').select('*').eq('trip_id', tripId).order('created_at').then(({ data }) => {
                    setStore((prev) => ({ ...prev, budgetItems: (data ?? []).map(mapBudgetItem) }));
                });
            })
            .subscribe();

        const expensesChannel = supabase
            .channel(`expenses:${tripId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` }, () => {
                supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }).then(({ data }) => {
                    setStore((prev) => ({ ...prev, expenses: (data ?? []).map(mapExpense) }));
                });
            })
            .subscribe();

        const carpoolsChannel = supabase
            .channel(`carpools:${tripId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'carpools', filter: `trip_id=eq.${tripId}` }, () => {
                supabase.from('carpools').select('*').eq('trip_id', tripId).order('created_at').then(({ data }) => {
                    setStore((prev) => ({ ...prev, carpools: (data ?? []).map(mapCarpool) }));
                });
            })
            .subscribe();

        const catChannel = supabase
            .channel(`custom_categories:${tripId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_categories', filter: `trip_id=eq.${tripId}` }, () => {
                supabase.from('custom_categories').select('*').eq('trip_id', tripId).order('created_at').then(({ data }) => {
                    setStore((prev) => ({ ...prev, customCategories: mapCustomCategory(data ?? []) }));
                });
            })
            .subscribe();

        const groceryChannel = supabase
            .channel(`grocery_items:${tripId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'grocery_items', filter: `trip_id=eq.${tripId}` }, () => {
                supabase.from('grocery_items').select('*').eq('trip_id', tripId).order('created_at').then(({ data }) => {
                    setStore((prev) => ({ ...prev, groceryItems: (data ?? []).map(mapGroceryItem) }));
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(tripChannel);
            supabase.removeChannel(membersChannel);
            supabase.removeChannel(budgetChannel);
            supabase.removeChannel(expensesChannel);
            supabase.removeChannel(carpoolsChannel);
            supabase.removeChannel(catChannel);
            supabase.removeChannel(groceryChannel);
        };
    }, [isHydrated, tripId]);

    // ── Trip ──────────────────────────────────────────────────────────────────

    const regenerateTripCode = async (): Promise<string> => {
        const newCode = generateTripCode();
        await trySupabase(
            async () => { await supabase.from('trips').update({ code: newCode }).eq('id', tripId); },
            { type: 'regenerateTripCode', code: newCode },
        );
        return newCode;
    };

    const updateTrip = async (trip: Trip) => {
        setStore((prev) => ({ ...prev, trip }));
        await trySupabase(
            async () => {
                await supabase.from('trips').update({
                    name: trip.name,
                    destination: trip.destination,
                    start_date: trip.startDate,
                    end_date: trip.endDate,
                }).eq('id', tripId);
            },
            { type: 'updateTrip', trip },
        );
    };

    // ── Members ───────────────────────────────────────────────────────────────

    const addMember = async (name: string) => {
        const id = crypto.randomUUID();
        setStore((prev) => ({ ...prev, members: [...prev.members, { id, name: name.trim() }] }));
        await trySupabase(
            async () => { await supabase.from('members').insert({ id, trip_id: tripId, name: name.trim() }); },
            { type: 'addMember', id, name: name.trim() },
        );
    };

    const updateMember = async (id: string, name: string) => {
        setStore((prev) => ({ ...prev, members: prev.members.map((m) => (m.id === id ? { ...m, name: name.trim() } : m)) }));
        await trySupabase(
            async () => { await supabase.from('members').update({ name: name.trim() }).eq('id', id); },
            { type: 'updateMember', id, name: name.trim() },
        );
    };

    const removeMember = async (id: string) => {
        const affectedCarpools = store.carpools
            .filter((c) => c.memberIds.includes(id))
            .map((c) => ({ id: c.id, memberIds: c.memberIds.filter((mid) => mid !== id) }));
        setStore((prev) => ({
            ...prev,
            members: prev.members.filter((m) => m.id !== id),
            carpools: prev.carpools.map((c) => ({ ...c, memberIds: c.memberIds.filter((mid) => mid !== id) })),
        }));
        await trySupabase(
            async () => {
                await supabase.from('members').delete().eq('id', id);
                await Promise.all(affectedCarpools.map((c) => supabase.from('carpools').update({ member_ids: c.memberIds }).eq('id', c.id)));
            },
            { type: 'removeMember', id, affectedCarpools },
        );
    };

    // ── Budget Items ──────────────────────────────────────────────────────────

    const addBudgetItem = async (name: string, category: Category, amount: number, carpoolId?: string) => {
        const id = crypto.randomUUID();
        const item: BudgetItem = { id, name: name.trim(), category, amount, ...(carpoolId ? { carpoolId } : {}) };
        setStore((prev) => ({ ...prev, budgetItems: [...prev.budgetItems, item] }));
        await trySupabase(
            async () => { await supabase.from('budget_items').insert({ id, trip_id: tripId, name: name.trim(), category, amount, carpool_id: carpoolId ?? null }); },
            { type: 'addBudgetItem', id, name: name.trim(), category, amount, carpoolId },
        );
    };

    const updateBudgetItem = async (id: string, name: string, category: Category, amount: number, carpoolId?: string) => {
        setStore((prev) => ({
            ...prev,
            budgetItems: prev.budgetItems.map((item) =>
                item.id === id ? { ...item, name: name.trim(), category, amount, carpoolId: carpoolId ?? undefined } : item,
            ),
        }));
        await trySupabase(
            async () => { await supabase.from('budget_items').update({ name: name.trim(), category, amount, carpool_id: carpoolId ?? null }).eq('id', id); },
            { type: 'updateBudgetItem', id, name: name.trim(), category, amount, carpoolId },
        );
    };

    const removeBudgetItem = async (id: string) => {
        setStore((prev) => ({ ...prev, budgetItems: prev.budgetItems.filter((item) => item.id !== id) }));
        await trySupabase(
            async () => { await supabase.from('budget_items').delete().eq('id', id); },
            { type: 'removeBudgetItem', id },
        );
    };

    const setBudgetBuffer = async (buffer: number) => {
        setStore((prev) => ({ ...prev, budgetBuffer: buffer }));
        await trySupabase(
            async () => { await supabase.from('trips').update({ budget_buffer: buffer }).eq('id', tripId); },
            { type: 'setBudgetBuffer', value: buffer },
        );
    };

    const setContingency = async (contingency: number) => {
        setStore((prev) => ({ ...prev, contingency }));
        await trySupabase(
            async () => { await supabase.from('trips').update({ contingency }).eq('id', tripId); },
            { type: 'setContingency', value: contingency },
        );
    };

    // ── Expenses ──────────────────────────────────────────────────────────────

    const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt'>) => {
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const memberIds = expense.splitType === 'equal' ? store.members.map((m) => m.id) : expense.memberIds;
        const newExpense: Expense = { ...expense, id, createdAt, ...(memberIds ? { memberIds } : {}) };
        setStore((prev) => ({ ...prev, expenses: [newExpense, ...prev.expenses] }));
        await trySupabase(
            async () => {
                await supabase.from('expenses').insert({
                    id,
                    trip_id: tripId,
                    description: expense.description,
                    amount: expense.amount,
                    category: expense.category,
                    paid_by_id: expense.paidById,
                    split_type: expense.splitType,
                    custom_splits: expense.customSplits,
                    member_ids: memberIds ?? null,
                    carpool_id: expense.carpoolId ?? null,
                    created_at: createdAt,
                    logged_by_name: expense.loggedByName ?? null,
                });
            },
            { type: 'addExpense', expense: newExpense },
        );
    };

    const removeExpense = async (id: string) => {
        setStore((prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e.id !== id) }));
        await trySupabase(
            async () => { await supabase.from('expenses').delete().eq('id', id); },
            { type: 'removeExpense', id },
        );
    };

    // ── Categories ────────────────────────────────────────────────────────────

    const addCategory = async (name: string, icon: string) => {
        const usedKeys = [...CATEGORY_KEYS, ...Object.keys(store.customCategories)];
        const key = generateCategoryKey(name, usedKeys);
        const colorIndex = Object.keys(store.customCategories).length % CUSTOM_CATEGORY_COLORS.length;
        const colors = CUSTOM_CATEGORY_COLORS[colorIndex];
        const meta: CategoryMeta = { label: name.trim(), shortLabel: name.trim(), icon: icon.trim() || '📌', ...colors, isCustom: true };
        setStore((prev) => ({ ...prev, customCategories: { ...prev.customCategories, [key]: meta } }));
        await trySupabase(
            async () => {
                await supabase.from('custom_categories').insert({
                    trip_id: tripId, key, label: meta.label, short_label: meta.shortLabel,
                    icon: meta.icon, bg_class: meta.bgClass, text_class: meta.textClass, progress_color_class: meta.progressColorClass,
                });
            },
            { type: 'addCategory', key, meta },
        );
    };

    const updateCategory = async (key: string, name: string, icon: string) => {
        const meta = store.customCategories[key];
        if (!meta) return;
        const updated = { ...meta, label: name.trim(), shortLabel: name.trim(), icon: icon.trim() || meta.icon };
        setStore((prev) => ({ ...prev, customCategories: { ...prev.customCategories, [key]: updated } }));
        await trySupabase(
            async () => { await supabase.from('custom_categories').update({ label: updated.label, short_label: updated.shortLabel, icon: updated.icon }).eq('trip_id', tripId).eq('key', key); },
            { type: 'updateCategory', key, label: updated.label, shortLabel: updated.shortLabel, icon: updated.icon },
        );
    };

    const toggleCategoryActive = async (key: string) => {
        const inactive = store.inactiveCategories ?? [];
        const next = inactive.includes(key) ? inactive.filter((k) => k !== key) : [...inactive, key];
        setStore((prev) => ({ ...prev, inactiveCategories: next }));
        await trySupabase(
            async () => { await supabase.from('trips').update({ inactive_categories: next }).eq('id', tripId); },
            { type: 'toggleCategoryActive', next },
        );
    };

    const removeCategory = async (key: string) => {
        const isBuiltIn = CATEGORY_KEYS.includes(key);
        const deletedBudgetItemIds = store.budgetItems.filter((item) => item.category === key).map((item) => item.id);
        if (isBuiltIn) {
            const hidden = [...(store.hiddenBuiltInCategories ?? []), key];
            setStore((prev) => ({
                ...prev,
                hiddenBuiltInCategories: hidden,
                budgetItems: prev.budgetItems.filter((item) => item.category !== key),
            }));
            await trySupabase(
                async () => {
                    await supabase.from('trips').update({ hidden_built_in_categories: hidden }).eq('id', tripId);
                    if (deletedBudgetItemIds.length > 0) {
                        await supabase.from('budget_items').delete().in('id', deletedBudgetItemIds);
                    }
                },
                { type: 'removeCategory', key, isBuiltIn: true, hidden, deletedBudgetItemIds },
            );
        } else {
            setStore((prev) => {
                const customCategories = { ...prev.customCategories };
                delete customCategories[key];
                return { ...prev, customCategories, budgetItems: prev.budgetItems.filter((item) => item.category !== key) };
            });
            await trySupabase(
                async () => {
                    await supabase.from('custom_categories').delete().eq('trip_id', tripId).eq('key', key);
                    if (deletedBudgetItemIds.length > 0) {
                        await supabase.from('budget_items').delete().in('id', deletedBudgetItemIds);
                    }
                },
                { type: 'removeCategory', key, isBuiltIn: false, deletedBudgetItemIds },
            );
        }
    };

    // ── Carpools ──────────────────────────────────────────────────────────────

    const addCarpool = async (name: string, memberIds: string[]) => {
        const id = crypto.randomUUID();
        setStore((prev) => ({ ...prev, carpools: [...prev.carpools, { id, name: name.trim(), memberIds }] }));
        await trySupabase(
            async () => { await supabase.from('carpools').insert({ id, trip_id: tripId, name: name.trim(), member_ids: memberIds }); },
            { type: 'addCarpool', id, name: name.trim(), memberIds },
        );
    };

    const updateCarpool = async (id: string, name: string, memberIds: string[]) => {
        setStore((prev) => ({ ...prev, carpools: prev.carpools.map((c) => (c.id === id ? { ...c, name: name.trim(), memberIds } : c)) }));
        await trySupabase(
            async () => { await supabase.from('carpools').update({ name: name.trim(), member_ids: memberIds }).eq('id', id); },
            { type: 'updateCarpool', id, name: name.trim(), memberIds },
        );
    };

    const removeCarpool = async (id: string) => {
        setStore((prev) => ({ ...prev, carpools: prev.carpools.filter((c) => c.id !== id) }));
        await trySupabase(
            async () => { await supabase.from('carpools').delete().eq('id', id); },
            { type: 'removeCarpool', id },
        );
    };

    // ── Grocery ───────────────────────────────────────────────────────────────

    const addGroceryItem = async (name: string, section: GrocerySection, addedByName?: string) => {
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const item: GroceryItem = { id, name: name.trim(), checked: false, section, createdAt, ...(addedByName ? { addedByName } : {}) };
        setStore((prev) => ({ ...prev, groceryItems: [...prev.groceryItems, item] }));
        await trySupabase(
            async () => { await supabase.from('grocery_items').insert({ id, trip_id: tripId, name: name.trim(), checked: false, section, added_by_name: addedByName ?? null, created_at: createdAt }); },
            { type: 'addGroceryItem', item },
        );
    };

    const toggleGroceryItem = async (id: string, checkedByName?: string) => {
        const item = store.groceryItems.find((i) => i.id === id);
        if (!item) return;
        const checked = !item.checked;
        const checkedByNameValue = checked ? (checkedByName ?? null) : null;
        setStore((prev) => ({
            ...prev,
            groceryItems: prev.groceryItems.map((i) =>
                i.id === id ? { ...i, checked, checkedByName: checkedByNameValue ?? undefined } : i,
            ),
        }));
        await trySupabase(
            async () => { await supabase.from('grocery_items').update({ checked, checked_by_name: checkedByNameValue }).eq('id', id); },
            { type: 'toggleGroceryItem', id, checked, checkedByName: checkedByNameValue },
        );
    };

    const assignGroceryItem = async (id: string, memberName: string) => {
        const item = store.groceryItems.find((i) => i.id === id);
        if (!item) return;
        const current = item.assignedToNames ?? [];
        const assignedToNames = current.includes(memberName)
            ? current.filter((n) => n !== memberName)
            : [...current, memberName];
        setStore((prev) => ({
            ...prev,
            groceryItems: prev.groceryItems.map((i) => (i.id === id ? { ...i, assignedToNames } : i)),
        }));
        await trySupabase(
            async () => { await supabase.from('grocery_items').update({ assigned_to_names: assignedToNames }).eq('id', id); },
            { type: 'assignGroceryItem', id, assignedToNames },
        );
    };

    const removeGroceryItem = async (id: string) => {
        setStore((prev) => ({ ...prev, groceryItems: prev.groceryItems.filter((i) => i.id !== id) }));
        await trySupabase(
            async () => { await supabase.from('grocery_items').delete().eq('id', id); },
            { type: 'removeGroceryItem', id },
        );
    };

    const renameGroceryItem = async (id: string, name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        setStore((prev) => ({ ...prev, groceryItems: prev.groceryItems.map((i) => (i.id === id ? { ...i, name: trimmed } : i)) }));
        await trySupabase(
            async () => { await supabase.from('grocery_items').update({ name: trimmed }).eq('id', id); },
            { type: 'renameGroceryItem', id, name: trimmed },
        );
    };

    const clearCheckedGroceryItems = async (section?: GrocerySection) => {
        const checkedIds = store.groceryItems
            .filter((i) => i.checked && (!section || (i.section ?? 'buy') === section))
            .map((i) => i.id);
        if (checkedIds.length === 0) return;
        setStore((prev) => ({
            ...prev,
            groceryItems: prev.groceryItems.filter((i) => !checkedIds.includes(i.id)),
        }));
        await trySupabase(
            async () => { await supabase.from('grocery_items').delete().in('id', checkedIds); },
            { type: 'clearCheckedGroceryItems', ids: checkedIds },
        );
    };

    // ── Clear all ─────────────────────────────────────────────────────────────

    const clearAll = async () => {
        setStore(DEFAULT_STORE);
        await supabase.from('trips').delete().eq('id', tripId);
    };

    return {
        store,
        isHydrated,
        isOnline,
        pendingCount,
        isSyncing,
        regenerateTripCode,
        updateTrip,
        addMember,
        updateMember,
        removeMember,
        addBudgetItem,
        updateBudgetItem,
        removeBudgetItem,
        setBudgetBuffer,
        setContingency,
        addExpense,
        removeExpense,
        addCategory,
        updateCategory,
        toggleCategoryActive,
        removeCategory,
        addCarpool,
        updateCarpool,
        removeCarpool,
        addGroceryItem,
        toggleGroceryItem,
        assignGroceryItem,
        removeGroceryItem,
        renameGroceryItem,
        clearCheckedGroceryItems,
        clearAll,
    };
}
