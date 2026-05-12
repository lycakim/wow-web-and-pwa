import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface AppModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    children: React.ReactNode;
    /** Extra class on the scrollable body wrapper */
    className?: string;
}

/**
 * Responsive modal:
 * - Mobile  → bottom sheet (slides up, max 92svh, scrollable body)
 * - Desktop → right slideover (max-w-md panel)
 *
 * Use this for all add/edit forms across the app.
 * Keep ConfirmDeleteDialog as a centered Dialog — it's intentionally small.
 */
export function AppModal({ open, onOpenChange, title, children, className }: AppModalProps) {
    const isMobile = useIsMobile();

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side={isMobile ? 'bottom' : 'right'}
                className={cn(
                    'flex flex-col',
                    isMobile
                        ? 'max-h-[92svh] rounded-t-2xl'
                        : 'h-full w-full max-w-md',
                )}
            >
                <SheetHeader className="shrink-0">
                    <SheetTitle>{title}</SheetTitle>
                </SheetHeader>
                <div className={cn('flex-1 overflow-y-auto overscroll-contain', className)}>
                    <div className="space-y-5 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                        {children}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
