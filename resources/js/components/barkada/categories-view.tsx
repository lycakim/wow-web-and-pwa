import { Badge } from '@/components/ui/badge';
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
import type { BarkadaStore } from '@/types/barkada';
import { CATEGORIES, CATEGORY_KEYS, getAllCategoryKeys } from '@/types/barkada';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface CategoriesViewProps {
    store: BarkadaStore;
    onAdd: (name: string, icon: string) => void;
    onUpdate: (key: string, name: string, icon: string) => void;
    onToggleActive: (key: string) => void;
    onRemove: (key: string) => void;
}

const EMOJI_GROUPS = [
    { label: 'Transport', emojis: ['✈️', '🚌', '🚗', '🚕', '🛵', '🚲', '🚢', '🚂', '🛺', '🚐', '⛵', '🚁', '🛞', '🚤'] },
    { label: 'Accommodation', emojis: ['🏨', '🏕️', '🛏️', '🏠', '🏡', '⛺', '🏖️', '🪵', '🏔️', '🌴'] },
    { label: 'Food & Drinks', emojis: ['🍜', '🍕', '🍔', '🍣', '🥗', '🍱', '🥘', '🍻', '☕', '🧋', '🥤', '🍰', '🌮', '🥩', '🍗', '🥐', '🍷'] },
    { label: 'Activities', emojis: ['🎭', '🏄', '🤿', '🎯', '🎪', '🎢', '🎡', '🏊', '🧗', '🎮', '🎆', '🌅', '🤸', '🏋️', '⛷️', '🎣', '🏸', '⛳'] },
    { label: 'Shopping', emojis: ['🛍️', '👗', '👟', '💄', '🧴', '🎁', '💍', '👒', '🧢', '🕶️', '👜', '🧸'] },
    { label: 'Other', emojis: ['📌', '⭐', '🔑', '🎒', '🧳', '🗺️', '📍', '❤️', '🌟', '✨', '💰', '💳', '🧾', '🩺', '💊', '📸', '🎵', '🎬', '🎉', '🎤', '🌺', '🐚'] },
];

