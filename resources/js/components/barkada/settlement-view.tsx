import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { calculateSettlements, getSpendByCategory, getTotalSpend } from '@/hooks/use-barkada-store';
import { cn } from '@/lib/utils';
import type { BarkadaStore, Member } from '@/types/barkada';
import { getActiveExpenses, getAllCategories, getAllCategoryKeys } from '@/types/barkada';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface SettlementViewProps {
    store: BarkadaStore;
}

const AVATAR_COLORS = [
    'bg-indigo-500',
    'bg-violet-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-green-500',
    'bg-blue-500',
    'bg-teal-500',
    'bg-rose-500',
];

const GROUP_COLORS = [
    {
        row: 'bg-blue-50 dark:bg-blue-950/20',
        header: 'bg-blue-100 dark:bg-blue-900/40 font-semibold',
        text: 'text-blue-800 dark:text-blue-200',
        subtotal: 'bg-blue-100/60 dark:bg-blue-900/20',
    },
    {
        row: 'bg-amber-50 dark:bg-amber-950/20',
        header: 'bg-amber-100 dark:bg-amber-900/40 font-semibold',
        text: 'text-amber-800 dark:text-amber-200',
        subtotal: 'bg-amber-100/60 dark:bg-amber-900/20',
    },
    {
        row: 'bg-green-50 dark:bg-green-950/20',
        header: 'bg-green-100 dark:bg-green-900/40 font-semibold',
        text: 'text-green-800 dark:text-green-200',
        subtotal: 'bg-green-100/60 dark:bg-green-900/20',
    },
    {
        row: 'bg-rose-50 dark:bg-rose-950/20',
        header: 'bg-rose-100 dark:bg-rose-900/40 font-semibold',
        text: 'text-rose-800 dark:text-rose-200',
        subtotal: 'bg-rose-100/60 dark:bg-rose-900/20',
    },
    {
        row: 'bg-violet-50 dark:bg-violet-950/20',
        header: 'bg-violet-100 dark:bg-violet-900/40 font-semibold',
        text: 'text-violet-800 dark:text-violet-200',
        subtotal: 'bg-violet-100/60 dark:bg-violet-900/20',
    },
    {
        row: 'bg-teal-50 dark:bg-teal-950/20',
        header: 'bg-teal-100 dark:bg-teal-900/40 font-semibold',
        text: 'text-teal-800 dark:text-teal-200',
        subtotal: 'bg-teal-100/60 dark:bg-teal-900/20',
    },
];

function avatarColor(members: Member[], id: string): string {
    const i = members.findIndex((m) => m.id === id);
    return AVATAR_COLORS[(i >= 0 ? i : 0) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');
}

function formatPeso(amount: number): string {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function MemberAvatar({ name, members, id }: { name: string; members: Member[]; id: string }) {
    return (
        <Avatar className="size-7">
            <AvatarFallback className={cn('text-xs font-bold text-white', avatarColor(members, id))}>
                {getInitials(name)}
            </AvatarFallback>
        </Avatar>
    );
}

export function SettlementView({ store }: SettlementViewProps) {
    const { members } = store;
    const activeExpenses = getActiveExpenses(store);
    const settlements = calculateSettlements(members, activeExpenses);
    const totalSpend = getTotalSpend(activeExpenses);
    const spendByCategory = getSpendByCategory(activeExpenses);
    const allCategories = getAllCategories(store);
    const allCategoryKeys = getAllCategoryKeys(store);

    const paidByMember: Record<string, number> = Object.fromEntries(members.map((m) => [m.id, 0]));
    for (const expense of activeExpenses) {
        if (paidByMember[expense.paidById] !== undefined) {
            paidByMember[expense.paidById] += expense.amount;
        }
    }

    const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
    const sharePerPerson = members.length > 0 ? totalSpend / members.length : 0;

    if (members.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 pt-16 text-center">
                <p className="text-4xl">💸</p>
                <p className="mt-3 text-base font-semibold">No members yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Add members and log expenses to see settlements</p>
            </div>
        );
    }

    if (activeExpenses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 pt-16 text-center">
                <p className="text-4xl">🤝</p>
                <p className="mt-3 text-base font-semibold">No expenses yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Log expenses to see who owes who</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4">
            {/* Transactions needed */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        {settlements.length === 0 ? 'All Settled 🎉' : `${settlements.length} Payment${settlements.length > 1 ? 's' : ''} Needed`}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Minimized number of transactions</p>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                    {settlements.length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-center">
                            <CheckCircle2 className="size-10 text-green-500" />
                            <p className="mt-2 font-medium">Everyone is even!</p>
                            <p className="text-sm text-muted-foreground">No payments needed</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">From</TableHead>
                                    <TableHead />
                                    <TableHead>To</TableHead>
                                    <TableHead className="pr-6 text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {settlements.map((s, i) => {
                                    const from = memberById[s.fromId] ?? { id: s.fromId, name: '(Deleted)' };
                                    const to = memberById[s.toId] ?? { id: s.toId, name: '(Deleted)' };

                                    return (
                                        <TableRow key={i}>
                                            <TableCell className="pl-6">
                                                <div className="flex items-center gap-2.5">
                                                    <MemberAvatar name={from.name} members={members} id={from.id} />
                                                    <span className={from.name === '(Deleted)' ? 'font-medium italic text-muted-foreground' : 'font-medium'}>
                                                        {from.name}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <ArrowRight className="size-4 text-muted-foreground" />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2.5">
                                                    <MemberAvatar name={to.name} members={members} id={to.id} />
                                                    <span className={to.name === '(Deleted)' ? 'font-medium italic text-muted-foreground' : 'font-medium'}>
                                                        {to.name}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="pr-6 text-right font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                                                {formatPeso(s.amount)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Category breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Spend by Category</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="pr-6 text-right">Share</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allCategoryKeys
                                .filter((cat) => (spendByCategory[cat] ?? 0) > 0)
                                .map((cat) => {
                                    const meta = allCategories[cat];
                                    const spent = spendByCategory[cat] ?? 0;
                                    const pct = totalSpend > 0 ? ((spent / totalSpend) * 100).toFixed(1) : '0';

                                    return (
                                        <TableRow key={cat}>
                                            <TableCell className="pl-6">
                                                <Badge
                                                    variant="outline"
                                                    className={cn('border-0 text-xs', meta.bgClass, meta.textClass)}
                                                >
                                                    {meta.icon} {meta.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium tabular-nums">
                                                {formatPeso(spent)}
                                            </TableCell>
                                            <TableCell className="pr-6 text-right text-muted-foreground">{pct}%</TableCell>
                                        </TableRow>
                                    );
                                })}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell className="pl-6">Total</TableCell>
                                <TableCell className="text-right font-semibold tabular-nums">{formatPeso(totalSpend)}</TableCell>
                                <TableCell className="pr-6 text-right">100%</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
