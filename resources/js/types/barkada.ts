export type Category = string;

export type View = 'home' | 'members' | 'budget' | 'expenses' | 'settlement' | 'categories' | 'carpools' | 'grocery' | 'collections' | 'mybalance';

export interface Member {
    id: string;
    name: string;
}

export interface Carpool {
    id: string;
    name: string;
    memberIds: string[];
}

export interface Expense {
    id: string;
    description: string;
    amount: number;
    category: Category;
    paidById: string;
    splitType: 'equal' | 'custom' | 'carpool' | 'kkb';
    customSplits: Record<string, number>;
    memberIds?: string[]; // snapshot of member IDs at creation time (equal splits)
    carpoolId?: string;   // reference carpool used for display (carpool splits)
    createdAt: string;
    loggedByName?: string; // display name of the person who logged this expense
}

export interface Trip {
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
}

export interface BudgetItem {
    id: string;
    name: string;
    category: string;
    amount: number;
    carpoolId?: string; // if set, split among carpool passengers only; otherwise split among all members
}

export interface BarkadaStore {
    trip: Trip;
    members: Member[];
    budgetItems: BudgetItem[];
    expenses: Expense[];
    customCategories: Record<string, CategoryMeta>;
    carpools: Carpool[];
    budgetBuffer: number; // inflation/buffer percentage (0–100)
    contingency: number; // fixed contingency amount on top of budget
    hiddenBuiltInCategories: string[]; // built-in category keys hidden by the user
    inactiveCategories: string[]; // category keys excluded from all calculations
    groceryItems: GroceryItem[];
    collections: Collection[];
    collectionPayments: CollectionPayment[];
    directPayments: DirectPayment[];
    memberPayments: MemberPayment[];
}

export type GrocerySection = 'buy' | 'bring' | 'meal';

export const GROCERY_SECTIONS: { key: GrocerySection; label: string; icon: string; emptyText: string }[] = [
    { key: 'buy', label: 'To Buy', icon: '🛒', emptyText: 'No items to buy yet' },
    { key: 'bring', label: 'To Bring', icon: '🎒', emptyText: 'No items to bring yet' },
    { key: 'meal', label: 'Meal Plan', icon: '🍽️', emptyText: 'No meals planned yet' },
];

export interface Collection {
    id: string;
    name: string;
    targetAmount: number;
    collectorId: string; // member who receives the money
    memberIds: string[]; // who is splitting the target (default: all members)
    createdAt: string;
}

export interface CollectionPayment {
    id: string;
    collectionId: string;
    fromMemberId: string;
    amount: number;
    note?: string;
    paidAt: string;
    createdAt: string;
    loggedByName?: string;
}

export interface MemberPayment {
    id: string;
    memberId: string;   // who paid toward their share
    amount: number;
    note?: string;
    paidAt: string;
    createdAt: string;
    loggedByName?: string;
}

export interface DirectPayment {
    id: string;
    fromId: string;   // who paid
    toId: string;     // who received
    amount: number;
    note?: string;
    paidAt: string;
    createdAt: string;
    loggedByName?: string;
}

export interface GroceryItem {
    id: string;
    name: string;
    checked: boolean;
    section: GrocerySection;
    addedByName?: string;
    checkedByName?: string;
    assignedToNames?: string[];
    createdAt: string;
}

export interface Settlement {
    fromId: string;
    toId: string;
    amount: number;
}

export interface CategoryMeta {
    label: string;
    shortLabel: string;
    icon: string;
    bgClass: string;
    textClass: string;
    progressColorClass: string;
    isCustom: boolean;
}

export const CATEGORIES: Record<string, CategoryMeta> = {
    transport: {
        label: 'Transport',
        shortLabel: 'Transport',
        icon: '🚌',
        bgClass: 'bg-blue-100 dark:bg-blue-900/30',
        textClass: 'text-blue-700 dark:text-blue-300',
        progressColorClass: 'bg-blue-500',
        isCustom: false,
    },
    accommodation: {
        label: 'Accommodation',
        shortLabel: 'Stay',
        icon: '🏨',
        bgClass: 'bg-purple-100 dark:bg-purple-900/30',
        textClass: 'text-purple-700 dark:text-purple-300',
        progressColorClass: 'bg-purple-500',
        isCustom: false,
    },
    food: {
        label: 'Food & Drinks',
        shortLabel: 'Food',
        icon: '🍜',
        bgClass: 'bg-orange-100 dark:bg-orange-900/30',
        textClass: 'text-orange-700 dark:text-orange-300',
        progressColorClass: 'bg-orange-500',
        isCustom: false,
    },
    activities: {
        label: 'Activities & Entrance Fees',
        shortLabel: 'Activities',
        icon: '🎭',
        bgClass: 'bg-green-100 dark:bg-green-900/30',
        textClass: 'text-green-700 dark:text-green-300',
        progressColorClass: 'bg-green-500',
        isCustom: false,
    },
    shopping: {
        label: 'Shopping & Pasalubong',
        shortLabel: 'Shopping',
        icon: '🛍️',
        bgClass: 'bg-pink-100 dark:bg-pink-900/30',
        textClass: 'text-pink-700 dark:text-pink-300',
        progressColorClass: 'bg-pink-500',
        isCustom: false,
    },
};

