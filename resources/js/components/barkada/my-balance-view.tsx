import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { BarkadaStore, Member } from '@/types/barkada';
import { calculateMemberBudgetShare, getActiveBudgetItems, getAllCategories } from '@/types/barkada';
import { getTotalBudget } from '@/hooks/use-barkada-store';
import { ArrowRight, Plus, Trash2, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';

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

function formatPeso(amount: number): string {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

const MY_MEMBER_KEY = 'barkada-my-member-id';

interface MyBalanceViewProps {
    store: BarkadaStore;
    myMemberId?: string;
    onAddMemberPayment?: (memberId: string, amount: number, paidAt: string, note?: string) => void;
    onRemoveMemberPayment?: (id: string) => void;
}

export function MyBalanceView({ store, myMemberId: myMemberIdProp, onAddMemberPayment, onRemoveMemberPayment }: MyBalanceViewProps) {
    const { members, budgetItems, carpools, collections, collectionPayments, memberPayments = [] } = store;
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNote, setPaymentNote] = useState('');
    const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [myMemberId, setMyMemberId] = useState<string>('');

    // Persist "I am" selection — prefer join-based ID, fall back to saved, then first member
    useEffect(() => {
        const saved = localStorage.getItem(MY_MEMBER_KEY);
        if (myMemberIdProp && members.some((m) => m.id === myMemberIdProp)) {
            setMyMemberId(myMemberIdProp);
            localStorage.setItem(MY_MEMBER_KEY, myMemberIdProp);
        } else if (saved && members.some((m) => m.id === saved)) {
            setMyMemberId(saved);
        } else if (members.length > 0) {
            setMyMemberId(members[0].id);
        }
    }, [members, myMemberIdProp]);

    const selectMe = (id: string) => {
        setMyMemberId(id);
        localStorage.setItem(MY_MEMBER_KEY, id);
    };

    if (members.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 pt-16 text-center">
                <p className="text-4xl">👤</p>
                <p className="mt-3 text-base font-semibold">Add members first</p>
                <p className="mt-1 text-sm text-muted-foreground">Then select yourself to see your balance</p>
            </div>
        );
    }

    if (budgetItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 pt-16 text-center">
                <p className="text-4xl">📋</p>
                <p className="mt-3 text-base font-semibold">No budget yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Add budget items first to see your share</p>
            </div>
        );
    }

    const me = members.find((m) => m.id === myMemberId);
    const activeBudgetItems = getActiveBudgetItems(store);
    const allCategories = getAllCategories(store);

    // My budget share (respects carpool splits)
    const myBudgetShare = me
        ? calculateMemberBudgetShare(myMemberId, activeBudgetItems, carpools, members.length)
        : 0;

    // My collection payments (advances paid)
    const myCollectionPayments = collectionPayments.filter((p) => p.fromMemberId === myMemberId);
    const myMemberPayments = memberPayments.filter((p) => p.memberId === myMemberId);
    const myTotalAdvance = myCollectionPayments.reduce((s, p) => s + p.amount, 0)
        + myMemberPayments.reduce((s, p) => s + p.amount, 0);

    // Still need to bring
    const stillNeeded = Math.max(0, myBudgetShare - myTotalAdvance);
    const overpaid = myTotalAdvance > myBudgetShare;

    // Budget breakdown by category for selected member
    const categoryShares: { key: string; label: string; icon: string; share: number }[] = [];
    const seenCategories = new Set<string>();
    for (const item of activeBudgetItems) {
        if (seenCategories.has(item.category)) continue;
        seenCategories.add(item.category);

        const itemsInCategory = activeBudgetItems.filter((i) => i.category === item.category);
        const share = calculateMemberBudgetShare(
            myMemberId,
            itemsInCategory,
            carpools,
            members.length,
        );
        if (share > 0) {
            const meta = allCategories[item.category];
            categoryShares.push({
                key: item.category,
                label: meta?.label ?? item.category,
                icon: meta?.icon ?? '📌',
                share,
            });
        }
    }

    // Buffer & contingency share
    const baseBudget = getTotalBudget(activeBudgetItems);
    const withBuffer = store.budgetBuffer > 0 ? baseBudget * (store.budgetBuffer / 100) : 0;
    const contingency = store.contingency ?? 0;
    const myBufferShare = members.length > 0 ? withBuffer / members.length : 0;
    const myContingencyShare = members.length > 0 ? contingency / members.length : 0;

    // All members summary
    const memberSummaries = members.map((m) => {
        const share = calculateMemberBudgetShare(m.id, activeBudgetItems, carpools, members.length)
            + (members.length > 0 ? (withBuffer + contingency) / members.length : 0);
        const advance = collectionPayments.filter((p) => p.fromMemberId === m.id).reduce((s, p) => s + p.amount, 0)
            + memberPayments.filter((p) => p.memberId === m.id).reduce((s, p) => s + p.amount, 0);
        return { member: m, share, advance, remaining: Math.max(0, share - advance) };
    });

    // Waterfall: cascade advance payment through each budget item in order
    const itemCoverage = me
        ? (() => {
            let remaining = myTotalAdvance;
            return activeBudgetItems
                .map((item) => {
                    const share = calculateMemberBudgetShare(me.id, [item], carpools, members.length);
                    if (share <= 0.005) return null; // item doesn't apply to this member
                    if (remaining >= share) {
                        remaining -= share;
                        return { item, share, status: 'covered' as const, paid: share, leftover: 0 };
                    }
                    const paid = remaining;
                    remaining = 0;
                    if (paid > 0.005) {
                        return { item, share, status: 'partial' as const, paid, leftover: share - paid };
                    }
                    return { item, share, status: 'unpaid' as const, paid: 0, leftover: share };
                })
                .filter((x): x is NonNullable<typeof x> => x !== null);
        })()
        : [];

    // Collection breakdown for my payments
    const collectorById = Object.fromEntries(members.map((m) => [m.id, m]));
    const collectionById = Object.fromEntries(collections.map((c) => [c.id, c]));

    return (
        <div className="space-y-4 p-4">
            {/* I am... picker */}
            <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">I am…</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {members.map((m) => {
                        const selected = myMemberId === m.id;
                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => selectMe(m.id)}
                                className={cn(
                                    'flex shrink-0 items-center gap-2 rounded-2xl border-2 px-3 py-2 transition-all',
                                    selected
                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40'
                                        : 'border-transparent bg-muted/50 hover:bg-muted',
                                )}
                            >
                                <span className={cn(
                                    'inline-flex size-8 shrink-0 items-center justify-center rounded-full font-bold text-white text-xs',
                                    avatarColor(members, m.id),
                                    selected && 'ring-2 ring-indigo-600 ring-offset-2',
                                )}>
                                    {getInitials(m.name)}
                                </span>
                                <span className={cn(
                                    'text-sm font-medium',
                                    selected ? 'text-indigo-700 dark:text-indigo-300' : 'text-muted-foreground',
                                )}>
                                    {m.id === myMemberIdProp ? 'You' : m.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {me && (
                <>
                    {/* Add payment dialog */}
                    {showAddPayment && (
                        <Dialog open onOpenChange={(open) => { if (!open) setShowAddPayment(false); }}>
                            <DialogContent className="max-w-sm">
                                <DialogHeader>
                                    <DialogTitle>Record Payment — {me.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label>Amount (₱)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            autoFocus
                                        />
                                        {stillNeeded > 0 && (
                                            <p className="text-xs text-muted-foreground">Remaining: {formatPeso(stillNeeded)}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Date</Label>
                                        <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Note (optional)</Label>
                                        <Input placeholder="e.g. GCash, cash" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowAddPayment(false)}>Cancel</Button>
                                    <Button onClick={() => {
                                        const amt = parseFloat(paymentAmount);
                                        if (!amt || amt <= 0) return;
                                        onAddMemberPayment?.(myMemberId, amt, paymentDate, paymentNote.trim() || undefined);
                                        setPaymentAmount('');
                                        setPaymentNote('');
                                        setShowAddPayment(false);
                                    }}>Save Payment</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}

                    {/* Personal summary hero card */}
                    <Card className={cn(
                        'overflow-hidden border-0',
                        overpaid ? 'bg-green-600' : stillNeeded === 0 ? 'bg-green-600' : 'bg-indigo-600',
                    )}>
                        <CardContent className="p-5">
                            <div className="flex items-center gap-2 text-indigo-100">
                                <Wallet className="size-4" />
                                <span className="text-sm font-medium">
                                    {overpaid ? 'You\'ve overpaid!' : stillNeeded === 0 ? 'You\'re all paid up!' : 'Still need to bring'}
                                </span>
                            </div>
                            <p className="mt-1 text-4xl font-bold tabular-nums text-white">
                                {formatPeso(overpaid ? myTotalAdvance - myBudgetShare : stillNeeded)}
                            </p>
                            {overpaid && (
                                <p className="mt-1 text-xs text-indigo-100">You'll get this back from the group</p>
                            )}

                            <div className="mt-4 flex items-center gap-4 border-t border-white/20 pt-4">
                                <div>
                                    <p className="text-[11px] text-indigo-200">Budget share</p>
                                    <p className="text-sm font-semibold tabular-nums text-white">{formatPeso(myBudgetShare + myBufferShare + myContingencyShare)}</p>
                                </div>
                                <div className="text-white/40">−</div>
                                <div>
                                    <p className="text-[11px] text-indigo-200">Advance paid</p>
                                    <p className="text-sm font-semibold tabular-nums text-white">{formatPeso(myTotalAdvance)}</p>
                                </div>
                                <div className="text-white/40">=</div>
                                <div>
                                    <p className="text-[11px] text-indigo-200">{overpaid ? 'Overpaid' : 'Remaining'}</p>
                                    <p className="text-sm font-semibold tabular-nums text-white">
                                        {overpaid ? '+' : ''}{formatPeso(overpaid ? myTotalAdvance - myBudgetShare : stillNeeded)}
                                    </p>
                                </div>
                            </div>
                            {onAddMemberPayment && (
                                <button
                                    type="button"
                                    onClick={() => setShowAddPayment(true)}
                                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/30 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                                >
                                    <Plus className="size-4" />
                                    Add Payment
                                </button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Budget breakdown */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Budget Breakdown</CardTitle>
                            <p className="text-sm text-muted-foreground">What each category costs you</p>
                        </CardHeader>
                        <CardContent className="px-0 pb-2">
                            <div className="divide-y">
                                {categoryShares.map(({ key, label, icon, share }) => (
                                    <div key={key} className="flex items-center justify-between px-4 py-2.5">
                                        <span className="text-sm">{icon} {label}</span>
                                        <span className="text-sm font-semibold tabular-nums">{formatPeso(share)}</span>
                                    </div>
                                ))}
                                {myBufferShare > 0 && (
                                    <div className="flex items-center justify-between px-4 py-2.5 text-muted-foreground">
                                        <span className="text-sm">Buffer ({store.budgetBuffer}%)</span>
                                        <span className="text-sm tabular-nums">+{formatPeso(myBufferShare)}</span>
                                    </div>
                                )}
                                {myContingencyShare > 0 && (
                                    <div className="flex items-center justify-between px-4 py-2.5 text-muted-foreground">
                                        <span className="text-sm">Contingency</span>
                                        <span className="text-sm tabular-nums">+{formatPeso(myContingencyShare)}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between bg-muted/40 px-4 py-3">
                                    <span className="text-sm font-semibold">Total share</span>
                                    <span className="text-sm font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                                        {formatPeso(myBudgetShare + myBufferShare + myContingencyShare)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment coverage waterfall */}
                    {itemCoverage.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Payment Coverage</CardTitle>
                                <p className="text-sm text-muted-foreground">How your advance covers each budget item</p>
                            </CardHeader>
                            <CardContent className="px-0 pb-0">
                                <div className="divide-y">
                                    {itemCoverage.map(({ item, share, status, paid, leftover }) => (
                                        <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                                            <span className="shrink-0 text-base">
                                                {status === 'covered' ? '✅' : status === 'partial' ? '🟡' : '⬜'}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">{item.name}</p>
                                                {status === 'partial' && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatPeso(paid)} covered · {formatPeso(leftover)} remaining
                                                    </p>
                                                )}
                                                {status === 'unpaid' && (
                                                    <p className="text-xs text-muted-foreground">Not yet covered</p>
                                                )}
                                            </div>
                                            <span className={cn(
                                                'shrink-0 text-sm font-semibold tabular-nums',
                                                status === 'covered' ? 'text-green-600 dark:text-green-400'
                                                    : status === 'partial' ? 'text-amber-600 dark:text-amber-400'
                                                    : 'text-muted-foreground',
                                            )}>
                                                {formatPeso(share)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* My advance payments */}
                    {(myCollectionPayments.length > 0 || myMemberPayments.length > 0) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Advance Payments</CardTitle>
                                <p className="text-sm text-muted-foreground">Already paid toward the trip</p>
                            </CardHeader>
                            <CardContent className="px-0 pb-0">
                                <div className="divide-y">
                                    {myMemberPayments.map((p) => (
                                        <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium">{p.note || 'Payment'}</p>
                                                <p className="text-xs text-muted-foreground">{formatDate(p.paidAt)}</p>
                                            </div>
                                            <span className="text-sm font-bold tabular-nums text-green-600 dark:text-green-400">
                                                −{formatPeso(p.amount)}
                                            </span>
                                            {onRemoveMemberPayment && (
                                                <button
                                                    type="button"
                                                    onClick={() => onRemoveMemberPayment(p.id)}
                                                    className="shrink-0 text-muted-foreground hover:text-red-500"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {myCollectionPayments.map((p) => {
                                        const col = collectionById[p.collectionId];
                                        const collector = collectorById[col?.collectorId ?? ''];
                                        return (
                                            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium">{col?.name ?? 'Collection'}</p>
                                                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                                        <span>To {collector?.name ?? '?'}</span>
                                                        <ArrowRight className="size-3" />
                                                        <span>{formatDate(p.paidAt)}</span>
                                                        {p.note && <span>· {p.note}</span>}
                                                    </div>
                                                </div>
                                                <span className="text-sm font-bold tabular-nums text-green-600 dark:text-green-400">
                                                    −{formatPeso(p.amount)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    <div className="flex items-center justify-between bg-muted/40 px-4 py-3">
                                        <span className="text-sm font-semibold">Total advance paid</span>
                                        <span className="text-sm font-bold tabular-nums text-green-600 dark:text-green-400">
                                            −{formatPeso(myTotalAdvance)}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* All members status */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Everyone's Status</CardTitle>
                            <p className="text-sm text-muted-foreground">Budget share vs advance paid</p>
                        </CardHeader>
                        <CardContent className="px-0 pb-2">
                            <div className="divide-y">
                                {memberSummaries.map(({ member, share, advance, remaining }) => {
                                    const isMe = member.id === myMemberId;
                                    const isOver = advance > share;
                                    return (
                                        <div key={member.id} className={cn('flex items-center gap-3 px-4 py-3', isMe && 'bg-indigo-50/60 dark:bg-indigo-950/20')}>
                                            <span className={cn(
                                                'inline-flex size-8 shrink-0 items-center justify-center rounded-full font-bold text-white text-xs',
                                                avatarColor(members, member.id),
                                                isMe && 'ring-2 ring-indigo-600 ring-offset-1',
                                            )}>
                                                {getInitials(member.name)}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">
                                                    {member.name}{isMe && <span className="ml-1.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">YOU</span>}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Share {formatPeso(share)}{advance > 0 ? ` · paid ${formatPeso(advance)}` : ''}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn(
                                                    'text-sm font-bold tabular-nums',
                                                    isOver ? 'text-green-600 dark:text-green-400' : remaining === 0 ? 'text-muted-foreground' : 'text-red-500 dark:text-red-400',
                                                )}>
                                                    {isOver ? `+${formatPeso(advance - share)}` : remaining === 0 ? '✓' : formatPeso(remaining)}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {isOver ? 'overpaid' : remaining === 0 ? 'settled' : 'left'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
