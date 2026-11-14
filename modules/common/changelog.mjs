/** Only level-two version headings and bullet items are supported, as in changelog.md. */
export function parseChangelogMarkdown(text) {
    const entries = [];
    let current = null;
    for (const line of String(text || '').split(/\r?\n/)) {
        const header = line.match(/^##\s+(.+?)\s*$/);
        if (header) {
            const title = header[1].trim(), parts = title.split(/\s+[—–-]\s+/);
            const version = parts.length >= 2 ? parts[0].trim() : title;
            const date = parts.length >= 2 ? parts.slice(1).join(' - ').trim() : '';
            current = { version, date, items: [] };
            entries.push(current);
            continue;
        }
        const bullet = line.match(/^\s*[-*]\s+(.+?)\s*$/);
        if (bullet && current) current.items.push(bullet[1].trim());
    }
    return entries;
}
