import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { GroceryItem } from '@/types/barkada';
import { Check, ShoppingCart, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface GroceryViewProps {
    items: GroceryItem[];
    currentUserName?: string;
    onAdd: (name: string, addedByName?: string) => void;
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
    onClearChecked: () => void;
}

export function GroceryView({ items, currentUserName, onAdd, onToggle, onRemove, onClearChecked }: GroceryViewProps) {
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
                                <GroceryRow key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} />
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
                                <GroceryRow key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function GroceryRow({ item, onToggle, onRemove }: { item: GroceryItem; onToggle: (id: string) => void; onRemove: (id: string) => void }) {
    return (
        <div className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors', item.checked ? 'opacity-50' : 'hover:bg-muted/50')}>
            {/* Checkbox */}
            <button
                type="button"
                onClick={() => onToggle(item.id)}
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

            {/* Added by badge */}
            {item.addedByName && (
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
    );
}
