import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateSettlements, getSpendByCategory, getTotalBudget, getTotalSpend } from '@/hooks/use-barkada-store';
import { cn } from '@/lib/utils';
import type { BarkadaStore, Member, Trip, View } from '@/types/barkada';
import { calculateMemberBudgetShare, getActiveBudgetItems, getActiveExpenses, getAllCategories } from '@/types/barkada';
import { ArrowRight, CalendarDays, HandCoins, MapPin, Pencil, Plus, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';

const MY_MEMBER_KEY = 'barkada-my-member-id';

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

function getDaysInfo(startDate: string, endDate: string): {
    countdown: { label: string; emoji: string } | null;
    dayProgress: { current: number; total: number } | null;
} {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let countdown: { label: string; emoji: string } | null = null;
    let dayProgress: { current: number; total: number } | null = null;

    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

        if (now < start) {
            const diff = Math.round((start.getTime() - now.getTime()) / 86400000);
            countdown = { label: `${diff} day${diff !== 1 ? 's' : ''} to go`, emoji: '🏖️' };
        } else if (now <= end) {
            const current = Math.round((now.getTime() - start.getTime()) / 86400000) + 1;
            dayProgress = { current, total: totalDays };
            countdown = { label: `Day ${current} of ${totalDays}`, emoji: '🤙' };
        }
    } else if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const diff = Math.round((start.getTime() - now.getTime()) / 86400000);
        if (diff > 0) countdown = { label: `${diff} day${diff !== 1 ? 's' : ''} to go`, emoji: '🏖️' };
        else if (diff === 0) countdown = { label: "It's today!", emoji: '🎉' };
    }

    return { countdown, dayProgress };
}

// Circular SVG progress ring
function ProgressRing({
    value, max, size = 72, strokeWidth = 7, colorClass = 'text-indigo-500',
}: {
    value: number; max: number; size?: number; strokeWidth?: number; colorClass?: string;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const pct = max > 0 ? Math.min(1, value / max) : 0;
    const offset = circumference * (1 - pct);
    const pctLabel = max > 0 ? Math.round(pct * 100) : 0;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-muted" />
                <circle
                    cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth}
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round" className={cn('transition-all duration-700', colorClass)}
                    style={{ stroke: 'currentColor' }}
                />
            </svg>
            <span className="absolute text-xs font-bold tabular-nums">{pctLabel}%</span>
        </div>
    );
}

interface HomeViewProps {
    store: BarkadaStore;
    onUpdateTrip: (trip: Trip) => void;
    onNavigate: (view: View) => void;
}

