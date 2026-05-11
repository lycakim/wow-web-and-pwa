import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { GroceryItem, Member } from '@/types/barkada';
import { Check, ShoppingCart, Trash2, UserRound, X } from 'lucide-react';
import { useState } from 'react';

interface GroceryViewProps {
    items: GroceryItem[];
    members: Member[];
    currentUserName?: string;
    onAdd: (name: string, addedByName?: string) => void;
    onToggle: (id: string, checkedByName?: string) => void;
    onAssign: (id: string, assignedToName: string | undefined) => void;
    onRemove: (id: string) => void;
    onClearChecked: () => void;
}

export function GroceryView({ items, members, currentUserName, onAdd, onToggle, onAssign, onRemove, onClearChecked }: GroceryViewProps) {
    const [input, setInput] = useState('');

    const submit = () => {
        if (!input.trim()) return;
        onAdd(input.trim(), currentUserName);
        setInput('');
    };

    const unchecked = items.filter((i) => !i.checked);
    const checked = items.filter((i) => i.checked);

    return (
        <div className="space-y-4 p-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                        <CardTitle>Grocery List</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {unchecked.length} remaining · {checked.length} done
                        </p>
                    </div>
                    {checked.length > 0 && (
                        <Button size="sm" variant="outline" onClick={onClearChecked} className="shrink-0 text-xs text-muted-foreground">
                            Clear done
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add item input */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Add an item..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && submit()}
                            className="flex-1"
                        />
                        <Button onClick={submit} disabled={!input.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                            Add
                        </Button>
                    </div>

                    {items.length === 0 ? (
                        <div className="py-10 text-center">
                            <ShoppingCart className="mx-auto size-10 text-muted-foreground/40" />
                            <p className="mt-2 text-sm font-medium">List is empty</p>
                            <p className="text-xs text-muted-foreground">Add items above to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {/* Unchecked items */}
                            {unchecked.map((item) => (
                                <GroceryRow
                                    key={item.id}
                                    item={item}
                                    members={members}
                                    currentUserName={currentUserName}
                                    onToggle={onToggle}
                                    onAssign={onAssign}
                                    onRemove={onRemove}
                                />
                            ))}

                            {/* Divider if both lists have items */}
                            {unchecked.length > 0 && checked.length > 0 && (
                                <div className="flex items-center gap-2 py-1">
                                    <div className="h-px flex-1 bg-border" />
                                    <span className="text-xs text-muted-foreground">{checked.length} done</span>
                                    <div className="h-px flex-1 bg-border" />
                                </div>
                            )}

                            {/* Checked items */}
                            {checked.map((item) => (
                                <GroceryRow
                                    key={item.id}
                                    item={item}
                                    members={members}
                                    currentUserName={currentUserName}
                                    onToggle={onToggle}
                                    onAssign={onAssign}
                                    onRemove={onRemove}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

interface GroceryRowProps {
    item: GroceryItem;
    members: Member[];
    currentUserName?: string;
    onToggle: (id: string, checkedByName?: string) => void;
    onAssign: (id: string, assignedToName: string | undefined) => void;
    onRemove: (id: string) => void;
}

function GroceryRow({ item, members, currentUserName, onToggle, onAssign, onRemove }: GroceryRowProps) {
    const [showAssign, setShowAssign] = useState(false);

    return (
        <div className={cn('rounded-lg px-3 py-2 transition-colors', item.checked ? 'opacity-50' : 'hover:bg-muted/50')}>
            <div className="flex items-center gap-3">
                {/* Checkbox */}
                <button
                    type="button"
                    onClick={() => onToggle(item.id, currentUserName)}
                    className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        item.checked
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-muted-foreground/40 hover:border-indigo-600',
                    )}
                >
                    {item.checked && <Check className="size-3 stroke-[3]" />}
                </button>

                {/* Name */}
                <span className={cn('flex-1 text-sm', item.checked && 'line-through text-muted-foreground')}>
                    {item.name}
                </span>

                {/* Assign button (only on unchecked items) */}
                {!item.checked && members.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowAssign((v) => !v)}
                        className={cn(
                            'shrink-0 transition-colors',
                            item.assignedToName
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-muted-foreground/40 hover:text-indigo-600',
                        )}
                        title="Assign to member"
                    >
                        <UserRound className="size-4" />
                    </button>
                )}

                {/* Added by / assigned to badge */}
                {item.assignedToName && !item.checked && (
                    <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        → {item.assignedToName}
                    </span>
                )}

                {/* Added by badge (when not assigned) */}
                {item.addedByName && !item.assignedToName && !item.checked && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {item.addedByName}
                    </span>
                )}

                {/* Delete */}
                <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors"
                >
                    <Trash2 className="size-4" />
                </button>
            </div>

            {/* Checked-by attribution */}
            {item.checked && item.checkedByName && (
                <p className="mt-0.5 pl-8 text-[10px] text-muted-foreground">
                    Checked by {item.checkedByName}
                </p>
            )}

            {/* Assign picker */}
            {showAssign && !item.checked && (
                <div className="mt-2 flex flex-wrap gap-1 pl-8">
                    {item.assignedToName && (
                        <button
                            type="button"
                            onClick={() => { onAssign(item.id, undefined); setShowAssign(false); }}
                            className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                            <X className="size-3" /> Unassign
                        </button>
                    )}
                    {members.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => { onAssign(item.id, m.name); setShowAssign(false); }}
                            className={cn(
                                'rounded-full px-2 py-0.5 text-[11px] transition-colors',
                                item.assignedToName === m.name
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-muted text-muted-foreground hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-300',
                            )}
                        >
                            {m.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