export const CATEGORY_KEYS: string[] = ['transport', 'accommodation', 'food', 'activities', 'shopping'];

export const CUSTOM_CATEGORY_COLORS: Array<{ bgClass: string; textClass: string; progressColorClass: string }> = [
    { bgClass: 'bg-cyan-100 dark:bg-cyan-900/30', textClass: 'text-cyan-700 dark:text-cyan-300', progressColorClass: 'bg-cyan-500' },
    { bgClass: 'bg-yellow-100 dark:bg-yellow-900/30', textClass: 'text-yellow-700 dark:text-yellow-300', progressColorClass: 'bg-yellow-500' },
    { bgClass: 'bg-red-100 dark:bg-red-900/30', textClass: 'text-red-700 dark:text-red-300', progressColorClass: 'bg-red-500' },
    { bgClass: 'bg-lime-100 dark:bg-lime-900/30', textClass: 'text-lime-700 dark:text-lime-300', progressColorClass: 'bg-lime-500' },
    { bgClass: 'bg-amber-100 dark:bg-amber-900/30', textClass: 'text-amber-700 dark:text-amber-300', progressColorClass: 'bg-amber-500' },
    { bgClass: 'bg-teal-100 dark:bg-teal-900/30', textClass: 'text-teal-700 dark:text-teal-300', progressColorClass: 'bg-teal-500' },
    { bgClass: 'bg-violet-100 dark:bg-violet-900/30', textClass: 'text-violet-700 dark:text-violet-300', progressColorClass: 'bg-violet-500' },
    { bgClass: 'bg-rose-100 dark:bg-rose-900/30', textClass: 'text-rose-700 dark:text-rose-300', progressColorClass: 'bg-rose-500' },
];

export function getBudgetByCategory(budgetItems: BudgetItem[]): Record<string, number> {
    const totals: Record<string, number> = {};
    for (const item of budgetItems) {
        totals[item.category] = (totals[item.category] ?? 0) + item.amount;
    }
    return totals;
}

export function getAllCategories(store: BarkadaStore): Record<string, CategoryMeta> {
    const hidden = store.hiddenBuiltInCategories ?? [];
    const builtIn = Object.fromEntries(Object.entries(CATEGORIES).filter(([key]) => !hidden.includes(key)));
    return { ...builtIn, ...store.customCategories };
}

export function getAllCategoryKeys(store: BarkadaStore): string[] {
    const hidden = store.hiddenBuiltInCategories ?? [];
    const inactive = store.inactiveCategories ?? [];
    return [
        ...CATEGORY_KEYS.filter((k) => !hidden.includes(k) && !inactive.includes(k)),
        ...Object.keys(store.customCategories).filter((k) => !inactive.includes(k)),
    ];
}

export function calculateMemberBudgetShare(memberId: string, budgetItems: BudgetItem[], carpools: Carpool[], totalMembers: number): number {
    const memberCarpoolId = carpools.find((c) => c.memberIds.includes(memberId))?.id;

    return budgetItems.reduce((sum, item) => {
        if (!item.carpoolId) {
            // Shared by all — equal split
            return sum + (totalMembers > 0 ? item.amount / totalMembers : 0);
        }
        if (item.carpoolId === memberCarpoolId) {
            // Belongs to this member's carpool
            const carpool = carpools.find((c) => c.id === item.carpoolId);
            const count = carpool?.memberIds.length ?? 1;
            return sum + item.amount / count;
        }
        // Another carpool's item — not this member's cost
        return sum;
    }, 0);
}

export function getActiveExpenses(store: BarkadaStore): Expense[] {
    const inactive = store.inactiveCategories ?? [];
    return store.expenses.filter((e) => !inactive.includes(e.category));
}

export function getActiveBudgetItems(store: BarkadaStore): BudgetItem[] {
    const inactive = store.inactiveCategories ?? [];
    return store.budgetItems.filter((item) => !inactive.includes(item.category));
}

export function getCategoryMeta(key: string, store: BarkadaStore): CategoryMeta {
    return (
        CATEGORIES[key] ??
        store.customCategories[key] ?? {
            label: key,
            shortLabel: key,
            icon: '❓',
            bgClass: 'bg-gray-100 dark:bg-gray-900/30',
            textClass: 'text-gray-700 dark:text-gray-300',
            progressColorClass: 'bg-gray-500',
            isCustom: true,
        }
    );
}
