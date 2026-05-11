import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSpendByCategory, getTotalBudget, getTotalSpend } from '@/hooks/use-barkada-store';
import { cn } from '@/lib/utils';
import type { BarkadaStore, BudgetItem, Category, Member } from '@/types/barkada';
import { calculateMemberBudgetShare, getActiveBudgetItems, getActiveExpenses, getAllCategories, getAllCategoryKeys, getBudgetByCategory } from '@/types/barkada';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';

const GROUP_COLORS = [
    { row: 'bg-blue-50 dark:bg-blue-950/20', header: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-800 dark:text-blue-200', subtotal: 'bg-blue-100/60 dark:bg-blue-900/20' },
    { row: 'bg-amber-50 dark:bg-amber-950/20', header: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-800 dark:text-amber-200', subtotal: 'bg-amber-100/60 dark:bg-amber-900/20' },
    { row: 'bg-green-50 dark:bg-green-950/20', header: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-800 dark:text-green-200', subtotal: 'bg-green-100/60 dark:bg-green-900/20' },
    { row: 'bg-rose-50 dark:bg-rose-950/20', header: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-800 dark:text-rose-200', subtotal: 'bg-rose-100/60 dark:bg-rose-900/20' },
    { row: 'bg-violet-50 dark:bg-violet-950/20', header: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-800 dark:text-violet-200', subtotal: 'bg-violet-100/60 dark:bg-violet-900/20' },
];

function getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function MemberChip({ member }: { member: Member }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                {getInitials(member.name)}
            </div>
            <span className="font-medium">{member.name}</span>
        </div>
    );
}

interface BudgetViewProps {
    store: BarkadaStore;
    onAdd: (name: string, category: Category, amount: number, carpoolId?: string) => void;
    onUpdate: (id: string, name: string, category: Category, amount: number, carpoolId?: string) => void;
    onRemove: (id: string) => void;
    onSetBudgetBuffer: (buffer: number) => void;
    onSetContingency: (contingency: number) => void;
}

function formatPeso(amount: number): string {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function BudgetItemDialog({
    open,
    onOpenChange,
    store,
    initial,
    onSave,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    store: BarkadaStore;
    initial?: BudgetItem;
    onSave: (name: string, category: Category, amount: number, carpoolId?: string) => void;
}) {
    const allCategories = getAllCategories(store);
    const allCategoryKeys = getAllCategoryKeys(store);
    const defaultCategory = allCategoryKeys[0] ?? 'food';

    const [name, setName] = useState(initial?.name ?? '');
    const [category, setCategory] = useState<Category>(initial?.category ?? defaultCategory);
    const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
    const [carpoolId, setCarpoolId] = useState<string>(initial?.carpoolId ?? '');
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (open) {
            setName(initial?.name ?? '');
            setCategory(initial?.category ?? defaultCategory);
            setAmount(initial ? String(initial.amount) : '');
            setCarpoolId(initial?.carpoolId ?? '');
            setErrors({});
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const submit = () => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = 'Required';
        const parsed = parseFloat(amount);
        if (!amount || isNaN(parsed) || parsed <= 0) errs.amount = 'Enter a valid amount';
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;
        onSave(name.trim(), category, parsed, carpoolId || undefined);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{initial ? 'Edit Budget Item' : 'Add Budget Item'}</DialogTitle>
                    <DialogDescription>Set a description, category, amount, and who this cost is split among.</DialogDescription>
                </DialogHeader>

                <div className="space-y-1.5">
                    <Label htmlFor="budget-name">Description</Label>
                    <Input
                        id="budget-name"
                        autoFocus
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setErrors((p) => ({ ...p, name: '' }));
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                        placeholder="e.g. Room, Gas Car 1, Island Hopping"
                        aria-invalid={!!errors.name}
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label>Category</Label>
                    <div className="flex flex-wrap gap-2">
                        {allCategoryKeys.map((cat) => {
                            const meta = allCategories[cat];
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setCategory(cat)}
                                    className={cn(
                                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                                        category === cat
                                            ? 'border-indigo-600 bg-indigo-600 text-white'
                                            : 'border-border bg-background hover:bg-muted',
                                    )}
                                >
                                    <span>{meta.icon}</span>
                                    {meta.shortLabel}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="budget-amount">Amount (₱)</Label>
                    <Input
                        id="budget-amount"
                        type="number"
                        min="0"
                        step="100"
                        value={amount}
                        onChange={(e) => {
                            setAmount(e.target.value);
                            setErrors((p) => ({ ...p, amount: '' }));
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                        placeholder="0.00"
                        aria-invalid={!!errors.amount}
                    />
                    {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
                </div>

                {store.carpools.length > 0 && (
                    <div className="space-y-1.5">
                        <Label>Split among</Label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setCarpoolId('')}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                                    !carpoolId ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-border bg-background hover:bg-muted',
                                )}
                            >
                                👥 All Members
                            </button>
                            {store.carpools.map((carpool) => (
                                <button
                                    key={carpool.id}
                                    type="button"
                                    onClick={() => setCarpoolId(carpool.id)}
                                    className={cn(
                                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                                        carpoolId === carpool.id
                                            ? 'border-indigo-600 bg-indigo-600 text-white'
                                            : 'border-border bg-background hover:bg-muted',
                                    )}
                                >
                                    🚗 {carpool.name}
                                    <span className="opacity-70">({carpool.memberIds.length})</span>
                                </button>
                            ))}
                        </div>
                        {carpoolId && (
                            <p className="text-xs text-muted-foreground">
                                Split among {store.carpools.find(c => c.id === carpoolId)?.memberIds.length ?? 0} passengers only
                            </p>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={!name.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function BudgetView({ store, onAdd, onUpdate, onRemove, onSetBudgetBuffer, onSetContingency }: BudgetViewProps) {
    const [addOpen, setAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<BudgetItem | null>(null);

    const { budgetItems, budgetBuffer, contingency } = store;
    const activeExpenses = getActiveExpenses(store);
    const activeBudgetItems = getActiveBudgetItems(store);
    const allCategories = getAllCategories(store);
    const spendByCategory = getSpendByCategory(activeExpenses);
    const budgetByCategory = getBudgetByCategory(activeBudgetItems);
    const totalBudget = getTotalBudget(activeBudgetItems);
    const totalSpend = getTotalSpend(activeExpenses);
    const totalRemaining = totalBudget - totalSpend;
    const bufferedBudget = totalBudget * (1 + budgetBuffer / 100) + (contingency ?? 0);

    return (
        <>
            <div className="space-y-4 p-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Budget Planner</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {budgetItems.length === 0 ? 'No items yet' : `${budgetItems.length} item${budgetItems.length > 1 ? 's' : ''}`}
                            </p>
                        </div>
                        <Button onClick={() => setAddOpen(true)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="size-4" />
                            Add Item
                        </Button>
                    </CardHeader>

                    <CardContent className="px-0 pb-0">
                        {budgetItems.length === 0 ? (
                            <div className="py-12 text-center">
                                <p className="text-4xl">💰</p>
                                <p className="mt-2 text-sm font-medium">No budget items yet</p>
                                <p className="text-xs text-muted-foreground">Add items like "Room", "Gas Car 1", "Island Hopping"</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Description</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Split</TableHead>
                                        <TableHead className="text-right">Budgeted</TableHead>
                                        <TableHead className="pr-6 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {budgetItems.map((item) => {
                                        const meta = allCategories[item.category];
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell className="pl-6 font-medium">{item.name}</TableCell>
                                                <TableCell>
                                                    {meta && (
                                                        <Badge
                                                            variant="outline"
                                                            className={cn('border-0 text-xs', meta.bgClass, meta.textClass)}
                                                        >
                                                            {meta.icon} {meta.shortLabel}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {item.carpoolId ? (
                                                        <Badge variant="outline" className="border-0 bg-indigo-100 text-xs text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                            🚗 {store.carpools.find(c => c.id === item.carpoolId)?.name ?? 'Car'}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">All</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-medium tabular-nums">
                                                    {formatPeso(item.amount)}
                                                </TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="size-8"
                                                            onClick={() => setEditTarget(item)}
                                                        >
                                                            <Pencil className="size-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="size-8 text-muted-foreground hover:text-destructive"
                                                            onClick={() => onRemove(item.id)}
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>

                    {budgetItems.length > 0 && (
                        <CardFooter className="flex flex-col gap-0 px-0 pb-0">
                            <div className="w-full border-t px-6 py-3">
                                <div className="flex items-center justify-between text-sm font-semibold">
                                    <span>Total Budget</span>
                                    <span className="tabular-nums">{formatPeso(totalBudget)}</span>
                                </div>
                                {budgetBuffer > 0 && (
                                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                                        <span>+ {budgetBuffer}% buffer</span>
                                        <span className="tabular-nums">{formatPeso(bufferedBudget)}</span>
                                    </div>
                                )}
                            </div>
                        </CardFooter>
                    )}
                </Card>

                {/* Per-category summary */}
                {budgetItems.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Summary by Category</CardTitle>
                        </CardHeader>
                        <CardContent className="px-0 pb-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Category</TableHead>
                                        <TableHead className="text-right">Budgeted</TableHead>
                                        <TableHead className="text-right">Spent</TableHead>
                                        <TableHead className="pr-6 text-right">Remaining</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(budgetByCategory).map(([cat, budget]) => {
                                        const meta = allCategories[cat];
                                        const spent = spendByCategory[cat] ?? 0;
                                        const remaining = budget - spent;
                                        const isOver = spent > budget;
                                        if (!meta) return null;
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
                                                <TableCell className="text-right tabular-nums">{formatPeso(budget)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{formatPeso(spent)}</TableCell>
                                                <TableCell
                                                    className={cn(
                                                        'pr-6 text-right font-medium tabular-nums',
                                                        isOver ? 'text-destructive' : 'text-green-600 dark:text-green-400',
                                                    )}
                                                >
                                                    {isOver ? '-' : ''}{formatPeso(Math.abs(remaining))}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                            <div className="flex items-center justify-between border-t px-6 py-3 text-sm font-semibold">
                                <span>Total</span>
                                <div className="flex gap-8 tabular-nums">
                                    <span>{formatPeso(totalBudget)}</span>
                                    <span>{formatPeso(totalSpend)}</span>
                                    <span className={cn(totalRemaining < 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400')}>
                                        {totalRemaining < 0 ? '-' : ''}{formatPeso(Math.abs(totalRemaining))}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Cost breakdown by member/group */}
                {store.members.length > 0 && totalBudget > 0 && (() => {
                    const { members, carpools } = store;
                    const bufferMultiplier = budgetBuffer > 0 ? (1 + budgetBuffer / 100) : 1;
                    const contingencyPerPerson = members.length > 0 ? (contingency ?? 0) / members.length : 0;
                    const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
                    const carpooledIds = new Set(carpools.flatMap((c) => c.memberIds));
                    const ungroupedMembers = members.filter((m) => !carpooledIds.has(m.id));
                    const carpoolGroups = carpools.map((carpool, i) => ({
                        label: carpool.name,
                        members: carpool.memberIds.map((id) => memberById[id]).filter(Boolean) as Member[],
                        colorIndex: i % GROUP_COLORS.length,
                    }));
                    const hasCarpoolItems = activeBudgetItems.some((item) => item.carpoolId);

                    const getMemberShare = (memberId: string) =>
                        calculateMemberBudgetShare(memberId, activeBudgetItems, carpools, members.length) * bufferMultiplier + contingencyPerPerson;

                    const grandTotal = members.reduce((s, m) => s + getMemberShare(m.id), 0);

                    return (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Cost Breakdown per Person</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    {hasCarpoolItems ? 'Carpool-aware split' : 'Equal split'}
                                    {budgetBuffer > 0 ? ` · +${budgetBuffer}% buffer` : ''}
                                    {(contingency ?? 0) > 0 ? ` · +${formatPeso(contingency)} contingency` : ''}
                                    {carpools.length > 0 ? ' · grouped by car' : ''}
                                </p>
                            </CardHeader>
                            <CardContent className="px-0 pb-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-8 pl-6 text-center">#</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead className="pr-6 text-right">Share</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {carpoolGroups.map(({ label, members: groupMembers, colorIndex }) => {
                                            const colors = GROUP_COLORS[colorIndex];
                                            const groupTotal = groupMembers.reduce((s, m) => s + getMemberShare(m.id), 0);
                                            return (
                                                <Fragment key={`group-${label}`}>
                                                    <TableRow className={colors.header}>
                                                        <TableCell className="pl-6 text-center">🚗</TableCell>
                                                        <TableCell colSpan={2} className={cn('font-semibold', colors.text)}>
                                                            {label}
                                                            <span className="ml-2 text-xs font-normal opacity-70">
                                                                {groupMembers.length} {groupMembers.length === 1 ? 'passenger' : 'passengers'}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                    {groupMembers.map((member, idx) => (
                                                        <TableRow key={member.id} className={colors.row}>
                                                            <TableCell className="pl-6 text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                                                            <TableCell><MemberChip member={member} /></TableCell>
                                                            <TableCell className="pr-6 text-right font-semibold tabular-nums">{formatPeso(getMemberShare(member.id))}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow className={colors.subtotal}>
                                                        <TableCell className="pl-6" />
                                                        <TableCell className="text-xs italic text-muted-foreground">Subtotal</TableCell>
                                                        <TableCell className="pr-6 text-right text-xs font-medium tabular-nums">{formatPeso(groupTotal)}</TableCell>
                                                    </TableRow>
                                                </Fragment>
                                            );
                                        })}
                                        {ungroupedMembers.length > 0 && (
                                            <>
                                                {carpools.length > 0 && (
                                                    <TableRow className="bg-muted/30">
                                                        <TableCell className="pl-6 text-center">👤</TableCell>
                                                        <TableCell colSpan={2} className="font-semibold text-muted-foreground">
                                                            Individual
                                                            <span className="ml-2 text-xs font-normal opacity-70">{ungroupedMembers.length} member{ungroupedMembers.length > 1 ? 's' : ''}</span>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                {ungroupedMembers.map((member, idx) => (
                                                    <TableRow key={member.id}>
                                                        <TableCell className="pl-6 text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                                                        <TableCell><MemberChip member={member} /></TableCell>
                                                        <TableCell className="pr-6 text-right font-semibold tabular-nums">{formatPeso(getMemberShare(member.id))}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </>
                                        )}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell className="pl-6" />
                                            <TableCell className="font-semibold">Total ({members.length} members)</TableCell>
                                            <TableCell className="pr-6 text-right font-semibold tabular-nums">{formatPeso(grandTotal)}</TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </CardContent>
                        </Card>
                    );
                })()}

                {/* Buffer + Contingency settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Budget Padding</CardTitle>
                        <p className="text-sm text-muted-foreground">Extra cushion on top of your planned budget to cover surprises.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Inflation Buffer</span>
                            <p className="text-xs text-muted-foreground">A % added on top of each budget item (e.g. 10% makes ₱1,000 → ₱1,100).</p>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={budgetBuffer || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        onSetBudgetBuffer(isNaN(val) ? 0 : val);
                                    }}
                                    placeholder="0"
                                    className="w-24 text-right"
                                />
                                <span className="text-sm text-muted-foreground">%</span>
                                {totalBudget > 0 && budgetBuffer > 0 && (
                                    <span className="text-sm text-muted-foreground">
                                        → <span className="font-semibold text-foreground">{formatPeso(totalBudget * (1 + budgetBuffer / 100))}</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="border-t pt-4 flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contingency Fund</span>
                            <p className="text-xs text-muted-foreground">A fixed ₱ amount set aside for emergencies, split equally among all members.</p>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-muted-foreground">₱</span>
                                <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={contingency || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        onSetContingency(isNaN(val) ? 0 : val);
                                    }}
                                    placeholder="0"
                                    className="w-32 text-right"
                                />
                                {(contingency ?? 0) > 0 && store.members.length > 0 && (
                                    <span className="text-sm text-muted-foreground">
                                        → <span className="font-semibold text-foreground">{formatPeso(contingency / store.members.length)}</span>/person
                                    </span>
                                )}
                            </div>
                        </div>

                        {totalBudget > 0 && ((budgetBuffer > 0) || (contingency ?? 0) > 0) && (
                            <div className="border-t pt-3 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Total with padding</span>
                                <span className="font-semibold">{formatPeso(bufferedBudget)}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <BudgetItemDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                store={store}
                onSave={(name, category, amount, carpoolId) => onAdd(name, category, amount, carpoolId)}
            />

            <BudgetItemDialog
                open={!!editTarget}
                onOpenChange={(open) => !open && setEditTarget(null)}
                store={store}
                initial={editTarget ?? undefined}
                onSave={(name, category, amount, carpoolId) => {
                    if (editTarget) onUpdate(editTarget.id, name, category, amount, carpoolId);
                    setEditTarget(null);
                }}
            />
        </>
    );
}
