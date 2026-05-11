import type { BarkadaStore, BudgetItem, Carpool, Category, CategoryMeta, Expense, GroceryItem, Member, Settlement, Trip } from '@/types/barkada';
import { CATEGORIES, CATEGORY_KEYS, CUSTOM_CATEGORY_COLORS } from '@/types/barkada';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'barkada-store';

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

function persist(store: BarkadaStore): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
        // Ignore storage errors (e.g. private browsing quota)
    }
}

export function calculateSettlements(members: Member[], expenses: Expense[]): Settlement[] {
    if (members.length === 0 || expenses.length === 0) {
        return [];
    }

    // Initialize balances for all referenced IDs (current + deleted members still in expenses)
    const allIds = new Set(members.map((m) => m.id));
    for (const expense of expenses) {
        if (expense.splitType === 'kkb') continue; // KKB: everyone paid their own, skip entirely
        allIds.add(expense.paidById);
        for (const id of expense.memberIds ?? []) {
            allIds.add(id);
        }
        for (const id of Object.keys(expense.customSplits)) {
            allIds.add(id);
        }
    }

    const balances: Record<string, number> = {};
    for (const id of allIds) {
        balances[id] = 0;
    }

    for (const expense of expenses) {
        if (expense.splitType === 'kkb') continue;

        const { amount, paidById, splitType, customSplits, memberIds } = expense;

        let shares: Record<string, number>;
        if (splitType === 'equal') {
            const splitIds = memberIds ?? members.map((m) => m.id);
            const perPerson = splitIds.length > 0 ? amount / splitIds.length : 0;
            shares = Object.fromEntries(splitIds.map((id) => [id, perPerson]));
        } else {
            // 'custom' and 'carpool' both store pre-computed amounts in customSplits
            shares = customSplits;
        }

        if (balances[paidById] !== undefined) {
            balances[paidById] += amount;
        }

        for (const [memberId, share] of Object.entries(shares)) {
            if (balances[memberId] !== undefined) {
                balances[memberId] -= share;
            }
        }
    }

    const creditors: Array<{ id: string; amount: number }> = [];
    const debtors: Array<{ id: string; amount: number }> = [];

    for (const [id, balance] of Object.entries(balances)) {
        if (balance > 0.005) {
            creditors.push({ id, amount: balance });
        } else if (balance < -0.005) {
            debtors.push({ id, amount: -balance });
        }
    }

    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const settlements: Settlement[] = [];
    let ci = 0;
    let di = 0;

    while (ci < creditors.length && di < debtors.length) {
        const creditor = creditors[ci];
        const debtor = debtors[di];
        const amount = Math.min(creditor.amount, debtor.amount);

        settlements.push({ fromId: debtor.id, toId: creditor.id, amount });

        creditor.amount -= amount;
        debtor.amount -= amount;

        if (creditor.amount < 0.005) ci++;
        if (debtor.amount < 0.005) di++;
    }

    return settlements;
}

export function getSpendByCategory(expenses: Expense[]): Record<string, number> {
    const totals: Record<string, number> = {};
    for (const expense of expenses) {
        totals[expense.category] = (totals[expense.category] ?? 0) + expense.amount;
    }
    return totals;
}

export function getTotalBudget(budgetItems: BudgetItem[]): number {
    return budgetItems.reduce((sum, item) => sum + item.amount, 0);
}

export function getTotalSpend(expenses: Expense[]): number {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
}

function generateCategoryKey(name: string, usedKeys: string[]): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category';
    if (!usedKeys.includes(base)) return base;
    let i = 2;
    while (usedKeys.includes(`${base}-${i}`)) i++;
    return `${base}-${i}`;
}

