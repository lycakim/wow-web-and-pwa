import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppModal } from '@/components/ui/app-modal';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { BarkadaStore, Carpool, Category, CategoryMeta, Expense, Member } from '@/types/barkada';
import { getAllCategories, getAllCategoryKeys, getCategoryMeta } from '@/types/barkada';
import { ConfirmDeleteDialog } from '@/components/barkada/confirm-delete-dialog';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ExpensesViewProps {
    store: BarkadaStore;
    onAdd: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
    onRemove: (id: string) => void;
    currentUserName?: string;
    myMemberId?: string;
}

function formatPeso(amount: number): string {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

type FormSplitType = 'equal' | 'carpool' | 'custom' | 'kkb';

interface FormState {
    description: string;
    amount: string;
    category: Category;
    paidById: string;
    splitType: FormSplitType;
    carpoolId: string;
    customSplits: Record<string, string>;
}

const SPLIT_LABELS: Record<FormSplitType, string> = {
    equal: 'Equal',
    carpool: 'By Car',
    custom: 'Custom',
    kkb: 'KKB',
};

function ExpenseSheet({
    members,
    carpools,
    allCategories,
    allCategoryKeys,
    open,
    onOpenChange,
    onSave,
}: {
    members: Member[];
    carpools: Carpool[];
    allCategories: Record<string, CategoryMeta>;
    allCategoryKeys: string[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
}) {
    const defaultCategory = allCategoryKeys[2] ?? allCategoryKeys[0] ?? 'food';

    const blankForm = (): FormState => ({
        description: '',
        amount: '',
        category: defaultCategory,
        paidById: members[0]?.id ?? '',
        splitType: 'equal',
        carpoolId: carpools[0]?.id ?? '',
        customSplits: Object.fromEntries(members.map((m) => [m.id, ''])),
    });

    const [form, setForm] = useState<FormState>(blankForm);
    const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

    // Reset when sheet opens
    useEffect(() => {
        if (open) {
            setForm(blankForm());
            setErrors({});
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync members changes while open
    useEffect(() => {
        if (!open) return;
        setForm((prev) => ({
            ...prev,
            paidById: members.find((m) => m.id === prev.paidById) ? prev.paidById : (members[0]?.id ?? ''),
            customSplits: Object.fromEntries(members.map((m) => [m.id, prev.customSplits[m.id] ?? ''])),
        }));
    }, [members, open]);

    // Auto-compute carpool split when carpool, amount, or splitType changes
    useEffect(() => {
        if (!open || form.splitType !== 'carpool') return;
        const carpool = carpools.find((c) => c.id === form.carpoolId);
        if (!carpool || carpool.memberIds.length === 0) return;
        const totalAmount = parseFloat(form.amount) || 0;
        const perPerson = totalAmount > 0 ? (totalAmount / carpool.memberIds.length).toFixed(2) : '';
        setForm((prev) => ({
            ...prev,
            customSplits: Object.fromEntries(
                members.map((m) => [m.id, carpool.memberIds.includes(m.id) ? perPerson : '']),
            ),
        }));
    }, [form.carpoolId, form.amount, form.splitType, open]); // eslint-disable-line react-hooks/exhaustive-deps

    const totalAmount = parseFloat(form.amount) || 0;
    const splitTotal = Object.values(form.customSplits).reduce((s, v) => s + (parseFloat(v) || 0), 0);
    const selectedCarpool = carpools.find((c) => c.id === form.carpoolId);

    const availableSplitTypes: FormSplitType[] = ['equal', ...(carpools.length > 0 ? ['carpool' as const] : []), 'custom', 'kkb'];

    const validate = (): boolean => {
        const errs: typeof errors = {};
        if (!form.description.trim()) errs.description = 'Required';
        if (!form.amount || totalAmount <= 0) errs.amount = 'Enter a valid amount';
        if (form.splitType !== 'kkb' && !form.paidById) errs.paidById = 'Select who paid';
        if (form.splitType === 'carpool' && !form.carpoolId) errs.carpool = 'Select a car';
        if (form.splitType === 'custom' && Math.abs(splitTotal - totalAmount) > 0.01) {
            errs.splits = `Must total ${formatPeso(totalAmount)} (currently ${formatPeso(splitTotal)})`;
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const submit = () => {
        if (!validate()) return;

        const isKkb = form.splitType === 'kkb';
        const isCarpool = form.splitType === 'carpool';
        const isCustomOrCarpool = isCarpool || form.splitType === 'custom';

        onSave({
            description: form.description.trim(),
            amount: totalAmount,
            category: form.category,
            paidById: isKkb ? (members[0]?.id ?? '') : form.paidById,
            splitType: isCarpool ? 'carpool' : form.splitType,
            carpoolId: isCarpool ? form.carpoolId : undefined,
            customSplits: isCustomOrCarpool
                ? Object.fromEntries(Object.entries(form.customSplits).map(([id, v]) => [id, parseFloat(v) || 0]))
                : {},
        });
        onOpenChange(false);
    };

    return (
        <AppModal open={open} onOpenChange={onOpenChange} title="Add Expense">
                {members.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-center">
                        <p className="text-4xl">👥</p>
                        <p className="mt-2 font-semibold">Add members first</p>
                        <p className="mt-1 text-sm text-muted-foreground">You need at least one member before logging expenses.</p>
                    </div>
                ) : (
                    <>
                        {/* Description */}
                        <div className="space-y-1.5">
                            <Label htmlFor="exp-desc">Description</Label>
                            <Input
                                id="exp-desc"
                                value={form.description}
                                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                placeholder="e.g. Dinner at Kuya's Lechon"
                                aria-invalid={!!errors.description}
                            />
                            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
                        </div>

                        {/* Amount */}
                        <div className="space-y-1.5">
                            <Label htmlFor="exp-amount">Amount (₱)</Label>
                            <Input
                                id="exp-amount"
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.amount}
                                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                                placeholder="0.00"
                                aria-invalid={!!errors.amount}
                            />
                            {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
                        </div>

                        {/* Category */}
                        <div className="space-y-1.5">
                            <Label>Category</Label>
                            <div className="flex flex-wrap gap-2">
                                {allCategoryKeys.map((cat) => {
                                    const meta = allCategories[cat];
                                    return (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setForm((p) => ({ ...p, category: cat }))}
                                            className={cn(
                                                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                                                form.category === cat
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

                        {/* Split type */}
                        <div className="space-y-1.5">
                            <Label>Split</Label>
                            <div className="flex overflow-hidden rounded-md border">
                                {availableSplitTypes.map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setForm((p) => ({ ...p, splitType: type }))}
                                        className={cn(
                                            'flex-1 py-2.5 text-sm font-medium transition-colors',
                                            form.splitType === type
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-background text-foreground hover:bg-muted',
                                        )}
                                    >
                                        {SPLIT_LABELS[type]}
                                    </button>
                                ))}
                            </div>
                            {form.splitType === 'kkb' && (
                                <p className="text-xs text-muted-foreground">
                                    Everyone pays their own share on the spot. Not included in settlement.
                                </p>
                            )}
                        </div>

                        {/* Paid by (hidden for KKB) */}
                        {form.splitType !== 'kkb' && (
                            <div className="space-y-1.5">
                                <Label htmlFor="exp-payer">Paid by</Label>
                                <Select value={form.paidById} onValueChange={(v) => setForm((p) => ({ ...p, paidById: v }))}>
                                    <SelectTrigger id="exp-payer" aria-invalid={!!errors.paidById}>
                                        <SelectValue placeholder="Select member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {members.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.paidById && <p className="text-xs text-destructive">{errors.paidById}</p>}
                            </div>
                        )}

                        {/* Carpool selector */}
                        {form.splitType === 'carpool' && (
                            <div className="space-y-2">
                                <Label htmlFor="exp-carpool">Car</Label>
                                <Select
                                    value={form.carpoolId}
                                    onValueChange={(v) => setForm((p) => ({ ...p, carpoolId: v }))}
                                >
                                    <SelectTrigger id="exp-carpool" aria-invalid={!!errors.carpool}>
                                        <SelectValue placeholder="Select car" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {carpools.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name} ({c.memberIds.length} passengers)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.carpool && <p className="text-xs text-destructive">{errors.carpool}</p>}
                                {selectedCarpool && selectedCarpool.memberIds.length > 0 && totalAmount > 0 && (
                                    <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                                        Split among {selectedCarpool.memberIds.length} passengers ·{' '}
                                        <span className="font-medium text-foreground">
                                            {formatPeso(totalAmount / selectedCarpool.memberIds.length)} each
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Custom splits */}
                        {form.splitType === 'custom' && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">Amounts per member</Label>
                                    <span
                                        className={cn(
                                            'text-xs font-medium',
                                            Math.abs(splitTotal - totalAmount) < 0.01 ? 'text-green-600' : 'text-destructive',
                                        )}
                                    >
                                        Total: {formatPeso(splitTotal)}
                                    </span>
                                </div>
                                {members.map((m) => (
                                    <div key={m.id} className="flex items-center gap-3">
                                        <span className="w-28 truncate text-sm">{m.name}</span>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.customSplits[m.id] ?? ''}
                                            onChange={(e) =>
                                                setForm((p) => ({
                                                    ...p,
                                                    customSplits: { ...p.customSplits, [m.id]: e.target.value },
                                                }))
                                            }
                                            placeholder="0.00"
                                        />
                                    </div>
                                ))}
                                {errors.splits && <p className="text-xs text-destructive">{errors.splits}</p>}
                            </div>
                        )}

                        <Button onClick={submit} className="w-full bg-indigo-600 hover:bg-indigo-700">
                            Add Expense
                        </Button>
                    </>
                )}
        </AppModal>
    );
}

const SPLIT_BADGE: Record<string, { label: string; className: string }> = {
    equal: { label: 'Equal', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
    carpool: { label: 'By Car', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    custom: { label: 'Custom', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    kkb: { label: 'KKB', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};

export function ExpensesView({ store, onAdd, onRemove, currentUserName, myMemberId }: ExpensesViewProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [filter, setFilter] = useState<Category | 'all'>('all');
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; description: string } | null>(null);
    const { members, expenses, carpools } = store;
    const allCategories = getAllCategories(store);
    const allCategoryKeys = getAllCategoryKeys(store);

    const filtered = filter === 'all' ? expenses : expenses.filter((e) => e.category === filter);
    const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);

    const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
    const carpoolById = Object.fromEntries(carpools.map((c) => [c.id, c]));

    return (
        <>
            <div className="p-4">
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>Expenses</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {filtered.length} {filter === 'all' ? 'total' : (allCategories[filter]?.label.toLowerCase() ?? filter)}
                            </p>
                        </div>
                        <Button size="sm" onClick={() => setIsAdding(true)} className="shrink-0 gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="size-4" />
                            Add
                        </Button>
                    </CardHeader>

                    {/* Category filter */}
                    <CardContent className="pb-0">
                        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            <button
                                onClick={() => setFilter('all')}
                                className={cn(
                                    'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                    filter === 'all'
                                        ? 'border-indigo-600 bg-indigo-600 text-white'
                                        : 'border-border bg-background',
                                )}
                            >
                                All
                            </button>
                            {allCategoryKeys.map((cat) => {
                                const meta = allCategories[cat];
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setFilter(cat)}
                                        className={cn(
                                            'flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                            filter === cat
                                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                                : 'border-border bg-background',
                                        )}
                                    >
                                        {meta.icon} {meta.shortLabel}
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>

                    <CardContent className="px-0 pb-0">
                        {filtered.length === 0 ? (
                            <div className="py-12 text-center">
                                <p className="text-4xl">🧾</p>
                                <p className="mt-2 text-sm font-medium">No expenses yet</p>
                                <p className="text-xs text-muted-foreground">Tap Add to get started</p>
                            </div>
                        ) : (
                            <>
                                {/* Mobile card list */}
                                <div className="space-y-3 px-4 pt-3 pb-4 sm:hidden">
                                    {filtered.map((expense) => {
                                        const meta = getCategoryMeta(expense.category, store);
                                        const payer = memberById[expense.paidById];
                                        const splitBadge = SPLIT_BADGE[expense.splitType] ?? SPLIT_BADGE.custom;
                                        const carpoolName = expense.carpoolId ? carpoolById[expense.carpoolId]?.name : null;
                                        return (
                                            <div key={expense.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                                                {/* Row 1: category pill + delete */}
                                                <div className="flex items-center justify-between">
                                                    <Badge variant="outline" className={cn('border-0 gap-1 text-xs font-medium', meta.bgClass, meta.textClass)}>
                                                        {meta.icon} {meta.shortLabel}
                                                    </Badge>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeleteTarget({ id: expense.id, description: expense.description })}
                                                        className="flex size-7 items-center justify-center rounded-full text-muted-foreground/30 transition-colors hover:bg-destructive/10 hover:text-destructive"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </div>

                                                {/* Row 2: description */}
                                                <p className="mt-2.5 text-base font-semibold leading-snug">{expense.description}</p>

                                                {/* Row 3: amount + split badge */}
                                                <div className="mt-2 flex items-end justify-between gap-2">
                                                    <span className="text-2xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                                                        {formatPeso(expense.amount)}
                                                    </span>
                                                    <Badge variant="outline" className={cn('mb-0.5 border-0 px-2 py-0.5 text-[11px] font-medium', splitBadge.className)}>
                                                        {carpoolName ?? splitBadge.label}
                                                    </Badge>
                                                </div>

                                                {/* Row 4: payer + date */}
                                                <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                                                    {expense.splitType !== 'kkb' && (
                                                        <span>Paid by <span className="font-medium text-foreground">{expense.paidById === myMemberId ? 'You' : (payer?.name ?? 'Unknown')}</span></span>
                                                    )}
                                                    {expense.splitType !== 'kkb' && <span>·</span>}
                                                    <span>{formatDate(expense.createdAt)}</span>
                                                    {expense.loggedByName && (
                                                        <>
                                                            <span>·</span>
                                                            <span>by <span className="font-medium text-indigo-600 dark:text-indigo-400">{expense.loggedByName}</span></span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="flex justify-between rounded-2xl border bg-muted/40 px-4 py-3 text-sm font-semibold">
                                        <span>Total</span>
                                        <span className="tabular-nums">{formatPeso(totalFiltered)}</span>
                                    </div>
                                </div>

                                {/* Desktop table */}
                                <Table className="hidden sm:table">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="pl-6">Description</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Paid by</TableHead>
                                            <TableHead>Logged by</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Split</TableHead>
                                            <TableHead className="pr-6 text-right">Amount</TableHead>
                                            <TableHead className="pr-6" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map((expense) => {
                                            const meta = getCategoryMeta(expense.category, store);
                                            const payer = memberById[expense.paidById];
                                            const splitBadge = SPLIT_BADGE[expense.splitType] ?? SPLIT_BADGE.custom;
                                            const carpoolName = expense.carpoolId ? carpoolById[expense.carpoolId]?.name : null;
                                            return (
                                                <TableRow key={expense.id}>
                                                    <TableCell className="pl-6 font-medium">{expense.description}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={cn('border-0 text-xs', meta.bgClass, meta.textClass)}>
                                                            {meta.icon} {meta.shortLabel}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {expense.splitType === 'kkb' ? '—' : (expense.paidById === myMemberId ? 'You' : (payer?.name ?? 'Unknown'))}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {expense.loggedByName
                                                            ? <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">{expense.loggedByName}</span>
                                                            : <span className="text-xs">—</span>
                                                        }
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">{formatDate(expense.createdAt)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={cn('border-0 text-xs', splitBadge.className)}>
                                                            {carpoolName ?? splitBadge.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="pr-6 text-right font-semibold tabular-nums">{formatPeso(expense.amount)}</TableCell>
                                                    <TableCell className="pr-4 text-right">
                                                        <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget({ id: expense.id, description: expense.description })}>
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell className="pl-6" colSpan={6}>Total</TableCell>
                                            <TableCell className="pr-6 text-right font-semibold tabular-nums">{formatPeso(totalFiltered)}</TableCell>
                                            <TableCell className="pr-4" />
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ConfirmDeleteDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="Delete Expense"
                description={`Delete "${deleteTarget?.description}"? This cannot be undone.`}
                onConfirm={() => { if (deleteTarget) onRemove(deleteTarget.id); }}
            />
            <ExpenseSheet
                members={members}
                carpools={carpools}
                allCategories={allCategories}
                allCategoryKeys={allCategoryKeys}
                open={isAdding}
                onOpenChange={setIsAdding}
                onSave={(expense) => {
                    onAdd({ ...expense, ...(currentUserName ? { loggedByName: currentUserName } : {}) });
                    setIsAdding(false);
                }}
            />
        </>
    );
}
