import { useState } from 'react';

const USER_NAME_KEY = 'barkada-user-name';

export function useCurrentUser() {
    const [name, setName] = useState<string>(() => localStorage.getItem(USER_NAME_KEY) ?? '');

    const saveName = (value: string) => {
        const trimmed = value.trim();
        localStorage.setItem(USER_NAME_KEY, trimmed);
        setName(trimmed);
    };

    return { name, saveName, isSet: name.length > 0 };
}
