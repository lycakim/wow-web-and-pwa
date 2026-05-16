import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { BarkadaStore, Member } from '@/types/barkada';
import { calculateMemberBudgetShare, getActiveBudgetItems, getCategoryMeta } from '@/types/barkada';

const AVATAR_COLORS = [
    'bg-indigo-500', 'bg-violet-500', 'bg-pink-500', 'bg-orange-500',
    'bg-green-500', 'bg-blue-500', 'bg-teal-500', 'bg-rose-500',
];

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function avatarColor(members: Member[], id: string): string {
    const i = members.findIndex((m) => m.id === id);
    return AVATAR_COLORS[(i >= 0 ? i : 0) % AVATAR_COLORS.length];
}

function MemberAvatar({ members, id, size = 'sm' }: { members: Member[]; id: string; size?: 'sm' | 'md' }) {
    const member = members.find((m) => m.id === id);
    const name = member?.name ?? '?';
    return (
        <span className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white',
            avatarColor(members, id),
            size === 'sm' ? 'size-6 text-[10px]' : 'size-8 text-xs',
        )}>
            {getInitials(name)}
        </span>
    );
}

function formatPeso(amount: number): string {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Payment Status View ───────────────────────────────────────────────────────

interface PaymentStatusViewProps {
    store: BarkadaStore;
    myMemberId?: string;
}

export function CollectionsView({ store, myMemberId }: PaymentStatusViewProps) {
    const { members, carpools, collectionPayments, memberPayments = [] } = store;
    const activeBudgetItems = getActiveBudgetItems(store);

    if (members.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 pt-16 text-center">
                <p className="text-4xl">👥</p>
                <p className="mt-3 text-base font-semibold">Add members first</p>
                <p className="mt-1 text-sm text-muted-foreground">Payment status shows once you have members and a budget</p>
            </div>
        );
    }

    if (activeBudgetItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 pt-16 text-center">
                <p className="text-4xl">📋</p>
                <p className="mt-3 text-base font-semibold">No budget items yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Add budget items to track payment coverage per member</p>
            </div>
        );
    }

    // For each member: compute their total advance and waterfall coverage per item
    type CoverageStatus = 'covered' | 'partial' | 'unpaid';
    type ItemCoverage = { share: number; status: CoverageStatus; paid: number; leftover: number };

    const memberData = members.map((m) => {
        const advance =
            collectionPayments.filter((p) => p.fromMemberId === m.id).reduce((s, p) => s + p.amount, 0) +
            memberPayments.filter((p) => p.memberId === m.id).reduce((s, p) => s + p.amount, 0);

        let remaining = advance;
        const byItem: Record<string, ItemCoverage> = {};

        for (const item of activeBudgetItems) {
            const share = calculateMemberBudgetShare(m.id, [item], carpools, members.length);
            if (share <= 0.005) continue; // item doesn't apply to this member (different carpool)
            if (remaining >= share) {
                remaining -= share;
                byItem[item.id] = { share, status: 'covered', paid: share, leftover: 0 };
            } else {
                const paid = remaining;
                remaining = 0;
                if (paid > 0.005) {
                    byItem[item.id] = { share, status: 'partial', paid, leftover: share - paid };
                } else {
                    byItem[item.id] = { share, status: 'unpaid', paid: 0, leftover: share };
                }
            }
        }

        const totalShare = calculateMemberBudgetShare(m.id, activeBudgetItems, carpools, members.length);
        return { member: m, advance, totalShare, byItem };
    });

    // Overall summary
    const totalAdvance = memberData.reduce((s, d) => s + d.advance, 0);
    const totalBudget = memberData.reduce((s, d) => s + d.totalShare, 0);
    const overallPct = totalBudget > 0 ? Math.min(100, (totalAdvance / totalBudget) * 100) : 0;
    const allPaid = totalAdvance >= totalBudget;

    return (
        <div className="space-y-4 p-4">
            {/* Header */}
            <div>
                <h2 className="font-semibold">Payment Status</h2>
                <p className="text-sm text-muted-foreground">Who has covered which budget items</p>
            </div>

            {/* Summary card */}
            <Card>
                <CardContent className="pt-4">
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground">Total advance collected</p>
                            <p className={cn('text-2xl font-bold tabular-nums', allPaid ? 'text-green-600 dark:text-green-400' : 'text-indigo-600 dark:text-indigo-400')}>
                                {formatPeso(totalAdvance)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">Total budget needed</p>
                            <p className="text-lg font-semibold tabular-nums text-foreground">{formatPeso(totalBudget)}</p>
                        </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className={cn('h-full rounded-full transition-all', allPaid ? 'bg-green-500' : 'bg-indigo-500')}
                            style={{ width: `${overallPct}%` }}
                        />
                    </div>
                    <p className="mt-1.5 text-right text-xs text-muted-foreground">{overallPct.toFixed(0)}% covered</p>
                    {allPaid && (
                        <p className="mt-1 text-center text-xs font-semibold text-green-600 dark:text-green-400">🎉 Fully covered!</p>
                    )}
                </CardContent>
            </Card>

            {/* Per-item cards */}
            {activeBudgetItems.map((item) => {
                const meta = getCategoryMeta(item.category, store);
                // Only show members who have a share for this item
                const applicableMembers = memberData.filter((d) => !!d.byItem[item.id]);
                if (applicableMembers.length === 0) return null;

                const itemTotal = applicableMembers.reduce((s, d) => s + (d.byItem[item.id]?.share ?? 0), 0);
                const itemPaid = applicableMembers.reduce((s, d) => s + (d.byItem[item.id]?.paid ?? 0), 0);
                const allItemCovered = applicableMembers.every((d) => d.byItem[item.id]?.status === 'covered');

                return (
                    <Card key={item.id}>
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="text-xl">{meta.icon}</span>
                                    <div className="min-w-0">
                                        <CardTitle className="text-base leading-tight">{item.name}</CardTitle>
                                        <p className="text-xs text-muted-foreground">{meta.label}</p>
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-sm font-bold tabular-nums">{formatPeso(item.amount)}</p>
                                    {allItemCovered
                                        ? <p className="text-xs font-semibold text-green-600 dark:text-green-400">✅ All covered</p>
                                        : <p className="text-xs text-muted-foreground">{formatPeso(itemPaid)} paid</p>
                                    }
                                </div>
                            </div>

                            {/* Mini progress bar */}
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className={cn('h-full rounded-full transition-all', allItemCovered ? 'bg-green-500' : 'bg-indigo-500')}
                                    style={{ width: `${itemTotal > 0 ? Math.min(100, (itemPaid / itemTotal) * 100) : 0}%` }}
                                />
                            </div>
                        </CardHeader>

                        <CardContent className="px-0 pb-0">
                            <div className="divide-y border-t">
                                {applicableMembers.map(({ member, byItem }) => {
                                    const cov = byItem[item.id];
                                    const isMe = member.id === myMemberId;
                                    return (
                                        <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                                            <MemberAvatar members={members} id={member.id} size="sm" />
                                            <div className="min-w-0 flex-1">
                                                <p className={cn('text-sm font-medium', isMe && 'text-indigo-600 dark:text-indigo-400')}>
                                                    {isMe ? 'You' : member.name}
                                                </p>
                                                {cov.status === 'partial' && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatPeso(cov.paid)} paid · {formatPeso(cov.leftover)} left
                                                    </p>
                                                )}
                                                {cov.status === 'unpaid' && (
                                                    <p className="text-xs text-muted-foreground">Not yet covered</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-sm">
                                                    {cov.status === 'covered' ? '✅' : cov.status === 'partial' ? '🟡' : '⬜'}
                                                </span>
                                                <span className={cn(
                                                    'text-sm font-semibold tabular-nums',
                                                    cov.status === 'covered' ? 'text-green-600 dark:text-green-400'
                                                        : cov.status === 'partial' ? 'text-amber-600 dark:text-amber-400'
                                                        : 'text-muted-foreground',
                                                )}>
                                                    {formatPeso(cov.share)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
