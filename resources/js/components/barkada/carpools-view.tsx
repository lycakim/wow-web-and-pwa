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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Carpool, Member } from '@/types/barkada';
import { Car, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CarpoolsViewProps {
    members: Member[];
    carpools: Carpool[];
    onAdd: (name: string, memberIds: string[]) => void;
    onUpdate: (id: string, name: string, memberIds: string[]) => void;
    onRemove: (id: string) => void;
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

function CarpoolDialog({
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
        if (name.trim()) {
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
                    <Label htmlFor="carpool-name">Car Name</Label>
                    <Input
                        id="carpool-name"
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                        placeholder="e.g. Car 1, Clyde's Van"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Passengers</Label>
                        <span className="text-xs text-muted-foreground">
                            {selectedIds.length} selected
                        </span>
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
                    <Button onClick={submit} disabled={!name.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeleteDialog({
    open,
    onOpenChange,
    carpool,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    carpool: Carpool | null;
    onConfirm: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Remove Car</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to remove <strong>{carpool?.name}</strong>? Existing expenses split by this car won't be affected.
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
                        Remove
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function CarpoolsView({ members, carpools, onAdd, onUpdate, onRemove }: CarpoolsViewProps) {
    const [addOpen, setAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Carpool | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Carpool | null>(null);

    const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

    return (
        <div className="p-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Carpools</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {carpools.length === 0 ? 'No cars yet' : `${carpools.length} car${carpools.length > 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <Button onClick={() => setAddOpen(true)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="size-4" />
                        Add Car
                    </Button>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                    {carpools.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-4xl">🚗</p>
                            <p className="mt-2 text-sm font-medium">No cars yet</p>
                            <p className="text-xs text-muted-foreground">Add cars to split gas costs by passengers</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">Car</TableHead>
                                    <TableHead>Passengers</TableHead>
                                    <TableHead className="pr-6 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {carpools.map((carpool) => (
                                    <TableRow key={carpool.id}>
                                        <TableCell className="pl-6">
                                            <div className="flex items-center gap-2">
                                                <div className="flex size-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                                                    <Car className="size-4 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <span className="font-medium">{carpool.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {carpool.memberIds.length === 0 ? (
                                                <span className="text-sm text-muted-foreground">No passengers</span>
                                            ) : (
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <div className="flex -space-x-2">
                                                        {carpool.memberIds.slice(0, 5).map((mid) => {
                                                            const m = memberById[mid];
                                                            if (!m) return null;
                                                            return (
                                                                <Avatar key={mid} className="size-6 ring-2 ring-background">
                                                                    <AvatarFallback className={cn('text-[9px] font-bold text-white', avatarColor(members, mid))}>
                                                                        {getInitials(m.name)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                            );
                                                        })}
                                                    </div>
                                                    <span className="text-sm text-muted-foreground">
                                                        {carpool.memberIds
                                                            .map((mid) => memberById[mid]?.name)
                                                            .filter(Boolean)
                                                            .join(', ')}
                                                    </span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="pr-6 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="size-8"
                                                    onClick={() => setEditTarget(carpool)}
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="size-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setDeleteTarget(carpool)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <CarpoolDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                members={members}
                initialName=""
                initialMemberIds={[]}
                title="Add Car"
                description="Name the car and select its passengers."
                onSave={(name, memberIds) => onAdd(name, memberIds)}
            />

            <CarpoolDialog
                open={!!editTarget}
                onOpenChange={(open) => !open && setEditTarget(null)}
                members={members}
                initialName={editTarget?.name ?? ''}
                initialMemberIds={editTarget?.memberIds ?? []}
                title="Edit Car"
                description="Update the car name or passengers."
                onSave={(name, memberIds) => {
                    if (editTarget) onUpdate(editTarget.id, name, memberIds);
                    setEditTarget(null);
                }}
            />

            <DeleteDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                carpool={deleteTarget}
                onConfirm={() => {
                    if (deleteTarget) onRemove(deleteTarget.id);
                    setDeleteTarget(null);
                }}
            />
        </div>
    );
}
