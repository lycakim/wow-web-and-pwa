import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { AbruptGala, GalaItem, Member, Settlement } from '@/types/barkada';
import { ArrowLeft, ArrowRight, ChevronRight, Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AbruptGalaViewProps {
    members: Member[];
    abruptGalas: AbruptGala[];
    onAddGala: (name: string, memberIds: string[]) => void;
    onUpdateGala: (id: string, updates: { name?: string; memberIds?: string[] }) => void;
    onRemoveGala: (id: string) => void;
    onAddItem: (galaId: string, item: Omit<GalaItem, 'id'>) => void;
    onRemoveItem: (galaId: string, itemId: string) => void;
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

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function calculateGalaSettlements(members: Member[], gala: AbruptGala): { settlements: Settlement[]; balances: Record<string, number> } {
    if (gala.memberIds.length === 0 || gala.items.length === 0) {
        return { settlements: [], balances: {} };
    }

    const totalCost = gala.items.reduce((s, item) => s + item.amount, 0);
    const fairShare = totalCost / gala.memberIds.length;

    const paid: Record<string, number> = {};
    for (const item of gala.items) {
        paid[item.paidById] = (paid[item.paidById] ?? 0) + item.amount;
    }

    const balances: Record<string, number> = {};
    for (const memberId of gala.memberIds) {
        balances[memberId] = (paid[memberId] ?? 0) - fairShare;
    }

    const creditors: Array<{ id: string; amount: number }> = [];
    const debtors: Array<{ id: string; amount: number }> = [];

    for (const [id, balance] of Object.entries(balances)) {
        if (balance > 0.005) {
            creditors.push({ id, amount: balance });
        } else if (balance < -0.005) {
            debtors.push({ id, amount: -balance });
        }
    }

    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const settlements: Settlement[] = [];
    let ci = 0;
    let di = 0;

    while (ci < creditors.length && di < debtors.length) {
        const creditor = creditors[ci];
        const debtor = debtors[di];
        const amount = Math.min(creditor.amount, debtor.amount);
        settlements.push({ fromId: debtor.id, toId: creditor.id, amount });
        creditor.amount -= amount;
        debtor.amount -= amount;
        if (creditor.amount < 0.005) ci++;
        if (debtor.amount < 0.005) di++;
    }

    return { settlements, balances };
}

function GalaDialog({
    open,
    onOpenChange,
    members,
    initialName,
    initialMemberIds,
    title,
    description,
    onSave,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    members: Member[];
    initialName: string;
    initialMemberIds: string[];
    title: string;
    description: string;
    onSave: (name: string, memberIds: string[]) => void;
}) {
    const [name, setName] = useState(initialName);
    const [selectedIds, setSelectedIds] = useState<string[]>(initialMemberIds);

    useEffect(() => {
        if (open) {
            setName(initialName);
            setSelectedIds(initialMemberIds);
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggle = (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const submit = () => {
        if (name.trim() && selectedIds.length > 0) {
            onSave(name.trim(), selectedIds);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-1.5">
                    <Label htmlFor="gala-name">Gala Name</Label>
                    <Input
                        id="gala-name"
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                        placeholder="e.g. Jollibee run, Night-out sa Tondo"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Who was there?</Label>
                        <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
                    </div>
                    {members.length === 0 ? (
                        <p className="rounded-md border p-3 text-sm text-muted-foreground">No members added yet.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {members.map((m) => {
                                const selected = selectedIds.includes(m.id);
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => toggle(m.id)}
                                        className={cn(
                                            'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                                            selected
                                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                                : 'border-border bg-background hover:bg-muted',
                                        )}
                                    >
                                        {m.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={!name.trim() || selectedIds.length === 0} className="bg-indigo-600 hover:bg-indigo-700">
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AddItemDialog({
    open,
    onOpenChange,
    galaMembers,
    onSave,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    galaMembers: Member[];
    onSave: (item: Omit<GalaItem, 'id'>) => void;
}) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [paidById, setPaidById] = useState('');

    useEffect(() => {
        if (open) {
            setDescription('');
            setAmount('');
            setPaidById(galaMembers[0]?.id ?? '');
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const submit = () => {
        const parsedAmount = parseFloat(amount);
        if (description.trim() && parsedAmount > 0 && paidById) {
            onSave({ description: description.trim(), amount: parsedAmount, paidById });
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Item</DialogTitle>
                    <DialogDescription>Log a purchase made during this gala.</DialogDescription>
                </DialogHeader>

                <div className="space-y-1.5">
                    <Label htmlFor="item-description">Description</Label>
                    <Input
                        id="item-description"
                        autoFocus
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Chickenjoy, Softdrinks"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="item-amount">Amount</Label>
                    <Input
                        id="item-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                        placeholder="0.00"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label>Paid by</Label>
                    <Select value={paidById} onValueChange={setPaidById}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select who paid" />
                        </SelectTrigger>
                        <SelectContent>
                            {galaMembers.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                    {m.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={submit}
                        disabled={!description.trim() || !amount || parseFloat(amount) <= 0 || !paidById}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        Add Item
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeleteDialog({
    open,
    onOpenChange,
    label,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    label: string;
    onConfirm: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <strong>{label}</strong>? This cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => {
                            onConfirm();
                            onOpenChange(false);
                        }}
                    >
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function GalaDetailView({
    gala,
    members,
    onBack,
    onEditGala,
    onDeleteGala,
    onAddItem,
    onRemoveItem,
}: {
    gala: AbruptGala;
    members: Member[];
    onBack: () => void;
    onEditGala: () => void;
    onDeleteGala: () => void;
    onAddItem: (item: Omit<GalaItem, 'id'>) => void;
    onRemoveItem: (itemId: string) => void;
}) {
    const [addItemOpen, setAddItemOpen] = useState(false);
    const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
    const [deleteGalaOpen, setDeleteGalaOpen] = useState(false);

    const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
    const galaMembers = gala.memberIds.map((id) => memberById[id]).filter(Boolean) as Member[];

    const totalCost = gala.items.reduce((s, item) => s + item.amount, 0);
    const fairShare = gala.memberIds.length > 0 ? totalCost / gala.memberIds.length : 0;

    const { settlements, balances } = calculateGalaSettlements(members, gala);

    return (
        <div className="space-y-4 p-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={onBack} className="size-8 shrink-0">
                    <ArrowLeft className="size-4" />
                </Button>
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold">{gala.name}</h2>
                    <p className="text-xs text-muted-foreground">{formatDate(gala.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-8" onClick={onEditGala}>
                        <Pencil className="size-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteGalaOpen(true)}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </div>

            {/* Members */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Attendees</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                        {galaMembers.map((m) => (
                            <div key={m.id} className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
                                <Avatar className="size-5">
                                    <AvatarFallback className={cn('text-[9px] font-bold text-white', avatarColor(members, m.id))}>
                                        {getInitials(m.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium">{m.name}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Items */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                        <CardTitle>Items</CardTitle>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {gala.items.length === 0 ? 'No items yet' : `${gala.items.length} item${gala.items.length > 1 ? 's' : ''} · ${formatPeso(totalCost)} total`}
                        </p>
                    </div>
                    <Button onClick={() => setAddItemOpen(true)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="size-4" />
                        Add Item
                    </Button>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                    {gala.items.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-3xl">🛒</p>
                            <p className="mt-2 text-sm font-medium">No items yet</p>
                            <p className="text-xs text-muted-foreground">Add the things you bought or paid for</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">Item</TableHead>
                                    <TableHead>Paid by</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="pr-6 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {gala.items.map((item) => {
                                    const payer = memberById[item.paidById];
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="pl-6 font-medium">{item.description}</TableCell>
                                            <TableCell>
                                                {payer ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Avatar className="size-5">
                                                            <AvatarFallback className={cn('text-[9px] font-bold text-white', avatarColor(members, payer.id))}>
                                                                {getInitials(payer.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm">{payer.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">Unknown</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{formatPeso(item.amount)}</TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="size-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setDeleteItemId(item.id)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Settlement */}
            {gala.items.length > 0 && gala.memberIds.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle>Settlement</CardTitle>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Equal split — {formatPeso(fairShare)} per person
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Per-member breakdown */}
                        <div className="space-y-2">
                            {galaMembers.map((m) => {
                                const paid = gala.items.filter((i) => i.paidById === m.id).reduce((s, i) => s + i.amount, 0);
                                const balance = balances[m.id] ?? 0;
                                return (
                                    <div key={m.id} className="flex items-center gap-3">
                                        <Avatar className="size-7 shrink-0">
                                            <AvatarFallback className={cn('text-[10px] font-bold text-white', avatarColor(members, m.id))}>
                                                {getInitials(m.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">{m.name}</p>
                                            <p className="text-xs text-muted-foreground">Paid {formatPeso(paid)} · Share {formatPeso(fairShare)}</p>
                                        </div>
                                        <span
                                            className={cn(
                                                'text-sm font-semibold',
                                                balance > 0.005
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : balance < -0.005
                                                      ? 'text-red-600 dark:text-red-400'
                                                      : 'text-muted-foreground',
                                            )}
                                        >
                                            {balance > 0.005 ? '+' : ''}{formatPeso(balance)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {settlements.length > 0 && (
                            <>
                                <Separator />
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        {settlements.length} payment{settlements.length > 1 ? 's' : ''} needed
                                    </p>
                                    {settlements.map((s, i) => {
                                        const from = memberById[s.fromId];
                                        const to = memberById[s.toId];
                                        return (
                                            <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                                                <Avatar className="size-6">
                                                    <AvatarFallback className={cn('text-[9px] font-bold text-white', from ? avatarColor(members, from.id) : 'bg-gray-400')}>
                                                        {from ? getInitials(from.name) : '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-medium">{from?.name ?? 'Unknown'}</span>
                                                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                                                <Avatar className="size-6">
                                                    <AvatarFallback className={cn('text-[9px] font-bold text-white', to ? avatarColor(members, to.id) : 'bg-gray-400')}>
                                                        {to ? getInitials(to.name) : '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-medium">{to?.name ?? 'Unknown'}</span>
                                                <span className="ml-auto text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                                                    {formatPeso(s.amount)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {settlements.length === 0 && (
                            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                Everyone's settled up!
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <AddItemDialog
                open={addItemOpen}
                onOpenChange={setAddItemOpen}
                galaMembers={galaMembers}
                onSave={onAddItem}
            />

            <DeleteDialog
                open={!!deleteItemId}
                onOpenChange={(open) => !open && setDeleteItemId(null)}
                label={gala.items.find((i) => i.id === deleteItemId)?.description ?? 'this item'}
                onConfirm={() => {
                    if (deleteItemId) onRemoveItem(deleteItemId);
                    setDeleteItemId(null);
                }}
            />

            <DeleteDialog
                open={deleteGalaOpen}
                onOpenChange={setDeleteGalaOpen}
                label={gala.name}
                onConfirm={onDeleteGala}
            />
        </div>
    );
}

export function AbruptGalaView({ members, abruptGalas, onAddGala, onUpdateGala, onRemoveGala, onAddItem, onRemoveItem }: AbruptGalaViewProps) {
    const [selectedGalaId, setSelectedGalaId] = useState<string | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<AbruptGala | null>(null);

    const selectedGala = abruptGalas.find((g) => g.id === selectedGalaId) ?? null;
    const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

    if (selectedGala) {
        return (
            <GalaDetailView
                gala={selectedGala}
                members={members}
                onBack={() => setSelectedGalaId(null)}
                onEditGala={() => setEditTarget(selectedGala)}
                onDeleteGala={() => {
                    onRemoveGala(selectedGala.id);
                    setSelectedGalaId(null);
                }}
                onAddItem={(item) => onAddItem(selectedGala.id, item)}
                onRemoveItem={(itemId) => onRemoveItem(selectedGala.id, itemId)}
            />
        );
    }

    return (
        <div className="p-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Spontaneous</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {abruptGalas.length === 0
                                ? 'No galas yet'
                                : `${abruptGalas.length} gala${abruptGalas.length > 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <Button onClick={() => setAddOpen(true)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700" disabled={members.length === 0}>
                        <Plus className="size-4" />
                        New Gala
                    </Button>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                    {members.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-4xl">⚡</p>
                            <p className="mt-2 text-sm font-medium">No members yet</p>
                            <p className="text-xs text-muted-foreground">Add members first before creating a gala</p>
                        </div>
                    ) : abruptGalas.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-4xl">⚡</p>
                            <p className="mt-2 text-sm font-medium">No galas yet</p>
                            <p className="text-xs text-muted-foreground">Track impromptu outings and split the cost equally</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">Gala</TableHead>
                                    <TableHead>Attendees</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="pr-6 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {abruptGalas.map((gala) => {
                                    const total = gala.items.reduce((s, i) => s + i.amount, 0);
                                    const galaMembers = gala.memberIds.map((id) => memberById[id]).filter(Boolean) as Member[];
                                    return (
                                        <TableRow key={gala.id} className="cursor-pointer" onClick={() => setSelectedGalaId(gala.id)}>
                                            <TableCell className="pl-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                                                        <Zap className="size-4 text-indigo-600 dark:text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{gala.name}</p>
                                                        <p className="text-xs text-muted-foreground">{formatDate(gala.createdAt)}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="flex -space-x-2">
                                                        {galaMembers.slice(0, 5).map((m) => (
                                                            <Avatar key={m.id} className="size-6 ring-2 ring-background">
                                                                <AvatarFallback className={cn('text-[9px] font-bold text-white', avatarColor(members, m.id))}>
                                                                    {getInitials(m.name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        ))}
                                                    </div>
                                                    {galaMembers.length > 5 && (
                                                        <span className="text-xs text-muted-foreground">+{galaMembers.length - 5}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div>
                                                    <p className="font-medium">{formatPeso(total)}</p>
                                                    <p className="text-xs text-muted-foreground">{gala.items.length} item{gala.items.length !== 1 ? 's' : ''}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="size-8"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditTarget(gala);
                                                        }}
                                                    >
                                                        <Pencil className="size-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="size-8"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedGalaId(gala.id);
                                                        }}
                                                    >
                                                        <ChevronRight className="size-4" />
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
            </Card>

            <GalaDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                members={members}
                initialName=""
                initialMemberIds={[]}
                title="New Gala"
                description="Name this gala and select who was there."
                onSave={(name, memberIds) => onAddGala(name, memberIds)}
            />

            <GalaDialog
                open={!!editTarget}
                onOpenChange={(open) => !open && setEditTarget(null)}
                members={members}
                initialName={editTarget?.name ?? ''}
                initialMemberIds={editTarget?.memberIds ?? []}
                title="Edit Gala"
                description="Update the gala name or attendees."
                onSave={(name, memberIds) => {
                    if (editTarget) onUpdateGala(editTarget.id, { name, memberIds });
                    setEditTarget(null);
                }}
            />
        </div>
    );
}
