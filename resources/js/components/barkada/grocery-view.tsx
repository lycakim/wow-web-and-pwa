import { ConfirmDeleteDialog } from '@/components/barkada/confirm-delete-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { GroceryItem, GrocerySection, Member } from '@/types/barkada';
import { GROCERY_SECTIONS } from '@/types/barkada';
import { Check, Trash2, UserRound, X } from 'lucide-react';
import { useState } from 'react';

interface GroceryViewProps {
    items: GroceryItem[];
    members: Member[];
    currentUserName?: string;
    onAdd: (name: string, section: GrocerySection, addedByName?: string) => void;
    onToggle: (id: string, checkedByName?: string) => void;
    onAssign: (id: string, memberName: string) => void;
    onRemove: (id: string) => void;
    onClearChecked: (section: GrocerySection) => void;
}

export function GroceryView({ items, members, currentUserName, onAdd, onToggle, onAssign, onRemove, onClearChecked }: GroceryViewProps) {
    const [activeSection, setActiveSection] = useState<GrocerySection>('buy');
    const [input, setInput] = useState('');

    const sectionItems = items.filter((i) => (i.section ?? 'buy') === activeSection);
    const unchecked = sectionItems.filter((i) => !i.checked);
    const checked = sectionItems.filter((i) => i.checked);
    const sectionMeta = GROCERY_SECTIONS.find((s) => s.key === activeSection)!;

    // Badge counts per tab
    const countBySection = Object.fromEntries(
        GROCERY_SECTIONS.map((s) => [s.key, items.filter((i) => (i.section ?? 'buy') === s.key && !i.checked).length]),
    );

    const submit = () => {
        if (!input.trim()) return;
        onAdd(input.trim(), activeSection, currentUserName);
        setInput('');
    };

    const hasCheckedInSection = checked.length > 0;

    return (
        <div className="space-y-4 p-4">
            {/* Section tabs */}
            <div className="flex gap-2">
                {GROCERY_SECTIONS.map((s) => {
                    const isActive = activeSection === s.key;
                    const count = countBySection[s.key];
                    return (
                        <button
                            key={s.key}
                            type="button"
                            onClick={() => setActiveSection(s.key)}
                            className={cn(
                                'relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl border py-3 px-2 transition-all',
                                isActive
                                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                                    : 'border-border bg-card text-muted-foreground hover:border-indigo-300 hover:text-foreground',
                            )}
                        >
                            <span className="text-2xl leading-none">{s.icon}</span>
                            <span className="text-xs font-semibold">{s.label}</span>
                            {count > 0 && (
                                <span className={cn(
                                    'absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums',
                                    isActive
                                        ? 'bg-white text-indigo-600'
                                        : 'bg-indigo-600 text-white',
                                )}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <span>{sectionMeta.icon}</span>
                            <span>{sectionMeta.label}</span>
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {unchecked.length} remaining · {checked.length} done
                        </p>
                    </div>
                    {hasCheckedInSection && (
                        <Button size="sm" variant="outline" onClick={() => onClearChecked(activeSection)} className="shrink-0 text-xs text-muted-foreground">
                            Clear done
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add item input */}
                    <div className="flex gap-2">
                        <Input
                            placeholder={
                                activeSection === 'buy' ? 'e.g. 5KL Rice, Softdrinks...' :
                                activeSection === 'bring' ? 'e.g. Frying pan, Cooler...' :
                                'e.g. Adobo - Chicken, Breakfast included...'
                            }
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && submit()}
                            className="flex-1"
                        />
                        <Button onClick={submit} disabled={!input.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                            Add
                        </Button>
                    </div>

                    {sectionItems.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-4xl">{sectionMeta.icon}</p>
                            <p className="mt-2 text-sm font-medium">{sectionMeta.emptyText}</p>
                            <p className="text-xs text-muted-foreground">Add items above to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
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

                            {unchecked.length > 0 && checked.length > 0 && (
                                <div className="flex items-center gap-2 py-1">
                                    <div className="h-px flex-1 bg-border" />
                                    <span className="text-xs text-muted-foreground">{checked.length} done</span>
                                    <div className="h-px flex-1 bg-border" />
                                </div>
                            )}

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
    onAssign: (id: string, memberName: string) => void;
    onRemove: (id: string) => void;
}

function GroceryRow({ item, members, currentUserName, onToggle, onAssign, onRemove }: GroceryRowProps) {
    const [showAssign, setShowAssign] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const assigned = item.assignedToNames ?? [];
    const hasAssigned = assigned.length > 0;

    return (
        <div className={cn('rounded-lg px-3 py-2 transition-colors', item.checked ? 'opacity-60' : 'hover:bg-muted/50')}>
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

                {/* Assign toggle (unchecked only, when members exist) */}
                {!item.checked && members.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowAssign((v) => !v)}
                        className={cn(
                            'shrink-0 transition-colors',
                            hasAssigned ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground/40 hover:text-indigo-600',
                        )}
                        title="Assign to members"
                    >
                        <UserRound className="size-4" />
                    </button>
                )}

                {/* Delete */}
                <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors"
                >
                    <Trash2 className="size-4" />
                </button>
            </div>

            {/* Meta: added by · assigned to · checked by */}
            {(item.addedByName || hasAssigned || item.checkedByName) && (
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-8">
                    {item.addedByName && (
                        <span className="text-[10px] text-muted-foreground">
                            Added by <span className="font-medium">{item.addedByName}</span>
                        </span>
                    )}
                    {item.addedByName && (hasAssigned || item.checkedByName) && (
                        <span className="text-[10px] text-muted-foreground">·</span>
                    )}
                    {hasAssigned && (
                        <span className="text-[10px] text-muted-foreground">
                            For{' '}
                            {assigned.map((name, i) => (
                                <span key={name}>
                                    <span className="font-medium text-indigo-600 dark:text-indigo-400">{name}</span>
                                    {i < assigned.length - 1 && ', '}
                                </span>
                            ))}
                        </span>
                    )}
                    {hasAssigned && item.checkedByName && (
                        <span className="text-[10px] text-muted-foreground">·</span>
                    )}
                    {item.checkedByName && (
                        <span className="text-[10px] text-muted-foreground">
                            Checked by <span className="font-medium">{item.checkedByName}</span>
                        </span>
                    )}
                </div>
            )}

            {/* Assign picker */}
            {showAssign && !item.checked && (
                <div className="mt-2 flex flex-wrap gap-1 pl-8">
                    {hasAssigned && assigned.map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => onAssign(item.id, n)}
                            className="flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] text-white hover:bg-indigo-700 transition-colors"
                        >
                            <X className="size-3" /> {n}
                        </button>
                    ))}
                    {members.map((m) => {
                        const isSelected = assigned.includes(m.name);
                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => onAssign(item.id, m.name)}
                                className={cn(
                                    'rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                                    isSelected
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-muted text-muted-foreground hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-300',
                                )}
                            >
                                {isSelected ? `✓ ${m.name}` : m.name}
                            </button>
                        );
                    })}
                </div>
            )}
            <ConfirmDeleteDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title="Delete Item"
                description={`Delete "${item.name}"? This cannot be undone.`}
                onConfirm={() => onRemove(item.id)}
            />
        </div>
    );
}
