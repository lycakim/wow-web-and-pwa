import '../../resources/css/standalone.css';

import { BudgetView } from '@/components/barkada/budget-view';
import { GroceryView } from '@/components/barkada/grocery-view';
import { CarpoolsView } from '@/components/barkada/carpools-view';
import { CategoriesView } from '@/components/barkada/categories-view';
import { ExpensesView } from '@/components/barkada/expenses-view';
import { HomeView } from '@/components/barkada/home-view';
import { MembersView } from '@/components/barkada/members-view';
import { SettlementView } from '@/components/barkada/settlement-view';
import { TripCodeBanner, TripLanding } from '@/components/barkada/trip-landing';
import { UserSetup } from '@/components/barkada/user-setup';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { useTripStore } from '@/hooks/use-trip-store';
import { cn } from '@/lib/utils';
import type { View } from '@/types/barkada';
import { Car, HandCoins, Home, LogOut, Moon, Pencil, ReceiptText, RefreshCw, ShoppingCart, Sun, Tag, Users, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const TRIP_ID_KEY = 'barkada-trip-id';
const TRIP_CODE_KEY = 'barkada-trip-code';

type NavItem = { view: View; label: string; icon: React.ElementType };

const NAV_ITEMS: NavItem[] = [
    { view: 'home', label: 'Home', icon: Home },
    { view: 'members', label: 'Members', icon: Users },
    { view: 'budget', label: 'Budget', icon: Wallet },
    { view: 'expenses', label: 'Expenses', icon: ReceiptText },
    { view: 'settlement', label: 'Settlement', icon: HandCoins },
    { view: 'categories', label: 'Categories', icon: Tag },
    { view: 'carpools', label: 'Carpools', icon: Car },
    { view: 'grocery', label: 'Grocery', icon: ShoppingCart },
];

const VIEW_LABELS: Record<View, string> = {
    home: 'Home',
    members: 'Members',
    budget: 'Budget',
    expenses: 'Expenses',
    settlement: 'Settlement',
    categories: 'Categories',
    carpools: 'Carpools',
    grocery: 'Grocery',
};

function useDarkMode() {
    const [dark, setDark] = useState(() => {
        const stored = localStorage.getItem('barkada-dark');
        const isDark = stored ? stored === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', isDark);
        return isDark;
    });

    const toggle = () => {
        setDark((prev) => {
            const next = !prev;
            localStorage.setItem('barkada-dark', String(next));
            document.documentElement.classList.toggle('dark', next);
            return next;
        });
    };

    return { dark, toggle };
}

function TripApp({ tripId, tripCode, onLeave }: { tripId: string; tripCode: string | null; onLeave: (id: string) => void }) {
    const [view, setView] = useState<View>('home');
    const [showBanner, setShowBanner] = useState(!!tripCode);
    const [editingName, setEditingName] = useState(false);
    const [removedFromTrip, setRemovedFromTrip] = useState(false);
    const { dark, toggle: toggleDark } = useDarkMode();
    const { name: currentUserName, saveName, isSet: nameIsSet } = useCurrentUser();

    const {
        store,
        isHydrated,
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
        clearCheckedGroceryItems,
    } = useTripStore(tripId);

    // Once hydrated, auto-join: claim existing member by name or add as new
    useEffect(() => {
        if (!isHydrated || !nameIsSet || !currentUserName) return;
        const joinedKey = `barkada-joined-${tripId}`;
        if (localStorage.getItem(joinedKey)) return;
        const match = store.members.find((m) => m.name.toLowerCase() === currentUserName.toLowerCase());
        if (match) {
            localStorage.setItem(joinedKey, match.id);
        } else {
            localStorage.setItem(joinedKey, 'new');
            addMember(currentUserName);
        }
    }, [isHydrated, nameIsSet, tripId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Detect if the current user was removed from the members list
    useEffect(() => {
        if (!isHydrated) return;
        const joinedKey = `barkada-joined-${tripId}`;
        const joinedId = localStorage.getItem(joinedKey);
        if (!joinedId || joinedId === 'new') return;
        const stillExists = store.members.some((m) => m.id === joinedId);
        if (!stillExists) setRemovedFromTrip(true);
    }, [isHydrated, store.members, tripId]);

    // Read the saved trip code from localStorage if not passed directly
    const [displayCode, setDisplayCode] = useState(() => tripCode ?? localStorage.getItem(TRIP_CODE_KEY) ?? '');
    const [confirmRegenerate, setConfirmRegenerate] = useState(false);
    const [regenerating, setRegenerating] = useState(false);

    const handleRegenerateCode = async () => {
        setRegenerating(true);
        try {
            const newCode = await regenerateTripCode();
            localStorage.setItem(TRIP_CODE_KEY, newCode);
            setDisplayCode(newCode);
            setConfirmRegenerate(false);
        } finally {
            setRegenerating(false);
        }
    };

    return (
        <>
        {removedFromTrip && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="mx-4 max-w-sm rounded-xl border bg-card p-6 text-center shadow-lg">
                    <p className="text-2xl">👋</p>
                    <h2 className="mt-2 text-base font-semibold">You've been removed</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        You're no longer a member of this trip.
                    </p>
                    <button
                        type="button"
                        onClick={() => onLeave(tripId)}
                        className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        )}
        {isHydrated && (!nameIsSet || editingName) && (
            <UserSetup onSave={(n) => {
                saveName(n);
                setEditingName(false);
                const joinedKey = `barkada-joined-${tripId}`;
                if (!localStorage.getItem(joinedKey)) {
                    const match = store.members.find((m) => m.name.toLowerCase() === n.toLowerCase());
                    if (match) {
                        // Name matches an existing member — claim them, no duplicate
                        localStorage.setItem(joinedKey, match.id);
                    } else {
                        // New person — add as member
                        localStorage.setItem(joinedKey, 'new');
                        addMember(n);
                    }
                }
            }} />
        )}
        <SidebarProvider>
            <Sidebar collapsible="icon" variant="inset">
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" onClick={() => setView('home')}>
                                <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                                    <span className="text-base leading-none">🤙</span>
                                </div>
                                <div className="flex flex-col gap-0.5 leading-none">
                                    <span className="font-semibold">{store.trip.name || 'Barkada Planner'}</span>
                                    <span className="font-mono text-xs text-muted-foreground">Code: {displayCode}</span>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                    {/* Regenerate code button */}
                    {!confirmRegenerate ? (
                        <button
                            type="button"
                            onClick={() => setConfirmRegenerate(true)}
                            className="mx-2 mb-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <RefreshCw className="size-3" />
                            <span>Regenerate code</span>
                        </button>
                    ) : (
                        <div className="mx-2 mb-1 rounded-md border bg-muted/50 p-2 text-xs">
                            <p className="text-muted-foreground">Kicked members won't be able to rejoin with the old code.</p>
                            <div className="mt-2 flex gap-1.5">
                                <button
                                    type="button"
                                    onClick={handleRegenerateCode}
                                    disabled={regenerating}
                                    className="flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                >
                                    {regenerating ? <RefreshCw className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                                    Confirm
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmRegenerate(false)}
                                    className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </SidebarHeader>

                <SidebarContent>
                    <SidebarGroup className="px-2 py-0">
                        <SidebarGroupLabel>Barkada Planner</SidebarGroupLabel>
                        <SidebarMenu>
                            {NAV_ITEMS.map(({ view: itemView, label, icon: Icon }) => (
                                <SidebarMenuItem key={itemView}>
                                    <SidebarMenuButton
                                        isActive={view === itemView}
                                        tooltip={{ children: label }}
                                        onClick={() => setView(itemView)}
                                    >
                                        <Icon />
                                        <span>{label}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                </SidebarContent>

                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => setEditingName(true)} tooltip={{ children: 'Change your name' }}>
                                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                                    {currentUserName ? currentUserName[0].toUpperCase() : '?'}
                                </div>
                                <span className="truncate">{currentUserName || 'Set your name'}</span>
                                <Pencil className="ml-auto size-3 text-muted-foreground" />
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={toggleDark} tooltip={{ children: dark ? 'Light mode' : 'Dark mode' }}>
                                {dark ? <Sun /> : <Moon />}
                                <span>{dark ? 'Light mode' : 'Dark mode'}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={onLeave} tooltip={{ children: 'Leave trip' }} className="text-muted-foreground hover:text-destructive">
                                <LogOut />
                                <span>Leave Trip</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>

            <SidebarInset>
                {/* Header */}
                <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                    <div className="h-4 w-px bg-border" />
                    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span>Barkada Planner</span>
                        {view !== 'home' && (
                            <>
                                <span>/</span>
                                <span className="text-foreground">{VIEW_LABELS[view]}</span>
                            </>
                        )}
                    </nav>
                </header>

                {/* Trip code banner shown after creating */}
                {showBanner && displayCode && (
                    <TripCodeBanner code={displayCode} onDismiss={() => setShowBanner(false)} />
                )}

                {/* Content */}
                <main className="flex-1 overflow-y-auto">
                    {!isHydrated ? (
                        <div className="flex h-64 items-center justify-center">
                            <div className="size-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                        </div>
                    ) : (
                        <>
                            {view === 'home' && <HomeView store={store} onUpdateTrip={updateTrip} />}
                            {view === 'members' && (
                                <MembersView
                                    members={store.members}
                                    onAdd={addMember}
                                    onUpdate={updateMember}
                                    onRemove={removeMember}
                                />
                            )}
                            {view === 'budget' && (
                                <BudgetView
                                    store={store}
                                    onAdd={addBudgetItem}
                                    onUpdate={updateBudgetItem}
                                    onRemove={removeBudgetItem}
                                    onSetBudgetBuffer={setBudgetBuffer}
                                    onSetContingency={setContingency}
                                />
                            )}
                            {view === 'expenses' && (
                                <ExpensesView store={store} onAdd={addExpense} onRemove={removeExpense} currentUserName={currentUserName || undefined} />
                            )}
                            {view === 'settlement' && <SettlementView store={store} />}
                            {view === 'categories' && (
                                <CategoriesView
                                    store={store}
                                    onAdd={addCategory}
                                    onUpdate={updateCategory}
                                    onToggleActive={toggleCategoryActive}
                                    onRemove={removeCategory}
                                />
                            )}
                            {view === 'carpools' && (
                                <CarpoolsView
                                    members={store.members}
                                    carpools={store.carpools}
                                    onAdd={addCarpool}
                                    onUpdate={updateCarpool}
                                    onRemove={removeCarpool}
                                />
                            )}
                            {view === 'grocery' && (
                                <GroceryView
                                    items={store.groceryItems}
                                    members={store.members}
                                    currentUserName={currentUserName || undefined}
                                    onAdd={addGroceryItem}
                                    onToggle={toggleGroceryItem}
                                    onAssign={assignGroceryItem}
                                    onRemove={removeGroceryItem}
                                    onClearChecked={clearCheckedGroceryItems}
                                />
                            )}
                        </>
                    )}
                </main>
            </SidebarInset>
        </SidebarProvider>
        </>
    );
}

function BarkadaSharedApp() {
    const [tripId, setTripId] = useState<string | null>(() => localStorage.getItem(TRIP_ID_KEY));
    const [newTripCode, setNewTripCode] = useState<string | null>(null);

    const handleEnter = (id: string, code: string) => {
        localStorage.setItem(TRIP_ID_KEY, id);
        localStorage.setItem(TRIP_CODE_KEY, code);
        setNewTripCode(code);
        setTripId(id);
    };

    const handleLeave = (id?: string) => {
        const resolvedId = id ?? localStorage.getItem(TRIP_ID_KEY);
        if (resolvedId) localStorage.removeItem(`barkada-joined-${resolvedId}`);
        localStorage.removeItem(TRIP_ID_KEY);
        localStorage.removeItem(TRIP_CODE_KEY);
        setTripId(null);
        setNewTripCode(null);
    };

    if (!tripId) {
        return <TripLanding onEnter={handleEnter} />;
    }

    return <TripApp tripId={tripId} tripCode={newTripCode} onLeave={handleLeave} />;
}

createRoot(document.getElementById('app')!).render(<BarkadaSharedApp />);
