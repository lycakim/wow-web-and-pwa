import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { generateTripCode } from '@/lib/trip-code';
import { Check, Copy, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface TripLandingProps {
    onEnter: (tripId: string, tripCode: string) => void;
}

export function TripLanding({ onEnter }: TripLandingProps) {
    const [tab, setTab] = useState<'create' | 'join'>('create');

    // Create state
    const [tripName, setTripName] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    // Join state
    const [code, setCode] = useState('');
    const [joining, setJoining] = useState(false);
    const [joinError, setJoinError] = useState('');

    const handleCreate = async () => {
        setCreating(true);
        setCreateError('');
        try {
            const id = crypto.randomUUID();
            const tripCode = generateTripCode();
            const { error } = await supabase.from('trips').insert({
                id,
                code: tripCode,
                name: tripName.trim(),
            });
            if (error) throw error;
            onEnter(id, tripCode);
        } catch {
            setCreateError('Failed to create trip. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    const handleJoin = async () => {
        const upper = code.trim().toUpperCase();
        if (!upper) return;
        setJoining(true);
        setJoinError('');
        try {
            const { data, error } = await supabase.from('trips').select('id').eq('code', upper).single();
            if (error || !data) {
                setJoinError('Trip not found. Check the code and try again.');
                return;
            }
            onEnter(data.id as string, upper);
        } catch {
            setJoinError('Failed to join trip. Please try again.');
        } finally {
            setJoining(false);
        }
    };

    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4">
            <div className="mb-8 text-center">
                <div className="mb-3 flex justify-center">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-indigo-600 text-4xl shadow-lg">
                        🤙
                    </div>
                </div>
                <h1 className="text-2xl font-bold">Barkada Planner</h1>
                <p className="mt-1 text-sm text-muted-foreground">Plan your group trip expenses together</p>
            </div>

            <Card className="w-full max-w-sm">
                {/* Tabs */}
                <div className="flex border-b">
                    {(['create', 'join'] as const).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${
                                tab === t
                                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {t === 'create' ? 'Create Trip' : 'Join Trip'}
                        </button>
                    ))}
                </div>

                {tab === 'create' && (
                    <>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Start a new trip</CardTitle>
                            <CardDescription>A shareable code will be generated for your barkada.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="trip-name">Trip name <span className="text-muted-foreground">(optional)</span></Label>
                                <Input
                                    id="trip-name"
                                    placeholder="e.g. Palawan 2025"
                                    value={tripName}
                                    onChange={(e) => setTripName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                />
                            </div>
                            {createError && <p className="text-xs text-destructive">{createError}</p>}
                            <Button
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                                onClick={handleCreate}
                                disabled={creating}
                            >
                                {creating ? <Loader2 className="size-4 animate-spin" /> : 'Create Trip'}
                            </Button>
                        </CardContent>
                    </>
                )}

                {tab === 'join' && (
                    <>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Join an existing trip</CardTitle>
                            <CardDescription>Ask your barkada for the 6-character trip code.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="trip-code">Trip code</Label>
                                <Input
                                    id="trip-code"
                                    placeholder="e.g. BATANG"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                                    className="font-mono tracking-widest uppercase"
                                    maxLength={6}
                                />
                            </div>
                            {joinError && <p className="text-xs text-destructive">{joinError}</p>}
                            <Button
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                                onClick={handleJoin}
                                disabled={joining || code.trim().length === 0}
                            >
                                {joining ? <Loader2 className="size-4 animate-spin" /> : 'Join Trip'}
                            </Button>
                        </CardContent>
                    </>
                )}
            </Card>
        </div>
    );
}

// Small component shown after creating — displays the trip code with copy button
export function TripCodeBanner({ code, onDismiss }: { code: string; onDismiss: () => void }) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mx-4 mt-3 flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-900 dark:bg-indigo-950/30">
            <div>
                <p className="text-xs text-indigo-700 dark:text-indigo-300">Share this code with your barkada</p>
                <p className="font-mono text-xl font-bold tracking-widest text-indigo-700 dark:text-indigo-300">{code}</p>
            </div>
            <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copy} className="gap-1.5 border-indigo-300 text-indigo-700 dark:border-indigo-700 dark:text-indigo-300">
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button size="sm" variant="ghost" onClick={onDismiss} className="text-muted-foreground">
                    Dismiss
                </Button>
            </div>
        </div>
    );
}
