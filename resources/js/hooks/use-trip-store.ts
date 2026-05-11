import { supabase } from '@/lib/supabase';
import type { BarkadaStore, BudgetItem, Carpool, Category, CategoryMeta, Expense, Member, Trip } from '@/types/barkada';
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
};

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
    const [tripRes, membersRes, budgetRes, expensesRes, carpoolsRes, catRes] = await Promise.all([
        supabase.from('trips').select('*').eq('id', tripId).single(),
        supabase.from('members').select('*').eq('trip_id', tripId).order('created_at'),
        supabase.from('budget_items').select('*').eq('trip_id', tripId).order('created_at'),
        supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
        supabase.from('carpools').select('*').eq('trip_id', tripId).order('created_at'),
        supabase.from('custom_categories').select('*').eq('trip_id', tripId).order('created_at'),
    ]);

    return {
        ...DEFAULT_STORE,
        ...(tripRes.data ? mapTrip(tripRes.data) : {}),
        members: (membersRes.data ?? []).map(mapMember),
        budgetItems: (budgetRes.data ?? []).map(mapBudgetItem),
        expenses: (expensesRes.data ?? []).map(mapExpense),
        carpools: (carpoolsRes.data ?? []).map(mapCarpool),
        customCategories: mapCustomCategory(catRes.data ?? []),
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
    const hydrated = useRef(false);

    // Initial load
    useEffect(() => {
        fetchAll(tripId).then((data) => {
            setStore(data);
            setIsHydrated(true);
            hydrated.current = true;
        });
    }, [tripId]);

    // Realtime subscriptions — one channel per table
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

        return () => {
            supabase.removeChannel(tripChannel);
            supabase.removeChannel(membersChannel);
            supabase.removeChannel(budgetChannel);
            supabase.removeChannel(expensesChannel);
            supabase.removeChannel(carpoolsChannel);
            supabase.removeChannel(catChannel);
        };
    }, [isHydrated, tripId]);

    // ── Trip ──────────────────────────────────────────────────────────────────

    const updateTrip = async (trip: Trip) => {
        setStore((prev) => ({ ...prev, trip }));
        await supabase.from('trips').update({
            name: trip.name,
            destination: trip.destination,
            start_date: trip.startDate,
            end_date: trip.endDate,
        }).eq('id', tripId);
    };

    // ── Members ───────────────────────────────────────────────────────────────

    const addMember = async (name: string) => {
        const id = crypto.randomUUID();
        setStore((prev) => ({ ...prev, members: [...prev.members, { id, name: name.trim() }] }));
        await supabase.from('members').insert({ id, trip_id: tripId, name: name.trim() });
    };

    const updateMember = async (id: string, name: string) => {
        setStore((prev) => ({ ...prev, members: prev.members.map((m) => (m.id === id ? { ...m, name: name.trim() } : m)) }));
        await supabase.from('members').update({ name: name.trim() }).eq('id', id);
    };

    const removeMember = async (id: string) => {
        setStore((prev) => ({
            ...prev,
            members: prev.members.filter((m) => m.id !== id),
            carpools: prev.carpools.map((c) => ({ ...c, memberIds: c.memberIds.filter((mid) => mid !== id) })),
        }));
        await supabase.from('members').delete().eq('id', id);
        // Update carpools that contained this member
        const affected = store.carpools.filter((c) => c.memberIds.includes(id));
        await Promise.all(
            affected.map((c) =>
                supabase.from('carpools').update({ member_ids: c.memberIds.filter((mid) => mid !== id) }).eq('id', c.id),
            ),
        );
    };

    // ── Budget Items ──────────────────────────────────────────────────────────

    const addBudgetItem = async (name: string, category: Category, amount: number, carpoolId?: string) => {
        const id = crypto.randomUUID();
        const item: BudgetItem = { id, name: name.trim(), category, amount, ...(carpoolId ? { carpoolId } : {}) };
        setStore((prev) => ({ ...prev, budgetItems: [...prev.budgetItems, item] }));
        await supabase.from('budget_items').insert({ id, trip_id: tripId, name: name.trim(), category, amount, carpool_id: carpoolId ?? null });
    };

    const updateBudgetItem = async (id: string, name: string, category: Category, amount: number, carpoolId?: string) => {
        setStore((prev) => ({
            ...prev,
            budgetItems: prev.budgetItems.map((item) =>
                item.id === id ? { ...item, name: name.trim(), category, amount, carpoolId: carpoolId ?? undefined } : item,
            ),
        }));
        await supabase.from('budget_items').update({ name: name.trim(), category, amount, carpool_id: carpoolId ?? null }).eq('id', id);
    };

    const removeBudgetItem = async (id: string) => {
        setStore((prev) => ({ ...prev, budgetItems: prev.budgetItems.filter((item) => item.id !== id) }));
        await supabase.from('budget_items').delete().eq('id', id);
    };

    const setBudgetBuffer = async (buffer: number) => {
        setStore((prev) => ({ ...prev, budgetBuffer: buffer }));
        await supabase.from('trips').update({ budget_buffer: buffer }).eq('id', tripId);
    };

    const setContingency = async (contingency: number) => {
        setStore((prev) => ({ ...prev, contingency }));
        await supabase.from('trips').update({ contingency }).eq('id', tripId);
    };

    // ── Expenses ──────────────────────────────────────────────────────────────

    const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt'>) => {
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const memberIds = expense.splitType === 'equal' ? store.members.map((m) => m.id) : expense.memberIds;
        const newExpense: Expense = { ...expense, id, createdAt, ...(memberIds ? { memberIds } : {}) };
        setStore((prev) => ({ ...prev, expenses: [newExpense, ...prev.expenses] }));
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
    };

    const removeExpense = async (id: string) => {
        setStore((prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e.id !== id) }));
        await supabase.from('expenses').delete().eq('id', id);
    };

    // ── Categories ────────────────────────────────────────────────────────────

    const addCategory = async (name: string, icon: string) => {
        const usedKeys = [...CATEGORY_KEYS, ...Object.keys(store.customCategories)];
        const key = generateCategoryKey(name, usedKeys);
        const colorIndex = Object.keys(store.customCategories).length % CUSTOM_CATEGORY_COLORS.length;
        const colors = CUSTOM_CATEGORY_COLORS[colorIndex];
        const meta: CategoryMeta = { label: name.trim(), shortLabel: name.trim(), icon: icon.trim() || '📌', ...colors, isCustom: true };
        setStore((prev) => ({ ...prev, customCategories: { ...prev.customCategories, [key]: meta } }));
        await supabase.from('custom_categories').insert({
            trip_id: tripId,
            key,
            label: meta.label,
            short_label: meta.shortLabel,
            icon: meta.icon,
            bg_class: meta.bgClass,
            text_class: meta.textClass,
            progress_color_class: meta.progressColorClass,
        });
    };

    const updateCategory = async (key: string, name: string, icon: string) => {
        const meta = store.customCategories[key];
        if (!meta) return;
        const updated = { ...meta, label: name.trim(), shortLabel: name.trim(), icon: icon.trim() || meta.icon };
        setStore((prev) => ({ ...prev, customCategories: { ...prev.customCategories, [key]: updated } }));
        await supabase.from('custom_categories').update({ label: updated.label, short_label: updated.shortLabel, icon: updated.icon }).eq('trip_id', tripId).eq('key', key);
    };

    const toggleCategoryActive = async (key: string) => {
        const inactive = store.inactiveCategories ?? [];
        const next = inactive.includes(key) ? inactive.filter((k) => k !== key) : [...inactive, key];
        setStore((prev) => ({ ...prev, inactiveCategories: next }));
        await supabase.from('trips').update({ inactive_categories: next }).eq('id', tripId);
    };

    const removeCategory = async (key: string) => {
        const isBuiltIn = CATEGORY_KEYS.includes(key);
        if (isBuiltIn) {
            const hidden = [...(store.hiddenBuiltInCategories ?? []), key];
            setStore((prev) => ({
                ...prev,
                hiddenBuiltInCategories: hidden,
                budgetItems: prev.budgetItems.filter((item) => item.category !== key),
            }));
            await supabase.from('trips').update({ hidden_built_in_categories: hidden }).eq('id', tripId);
            await supabase.from('budget_items').delete().eq('trip_id', tripId).eq('category', key);
        } else {
            setStore((prev) => {
                const customCategories = { ...prev.customCategories };
                delete customCategories[key];
                return { ...prev, customCategories, budgetItems: prev.budgetItems.filter((item) => item.category !== key) };
            });
            await supabase.from('custom_categories').delete().eq('trip_id', tripId).eq('key', key);
            await supabase.from('budget_items').delete().eq('trip_id', tripId).eq('category', key);
        }
    };

    // ── Carpools ──────────────────────────────────────────────────────────────

    const addCarpool = async (name: string, memberIds: string[]) => {
        const id = crypto.randomUUID();
        setStore((prev) => ({ ...prev, carpools: [...prev.carpools, { id, name: name.trim(), memberIds }] }));
        await supabase.from('carpools').insert({ id, trip_id: tripId, name: name.trim(), member_ids: memberIds });
    };

    const updateCarpool = async (id: string, name: string, memberIds: string[]) => {
        setStore((prev) => ({ ...prev, carpools: prev.carpools.map((c) => (c.id === id ? { ...c, name: name.trim(), memberIds } : c)) }));
        await supabase.from('carpools').update({ name: name.trim(), member_ids: memberIds }).eq('id', id);
    };

    const removeCarpool = async (id: string) => {
        setStore((prev) => ({ ...prev, carpools: prev.carpools.filter((c) => c.id !== id) }));
        await supabase.from('carpools').delete().eq('id', id);
    };

    // ── Clear all ─────────────────────────────────────────────────────────────

    const clearAll = async () => {
        setStore(DEFAULT_STORE);
        await supabase.from('trips').delete().eq('id', tripId);
    };

    return {
        store,
        isHydrated,
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
        clearAll,
    };
}
