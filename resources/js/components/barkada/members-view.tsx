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
import type { Member } from '@/types/barkada';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MembersViewProps {
    members: Member[];
    myMemberId?: string;
    onAdd: (name: string) => void;
    onUpdate: (id: string, name: string) => void;
    onRemove: (id: string) => void;
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');
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

function avatarColor(index: number): string {
    return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function MemberDialog({
    open,
    onOpenChange,
    initialName,
    title,
    description,
    onSave,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialName: string;
    title: string;
    description: string;
    onSave: (name: string) => void;
}) {
    const [name, setName] = useState(initialName);

    useEffect(() => {
        if (open) setName(initialName);
    }, [open, initialName]);

    const handleOpenChange = (value: boolean) => {
        onOpenChange(value);
    };

    const submit = () => {
        if (name.trim()) {
            onSave(name.trim());
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5">
                    <Label htmlFor="member-name">Name</Label>
                    <Input
                        id="member-name"
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                        placeholder="e.g. Juan dela Cruz"
                    />
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
    member,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    member: Member | null;
    onConfirm: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Remove Member</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to remove <strong>{member?.name}</strong> from the barkada? This won't delete their
                        existing expenses.
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

export function MembersView({ members, myMemberId, onAdd, onUpdate, onRemove }: MembersViewProps) {
    const [addOpen, setAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Member | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

    return (
        <div className="p-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Members</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">{members.length} in the barkada</p>
                    </div>
                    <Button onClick={() => setAddOpen(true)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="size-4" />
                        Add Member
                    </Button>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                    {members.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-4xl">👥</p>
                            <p className="mt-2 text-sm font-medium">No members yet</p>
                            <p className="text-xs text-muted-foreground">Add your barkada members to get started</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">#</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="pr-6 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map((member, i) => (
                                    <TableRow key={member.id}>
                                        <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="size-8">
                                                    <AvatarFallback className={cn('text-xs font-bold text-white', avatarColor(i))}>
                                                        {getInitials(member.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{member.name}</span>
                                                {member.id === myMemberId && (
                                                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">You</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="pr-6 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="size-8"
                                                    onClick={() => setEditTarget(member)}
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="size-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setDeleteTarget(member)}
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

            {/* Add dialog */}
            <MemberDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                initialName=""
                title="Add Member"
                description="Enter the name of the barkada member to add to the trip."
                onSave={(name) => onAdd(name)}
            />

            {/* Edit dialog */}
            <MemberDialog
                open={!!editTarget}
                onOpenChange={(open) => !open && setEditTarget(null)}
                initialName={editTarget?.name ?? ''}
                title="Edit Member"
                description="Update the member's name."
                onSave={(name) => {
                    if (editTarget) onUpdate(editTarget.id, name);
                    setEditTarget(null);
                }}
            />

            {/* Delete dialog */}
            <DeleteDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                member={deleteTarget}
                onConfirm={() => {
                    if (deleteTarget) onRemove(deleteTarget.id);
                    setDeleteTarget(null);
                }}
            />
        </div>
    );
}
