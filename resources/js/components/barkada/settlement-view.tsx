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

function MemberAvatar({ name, members, id, size = 'md' }: { name: string; members: Member[]; id: string; size?: 'sm' | 'md' }) {
    return (
        <Avatar className={size === 'sm' ? 'size-6' : 'size-8'}>
            <AvatarFallback className={cn(size === 'sm' ? 'text-[10px]' : 'text-xs', 'font-bold text-white', avatarColor(members, id))}>
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

    const activeCategoryKeys = allCategoryKeys.filter((cat) => (spendByCategory[cat] ?? 0) > 0);

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
                        <>
                            {/* Mobile cards */}
                            <div className="divide-y sm:hidden">
                                {settlements.map((s, i) => {
                                    const from = memberById[s.fromId] ?? { id: s.fromId, name: '?' } as Member;
                                    const to = memberById[s.toId] ?? { id: s.toId, name: '?' } as Member;
                                    return (
                                        <div key={i} className="px-4 py-4">
                                            {/* Amount prominent at top */}
                                            <p className="mb-3 text-center text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                                                {formatPeso(s.amount)}
                                            </p>
                                            {/* From → To */}
                                            <div className="flex items-center gap-2">
                                                <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                                                    <MemberAvatar name={from.name} members={members} id={from.id} />
                                                    <span className="max-w-full truncate text-center text-xs font-medium">{from.name}</span>
                                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">pays</span>
                                                </div>
                                                <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
                                                <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                                                    <MemberAvatar name={to.name} members={members} id={to.id} />
                                                    <span className="max-w-full truncate text-center text-xs font-medium">{to.name}</span>
                                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:bg-green-950/40 dark:text-green-400">receives</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Desktop table */}
                            <Table className="hidden sm:table">
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
                                        const from = memberById[s.fromId] ?? { id: s.fromId, name: '(Deleted)' } as Member;
                                        const to = memberById[s.toId] ?? { id: s.toId, name: '(Deleted)' } as Member;
                                        return (
                                            <TableRow key={i}>
                                                <TableCell className="pl-6">
                                                    <div className="flex items-center gap-2.5">
                                                        <MemberAvatar name={from.name} members={members} id={from.id} />
                                                        <span className={from.name === '(Deleted)' ? 'font-medium italic text-muted-foreground' : 'font-medium'}>{from.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell><ArrowRight className="size-4 text-muted-foreground" /></TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2.5">
                                                        <MemberAvatar name={to.name} members={members} id={to.id} />
                                                        <span className={to.name === '(Deleted)' ? 'font-medium italic text-muted-foreground' : 'font-medium'}>{to.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="pr-6 text-right font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{formatPeso(s.amount)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Member balances */}
            <Card>
                <CardHeader>
                    <CardTitle>Balance per Member</CardTitle>
                    <p className="text-sm text-muted-foreground">Fair share: {formatPeso(sharePerPerson)} each</p>
                </CardHeader>
                <CardContent className="px-0 pb-2">
                    {/* Mobile list */}
                    <div className="divide-y sm:hidden">
                        {members.map((m) => {
                            const paid = paidByMember[m.id] ?? 0;
                            const net = paid - sharePerPerson;
                            const isOwed = net > 0.005;
                            const owes = net < -0.005;
                            return (
                                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                                    <MemberAvatar name={m.name} members={members} id={m.id} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{m.name}</p>
                                        <p className="text-xs text-muted-foreground">Paid {formatPeso(paid)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn('text-sm font-bold tabular-nums', isOwed ? 'text-green-600 dark:text-green-400' : owes ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground')}>
                                            {isOwed ? '+' : ''}{formatPeso(net)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {isOwed ? 'gets back' : owes ? 'owes' : 'settled'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Desktop table */}
                    <Table className="hidden sm:table">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Member</TableHead>
                                <TableHead className="text-right">Paid</TableHead>
                                <TableHead className="pr-6 text-right">Net</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.map((m) => {
                                const paid = paidByMember[m.id] ?? 0;
                                const net = paid - sharePerPerson;
                                const isOwed = net > 0.005;
                                const owes = net < -0.005;
                                return (
                                    <TableRow key={m.id}>
                                        <TableCell className="pl-6">
                                            <div className="flex items-center gap-2.5">
                                                <MemberAvatar name={m.name} members={members} id={m.id} />
                                                <span className="font-medium">{m.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-muted-foreground">{formatPeso(paid)}</TableCell>
                                        <TableCell className={cn('pr-6 text-right font-semibold tabular-nums', isOwed ? 'text-green-600 dark:text-green-400' : owes ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground')}>
                                            {isOwed ? '+' : ''}{formatPeso(net)}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell className="pl-6">Total</TableCell>
                                <TableCell className="text-right font-semibold tabular-nums">{formatPeso(totalSpend)}</TableCell>
                                <TableCell className="pr-6" />
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>

            {/* Category breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Spend by Category</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                    {/* Mobile list */}
                    <div className="divide-y sm:hidden">
                        {activeCategoryKeys.map((cat) => {
                            const meta = allCategories[cat];
                            const spent = spendByCategory[cat] ?? 0;
                            const pct = totalSpend > 0 ? ((spent / totalSpend) * 100).toFixed(1) : '0';
                            const barWidth = totalSpend > 0 ? (spent / totalSpend) * 100 : 0;
                            return (
                                <div key={cat} className="px-4 py-3">
                                    <div className="mb-1.5 flex items-center justify-between gap-2">
                                        <Badge variant="outline" className={cn('border-0 text-xs', meta.bgClass, meta.textClass)}>
                                            {meta.icon} {meta.label}
                                        </Badge>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold tabular-nums">{formatPeso(spent)}</span>
                                            <span className="w-9 text-right text-xs text-muted-foreground">{pct}%</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-indigo-500 transition-all"
                                            style={{ width: `${barWidth}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        <div className="flex justify-between px-4 py-3 text-sm font-semibold">
                            <span>Total</span>
                            <span className="tabular-nums">{formatPeso(totalSpend)}</span>
                        </div>
                    </div>

                    {/* Desktop table */}
                    <Table className="hidden sm:table">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="pr-6 text-right">Share</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeCategoryKeys.map((cat) => {
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
