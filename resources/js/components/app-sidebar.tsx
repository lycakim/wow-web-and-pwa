import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, Car, Folder, HandCoins, LayoutGrid, ReceiptText, Tag, Users, Wallet } from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

const barkadaNavItems: NavItem[] = [
    { title: 'Members', href: { url: '/barkada/members', method: 'get' }, icon: Users },
    { title: 'Budget', href: { url: '/barkada/budget', method: 'get' }, icon: Wallet },
    { title: 'Expenses', href: { url: '/barkada/expenses', method: 'get' }, icon: ReceiptText },
    { title: 'Settlement', href: { url: '/barkada/settlement', method: 'get' }, icon: HandCoins },
    { title: 'Categories', href: { url: '/barkada/categories', method: 'get' }, icon: Tag },
    { title: 'Carpools', href: { url: '/barkada/carpools', method: 'get' }, icon: Car },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
                <NavMain items={barkadaNavItems} label="Barkada Planner" />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
