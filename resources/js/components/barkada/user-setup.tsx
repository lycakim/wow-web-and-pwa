import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface UserSetupProps {
    onSave: (name: string) => void;
}

export function UserSetup({ onSave }: UserSetupProps) {
    const [name, setName] = useState('');

    const submit = () => {
        if (!name.trim()) return;
        onSave(name.trim());
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border bg-background p-6 shadow-xl">
                <div className="mb-5 text-center">
                    <div className="mb-3 flex justify-center text-4xl">👋</div>
                    <h2 className="text-lg font-bold">What's your name?</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Your barkada will see this when you log expenses.
                    </p>
                </div>

                <div className="space-y-3">
                    <Input
                        autoFocus
                        placeholder="e.g. Lyca"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                        className="text-center text-base"
                    />
                    <Button
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                        onClick={submit}
                        disabled={!name.trim()}
                    >
                        Let's go! 🤙
                    </Button>
                </div>
            </div>
        </div>
    );
}
