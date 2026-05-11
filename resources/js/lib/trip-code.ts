const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/1/I to avoid confusion

export function generateTripCode(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    return Array.from(bytes)
        .map((b) => CHARS[b % CHARS.length])
        .join('');
}
