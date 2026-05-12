import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppModal } from '@/components/ui/app-modal';
import { ConfirmDeleteDialog } from '@/components/barkada/confirm-delete-dialog';
import { cn } from '@/lib/utils';
import type { BarkadaStore, Collection, CollectionPayment, Member } from '@/types/barkada';
import { ArrowRight, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

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

function MemberAvatar({ members, id, size = 'md' }: { members: Member[]; id: string; size?: 'sm' | 'md' }) {
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

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Add Collection Sheet ──────────────────────────────────────────────────────

function AddCollectionSheet({
    members,
    open,
    onOpenChange,
    onSave,
}: {
    members: Member[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (name: string, targetAmount: number, collectorId: string, memberIds: string[]) => void;
}) {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [collectorId, setCollectorId] = useState(members[0]?.id ?? '');
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(members.map((m) => m.id));
    const [errors, setErrors] = useState<Record<string, string>>({});

    const reset = () => {
        setName(''); setAmount(''); setCollectorId(members[0]?.id ?? '');
        setSelectedMemberIds(members.map((m) => m.id)); setErrors({});
    };

    const toggleMember = (id: string) => {
        setSelectedMemberIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };

    const submit = () => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = 'Required';
        const parsed = parseFloat(amount);
        if (!amount || isNaN(parsed) || parsed <= 0) errs.amount = 'Enter a valid amount';
        if (!collectorId) errs.collectorId = 'Select a collector';
        if (selectedMemberIds.length === 0) errs.members = 'Select at least one member';
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;
        onSave(name.trim(), parsed, collectorId, selectedMemberIds);
        reset();
        onOpenChange(false);
    };

    return (
        <AppModal open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }} title="New Collection">
                <div>
                    <div className="space-y-1.5">
                        <Label>Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Room Downpayment, Van Deposit" aria-invalid={!!errors.name} />
                        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label>Target Amount (₱)</Label>
                        <Input type="number" min="0" step="100" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" aria-invalid={!!errors.amount} />
                        {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
                        {!errors.amount && amount && selectedMemberIds.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                = <span className="font-semibold text-foreground">{formatPeso(parseFloat(amount) / selectedMemberIds.length)}</span> per person ({selectedMemberIds.length} members)
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label>Collector (who receives the money)</Label>
                        <Select value={collectorId} onValueChange={setCollectorId}>
                            <SelectTrigger aria-invalid={!!errors.collectorId}><SelectValue placeholder="Select member" /></SelectTrigger>
                            <SelectContent>
                                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {errors.collectorId && <p className="text-xs text-destructive">{errors.collectorId}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label>Who is splitting this?</Label>
                        <div className="flex flex-wrap gap-2">
                            {members.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => toggleMember(m.id)}
                                    className={cn(
                                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                                        selectedMemberIds.includes(m.id)
                                            ? 'border-indigo-600 bg-indigo-600 text-white'
                                            : 'border-border bg-background',
                                    )}
                                >
                                    {m.name}
                                </button>
                            ))}
                        </div>
                        {errors.members && <p className="text-xs text-destructive">{errors.members}</p>}
                    </div>

                    <Button onClick={submit} className="w-full bg-indigo-600 hover:bg-indigo-700">Create Collection</Button>
                </div>
        </AppModal>
    );
}

// ── Add Payment Sheet ─────────────────────────────────────────────────────────