export function useBarkadaStore() {
    const [store, setStore] = useState<BarkadaStore>(DEFAULT_STORE);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as Partial<BarkadaStore> & { budgets?: Record<string, number> };
                // Migrate old budgets: Record<string, number> → BudgetItem[]
                let budgetItems: BudgetItem[] = parsed.budgetItems ?? [];
                if (budgetItems.length === 0 && parsed.budgets) {
                    budgetItems = Object.entries(parsed.budgets)
                        .filter(([, amount]) => amount > 0)
                        .map(([cat, amount]) => ({
                            id: crypto.randomUUID(),
                            name: CATEGORIES[cat]?.label ?? cat,
                            category: cat,
                            amount,
                        }));
                }
                setStore({
                    ...DEFAULT_STORE,
                    ...parsed,
                    budgetItems,
                    customCategories: { ...(parsed.customCategories ?? {}) },
                    carpools: parsed.carpools ?? [],
                    budgetBuffer: parsed.budgetBuffer ?? 0,
                    contingency: parsed.contingency ?? 0,
                    hiddenBuiltInCategories: parsed.hiddenBuiltInCategories ?? [],
                    inactiveCategories: parsed.inactiveCategories ?? [],
                    groceryItems: parsed.groceryItems ?? [],
                });
            }
        } catch {
            // Use defaults if parse fails
        }
        setIsHydrated(true);
    }, []);

    const updateStore = (updater: (prev: BarkadaStore) => BarkadaStore) => {
        setStore((prev) => {
            const next = updater(prev);
            persist(next);
            return next;
        });
    };

    const updateTrip = (trip: Trip) => {
        updateStore((prev) => ({ ...prev, trip }));
    };

    const addMember = (name: string) => {
        const member: Member = { id: crypto.randomUUID(), name: name.trim() };
        updateStore((prev) => ({ ...prev, members: [...prev.members, member] }));
    };

    const updateMember = (id: string, name: string) => {
        updateStore((prev) => ({
            ...prev,
            members: prev.members.map((m) => (m.id === id ? { ...m, name: name.trim() } : m)),
        }));
    };

    const removeMember = (id: string) => {
        updateStore((prev) => ({
            ...prev,
            members: prev.members.filter((m) => m.id !== id),
            // Remove from carpools too
            carpools: prev.carpools.map((c) => ({ ...c, memberIds: c.memberIds.filter((mid) => mid !== id) })),
        }));
    };

    const addBudgetItem = (name: string, category: Category, amount: number, carpoolId?: string) => {
        const item: BudgetItem = { id: crypto.randomUUID(), name: name.trim(), category, amount, ...(carpoolId ? { carpoolId } : {}) };
        updateStore((prev) => ({ ...prev, budgetItems: [...prev.budgetItems, item] }));
    };

    const updateBudgetItem = (id: string, name: string, category: Category, amount: number, carpoolId?: string) => {
        updateStore((prev) => ({
            ...prev,
            budgetItems: prev.budgetItems.map((item) =>
                item.id === id ? { ...item, name: name.trim(), category, amount, carpoolId: carpoolId ?? undefined } : item,
            ),
        }));
    };

    const removeBudgetItem = (id: string) => {
        updateStore((prev) => ({ ...prev, budgetItems: prev.budgetItems.filter((item) => item.id !== id) }));
    };

    const setBudgetBuffer = (buffer: number) => {
        updateStore((prev) => ({ ...prev, budgetBuffer: buffer }));
    };

    const setContingency = (contingency: number) => {
        updateStore((prev) => ({ ...prev, contingency }));
    };

    const addExpense = (expense: Omit<Expense, 'id' | 'createdAt'>) => {
        updateStore((prev) => {
            const newExpense: Expense = {
                ...expense,
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                ...(expense.splitType === 'equal' ? { memberIds: prev.members.map((m) => m.id) } : {}),
            };
            return { ...prev, expenses: [newExpense, ...prev.expenses] };
        });
    };

    const removeExpense = (id: string) => {
        updateStore((prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e.id !== id) }));
    };

    const toggleCategoryActive = (key: string) => {
        updateStore((prev) => {
            const inactive = prev.inactiveCategories ?? [];
            return {
                ...prev,
                inactiveCategories: inactive.includes(key)
                    ? inactive.filter((k) => k !== key)
                    : [...inactive, key],
            };
        });
    };

    const updateCategory = (key: string, name: string, icon: string) => {
        updateStore((prev) => {
            const meta = prev.customCategories[key];
            if (!meta) return prev;
            return {
                ...prev,
                customCategories: {
                    ...prev.customCategories,
                    [key]: { ...meta, label: name.trim(), shortLabel: name.trim(), icon: icon.trim() || meta.icon },
                },
            };
        });
    };

    const addCategory = (name: string, icon: string) => {
        updateStore((prev) => {
            const usedKeys = [...CATEGORY_KEYS, ...Object.keys(prev.customCategories)];
            const key = generateCategoryKey(name, usedKeys);
            const colorIndex = Object.keys(prev.customCategories).length % CUSTOM_CATEGORY_COLORS.length;
            const colors = CUSTOM_CATEGORY_COLORS[colorIndex];
            const meta: CategoryMeta = {
                label: name.trim(),
                shortLabel: name.trim(),
                icon: icon.trim() || '📌',
                ...colors,
                isCustom: true,
            };
            return {
                ...prev,
                customCategories: { ...prev.customCategories, [key]: meta },
            };
        });
    };

    const removeCategory = (key: string) => {
        updateStore((prev) => {
            const isBuiltIn = CATEGORY_KEYS.includes(key);
            if (isBuiltIn) {
                return {
                    ...prev,
                    hiddenBuiltInCategories: [...(prev.hiddenBuiltInCategories ?? []), key],
                    budgetItems: prev.budgetItems.filter((item) => item.category !== key),
                };
            }
            const customCategories = { ...prev.customCategories };
            delete customCategories[key];
            return { ...prev, customCategories, budgetItems: prev.budgetItems.filter((item) => item.category !== key) };
        });
    };

    const addCarpool = (name: string, memberIds: string[]) => {
        const carpool: Carpool = { id: crypto.randomUUID(), name: name.trim(), memberIds };
        updateStore((prev) => ({ ...prev, carpools: [...prev.carpools, carpool] }));
    };

    const updateCarpool = (id: string, name: string, memberIds: string[]) => {
        updateStore((prev) => ({
            ...prev,
            carpools: prev.carpools.map((c) => (c.id === id ? { ...c, name: name.trim(), memberIds } : c)),
        }));
    };

    const removeCarpool = (id: string) => {
        updateStore((prev) => ({
            ...prev,
            carpools: prev.carpools.filter((c) => c.id !== id),
        }));
    };

    const addGroceryItem = (name: string, addedByName?: string) => {
        const item: GroceryItem = { id: crypto.randomUUID(), name: name.trim(), checked: false, createdAt: new Date().toISOString(), ...(addedByName ? { addedByName } : {}) };
        updateStore((prev) => ({ ...prev, groceryItems: [...prev.groceryItems, item] }));
    };

    const toggleGroceryItem = (id: string, checkedByName?: string) => {
        updateStore((prev) => ({
            ...prev,
            groceryItems: prev.groceryItems.map((item) =>
                item.id === id
                    ? { ...item, checked: !item.checked, checkedByName: !item.checked ? checkedByName : undefined }
                    : item,
            ),
        }));
    };

    const assignGroceryItem = (id: string, memberName: string) => {
        updateStore((prev) => ({
            ...prev,
            groceryItems: prev.groceryItems.map((item) => {
                if (item.id !== id) return item;
                const current = item.assignedToNames ?? [];
                const assignedToNames = current.includes(memberName)
                    ? current.filter((n) => n !== memberName)
                    : [...current, memberName];
                return { ...item, assignedToNames };
            }),
        }));
    };

    const removeGroceryItem = (id: string) => {
        updateStore((prev) => ({ ...prev, groceryItems: prev.groceryItems.filter((item) => item.id !== id) }));
    };

    const clearCheckedGroceryItems = () => {
        updateStore((prev) => ({ ...prev, groceryItems: prev.groceryItems.filter((item) => !item.checked) }));
    };

    const clearAll = () => {
        persist(DEFAULT_STORE);
        setStore(DEFAULT_STORE);
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
        addGroceryItem,
        toggleGroceryItem,
        assignGroceryItem,
        removeGroceryItem,
        clearCheckedGroceryItems,
        clearAll,
    };
}
