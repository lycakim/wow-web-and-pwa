import '../../resources/css/standalone.css';

import { BudgetView } from '@/components/barkada/budget-view';
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
import { Car, HandCoins, Home, LogOut, Moon, Pencil, ReceiptText, Sun, Tag, Users, Wallet } from 'lucide-react';
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
];

const VIEW_LABELS: Record<View, string> = {
    home: 'Home',
    members: 'Members',
    budget: 'Budget',
    expenses: 'Expenses',
    settlement: 'Settlement',
    categories: 'Categories',
    carpools: 'Carpools',
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

function TripApp({ tripId, tripCode, onLeave }: { tripId: string; tripCode: string | null; onLeave: () => void }) {
    const [view, setView] = useState<View>('home');
    const [showBanner, setShowBanner] = useState(!!tripCode);
    const [editingName, setEditingName] = useState(false);
    const { dark, toggle: toggleDark } = useDarkMode();
    const { name: currentUserName, saveName, isSet: nameIsSet } = useCurrentUser();

    // Auto-add user as a member once per trip per device
    useEffect(() => {
        if (!isHydrated || !nameIsSet || !currentUserName) return;
        const joinedKey = `barkada-joined-${tripId}`;
        if (localStorage.getItem(joinedKey)) return;
        localStorage.setItem(joinedKey, '1');
        addMember(currentUserName);
    }, [isHydrated, nameIsSet, tripId]); // eslint-disable-line react-hooks/exhaustive-deps

    const {
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
    } = useTripStore(tripId);

    // Read the saved trip code from localStorage if not passed directly
    const displayCode = tripCode ?? localStorage.getItem(TRIP_CODE_KEY) ?? '';

    return (
        <>
        {(!nameIsSet || editingName) && (
            <UserSetup onSave={(n) => {
                saveName(n);
                setEditingName(false);
                // If store already hydrated, add as member immediately
                if (isHydrated) {
                    const joinedKey = `barkada-joined-${tripId}`;
                    if (!localStorage.getItem(joinedKey)) {
                        localStorage.setItem(joinedKey, '1');
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

    const handleLeave = () => {
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
