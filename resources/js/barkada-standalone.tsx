import '../../resources/css/standalone.css';

import { BudgetView } from '@/components/barkada/budget-view';
import { CarpoolsView } from '@/components/barkada/carpools-view';
import { CategoriesView } from '@/components/barkada/categories-view';
import { ExpensesView } from '@/components/barkada/expenses-view';
import { HomeView } from '@/components/barkada/home-view';
import { MembersView } from '@/components/barkada/members-view';
import { SettlementView } from '@/components/barkada/settlement-view';
import { useBarkadaStore } from '@/hooks/use-barkada-store';
import { cn } from '@/lib/utils';
import type { View } from '@/types/barkada';
import { Car, HandCoins, Home, Moon, ReceiptText, Sun, Tag, Users, Wallet } from 'lucide-react';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

type NavTab = { view: View; label: string; icon: React.ElementType };

const NAV_TABS: NavTab[] = [
    { view: 'home', label: 'Home', icon: Home },
    { view: 'members', label: 'Members', icon: Users },
    { view: 'budget', label: 'Budget', icon: Wallet },
    { view: 'expenses', label: 'Expenses', icon: ReceiptText },
    { view: 'settlement', label: 'Settle', icon: HandCoins },
    { view: 'categories', label: 'Categories', icon: Tag },
    { view: 'carpools', label: 'Carpools', icon: Car },
];

function useDarkMode() {
    const [dark, setDark] = useState(() => {
        const stored = localStorage.getItem('barkada-dark');
        return stored ? stored === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    const toggle = () => {
        setDark((prev) => {
            const next = !prev;
            localStorage.setItem('barkada-dark', String(next));
            document.documentElement.classList.toggle('dark', next);
            return next;
        });
    };

    // Apply on mount
    useState(() => {
        const stored = localStorage.getItem('barkada-dark');
        const isDark = stored ? stored === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', isDark);
    });

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
        <div className="flex h-dvh flex-col bg-background">
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🤙</span>
                    <span className="font-semibold text-foreground">Barkada Planner</span>
                </div>
                <button
                    type="button"
                    onClick={toggleDark}
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </button>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto">
                {!isHydrated ? (
                    <div className="flex h-full items-center justify-center">
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

            {/* Bottom nav */}
            <nav className="shrink-0 border-t bg-background">
                <div className="flex overflow-x-auto scrollbar-none">
                    {NAV_TABS.map(({ view: tabView, label, icon: Icon }) => {
                        const active = view === tabView;
                        return (
                            <button
                                key={tabView}
                                type="button"
                                onClick={() => setView(tabView)}
                                className={cn(
                                    'flex min-w-0 flex-1 flex-col items-center gap-0.5 px-2 py-2.5 text-[10px] font-medium transition-colors',
                                    active
                                        ? 'text-indigo-600 dark:text-indigo-400'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <Icon className={cn('size-5 shrink-0', active && 'stroke-[2.5]')} />
                                <span className="truncate">{label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}

createRoot(document.getElementById('app')!).render(<BarkadaApp />);