function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex size-10 items-center justify-center rounded-md border bg-background text-xl hover:bg-muted"
                title="Pick an emoji"
            >
                {value || '📌'}
            </button>
            {open && (
                <div className="absolute top-12 left-0 z-50 w-64 rounded-lg border bg-popover p-2 shadow-lg">
                    <div className="max-h-56 overflow-y-auto space-y-2">
                        {EMOJI_GROUPS.map((group) => (
                            <div key={group.label}>
                                <p className="mb-1 px-1 text-xs font-semibold text-muted-foreground">{group.label}</p>
                                <div className="flex flex-wrap gap-0.5">
                                    {group.emojis.map((emoji) => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => {
                                                onChange(emoji);
                                                setOpen(false);
                                            }}
                                            className={cn(
                                                'flex size-8 items-center justify-center rounded text-lg hover:bg-muted',
                                                value === emoji && 'bg-indigo-100 dark:bg-indigo-900/30',
                                            )}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function AddCategoryDialog({
    open,
    onOpenChange,
    onSave,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (name: string, icon: string) => void;
}) {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('');
    const [error, setError] = useState('');

    const handleOpenChange = (value: boolean) => {
        if (!value) {
            setName('');
            setIcon('');
            setError('');
        }
        onOpenChange(value);
    };

    const submit = () => {
        if (!name.trim()) {
            setError('Name is required');
            return;
        }
        onSave(name.trim(), icon.trim());
        handleOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Category</DialogTitle>
                    <DialogDescription>Create a custom expense category for your trip.</DialogDescription>
                </DialogHeader>
                <div className="flex items-start gap-3">
                    <div className="space-y-1.5">
                        <Label>Icon</Label>
                        <EmojiPicker value={icon} onChange={setIcon} />
                    </div>
                    <div className="flex-1 space-y-1.5">
                        <Label htmlFor="cat-name">Name</Label>
                        <Input
                            id="cat-name"
                            autoFocus
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setError('');
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && submit()}
                            placeholder="e.g. Miscellaneous"
                            aria-invalid={!!error}
                        />
                        {error && <p className="text-xs text-destructive">{error}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={!name.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                        Add Category
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EditCategoryDialog({
    open,
    onOpenChange,
    initial,
    onSave,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initial: { name: string; icon: string } | null;
    onSave: (name: string, icon: string) => void;
}) {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (open && initial) {
            setName(initial.name);
            setIcon(initial.icon);
            setError('');
        }
    }, [open, initial]);

    const submit = () => {
        if (!name.trim()) {
            setError('Name is required');
            return;
        }
        onSave(name.trim(), icon.trim());
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Category</DialogTitle>
                    <DialogDescription>Update the name or icon for this category.</DialogDescription>
                </DialogHeader>
                <div className="flex items-start gap-3">
                    <div className="space-y-1.5">
                        <Label>Icon</Label>
                        <EmojiPicker value={icon} onChange={setIcon} />
                    </div>
                    <div className="flex-1 space-y-1.5">
                        <Label htmlFor="edit-cat-name">Name</Label>
                        <Input
                            id="edit-cat-name"
                            autoFocus
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setError('');
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && submit()}
                            placeholder="e.g. Miscellaneous"
                            aria-invalid={!!error}
                        />
                        {error && <p className="text-xs text-destructive">{error}</p>}
                    </div>
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
    categoryName,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categoryName: string;
    onConfirm: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Remove Category</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to remove <strong>{categoryName}</strong>? This cannot be undone.
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

export function CategoriesView({ store, onAdd, onUpdate, onToggleActive, onRemove }: CategoriesViewProps) {
    const [addOpen, setAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<{ key: string; name: string; icon: string } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ key: string; name: string } | null>(null);

    const allCategoryKeys = getAllCategoryKeys(store);
    const hidden = store.hiddenBuiltInCategories ?? [];
    const inactive = store.inactiveCategories ?? [];

    const expenseCountByCategory: Record<string, number> = {};
    for (const expense of store.expenses) {
        expenseCountByCategory[expense.category] = (expenseCountByCategory[expense.category] ?? 0) + 1;
    }

    const builtInRows = CATEGORY_KEYS.map((key) => ({ key, meta: CATEGORIES[key], isCustom: false, isHidden: hidden.includes(key) }));
    const customRows = Object.entries(store.customCategories).map(([key, meta]) => ({ key, meta, isCustom: true, isHidden: false }));
    const rows = [...builtInRows, ...customRows];

    return (
        <div className="p-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Categories</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {allCategoryKeys.length} active · {inactive.length > 0 ? `${inactive.length} inactive · ` : ''}{Object.keys(store.customCategories).length} custom
                        </p>
                    </div>
                    <Button onClick={() => setAddOpen(true)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="size-4" />
                        Add Category
                    </Button>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Icon</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Expenses</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="pr-6 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map(({ key, meta, isCustom, isHidden }) => {
                                const expenseCount = expenseCountByCategory[key] ?? 0;
                                const isInactive = inactive.includes(key);
                                const canDelete = expenseCount === 0 && !isHidden;

                                return (
                                    <TableRow key={key} className={cn((isHidden || isInactive) && 'opacity-50')}>
                                        <TableCell className="pl-6 text-xl">{meta.icon}</TableCell>
                                        <TableCell>
                                            <span className="font-medium">{meta.label}</span>
                                            {isHidden && <span className="ml-2 text-xs text-muted-foreground">(hidden)</span>}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'border-0 text-xs',
                                                    isCustom ? `${meta.bgClass} ${meta.textClass}` : 'bg-muted text-muted-foreground',
                                                )}
                                            >
                                                {isCustom ? 'custom' : 'built-in'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-muted-foreground">
                                            {expenseCount > 0 ? expenseCount : '—'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <button
                                                type="button"
                                                onClick={() => onToggleActive(key)}
                                                className={cn(
                                                    'inline-flex h-6 w-11 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none',
                                                    isInactive ? 'bg-muted' : 'bg-indigo-600',
                                                )}
                                                title={isInactive ? 'Inactive — click to activate' : 'Active — click to deactivate'}
                                            >
                                                <span
                                                    className={cn(
                                                        'block size-4 rounded-full bg-white shadow-sm transition-transform',
                                                        isInactive ? 'translate-x-0.5' : 'translate-x-6',
                                                    )}
                                                />
                                            </button>
                                        </TableCell>
                                        <TableCell className="pr-6 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {isCustom && !isHidden && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="size-8"
                                                        title="Edit category"
                                                        onClick={() => setEditTarget({ key, name: meta.label, icon: meta.icon })}
                                                    >
                                                        <Pencil className="size-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="size-8 text-muted-foreground hover:text-destructive disabled:opacity-30"
                                                    disabled={!canDelete}
                                                    title={
                                                        isHidden
                                                            ? 'Already hidden'
                                                            : expenseCount > 0
                                                              ? `Remove ${expenseCount} expense${expenseCount > 1 ? 's' : ''} first`
                                                              : 'Remove category'
                                                    }
                                                    onClick={canDelete ? () => setDeleteTarget({ key, name: meta.label }) : undefined}
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
                </CardContent>
            </Card>

            <AddCategoryDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                onSave={(name, icon) => onAdd(name, icon)}
            />

            <EditCategoryDialog
                open={!!editTarget}
                onOpenChange={(open) => !open && setEditTarget(null)}
                initial={editTarget}
                onSave={(name, icon) => {
                    if (editTarget) onUpdate(editTarget.key, name, icon);
                    setEditTarget(null);
                }}
            />

            <DeleteDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                categoryName={deleteTarget?.name ?? ''}
                onConfirm={() => {
                    if (deleteTarget) onRemove(deleteTarget.key);
                    setDeleteTarget(null);
                }}
            />
        </div>
    );
}
