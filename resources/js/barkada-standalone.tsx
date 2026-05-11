import '../../resources/css/standalone.css';

import { BudgetView } from '@/components/barkada/budget-view';
import { CarpoolsView } from '@/components/barkada/carpools-view';
import { CategoriesView } from '@/components/barkada/categories-view';
import { ExpensesView } from '@/components/barkada/expenses-view';
import { HomeView } from '@/components/barkada/home-view';
import { MembersView } from '@/components/barkada/members-view';
import { SettlementView } from '@/components/barkada/settlement-view';
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
import { useBarkadaStore } from '@/hooks/use-barkada-store';
import { cn } from '@/lib/utils';
import type { View } from '@/types/barkada';
import { Car, HandCoins, Home, Moon, ReceiptText, Sun, Tag, Users, Wallet } from 'lucide-react';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

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

function BarkadaApp() {
    const [view, setView] = useState<View>('home');
    const { dark, toggle: toggleDark } = useDarkMode();

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
    } = useBarkadaStore();

    return (
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
                                    <span className="font-semibold">Barkada Planner</span>
                                    <span className="text-xs text-muted-foreground">Trip Expense Calculator</span>
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
                            <SidebarMenuButton onClick={toggleDark} tooltip={{ children: dark ? 'Light mode' : 'Dark mode' }}>
                                {dark ? <Sun /> : <Moon />}
                                <span>{dark ? 'Light mode' : 'Dark mode'}</span>
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
                                <ExpensesView store={store} onAdd={addExpense} onRemove={removeExpense} />
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
    );
}

createRoot(document.getElementById('app')!).render(<BarkadaApp />);
