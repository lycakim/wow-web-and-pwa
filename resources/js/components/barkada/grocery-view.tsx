import { ConfirmDeleteDialog } from '@/components/barkada/confirm-delete-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { GroceryItem, GrocerySection, Member } from '@/types/barkada';
import { GROCERY_SECTIONS } from '@/types/barkada';
import { MoreVertical, Trash2, UserRound, X } from 'lucide-react';
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
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [animating, setAnimating] = useState(false);
    const assigned = item.assignedToNames ?? [];
    const hasAssigned = assigned.length > 0;

    const handleToggle = () => {
        if (!item.checked) {
            setAnimating(true);
            setTimeout(() => setAnimating(false), 500);
        }
        onToggle(item.id, currentUserName);
    };

    return (
        <div className={cn(
            'rounded-lg px-3 py-2.5 transition-colors',
            item.checked ? 'opacity-60' : 'hover:bg-muted/50',
            animating && 'grocery-check-flash',
        )}>
            <div className="flex items-center gap-3">
                {/* Checkbox */}
                <button
                    type="button"
                    onClick={handleToggle}
                    className={cn(
                        'relative flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors active:scale-95',
                        item.checked
                            ? 'border-indigo-600 bg-indigo-600'
                            : 'border-muted-foreground/40 hover:border-indigo-400 active:border-indigo-600',
                        animating && 'grocery-check-bounce',
                    )}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    {item.checked && (
                        <svg
                            viewBox="0 0 12 10"
                            fill="none"
                            stroke="white"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="size-3.5"
                            style={animating ? {
                                strokeDasharray: 22,
                                strokeDashoffset: 0,
                                animation: 'check-draw 0.25s ease-out 0.05s both',
                            } : undefined}
                        >
                            <path d="M1 5l3.5 3.5L11 1" />
                        </svg>
                    )}
                </button>

                {/* Name */}
                <span className={cn(
                    'flex-1 text-sm font-medium transition-all duration-300',
                    item.checked && 'line-through text-muted-foreground font-normal',
                )}>
                    {item.name}
                </span>

                {/* Three-dot menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="shrink-0 flex size-7 items-center justify-center rounded-full text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <MoreVertical className="size-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        {members.length > 0 && !item.checked && (
                            <>
                                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal pb-1">
                                    Assign to
                                </DropdownMenuLabel>
                                {members.map((m) => {
                                    const isSelected = assigned.includes(m.name);
                                    return (
                                        <DropdownMenuItem
                                            key={m.id}
                                            onSelect={(e) => { e.preventDefault(); onAssign(item.id, m.name); }}
                                            className="flex items-center justify-between gap-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span className={cn(
                                                    'flex size-4 items-center justify-center rounded-full border text-[9px]',
                                                    isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-muted-foreground/30',
                                                )}>
                                                    {isSelected && '✓'}
                                                </span>
                                                {m.name}
                                            </span>
                                        </DropdownMenuItem>
                                    );
                                })}
                                <DropdownMenuSeparator />
                            </>
                        )}
                        <DropdownMenuItem
                            onSelect={() => setConfirmDelete(true)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                        >
                            <Trash2 className="size-4 mr-2" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Meta badges: added by · assigned to · checked by */}
            {(item.addedByName || hasAssigned || item.checkedByName) && (
                <div className="mt-2 flex flex-wrap gap-1.5 pl-10">
                    {item.addedByName && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            <span>✏️</span>
                            <span>{item.addedByName}</span>
                        </span>
                    )}
                    {hasAssigned && assigned.map((name) => (
                        <span key={name} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                            <span>👤</span>
                            <span>{name}</span>
                            {!item.checked && (
                                <button
                                    type="button"
                                    onClick={() => onAssign(item.id, name)}
                                    className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                                >
                                    <X className="size-2.5" />
                                </button>
                            )}
                        </span>
                    ))}
                    {item.checkedByName && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <span>✅</span>
                            <span>{item.checkedByName}</span>
                        </span>
                    )}
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