function AddPaymentSheet({
    members,
    collection,
    open,
    onOpenChange,
    onSave,
}: {
    members: Member[];
    collection: Collection;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (fromMemberId: string, amount: number, paidAt: string, note?: string) => void;
}) {
    const today = new Date().toISOString().slice(0, 10);
    const [fromMemberId, setFromMemberId] = useState('');
    const [amount, setAmount] = useState('');
    const [paidAt, setPaidAt] = useState(today);
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const reset = () => { setFromMemberId(''); setAmount(''); setPaidAt(today); setNote(''); setErrors({}); };

    const submit = () => {
        const errs: Record<string, string> = {};
        if (!fromMemberId) errs.from = 'Select who paid';
        const parsed = parseFloat(amount);
        if (!amount || isNaN(parsed) || parsed <= 0) errs.amount = 'Enter a valid amount';
        if (!paidAt) errs.paidAt = 'Select a date';
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;
        onSave(fromMemberId, parsed, paidAt, note.trim() || undefined);
        reset();
        onOpenChange(false);
    };

    const payers = members.filter((m) => collection.memberIds.includes(m.id));

    return (
        <AppModal open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }} title="Record Payment">
                    {/* Visual arrow preview */}
                    <div className="flex items-center justify-center gap-3 rounded-2xl bg-muted/50 px-4 py-4">
                        <div className="flex flex-col items-center gap-1">
                            {fromMemberId
                                ? <MemberAvatar members={members} id={fromMemberId} />
                                : <span className="flex size-8 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 text-muted-foreground/40 text-xs">?</span>
                            }
                            <span className="text-xs font-medium">{members.find((m) => m.id === fromMemberId)?.name ?? 'Payer'}</span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                            <ArrowRight className="size-5 text-muted-foreground" />
                            {amount && parseFloat(amount) > 0 && (
                                <span className="text-xs font-bold tabular-nums text-indigo-600">{formatPeso(parseFloat(amount))}</span>
                            )}
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <MemberAvatar members={members} id={collection.collectorId} />
                            <span className="text-xs font-medium">{members.find((m) => m.id === collection.collectorId)?.name ?? 'Collector'}</span>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label>From (who paid)</Label>
                        <Select value={fromMemberId} onValueChange={setFromMemberId}>
                            <SelectTrigger aria-invalid={!!errors.from}><SelectValue placeholder="Select member" /></SelectTrigger>
                            <SelectContent>
                                {payers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {errors.from && <p className="text-xs text-destructive">{errors.from}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label>Amount (₱)</Label>
                        <Input type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" aria-invalid={!!errors.amount} />
                        {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label>Date paid</Label>
                        <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} aria-invalid={!!errors.paidAt} />
                        {errors.paidAt && <p className="text-xs text-destructive">{errors.paidAt}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label>Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. GCash, cash on hand" />
                    </div>

                    <Button onClick={submit} className="w-full bg-indigo-600 hover:bg-indigo-700">Record Payment</Button>
        </AppModal>
    );
}

// ── Collection Card ───────────────────────────────────────────────────────────

function CollectionCard({
    collection,
    members,
    payments,
    currentUserName,
    onAddPayment,
    onRemovePayment,
    onRemoveCollection,
}: {
    collection: Collection;
    members: Member[];
    payments: CollectionPayment[];
    currentUserName?: string;
    onAddPayment: (collectionId: string) => void;
    onRemovePayment: (id: string) => void;
    onRemoveCollection: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const [deletePayment, setDeletePayment] = useState<CollectionPayment | null>(null);
    const [deleteCollection, setDeleteCollection] = useState(false);

    const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
    const collector = memberById[collection.collectorId];
    const splitMembers = collection.memberIds.map((id) => memberById[id]).filter(Boolean) as Member[];
    const sharePerPerson = splitMembers.length > 0 ? collection.targetAmount / splitMembers.length : 0;

    // Total paid per member
    const paidByMember: Record<string, number> = {};
    for (const p of payments) {
        paidByMember[p.fromMemberId] = (paidByMember[p.fromMemberId] ?? 0) + p.amount;
    }

    const totalCollected = Object.values(paidByMember).reduce((s, v) => s + v, 0);
    const progressPct = collection.targetAmount > 0 ? Math.min(100, (totalCollected / collection.targetAmount) * 100) : 0;
    const isComplete = totalCollected >= collection.targetAmount;

    return (
        <Card>
            {/* Header */}
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <CardTitle className="text-base">{collection.name}</CardTitle>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Collector: <span className="font-medium text-foreground">{collector?.name ?? '?'}</span>
                            {' · '}{splitMembers.length} member{splitMembers.length !== 1 ? 's' : ''}
                            {' · '}<span className="font-medium text-foreground">{formatPeso(sharePerPerson)}</span>/person
                        </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => onAddPayment(collection.id)}>
                            <Plus className="size-3" /> Pay
                        </Button>
                        <button
                            type="button"
                            onClick={() => setDeleteCollection(true)}
                            className="flex size-7 items-center justify-center rounded-full text-muted-foreground/30 hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                            <Trash2 className="size-3.5" />
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                        <span className={cn('font-bold tabular-nums text-sm', isComplete ? 'text-green-600 dark:text-green-400' : 'text-indigo-600 dark:text-indigo-400')}>
                            {formatPeso(totalCollected)}
                        </span>
                        <span className="text-muted-foreground">of {formatPeso(collection.targetAmount)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className={cn('h-full rounded-full transition-all', isComplete ? 'bg-green-500' : 'bg-indigo-500')}
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                    {isComplete && (
                        <p className="text-center text-xs font-semibold text-green-600 dark:text-green-400">🎉 Fully collected!</p>
                    )}
                </div>
            </CardHeader>

            <CardContent className="px-0 pb-0">
                {/* Toggle */}
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="flex w-full items-center justify-between border-t px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
                >
                    <span>Details</span>
                    {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </button>

                {expanded && (
                    <>
                        {/* Per-member status table */}
                        <div className="divide-y border-t">
                            {splitMembers.map((m) => {
                                const paid = paidByMember[m.id] ?? 0;
                                const remaining = sharePerPerson - paid;
                                const done = remaining <= 0.005;
                                return (
                                    <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                                        <MemberAvatar members={members} id={m.id} size="sm" />
                                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.name}</span>
                                        <div className="flex items-center gap-3 shrink-0 text-right">
                                            <div className="w-20">
                                                <p className="text-xs text-muted-foreground">Paid</p>
                                                <p className="text-sm font-semibold tabular-nums">{formatPeso(paid)}</p>
                                            </div>
                                            <div className="w-20">
                                                <p className="text-xs text-muted-foreground">Remaining</p>
                                                <p className={cn('text-sm font-bold tabular-nums', done ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400')}>
                                                    {done ? '✓' : formatPeso(remaining)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Payment feed */}
                        {payments.length > 0 && (
                            <div className="border-t">
                                <p className="px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Payment History</p>
                                <div className="divide-y">
                                    {payments.map((p) => {
                                        const from = memberById[p.fromMemberId];
                                        return (
                                            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                                                {/* Arrow visualization */}
                                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                                    <MemberAvatar members={members} id={p.fromMemberId} size="sm" />
                                                    <span className="text-sm font-medium truncate">{from?.name ?? '?'}</span>
                                                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                                                    <MemberAvatar members={members} id={collection.collectorId} size="sm" />
                                                    <span className="text-sm font-medium truncate">{collector?.name ?? '?'}</span>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="text-sm font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{formatPeso(p.amount)}</p>
                                                    <p className="text-[10px] text-muted-foreground">{formatDate(p.paidAt)}</p>
                                                    {p.note && <p className="text-[10px] italic text-muted-foreground">{p.note}</p>}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeletePayment(p)}
                                                    className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground/30 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                                >
                                                    <Trash2 className="size-3" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {payments.length === 0 && (
                            <div className="border-t py-6 text-center">
                                <p className="text-sm text-muted-foreground">No payments yet — tap Pay to record one</p>
                            </div>
                        )}
                    </>
                )}
            </CardContent>

            <ConfirmDeleteDialog
                open={!!deletePayment}
                onOpenChange={(o) => !o && setDeletePayment(null)}
                title="Remove Payment"
                description={`Remove this payment of ${deletePayment ? formatPeso(deletePayment.amount) : ''}?`}
                onConfirm={() => { if (deletePayment) onRemovePayment(deletePayment.id); }}
            />
            <ConfirmDeleteDialog
                open={deleteCollection}
                onOpenChange={setDeleteCollection}
                title="Delete Collection"
                description={`Delete "${collection.name}"? All payment records will be lost.`}
                onConfirm={() => onRemoveCollection(collection.id)}
            />
        </Card>
    );
}

// ── Main View ─────────────────────────────────────────────────────────────────

interface CollectionsViewProps {
    store: BarkadaStore;
    currentUserName?: string;
    onAddCollection: (name: string, targetAmount: number, collectorId: string, memberIds: string[]) => void;
    onRemoveCollection: (id: string) => void;
    onAddPayment: (collectionId: string, fromMemberId: string, amount: number, paidAt: string, note?: string) => void;
    onRemovePayment: (id: string) => void;
}

export function CollectionsView({ store, currentUserName, onAddCollection, onRemoveCollection, onAddPayment, onRemovePayment }: CollectionsViewProps) {
    const { members, collections, collectionPayments } = store;
    const [addCollectionOpen, setAddCollectionOpen] = useState(false);
    const [addPaymentFor, setAddPaymentFor] = useState<Collection | null>(null);

    if (members.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 pt-16 text-center">
                <p className="text-4xl">💰</p>
                <p className="mt-3 text-base font-semibold">Add members first</p>
                <p className="mt-1 text-sm text-muted-foreground">Collections track who has paid toward a specific fund</p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold">Collections</h2>
                        <p className="text-sm text-muted-foreground">Track partial payments toward a fund</p>
                    </div>
                    <Button size="sm" onClick={() => setAddCollectionOpen(true)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="size-4" /> New
                    </Button>
                </div>

                {collections.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-4xl">🏦</p>
                        <p className="mt-2 text-sm font-medium">No collections yet</p>
                        <p className="text-xs text-muted-foreground">Create one for room downpayments, van deposits, etc.</p>
                    </div>
                ) : (
                    collections.map((col) => {
                        const payments = collectionPayments.filter((p) => p.collectionId === col.id);
                        return (
                            <CollectionCard
                                key={col.id}
                                collection={col}
                                members={members}
                                payments={payments}
                                currentUserName={currentUserName}
                                onAddPayment={() => setAddPaymentFor(col)}
                                onRemovePayment={onRemovePayment}
                                onRemoveCollection={onRemoveCollection}
                            />
                        );
                    })
                )}
            </div>

            <AddCollectionSheet
                members={members}
                open={addCollectionOpen}
                onOpenChange={setAddCollectionOpen}
                onSave={onAddCollection}
            />

            {addPaymentFor && (
                <AddPaymentSheet
                    members={members}
                    collection={addPaymentFor}
                    open={!!addPaymentFor}
                    onOpenChange={(o) => !o && setAddPaymentFor(null)}
                    onSave={(fromMemberId, amount, paidAt, note) => {
                        onAddPayment(addPaymentFor.id, fromMemberId, amount, paidAt, note);
                    }}
                />
            )}
        </>
    );
}
