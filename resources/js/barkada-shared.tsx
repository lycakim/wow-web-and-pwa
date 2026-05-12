import '../../resources/css/standalone.css';

// When a new service worker takes control (skipWaiting + clientsClaim), the
// already-loaded page has stale chunk hashes. Reload once so the fresh build loads.
if ('serviceWorker' in navigator) {
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
    });
}

import { BudgetView } from '@/components/barkada/budget-view';
import { CollectionsView } from '@/components/barkada/collections-view';
import { MyBalanceView } from '@/components/barkada/my-balance-view';
import { GroceryView } from '@/components/barkada/grocery-view';
import { CarpoolsView } from '@/components/barkada/carpools-view';
import { CategoriesView } from '@/components/barkada/categories-view';
import { ExpensesView } from '@/components/barkada/expenses-view';
import { HomeView } from '@/components/barkada/home-view';
import { MembersView } from '@/components/barkada/members-view';
import { SettlementView } from '@/components/barkada/settlement-view';
import { ConfirmDeleteDialog } from '@/components/barkada/confirm-delete-dialog';
import { TripCodeBanner, TripLanding } from '@/components/barkada/trip-landing';
import { UserSetup } from '@/components/barkada/user-setup';
import { useCurrentUser } from '@/hooks/use-current-user';
import { usePushNotifications } from '@/hooks/use-push-notifications';
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
    useSidebar,
} from '@/components/ui/sidebar';
import { useTripStore } from '@/hooks/use-trip-store';
import { cn } from '@/lib/utils';
import type { View } from '@/types/barkada';
import { ArrowLeftRight, Bell, BellOff, Car, Check, Copy, HandCoins, Home, LogOut, Moon, Pencil, ReceiptText, RefreshCw, ShoppingCart, Sun, Tag, Users, Vault, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const TRIP_ID_KEY = 'barkada-trip-id';
const TRIP_CODE_KEY = 'barkada-trip-code';

type NavItem = { view: View; label: string; icon: React.ElementType };

const MAIN_NAV: NavItem[] = [
    { view: 'home', label: 'Home', icon: Home },
    { view: 'mybalance', label: 'My Balance', icon: ArrowLeftRight },
    { view: 'expenses', label: 'Expenses', icon: ReceiptText },
    { view: 'collections', label: 'Collections', icon: Vault },
    { view: 'grocery', label: 'Grocery', icon: ShoppingCart },
    { view: 'settlement', label: 'Settlement', icon: HandCoins },
];

const SETUP_NAV: NavItem[] = [
    { view: 'members', label: 'Members', icon: Users },
    { view: 'budget', label: 'Budget', icon: Wallet },
    { view: 'carpools', label: 'Carpools', icon: Car },
    { view: 'categories', label: 'Categories', icon: Tag },
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
    collections: 'Collections',
    mybalance: 'My Balance',
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

function NavGroup({ items, view, onNav }: { items: NavItem[]; view: View; onNav: (v: View) => void }) {
    const { setOpenMobile } = useSidebar();

    const handleNav = (v: View) => {
        onNav(v);
        setOpenMobile(false);
    };

    return (
        <SidebarMenu>
            {items.map(({ view: itemView, label, icon: Icon }) => (
                <SidebarMenuItem key={itemView}>
                    <SidebarMenuButton
                        isActive={view === itemView}
                        tooltip={{ children: label }}
                        onClick={() => handleNav(itemView)}
                    >
                        <Icon />
                        <span>{label}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
        </SidebarMenu>
    );
}

function TripApp({ tripId, tripCode, onSwitch, onLeave }: { tripId: string; tripCode: string | null; onSwitch: () => void; onLeave: (id: string) => void }) {
    const [view, setView] = useState<View>('home');
    const [showBanner, setShowBanner] = useState(!!tripCode);
    const [editingName, setEditingName] = useState(false);
    const [removedFromTrip, setRemovedFromTrip] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [confirmSwitch, setConfirmSwitch] = useState(false);
    const { dark, toggle: toggleDark } = useDarkMode();
    const { name: currentUserName, saveName, isSet: nameIsSet } = useCurrentUser();

    const {
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
        addCollection,
        removeCollection,
        addCollectionPayment,
        removeCollectionPayment,
    } = useTripStore(tripId);

    const { isSubscribed: notifSubscribed, isLoading: notifLoading, isSupported: notifSupported, subscribe: subscribeToNotifs, unsubscribe: unsubscribeFromNotifs } = usePushNotifications(tripId, currentUserName);

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
    const [regenerating, setRegenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleRegenerateCode = async () => {
        if (!confirm('Generate a new trip code? The old code will stop working — share the new one with your barkada.')) return;
        setRegenerating(true);
        try {
            const newCode = await regenerateTripCode();
            localStorage.setItem(TRIP_CODE_KEY, newCode);
            setDisplayCode(newCode);
        } finally {
            setRegenerating(false);
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(displayCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
                                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                                    <span className="font-semibold">{store.trip.name || 'Barkada Planner'}</span>
                                    <span className="font-mono text-xs text-muted-foreground">Code: {displayCode}</span>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarContent>
                    <SidebarGroup className="px-2 py-0">
                        <SidebarGroupLabel>Main</SidebarGroupLabel>
                        <NavGroup items={MAIN_NAV} view={view} onNav={setView} />
                    </SidebarGroup>
                    <SidebarGroup className="px-2 py-0">
                        <SidebarGroupLabel>Setup</SidebarGroupLabel>
                        <NavGroup items={SETUP_NAV} view={view} onNav={setView} />
                    </SidebarGroup>
                </SidebarContent>

                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={handleCopyCode} tooltip={{ children: copied ? 'Copied!' : `Copy code: ${displayCode}` }}>
                                {copied ? <Check className="text-green-500" /> : <Copy />}
                                <span className="font-mono tracking-widest">{displayCode}</span>
                                {copied && <span className="ml-auto text-xs text-green-500">Copied!</span>}
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={handleRegenerateCode} disabled={regenerating} tooltip={{ children: 'Regenerate trip code' }} className="text-muted-foreground">
                                <RefreshCw className={regenerating ? 'animate-spin' : ''} />
                                <span>Regenerate code</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => setEditingName(true)} tooltip={{ children: 'Change your name' }}>
                                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                                    {currentUserName ? currentUserName[0].toUpperCase() : '?'}
                                </div>
                                <span className="truncate">{currentUserName || 'Set your name'}</span>
                                <Pencil className="ml-auto size-3 text-muted-foreground" />
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        {notifSupported && (
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    onClick={notifSubscribed ? unsubscribeFromNotifs : subscribeToNotifs}
                                    disabled={notifLoading}
                                    tooltip={{ children: notifSubscribed ? 'Turn off notifications' : 'Turn on notifications' }}
                                >
                                    {notifSubscribed ? <Bell className="text-indigo-600 dark:text-indigo-400" /> : <BellOff />}
                                    <span>{notifSubscribed ? 'Notifications on' : 'Notifications off'}</span>
                                    {notifLoading && <span className="ml-auto size-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />}
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )}
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={toggleDark} tooltip={{ children: dark ? 'Light mode' : 'Dark mode' }}>
                                {dark ? <Sun /> : <Moon />}
                                <span>{dark ? 'Light mode' : 'Dark mode'}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => setConfirmSwitch(true)} tooltip={{ children: 'Visit another trip' }} className="text-muted-foreground">
                                <ArrowLeftRight />
                                <span>Switch Trip</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => setConfirmLeave(true)} tooltip={{ children: 'Leave & remove yourself from this trip' }} className="text-muted-foreground hover:text-destructive">
                                <LogOut />
                                <span>Leave Trip</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>

            <SidebarInset>
                {/* Header */}
                <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1 size-9" />
                    <div className="h-4 w-px bg-border" />
                    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span className="hidden sm:inline">Barkada Planner</span>
                        {view !== 'home' ? (
                            <>
                                <span className="hidden sm:inline">/</span>
                                <span className="text-foreground font-medium">{VIEW_LABELS[view]}</span>
                            </>
                        ) : (
                            <span className="text-foreground font-medium sm:hidden">
                                {store.trip.name || 'Barkada Planner'}
                            </span>
                        )}
                    </nav>
                </header>

                {/* Offline / syncing banner */}
                {(!isOnline || isSyncing) && (
                    <div className={cn(
                        'flex items-center gap-2 px-4 py-2 text-xs font-medium',
                        isSyncing
                            ? 'bg-indigo-600 text-white'
                            : 'bg-amber-400 text-amber-950 dark:bg-amber-500 dark:text-amber-950',
                    )}>
                        {isSyncing ? (
                            <>
                                <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                <span className="font-semibold">Syncing…</span>
                                <span className="opacity-75">{pendingCount} change{pendingCount !== 1 ? 's' : ''}</span>
                            </>
                        ) : (
                            <>
                                <span className="shrink-0">⚡</span>
                                <span className="font-semibold">Offline</span>
                                {pendingCount > 0 ? (
                                    <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-950/20 px-2 py-0.5">
                                        <span className="font-bold tabular-nums">{pendingCount}</span>
                                        <span className="opacity-75">pending</span>
                                    </span>
                                ) : (
                                    <span className="ml-1 opacity-65 hidden sm:inline">— will sync when reconnected</span>
                                )}
                            </>
                        )}
                    </div>
                )}

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
                                    onRename={renameGroceryItem}
                                    onClearChecked={clearCheckedGroceryItems}
                                />
                            )}
                            {view === 'collections' && (
                                <CollectionsView
                                    store={store}
                                    currentUserName={currentUserName || undefined}
                                    onAddCollection={addCollection}
                                    onRemoveCollection={removeCollection}
                                    onAddPayment={addCollectionPayment}
                                    onRemovePayment={removeCollectionPayment}
                                />
                            )}
                            {view === 'mybalance' && (
                                <MyBalanceView store={store} />
                            )}
                        </>
                    )}
                </main>
            </SidebarInset>
        </SidebarProvider>

        <ConfirmDeleteDialog
            open={confirmSwitch}
            onOpenChange={setConfirmSwitch}
            title="Switch Trip"
            description="Go back to the landing page? You'll stay as a member and can rejoin with the same code."
            confirmLabel="Switch"
            confirmVariant="default"
            onConfirm={onSwitch}
        />
        <ConfirmDeleteDialog
            open={confirmLeave}
            onOpenChange={setConfirmLeave}
            title="Leave Trip"
            description="Remove yourself from this trip? You won't appear as a member anymore. You can still rejoin with the code, but you'll be added as a new member."
            confirmLabel="Leave Trip"
            confirmVariant="destructive"
            onConfirm={() => onLeave(tripId)}
        />
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

    // Switch: go to landing but keep membership (can rejoin same trip)
    const handleSwitch = () => {
        localStorage.removeItem(TRIP_ID_KEY);
        localStorage.removeItem(TRIP_CODE_KEY);
        setTripId(null);
        setNewTripCode(null);
    };

    // Leave: remove membership then go to landing
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

    return <TripApp tripId={tripId} tripCode={newTripCode} onSwitch={handleSwitch} onLeave={handleLeave} />;
}

createRoot(document.getElementById('app')!).render(<BarkadaSharedApp />);