function TripEditForm({ trip, onSave, onCancel }: { trip: Trip; onSave: (t: Trip) => void; onCancel: () => void }) {
    const [form, setForm] = useState<Trip>(trip);
    const set = (key: keyof Trip) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((p) => ({ ...p, [key]: e.target.value }));
    return (
        <Card>
            <CardHeader><CardTitle className="text-base">Edit Trip Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {([
                        { key: 'name' as const, label: 'Trip Name', type: 'text', placeholder: 'Batangas Beach Trip' },
                        { key: 'destination' as const, label: 'Destination', type: 'text', placeholder: 'Laiya, Batangas' },
                        { key: 'startDate' as const, label: 'Start Date', type: 'date', placeholder: '' },
                        { key: 'endDate' as const, label: 'End Date', type: 'date', placeholder: '' },
                    ] as const).map(({ key, label, type, placeholder }) => (
                        <div key={key} className="space-y-1.5">
                            <Label htmlFor={`trip-${key}`}>{label}</Label>
                            <Input id={`trip-${key}`} type={type} value={form[key]} onChange={set(key)} placeholder={placeholder} />
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 pt-1">
                    <Button onClick={() => onSave(form)} className="flex-1 bg-indigo-600 hover:bg-indigo-700">Save</Button>
                    <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
                </div>
            </CardContent>
        </Card>
    );
}

export function HomeView({ store, onUpdateTrip, onNavigate }: HomeViewProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [myMemberId, setMyMemberId] = useState('');

    const { trip, members, collections, collectionPayments, carpools } = store;
    const activeExpenses = getActiveExpenses(store);
    const activeBudgetItems = getActiveBudgetItems(store);
    const totalBudget = getTotalBudget(activeBudgetItems);
    const totalSpend = getTotalSpend(activeExpenses);
    const remaining = totalBudget - totalSpend;
    const isOverBudget = remaining < 0;
    const hasTrip = trip.name || trip.destination;
    const settlements = calculateSettlements(members, activeExpenses, collections, collectionPayments);
    const allCategories = getAllCategories(store);
    const spendByCategory = getSpendByCategory(activeExpenses);
    const { countdown, dayProgress } = getDaysInfo(trip.startDate, trip.endDate);

    // Collections
    const activeCollections = collections.filter((c) => {
        const paid = collectionPayments.filter((p) => p.collectionId === c.id).reduce((s, p) => s + p.amount, 0);
        return paid < c.targetAmount;
    });
    const totalCollected = collectionPayments.reduce((s, p) => s + p.amount, 0);
    const totalCollectionTarget = collections.reduce((s, c) => s + c.targetAmount, 0);

    // Load "I am" selection
    useEffect(() => {
        const saved = localStorage.getItem(MY_MEMBER_KEY);
        if (saved && members.some((m) => m.id === saved)) {
            setMyMemberId(saved);
        } else if (members.length > 0) {
            setMyMemberId(members[0].id);
        }
    }, [members]);

    const me = members.find((m) => m.id === myMemberId);
    const bufferContingencyShare = members.length > 0
        ? ((store.budgetBuffer > 0 ? totalBudget * store.budgetBuffer / 100 : 0) + (store.contingency ?? 0)) / members.length
        : 0;
    const myBudgetShare = me
        ? calculateMemberBudgetShare(myMemberId, activeBudgetItems, carpools, members.length) + bufferContingencyShare
        : 0;
    const myAdvancePaid = collectionPayments.filter((p) => p.fromMemberId === myMemberId).reduce((s, p) => s + p.amount, 0);
    const myStillNeeded = Math.max(0, myBudgetShare - myAdvancePaid);
    const allPaidUp = myBudgetShare > 0 && myStillNeeded === 0;

    const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
    const recentExpenses = activeExpenses.slice(0, 4);
    const budgetPct = totalBudget > 0 ? Math.min(100, (totalSpend / totalBudget) * 100) : 0;
    const perPersonRemaining = members.length > 0 && remaining > 0 ? remaining / members.length : null;

    // Top 3 categories by spend
    const topCategories = Object.entries(spendByCategory)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([key, amount]) => ({ key, amount, meta: allCategories[key] }))
        .filter(({ meta }) => !!meta);

    // Biggest spender
    const spendByMember: Record<string, number> = {};
    for (const e of activeExpenses) {
        spendByMember[e.paidById] = (spendByMember[e.paidById] ?? 0) + e.amount;
    }
    const biggestSpender = Object.entries(spendByMember).sort(([, a], [, b]) => b - a)[0];
    const biggestSpenderMember = biggestSpender ? memberById[biggestSpender[0]] : null;

    // Members who haven't paid any amount toward each collection
    const collectionMemberStatus = (collectionId: string, memberIds: string[], targetAmount: number) => {
        const sharePerPerson = memberIds.length > 0 ? targetAmount / memberIds.length : 0;
        return memberIds.filter((mid) => {
            const paid = collectionPayments.filter((p) => p.collectionId === collectionId && p.fromMemberId === mid).reduce((s, p) => s + p.amount, 0);
            return paid < sharePerPerson - 0.005;
        });
    };

    return (
        <div className="space-y-3 p-3">
            {/* Trip hero */}
            {isEditing ? (
                <TripEditForm trip={trip} onSave={(t) => { onUpdateTrip(t); setIsEditing(false); }} onCancel={() => setIsEditing(false)} />
            ) : (
                <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg">
                    <div className="relative p-4">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="absolute right-3 top-3 rounded-full bg-white/20 p-1.5 transition hover:bg-white/30"
                            aria-label="Edit trip details"
                        >
                            <Pencil className="size-3.5" />
                        </button>

                        {hasTrip ? (
                            <>
                                <p className="text-xs font-medium uppercase tracking-widest text-white/60">Barkada Trip</p>
                                <h2 className="mt-0.5 text-2xl font-bold leading-tight">{trip.name || 'Unnamed Trip'}</h2>

                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                                    {trip.destination && (
                                        <div className="flex items-center gap-1 text-sm text-white/80">
                                            <MapPin className="size-3.5" />
                                            <span>{trip.destination}</span>
                                        </div>
                                    )}
                                    {(trip.startDate || trip.endDate) && (
                                        <div className="flex items-center gap-1 text-sm text-white/80">
                                            <CalendarDays className="size-3.5" />
                                            <span>
                                                {trip.startDate && new Date(trip.startDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                {trip.startDate && trip.endDate && ' – '}
                                                {trip.endDate && new Date(trip.endDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Day progress bar */}
                                {dayProgress && (
                                    <div className="mt-3">
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                                            <div
                                                className="h-full rounded-full bg-white/70 transition-all"
                                                style={{ width: `${(dayProgress.current / dayProgress.total) * 100}%` }}
                                            />
                                        </div>
                                        <p className="mt-1 text-[11px] text-white/60">Day {dayProgress.current} of {dayProgress.total}</p>
                                    </div>
                                )}

                                {/* Countdown pill */}
                                {countdown && (
                                    <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                                        <span>{countdown.emoji}</span>
                                        <span>{countdown.label}</span>
                                    </div>
                                )}

                                {/* Member avatars */}
                                {members.length > 0 && (
                                    <div className="mt-3 flex items-center gap-1.5">
                                        <div className="flex -space-x-2">
                                            {members.slice(0, 6).map((m) => (
                                                <span
                                                    key={m.id}
                                                    title={m.name}
                                                    className={cn(
                                                        'inline-flex size-7 items-center justify-center rounded-full border-2 border-indigo-600 text-[10px] font-bold text-white',
                                                        avatarColor(members, m.id),
                                                    )}
                                                >
                                                    {getInitials(m.name)}
                                                </span>
                                            ))}
                                            {members.length > 6 && (
                                                <span className="inline-flex size-7 items-center justify-center rounded-full border-2 border-indigo-600 bg-white/20 text-[10px] font-bold">
                                                    +{members.length - 6}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-white/60">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-2 text-center">
                                <p className="text-lg font-bold">Welcome to Barkada Planner!</p>
                                <p className="mt-1 text-sm text-white/70">Tap the pencil to set up your trip</p>
                            </div>
                        )}
                    </div>

                    {/* Stat ribbon */}
                    <div className="grid grid-cols-4 border-t border-white/20">
                        {[
                            { label: 'Members', value: members.length, view: 'members' as View },
                            { label: 'Expenses', value: activeExpenses.length, view: 'expenses' as View },
                            { label: 'Collections', value: activeCollections.length, view: 'collections' as View },
                            { label: 'Settlements', value: settlements.length, view: 'settlement' as View },
                        ].map(({ label, value, view }, i) => (
                            <button
                                key={view}
                                type="button"
                                onClick={() => onNavigate(view)}
                                className={cn(
                                    'flex flex-col items-center gap-0.5 py-3 transition hover:bg-white/10',
                                    i !== 0 && 'border-l border-white/20',
                                )}
                            >
                                <span className="text-xl font-bold tabular-nums">{value}</span>
                                <span className="text-[10px] text-white/60">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => onNavigate('expenses')}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
                >
                    <Plus className="size-4" /> Log Expense
                </button>
                <button
                    type="button"
                    onClick={() => onNavigate('collections')}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/50"
                >
                    <Plus className="size-4" /> Record Payment
                </button>
            </div>

            {/* 2-column grid on desktop */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                {/* My balance hero */}
                {me && myBudgetShare > 0 && (
                    <button type="button" onClick={() => onNavigate('mybalance')} className="h-full w-full text-left">
                        <div className={cn(
                            'flex h-full flex-col overflow-hidden rounded-2xl p-4 text-white shadow-sm transition-opacity hover:opacity-95',
                            allPaidUp ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-violet-600 to-purple-700',
                        )}>
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                                    {getInitials(me.name)}
                                </span>
                                <p className="text-sm text-white/80">
                                    Hi, {me.name.split(' ')[0]}!{' '}
                                    {allPaidUp ? "You're all paid up" : 'You still need to bring'}
                                </p>
                                <ArrowRight className="ml-auto size-4 shrink-0 text-white/60" />
                            </div>
                            {allPaidUp ? (
                                <p className="mt-2 text-3xl font-bold">🎉 All settled!</p>
                            ) : (
                                <p className="mt-2 text-4xl font-bold tabular-nums">{formatPeso(myStillNeeded)}</p>
                            )}
                            <div className="mt-auto flex items-center gap-4 border-t border-white/20 pt-3 text-xs text-white/70">
                                <span>Share: {formatPeso(myBudgetShare)}</span>
                                {myAdvancePaid > 0 && <span>Paid: {formatPeso(myAdvancePaid)}</span>}
                            </div>
                        </div>
                    </button>
                )}

                {/* Budget */}
                {(totalBudget > 0 || totalSpend > 0) && (
                    <button type="button" onClick={() => onNavigate('budget')} className="h-full w-full text-left">
                        <Card className="h-full transition-colors hover:bg-muted/40">
                            <CardContent className="flex h-full flex-col p-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <Wallet className="size-4 text-muted-foreground" />
                                    <span className="text-sm font-semibold">Budget</span>
                                    <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
                                </div>
                                <div className="flex items-center gap-4">
                                    <ProgressRing
                                        value={totalSpend}
                                        max={totalBudget > 0 ? totalBudget : totalSpend}
                                        colorClass={isOverBudget ? 'text-destructive' : 'text-indigo-500'}
                                    />
                                    <div className="flex-1">
                                        {totalBudget > 0 ? (
                                            <>
                                                <p className="text-xs text-muted-foreground">{isOverBudget ? 'Over budget' : 'Remaining'}</p>
                                                <p className={cn('text-2xl font-bold tabular-nums leading-tight', isOverBudget ? 'text-destructive' : 'text-green-600 dark:text-green-400')}>
                                                    {isOverBudget ? '−' : ''}{formatPeso(Math.abs(remaining))}
                                                </p>
                                                <p className="text-xs text-muted-foreground">of {formatPeso(totalBudget)} · spent {formatPeso(totalSpend)}</p>
                                                {perPersonRemaining !== null && members.length > 1 && (
                                                    <p className="mt-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                                        ≈ {formatPeso(perPersonRemaining)} each left
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-xs text-muted-foreground">Spent</p>
                                                <p className="text-2xl font-bold tabular-nums">{formatPeso(totalSpend)}</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {topCategories.length > 0 && (
                                    <div className="mt-auto pt-3 flex flex-wrap gap-1.5">
                                        {topCategories.map(({ key, amount, meta }) => (
                                            <span key={key} className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', meta.bgClass, meta.textClass)}>
                                                {meta.icon} {meta.shortLabel} · {formatPeso(amount)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </button>
                )}

                {/* Collections */}
                {collections.length > 0 && (
                    <Card className="h-full">
                        <CardHeader className="px-4 pb-2 pt-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm">Collections</CardTitle>
                                <button type="button" onClick={() => onNavigate('collections')} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                                    View all
                                </button>
                            </div>
                            {totalCollectionTarget > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    {formatPeso(totalCollected)} of {formatPeso(totalCollectionTarget)} collected
                                </p>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-3 px-4 pb-4">
                            {collections.map((col) => {
                                const paid = collectionPayments.filter((p) => p.collectionId === col.id).reduce((s, p) => s + p.amount, 0);
                                const pct = col.targetAmount > 0 ? Math.min(100, (paid / col.targetAmount) * 100) : 0;
                                const done = paid >= col.targetAmount;
                                const unpaidMemberIds = collectionMemberStatus(col.id, col.memberIds, col.targetAmount);
                                const unpaidNames = unpaidMemberIds.map((id) => memberById[id]?.name).filter(Boolean);
                                return (
                                    <div key={col.id}>
                                        <div className="mb-1 flex items-center justify-between text-xs">
                                            <span className="font-medium">{col.name}</span>
                                            <span className={cn('tabular-nums', done ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground')}>
                                                {formatPeso(paid)} / {formatPeso(col.targetAmount)}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                            <div className={cn('h-full rounded-full transition-all', done ? 'bg-green-500' : 'bg-indigo-500')} style={{ width: `${pct}%` }} />
                                        </div>
                                        {!done && unpaidNames.length > 0 && (
                                            <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                                                ⚠️ {unpaidNames.length === 1 ? unpaidNames[0] : `${unpaidNames.slice(0, 2).join(', ')}${unpaidNames.length > 2 ? ` +${unpaidNames.length - 2}` : ''}`} haven't paid yet
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                )}

                {/* Recent expenses */}
                {recentExpenses.length > 0 && (
                    <Card className="h-full">
                        <CardHeader className="px-4 pb-2 pt-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm">Recent Expenses</CardTitle>
                                <button type="button" onClick={() => onNavigate('expenses')} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                                    View all
                                </button>
                            </div>
                            {biggestSpenderMember && activeExpenses.length > 1 && (
                                <p className="text-xs text-muted-foreground">
                                    🏆 <span className="font-medium text-foreground">{biggestSpenderMember.name}</span> paid the most — {formatPeso(biggestSpender![1])}
                                </p>
                            )}
                        </CardHeader>
                        <CardContent className="px-0 pb-2">
                            <div className="divide-y">
                                {recentExpenses.map((e) => {
                                    const paidBy = memberById[e.paidById];
                                    return (
                                        <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">{e.description}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {paidBy?.name ?? '?'} · {new Date(e.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                                </p>
                                            </div>
                                            <p className="text-sm font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{formatPeso(e.amount)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Settlement nudge — full width */}
                {settlements.length > 0 && (
                    <button type="button" onClick={() => onNavigate('settlement')} className="w-full text-left sm:col-span-2">
                        <Card className="border-orange-200 bg-orange-50 transition-colors hover:bg-orange-100 dark:border-orange-900/40 dark:bg-orange-950/20 dark:hover:bg-orange-950/30">
                            <CardContent className="flex items-center gap-3 p-4">
                                <HandCoins className="size-5 shrink-0 text-orange-600 dark:text-orange-400" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                                        {settlements.length} payment{settlements.length !== 1 ? 's' : ''} needed
                                    </p>
                                    <p className="text-xs text-orange-600 dark:text-orange-400">Tap to see who owes whom</p>
                                </div>
                                <ArrowRight className="size-4 shrink-0 text-orange-500" />
                            </CardContent>
                        </Card>
                    </button>
                )}

            </div>
        </div>
    );
}
