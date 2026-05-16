import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateSettlements, getSpendByCategory, getTotalBudget, getTotalSpend } from '@/hooks/use-barkada-store';
import { cn } from '@/lib/utils';
import type { BarkadaStore, Member, Trip, View } from '@/types/barkada';
import { calculateMemberBudgetShare, getActiveBudgetItems, getActiveExpenses, getAllCategories } from '@/types/barkada';
import { CalendarDays, HandCoins, MapPin, Pencil, Plus, ReceiptText, Users, Vault } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

const PROGRESS_COLOR_HEX: Record<string, string> = {
    'bg-blue-500': '#3b82f6',
    'bg-purple-500': '#a855f7',
    'bg-orange-500': '#f97316',
    'bg-green-500': '#22c55e',
    'bg-pink-500': '#ec4899',
    'bg-cyan-500': '#06b6d4',
    'bg-yellow-500': '#eab308',
    'bg-red-500': '#ef4444',
    'bg-lime-500': '#84cc16',
    'bg-amber-500': '#f59e0b',
    'bg-teal-500': '#14b8a6',
    'bg-violet-500': '#8b5cf6',
    'bg-rose-500': '#f43f5e',
    'bg-indigo-500': '#6366f1',
};

function progressColorToHex(cls: string): string {
    return PROGRESS_COLOR_HEX[cls] ?? '#6366f1';
}

function RingProgress({ pct, size = 72, strokeWidth = 7, color = '#6366f1' }: {
    pct: number; size?: number; strokeWidth?: number; color?: string;
}) {
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const filled = Math.min(pct / 100, 1) * circ;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-foreground/10" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
                strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" />
        </svg>
    );
}

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

interface HomeViewProps {
    store: BarkadaStore;
    myMemberId?: string;
    onUpdateTrip: (trip: Trip) => void;
    onNavigate?: (view: View) => void;
}

function TripEditForm({ trip, onSave, onCancel }: { trip: Trip; onSave: (t: Trip) => void; onCancel: () => void }) {
    const [form, setForm] = useState<Trip>(trip);
    const set = (key: keyof Trip) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((p) => ({ ...p, [key]: e.target.value }));
    return (
        <Card className="gap-0 py-0">
            <CardHeader className="px-5 pt-5 pb-0"><CardTitle className="text-base">Edit Trip Details</CardTitle></CardHeader>
            <CardContent className="space-y-4 p-5">
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
                    <button onClick={() => onSave(form)} className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">Save</button>
                    <button onClick={onCancel} className="flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors hover:bg-muted">Cancel</button>
                </div>
            </CardContent>
        </Card>
    );
}

