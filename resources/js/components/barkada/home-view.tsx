import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSpendByCategory, getTotalBudget, getTotalSpend } from '@/hooks/use-barkada-store';
import { cn } from '@/lib/utils';
import type { BarkadaStore, Trip } from '@/types/barkada';
import { getActiveBudgetItems, getActiveExpenses, getAllCategories, getAllCategoryKeys, getBudgetByCategory } from '@/types/barkada';
import { CalendarDays, MapPin, Pencil, ReceiptText, Users } from 'lucide-react';
import { useState } from 'react';

interface HomeViewProps {
    store: BarkadaStore;
    onUpdateTrip: (trip: Trip) => void;
}

function formatPeso(amount: number): string {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ProgressBar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const isOver = max > 0 && value > max;

    return (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
                className={cn('h-full rounded-full transition-all', isOver ? 'bg-destructive' : colorClass)}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

function TripEditForm({ trip, onSave, onCancel }: { trip: Trip; onSave: (t: Trip) => void; onCancel: () => void }) {
    const [form, setForm] = useState<Trip>(trip);
    const set = (key: keyof Trip) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((p) => ({ ...p, [key]: e.target.value }));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Edit Trip Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    {(
                        [
                            { key: 'name' as const, label: 'Trip Name', type: 'text', placeholder: 'Batangas Beach Trip' },
                            { key: 'destination' as const, label: 'Destination', type: 'text', placeholder: 'Laiya, Batangas' },
                            { key: 'startDate' as const, label: 'Start Date', type: 'date', placeholder: '' },
                            { key: 'endDate' as const, label: 'End Date', type: 'date', placeholder: '' },
                        ] as const
                    ).map(({ key, label, type, placeholder }) => (
                        <div key={key} className="space-y-1.5">
                            <Label htmlFor={`trip-${key}`}>{label}</Label>
                            <Input
                                id={`trip-${key}`}
                                type={type}
                                value={form[key]}
                                onChange={set(key)}
                                placeholder={placeholder}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 pt-1">
                    <Button onClick={() => onSave(form)} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                        Save
                    </Button>
                    <Button variant="outline" onClick={onCancel} className="flex-1">
                        Cancel
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export function HomeView({ store, onUpdateTrip }: HomeViewProps) {
    const [isEditing, setIsEditing] = useState(false);
    const { trip, members } = store;
    const activeExpenses = getActiveExpenses(store);
    const activeBudgetItems = getActiveBudgetItems(store);
    const totalBudget = getTotalBudget(activeBudgetItems);
    const totalSpend = getTotalSpend(activeExpenses);
    const spendByCategory = getSpendByCategory(activeExpenses);
    const budgetByCategory = getBudgetByCategory(activeBudgetItems);
    const remaining = totalBudget - totalSpend;
    const isOverBudget = remaining < 0;
    const hasTrip = trip.name || trip.destination;
    const allCategories = getAllCategories(store);
    const allCategoryKeys = getAllCategoryKeys(store);

    return (
        <div className="space-y-4 p-4">
            {isEditing ? (
                <TripEditForm
                    trip={trip}
                    onSave={(t) => {
                        onUpdateTrip(t);
                        setIsEditing(false);
                    }}
                    onCancel={() => setIsEditing(false)}
                />
            ) : (
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-lg">
                    <button
                        onClick={() => setIsEditing(true)}
                        className="absolute top-3 right-3 rounded-full bg-white/20 p-1.5 transition hover:bg-white/30"
                        aria-label="Edit trip details"
                    >
                        <Pencil className="size-3.5" />
                    </button>
                    {hasTrip ? (
                        <>
                            <p className="text-xs font-medium tracking-widest text-white/70 uppercase">Barkada Trip</p>
                            <h2 className="mt-1 text-2xl font-bold">{trip.name || 'Unnamed Trip'}</h2>
                            {trip.destination && (
                                <div className="mt-1.5 flex items-center gap-1 text-sm text-white/80">
                                    <MapPin className="size-3.5" />
                                    <span>{trip.destination}</span>
                                </div>
                            )}
                            {(trip.startDate || trip.endDate) && (
                                <div className="mt-1 flex items-center gap-1 text-sm text-white/80">
                                    <CalendarDays className="size-3.5" />
                                    <span>
                                        {trip.startDate &&
                                            new Date(trip.startDate).toLocaleDateString('en-PH', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        {trip.startDate && trip.endDate && ' – '}
                                        {trip.endDate &&
                                            new Date(trip.endDate).toLocaleDateString('en-PH', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                    </span>
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
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="gap-3 py-4">
                    <CardContent className="flex items-center gap-3 px-4">
                        <div className="flex size-9 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                            <Users className="size-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{members.length}</p>
                            <p className="text-xs text-muted-foreground">Members</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="gap-3 py-4">
                    <CardContent className="flex items-center gap-3 px-4">
                        <div className="flex size-9 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                            <ReceiptText className="size-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{store.expenses.length}</p>
                            <p className="text-xs text-muted-foreground">Expenses</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Budget overview */}
            <Card className="gap-4 py-4">
                <CardHeader className="px-4">
                    <CardTitle className="text-sm">Budget Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4">
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-2xl font-bold">{formatPeso(totalSpend)}</p>
                            <p className="text-xs text-muted-foreground">Total spent</p>
                        </div>
                        {totalBudget > 0 && (
                            <div className="text-right">
                                <p
                                    className={cn(
                                        'text-lg font-semibold',
                                        isOverBudget ? 'text-destructive' : 'text-green-600 dark:text-green-400',
                                    )}
                                >
                                    {isOverBudget ? '-' : ''}
                                    {formatPeso(Math.abs(remaining))}
                                </p>
                                <p className="text-xs text-muted-foreground">{isOverBudget ? 'over budget' : 'remaining'}</p>
                            </div>
                        )}
                    </div>
                    <ProgressBar
                        value={totalSpend}
                        max={totalBudget > 0 ? totalBudget : totalSpend > 0 ? totalSpend : 1}
                        colorClass="bg-indigo-500"
                    />
                    {totalBudget > 0 && (
                        <p className="text-right text-xs text-muted-foreground">of {formatPeso(totalBudget)} budget</p>
                    )}
                </CardContent>
            </Card>

            {/* Per-category breakdown */}
            <Card className="gap-4 py-4">
                <CardHeader className="px-4">
                    <CardTitle className="text-sm">By Category</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Category</TableHead>
                                <TableHead className="text-right">Spent</TableHead>
                                <TableHead className="text-right">Budget</TableHead>
                                <TableHead className="pr-6 min-w-28">Progress</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allCategoryKeys.map((cat) => {
                                const meta = allCategories[cat];
                                const spent = spendByCategory[cat] ?? 0;
                                const budget = budgetByCategory[cat] ?? 0;
                                const isOver = budget > 0 && spent > budget;

                                return (
                                    <TableRow key={cat}>
                                        <TableCell className="pl-6">
                                            <div className="flex items-center gap-2">
                                                <span>{meta.icon}</span>
                                                <Badge
                                                    variant="outline"
                                                    className={cn('border-0 text-xs', meta.bgClass, meta.textClass)}
                                                >
                                                    {meta.shortLabel}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium tabular-nums">
                                            {formatPeso(spent)}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-muted-foreground">
                                            {budget > 0 ? formatPeso(budget) : '—'}
                                        </TableCell>
                                        <TableCell className="pr-6">
                                            <ProgressBar
                                                value={spent}
                                                max={budget > 0 ? budget : spent > 0 ? spent : 1}
                                                colorClass={isOver ? 'bg-destructive' : meta.progressColorClass}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
