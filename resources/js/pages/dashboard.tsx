import { HomeView } from '@/components/barkada/home-view';
import AppLayout from '@/layouts/app-layout';
import { useBarkadaStore } from '@/hooks/use-barkada-store';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

export default function Dashboard() {
    const { store, isHydrated, updateTrip } = useBarkadaStore();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            {!isHydrated ? (
                <div className="flex flex-1 items-center justify-center py-20">
                    <div className="size-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                </div>
            ) : (
                <HomeView store={store} onUpdateTrip={updateTrip} />
            )}
        </AppLayout>
    );
}