export function HomeView({ store, myMemberId: myMemberIdProp, onUpdateTrip, onNavigate = () => {} }: HomeViewProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [myMemberId, setMyMemberId] = useState('');

    const { trip, members, collections, collectionPayments, memberPayments = [], directPayments = [], carpools } = store;
    const activeExpenses = getActiveExpenses(store);
    const activeBudgetItems = getActiveBudgetItems(store);
    const totalBudget = getTotalBudget(activeBudgetItems);
    const totalSpend = getTotalSpend(activeExpenses);
    const remaining = totalBudget - totalSpend;
    const isOverBudget = remaining < 0;
    const settlements = calculateSettlements(members, activeExpenses, collections, collectionPayments, directPayments);
    const allCategories = getAllCategories(store);
    const spendByCategory = getSpendByCategory(activeExpenses);
    const { countdown, dayProgress } = getDaysInfo(trip.startDate, trip.endDate);
    const budgetPct = totalBudget > 0 ? Math.min(100, (totalSpend / totalBudget) * 100) : 0;

    const activeCollections = collections.filter((c) => {
        const paid = collectionPayments.filter((p) => p.collectionId === c.id).reduce((s, p) => s + p.amount, 0);
        return paid < c.targetAmount;
    });
    const totalCollected = collectionPayments.reduce((s, p) => s + p.amount, 0);
    const totalCollectionTarget = collections.reduce((s, c) => s + c.targetAmount, 0);

    useEffect(() => {
        const saved = localStorage.getItem(MY_MEMBER_KEY);
        if (saved && members.some((m) => m.id === saved)) {
            setMyMemberId(saved);
        } else if (myMemberIdProp && members.some((m) => m.id === myMemberIdProp)) {
            setMyMemberId(myMemberIdProp);
        } else if (members.length > 0) {
            setMyMemberId(members[0].id);
        }
    }, [members, myMemberIdProp]);

    const me = members.find((m) => m.id === myMemberId);
    const bufferContingencyShare = members.length > 0
        ? totalBudget * ((store.budgetBuffer ?? 0) + (store.contingency ?? 0)) / 100 / members.length
        : 0;
    const myBudgetShare = me
        ? calculateMemberBudgetShare(myMemberId, activeBudgetItems, carpools, members.length) + bufferContingencyShare
        : 0;
    const myAdvancePaid = collectionPayments.filter((p) => p.fromMemberId === myMemberId).reduce((s, p) => s + p.amount, 0)
        + memberPayments.filter((p) => p.memberId === myMemberId).reduce((s, p) => s + p.amount, 0);
    const myStillNeeded = Math.max(0, myBudgetShare - myAdvancePaid);
    const allPaidUp = myBudgetShare > 0 && myStillNeeded === 0;

    const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
    const recentExpenses = activeExpenses.slice(0, 5);
    const perPersonRemaining = members.length > 0 && remaining > 0 ? remaining / members.length : null;

    // Bar chart data
    const chartData = Object.entries(spendByCategory)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([key, amount]) => {
            const meta = allCategories[key];
            return meta ? { name: meta.shortLabel, amount, color: progressColorToHex(meta.progressColorClass), icon: meta.icon } : null;
        })
        .filter(Boolean) as { name: string; amount: number; color: string; icon: string }[];

    const totalSettlementsAmount = settlements.reduce((s, x) => s + x.amount, 0);

    // Member balance summaries
    const memberBalanceSummaries = members.map((m) => {
        const share = calculateMemberBudgetShare(m.id, activeBudgetItems, carpools, members.length) + bufferContingencyShare;
        const advance = collectionPayments.filter((p) => p.fromMemberId === m.id).reduce((s, p) => s + p.amount, 0)
            + memberPayments.filter((p) => p.memberId === m.id).reduce((s, p) => s + p.amount, 0);
        return { member: m, share, advance, remaining: share - advance };
    });

    // Collections helper
    const collectionMemberStatus = (collectionId: string, memberIds: string[], targetAmount: number) => {
        const sharePerPerson = memberIds.length > 0 ? targetAmount / memberIds.length : 0;
        return memberIds.filter((mid) => {
            const paid = collectionPayments.filter((p) => p.collectionId === collectionId && p.fromMemberId === mid).reduce((s, p) => s + p.amount, 0);
            return paid < sharePerPerson - 0.005;
        });
    };

    return (
        <div className="space-y-4 p-4">
            {isEditing ? (
                <TripEditForm trip={trip} onSave={(t) => { onUpdateTrip(t); setIsEditing(false); }} onCancel={() => setIsEditing(false)} />
            ) : (
                <>
                    {/* ── Header ── */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Barkada Trip</p>
                            <h1 className="truncate text-xl font-bold sm:text-2xl">{trip.name || 'My Trip'}</h1>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                {trip.destination && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <MapPin className="size-3" />{trip.destination}
                                    </span>
                                )}
                                {(trip.startDate || trip.endDate) && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <CalendarDays className="size-3" />
                                        {trip.startDate && new Date(trip.startDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        {trip.startDate && trip.endDate && ' – '}
                                        {trip.endDate && new Date(trip.endDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                )}
                            </div>
                            {countdown && (
                                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                    {countdown.emoji} {countdown.label}
                                </span>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2 pt-0.5">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="rounded-lg border p-1.5 text-muted-foreground transition hover:bg-muted"
                                aria-label="Edit trip"
                            >
                                <Pencil className="size-3.5" />
                            </button>
                            <button
                                onClick={() => onNavigate('expenses')}
                                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                            >
                                <Plus className="size-3.5" /> Add Expense
                            </button>
                        </div>
                    </div>

                    {/* Day progress bar (during trip) */}
                    {dayProgress && (
                        <div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-indigo-500 transition-all"
                                    style={{ width: `${(dayProgress.current / dayProgress.total) * 100}%` }}
                                />
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">Day {dayProgress.current} of {dayProgress.total}</p>
                        </div>
                    )}

                    {/* ── Stat cards ── */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {([
                            {
                                icon: Users, label: 'Members', value: members.length,
                                sub: members.length === 1 ? 'participant' : 'participants',
                                mono: null,
                                color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30',
                            },
                            {
                                icon: ReceiptText, label: 'Expenses', value: activeExpenses.length,
                                sub: activeExpenses.length === 1 ? 'transaction' : 'transactions',
                                mono: totalSpend > 0 ? formatPeso(totalSpend) : null,
                                color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30',
                            },
                            {
                                icon: Vault, label: 'Collections', value: collections.length,
                                sub: collections.length === 1 ? 'fund' : 'funds',
                                mono: totalCollectionTarget > 0 ? `${formatPeso(totalCollected)} raised` : null,
                                color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30',
                            },
                            {
                                icon: HandCoins, label: 'Settlements', value: settlements.length,
                                sub: settlements.length === 1 ? 'payment needed' : 'payments needed',
                                mono: totalSettlementsAmount > 0 ? formatPeso(totalSettlementsAmount) : (settlements.length === 0 ? 'All settled!' : null),
                                color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30',
                            },
                        ]).map(({ icon: Icon, label, value, sub, mono, color, bg }) => (
                            <div key={label} className={cn('rounded-2xl p-4', bg)}>
                                <Icon className={cn('mb-2 size-4', color)} />
                                <p className={cn('text-2xl font-bold tabular-nums', color)}>{value}</p>
                                <p className="mt-0.5 text-[11px] font-semibold text-foreground/70">{label}</p>
                                {mono ? (
                                    <p className={cn('truncate text-[10px] font-semibold tabular-nums', color)}>{mono}</p>
                                ) : (
                                    <p className="text-[10px] text-muted-foreground">{sub}</p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* ── Row 1: Balance Due + Budget Status ── */}
                    {(me && myBudgetShare > 0 || totalBudget > 0) && (
                        <div className={cn('grid grid-cols-1 gap-4', (me && myBudgetShare > 0) && totalBudget > 0 && 'sm:grid-cols-2')}>
                            {me && myBudgetShare > 0 && (
                                <button type="button" onClick={() => onNavigate('mybalance')} className="w-full text-left">
                                    <div className={cn(
                                        'flex h-full flex-col rounded-2xl p-5 text-white',
                                        allPaidUp
                                            ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                                            : 'bg-gradient-to-br from-indigo-600 to-violet-700',
                                    )}>
                                        <p className="text-[11px] font-medium text-white/70">Your Balance Due</p>
                                        <p className="mt-1 text-3xl font-bold tabular-nums">
                                            {allPaidUp ? '🎉 All settled!' : formatPeso(myStillNeeded)}
                                        </p>
                                        <p className="mt-1 text-xs text-white/60">
                                            {allPaidUp
                                                ? `Hi ${me.name.split(' ')[0]}, you're all paid up`
                                                : `Hi ${me.name.split(' ')[0]}, you still need to bring this amount`}
                                        </p>
                                        <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-3">
                                            <div className="text-xs text-white/60">
                                                <span>Share {formatPeso(myBudgetShare)}</span>
                                                {myAdvancePaid > 0 && <span> · Paid {formatPeso(myAdvancePaid)}</span>}
                                            </div>
                                            <span className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/30">
                                                <HandCoins className="size-3.5" /> Record Payment
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            )}

                            {totalBudget > 0 && (
                                <button type="button" onClick={() => onNavigate('budget')} className="w-full text-left">
                                    <Card className="h-full gap-0 py-0 transition-colors hover:bg-muted/40">
                                        <CardContent className="flex h-full flex-col justify-between p-5">
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Budget Status</p>
                                                <div className="mt-3 flex items-center gap-4">
                                                    <div className="relative shrink-0">
                                                        <RingProgress
                                                            pct={budgetPct}
                                                            size={72}
                                                            strokeWidth={7}
                                                            color={isOverBudget ? '#ef4444' : '#6366f1'}
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className={cn('text-xs font-bold tabular-nums', isOverBudget ? 'text-destructive' : 'text-indigo-600 dark:text-indigo-400')}>
                                                                {Math.round(budgetPct)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0 flex-1 space-y-1.5">
                                                        <div>
                                                            <p className="text-[10px] text-muted-foreground">{isOverBudget ? 'Over budget' : 'Remaining'}</p>
                                                            <p className={cn('text-base font-bold tabular-nums leading-tight', isOverBudget ? 'text-destructive' : 'text-green-600 dark:text-green-400')}>
                                                                {isOverBudget ? '−' : ''}{formatPeso(Math.abs(remaining))}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-muted-foreground">Total budget</p>
                                                            <p className="text-sm font-semibold tabular-nums">{formatPeso(totalBudget)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            {perPersonRemaining !== null && members.length > 1 && (
                                                <p className="mt-3 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                                                    ≈ {formatPeso(perPersonRemaining)} per person remaining
                                                </p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </button>
                            )}
                        </div>
                    )}

                    {/* ── Row 2: Expense Distribution + Collections ── */}
                    {(chartData.length > 0 || collections.length > 0) && (
                        <div className={cn('grid grid-cols-1 gap-4', chartData.length > 0 && collections.length > 0 && 'sm:grid-cols-2')}>
                            {chartData.length > 0 && (
                                <Card className="gap-0 py-0">
                                    <CardContent className="p-5">
                                        <div className="mb-3 flex items-start justify-between">
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Expense Distribution</p>
                                                <p className="text-[11px] text-muted-foreground">By category</p>
                                            </div>
                                            {totalSpend > 0 && (
                                                <div className="text-right">
                                                    <p className="text-[10px] text-muted-foreground">Total spent</p>
                                                    <p className="text-sm font-bold tabular-nums text-foreground">{formatPeso(totalSpend)}</p>
                                                </div>
                                            )}
                                        </div>
                                        <ResponsiveContainer width="100%" height={160}>
                                            <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap="28%">
                                                <XAxis
                                                    dataKey="name"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 10, fill: 'currentColor' }}
                                                    className="text-muted-foreground"
                                                />
                                                <Tooltip
                                                    cursor={{ fill: 'transparent' }}
                                                    content={({ active, payload }) => {
                                                        if (!active || !payload?.length) return null;
                                                        const d = payload[0].payload as { name: string; amount: number; icon: string };
                                                        return (
                                                            <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
                                                                <p className="font-semibold">{d.icon} {d.name}</p>
                                                                <p className="tabular-nums text-muted-foreground">{formatPeso(d.amount)}</p>
                                                            </div>
                                                        );
                                                    }}
                                                />
                                                <Bar dataKey="amount" radius={[5, 5, 0, 0]}>
                                                    {chartData.map((entry, i) => (
                                                        <Cell key={i} fill={entry.color} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            )}

                            {collections.length > 0 && (
                                <Card className="gap-0 py-0">
                                    <CardContent className="p-5">
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Collections</p>
                                            <button type="button" onClick={() => onNavigate('collections')} className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                                                View all
                                            </button>
                                        </div>
                                        {totalCollectionTarget > 0 && (
                                            <p className="mb-3 text-[11px] text-muted-foreground">
                                                {formatPeso(totalCollected)} of {formatPeso(totalCollectionTarget)} collected
                                            </p>
                                        )}
                                        <div className="space-y-3">
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
                                                                ⚠️ {unpaidNames.length === 1 ? unpaidNames[0] : `${unpaidNames.slice(0, 2).join(', ')}${unpaidNames.length > 2 ? ` +${unpaidNames.length - 2}` : ''}`} haven't paid
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* ── Row 3: Member Balances + Recent Activity ── */}
                    {(members.length > 0 && activeBudgetItems.length > 0 || recentExpenses.length > 0) && (
                        <div className={cn('grid grid-cols-1 gap-4', (members.length > 0 && activeBudgetItems.length > 0) && recentExpenses.length > 0 && 'sm:grid-cols-2')}>
                            {members.length > 0 && activeBudgetItems.length > 0 && (
                                <Card className="gap-0 py-0">
                                    <CardContent className="p-5">
                                        <div className="mb-3">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Member Balances</p>
                                            <p className="text-[11px] text-muted-foreground">Who owes what</p>
                                        </div>
                                        <div className="space-y-2.5">
                                            {memberBalanceSummaries.map(({ member, share, advance, remaining: memberRemaining }) => {
                                                const isMe = member.id === myMemberId;
                                                const isSettled = memberRemaining <= 0.005;
                                                const isOverpaid = advance > share + 0.005;
                                                const paidPct = share > 0 ? Math.min(100, (advance / share) * 100) : 0;
                                                return (
                                                    <div key={member.id} className={cn('rounded-xl px-3 py-2', isMe && 'bg-indigo-50 dark:bg-indigo-950/20')}>
                                                        <div className="flex items-center gap-3">
                                                            <span className={cn(
                                                                'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white',
                                                                avatarColor(members, member.id),
                                                            )}>
                                                                {getInitials(member.name)}
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate text-sm font-medium">
                                                                    {member.name}
                                                                    {isMe && <span className="ml-1.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">YOU</span>}
                                                                </p>
                                                                {share > 0 && (
                                                                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-foreground/10">
                                                                        <div
                                                                            className={cn('h-full rounded-full transition-all', isSettled ? (isOverpaid ? 'bg-violet-500' : 'bg-green-500') : 'bg-indigo-500')}
                                                                            style={{ width: `${paidPct}%` }}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {isSettled ? (
                                                                <span className={cn(
                                                                    'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                                                                    isOverpaid
                                                                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400'
                                                                        : 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
                                                                )}>
                                                                    {isOverpaid ? 'Overpaid' : 'Paid'}
                                                                </span>
                                                            ) : (
                                                                <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-red-600 dark:bg-red-950/40 dark:text-red-400">
                                                                    −{formatPeso(memberRemaining)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {recentExpenses.length > 0 && (
                                <Card className="gap-0 py-0">
                                    <CardContent className="p-5">
                                        <div className="mb-3 flex items-center justify-between">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recent Activity</p>
                                            <button type="button" onClick={() => onNavigate('expenses')} className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                                                View all
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {recentExpenses.map((e) => {
                                                const paidBy = memberById[e.paidById];
                                                const meta = allCategories[e.category];
                                                return (
                                                    <div key={e.id} className="flex items-center gap-3">
                                                        <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg text-sm', meta?.bgClass ?? 'bg-muted')}>
                                                            {meta?.icon ?? '📌'}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-medium">{e.description}</p>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {paidBy?.name ?? '?'} · {new Date(e.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                                            </p>
                                                        </div>
                                                        <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                                                            −{formatPeso(e.amount)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
