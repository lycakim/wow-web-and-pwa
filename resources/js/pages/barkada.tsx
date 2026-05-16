import { BudgetView } from '@/components/barkada/budget-view';
import { CarpoolsView } from '@/components/barkada/carpools-view';
import { CategoriesView } from '@/components/barkada/categories-view';
import { ExpensesView } from '@/components/barkada/expenses-view';
import { HomeView } from '@/components/barkada/home-view';
import { MembersView } from '@/components/barkada/members-view';
import { SettlementView } from '@/components/barkada/settlement-view';
import { useBarkadaStore } from '@/hooks/use-barkada-store';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import type { View } from '@/types/barkada';
import { Head } from '@inertiajs/react';

const VALID_VIEWS: View[] = ['home', 'members', 'budget', 'expenses', 'settlement', 'categories', 'carpools'];

const BREADCRUMB_LABELS: Record<View, string> = {
    home: 'Home',
    members: 'Members',
    budget: 'Budget',
    expenses: 'Expenses',
    settlement: 'Settlement',
    categories: 'Categories',
    carpools: 'Carpools',
    grocery: 'Grocery',
    collections: 'Payment Status',
    mybalance: 'My Balance',
};

interface BarkadaProps {
    view: View;
}

export default function Barkada({ view: rawView }: BarkadaProps) {
    const view: View = VALID_VIEWS.includes(rawView) ? rawView : 'home';
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
        addDirectPayment,
        removeDirectPayment,
    } = useBarkadaStore();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Barkada Planner', href: '/barkada' },
        ...(view !== 'home' ? [{ title: BREADCRUMB_LABELS[view], href: `/barkada/${view}` }] : []),
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Barkada — ${BREADCRUMB_LABELS[view]}`} />

            <div className="flex h-full flex-1 flex-col overflow-y-auto">
                {!isHydrated ? (
                    <div className="flex flex-1 items-center justify-center py-20">
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
                        {view === 'settlement' && <SettlementView store={store} onAddDirectPayment={addDirectPayment} onRemoveDirectPayment={removeDirectPayment} />}
                        {view === 'categories' && (
                            <CategoriesView store={store} onAdd={addCategory} onUpdate={updateCategory} onToggleActive={toggleCategoryActive} onRemove={removeCategory} />
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
            </div>
        </AppLayout>
    );
}
