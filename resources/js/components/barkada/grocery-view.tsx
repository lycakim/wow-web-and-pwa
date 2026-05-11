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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { GroceryItem, GrocerySection, Member } from '@/types/barkada';
import { GROCERY_SECTIONS } from '@/types/barkada';
import { Check, Pencil, Trash2, X, MoreVertical } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// Must match the same palette and order as members-view.tsx
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

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

// Use member index for consistent color matching the members list view.
// Falls back to hash for names not found in the members array.
function getAvatarColor(name: string, members: Member[]): string {
    const index = members.findIndex((m) => m.name === name);
    if (index !== -1) {
        return AVATAR_COLORS[index % AVATAR_COLORS.length];
    }
    const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function Avatar({ name, members, size = 'md', ring = false }: { name: string; members: Member[]; size?: 'sm' | 'md'; ring?: boolean }) {
    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span
                        className={cn(
                            'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none',
                            getAvatarColor(name, members),
                            size === 'sm' ? 'size-5 text-[9px]' : 'size-6 text-[10px]',
                            ring && 'ring-2 ring-background',
                        )}
                    >
                        {getInitials(name)}
                    </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                    {name}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

interface GroceryViewProps {
    items: GroceryItem[];
    members: Member[];
    currentUserName?: string;
    onAdd: (name: string, section: GrocerySection, addedByName?: string) => void;
    onToggle: (id: string, checkedByName?: string) => void;
    onAssign: (id: string, memberName: string) => void;
    onRemove: (id: string) => void;
    onRename: (id: string, name: string) => void;
    onClearChecked: (section: GrocerySection) => void;
}

export function GroceryView({ items, members, currentUserName, onAdd, onToggle, onAssign, onRemove, onRename, onClearChecked }: GroceryViewProps) {
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
                                    'absolute -top-2 -right-2 flex min-w-[22px] h-[22px] px-1 items-center justify-center rounded-full text-[11px] font-bold tabular-nums ring-2',
                                    isActive
                                        ? 'bg-white text-indigo-600 ring-indigo-600'
                                        : 'bg-indigo-600 text-white ring-white dark:ring-zinc-900',
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
                                    onRename={onRename}
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
                                    onRename={onRename}
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
    onRename: (id: string, name: string) => void;
}

function GroceryRow({ item, members, currentUserName, onToggle, onAssign, onRemove, onRename }: GroceryRowProps) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [animating, setAnimating] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(item.name);
    const editInputRef = useRef<HTMLInputElement>(null);
    const assigned = item.assignedToNames ?? [];

    useEffect(() => {
        if (editing) {
            setEditValue(item.name);
            setTimeout(() => editInputRef.current?.select(), 0);
        }
    }, [editing, item.name]);

    const saveEdit = () => {
        if (editValue.trim() && editValue.trim() !== item.name) {
            onRename(item.id, editValue.trim());
        }
        setEditing(false);
    };

    const cancelEdit = () => {
        setEditValue(item.name);
        setEditing(false);
    };
    const hasAssigned = assigned.length > 0;

    const handleToggle = () => {
        if (!item.checked) {
            setAnimating(true);
            setTimeout(() => setAnimating(false), 500);
        }
        onToggle(item.id, currentUserName);
    };

    // Show max 3 avatars, then overflow count
    const MAX_AVATARS = 3;
    const visibleAssigned = assigned.slice(0, MAX_AVATARS);
    const overflowCount = assigned.length - MAX_AVATARS;

    return (
        <div className={cn(
            'rounded-lg px-3 py-2 transition-colors',
            item.checked ? 'opacity-55' : 'hover:bg-muted/50',
            animating && 'grocery-check-flash',
        )}>
            <div className="flex items-center gap-2.5">
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

                {/* Name + added by */}
                <div className="flex min-w-0 flex-1 flex-col">
                    {editing ? (
                        <div className="flex items-center gap-1.5">
                            <Input
                                ref={editInputRef}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit();
                                    if (e.key === 'Escape') cancelEdit();
                                }}
                                className="h-7 px-2 text-sm py-0"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={saveEdit}
                                disabled={!editValue.trim()}
                                className="shrink-0 flex size-6 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                            >
                                <Check className="size-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={cancelEdit}
                                className="shrink-0 flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
                            >
                                <X className="size-3.5" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <span className={cn(
                                'text-sm font-medium leading-snug transition-all duration-300',
                                item.checked && 'line-through text-muted-foreground font-normal',
                            )}>
                                {item.name}
                            </span>
                            {item.addedByName && (
                                <span className="text-[10px] text-muted-foreground/60 leading-tight">
                                    by {item.addedByName}
                                </span>
                            )}
                        </>
                    )}
                </div>

                {/* Avatar stack — tap/click to reveal names */}
                {!editing && (hasAssigned || item.checkedByName) && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="flex shrink-0 items-center -space-x-1.5 focus:outline-none"
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                {visibleAssigned.map((name) => (
                                    <Avatar key={name} name={name} members={members} ring />
                                ))}
                                {overflowCount > 0 && (
                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-background">
                                        +{overflowCount}
                                    </span>
                                )}
                                {item.checkedByName && (
                                    <span className={cn(
                                        'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-background bg-emerald-500',
                                        hasAssigned && 'ml-0',
                                    )}>
                                        ✓
                                    </span>
                                )}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="end" className="w-auto min-w-[160px] p-3">
                            <div className="space-y-2">
                                {hasAssigned && (
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Assigned to</p>
                                        {assigned.map((name) => (
                                            <div key={name} className="flex items-center gap-2">
                                                <Avatar name={name} members={members} size="sm" />
                                                <span className="text-sm">{name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {item.checkedByName && (
                                    <div className="space-y-1.5">
                                        {hasAssigned && <div className="h-px bg-border" />}
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Checked by</p>
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">✓</span>
                                            <span className="text-sm">{item.checkedByName}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                {/* Three-dot menu */}
                {!editing && <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="shrink-0 flex size-7 items-center justify-center rounded-full text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <MoreVertical className="size-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                            onSelect={() => setEditing(true)}
                            className="flex items-center gap-2.5 cursor-pointer"
                        >
                            <Pencil className="size-4" />
                            Edit name
                        </DropdownMenuItem>
                        {members.length > 0 && !item.checked && <DropdownMenuSeparator />}
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
                                            className="flex items-center gap-2.5 cursor-pointer"
                                        >
                                            <Avatar name={m.name} members={members} size="sm" />
                                            <span className="flex-1 text-sm">{m.name}</span>
                                            {isSelected && (
                                                <span className="text-indigo-600 text-xs font-semibold">✓</span>
                                            )}
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
                </DropdownMenu>}
            </div>

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
