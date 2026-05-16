import { ConfirmDeleteDialog } from '@/components/barkada/confirm-delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { BarkadaStore } from '@/types/barkada';
import { CATEGORIES, CATEGORY_KEYS } from '@/types/barkada';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface CategoriesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    store: BarkadaStore;
    onAdd: (name: string, icon: string) => void;
    onRemove: (key: string) => void;
}

export function CategoriesDialog({ open, onOpenChange, store, onAdd, onRemove }: CategoriesDialogProps) {
    const [icon, setIcon] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<{ key: string; label: string } | null>(null);
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const expenseCountByCategory: Record<string, number> = {};
    for (const expense of store.expenses) {
        expenseCountByCategory[expense.category] = (expenseCountByCategory[expense.category] ?? 0) + 1;
    }

    const handleAdd = () => {
        if (!name.trim()) {
            setError('Name is required');
            return;
        }
        onAdd(name.trim(), icon.trim());
        setName('');
        setIcon('');
        setError('');
    };

    const handleOpenChange = (value: boolean) => {
        if (!value) {
            setName('');
            setIcon('');
            setError('');
        }
        onOpenChange(value);
    };

    const customKeys = Object.keys(store.customCategories);

    return (
        <>
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Manage Categories</DialogTitle>
                    <DialogDescription>Add custom expense categories. Built-in categories cannot be removed.</DialogDescription>
                </DialogHeader>

                {/* Built-in categories */}
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Built-in</p>
                    {CATEGORY_KEYS.map((key) => {
                        const meta = CATEGORIES[key];
                        return (
                            <div key={key} className="flex items-center gap-3 rounded-md px-1 py-1.5">
                                <span className="text-base">{meta.icon}</span>
                                <span className="flex-1 text-sm font-medium">{meta.label}</span>
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                    built-in
                                </Badge>
                            </div>
                        );
                    })}
                </div>

                {/* Custom categories */}
                {customKeys.length > 0 && (
                    <>
                        <Separator />
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Custom</p>
                            {customKeys.map((key) => {
                                const meta = store.customCategories[key];
                                const expenseCount = expenseCountByCategory[key] ?? 0;
                                const canDelete = expenseCount === 0;

                                return (
                                    <div key={key} className="flex items-center gap-3 rounded-md px-1 py-1.5">
                                        <span className="text-base">{meta.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm font-medium">{meta.label}</span>
                                            {!canDelete && (
                                                <p className="text-xs text-muted-foreground">
                                                    {expenseCount} expense{expenseCount > 1 ? 's' : ''} — remove expenses first
                                                </p>
                                            )}
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={cn('border-0 text-xs shrink-0', meta.bgClass, meta.textClass)}
                                        >
                                            custom
                                        </Badge>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                                            disabled={!canDelete}
                                            onClick={() => setDeleteTarget({ key, label: meta.label })}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                <Separator />

                {/* Add new */}
                <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add New Category</p>
                    <div className="flex gap-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="cat-icon" className="text-xs">
                                Icon
                            </Label>
                            <Input
                                id="cat-icon"
                                value={icon}
                                onChange={(e) => setIcon(e.target.value)}
                                placeholder="📌"
                                className="w-14 text-center text-lg"
                            />
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <Label htmlFor="cat-name" className="text-xs">
                                Name
                            </Label>
                            <Input
                                id="cat-name"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setError('');
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                placeholder="e.g. Miscellaneous"
                                aria-invalid={!!error}
                            />
                            {error && <p className="text-xs text-destructive">{error}</p>}
                        </div>
                    </div>
                    <Button
                        onClick={handleAdd}
                        disabled={!name.trim()}
                        className="w-full gap-1.5 bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Plus className="size-4" />
                        Add Category
                    </Button>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <ConfirmDeleteDialog
            open={!!deleteTarget}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
            title="Delete Category"
            description={`Delete "${deleteTarget?.label}"? This cannot be undone.`}
            onConfirm={() => { if (deleteTarget) onRemove(deleteTarget.key); }}
        />
        </>
    );
}
