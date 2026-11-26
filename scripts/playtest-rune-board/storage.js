// Every refresh starts a new isolated guest. The test page loads before the game reads storage.
for (const name of ['localStorage', 'sessionStorage']) {
    const entries = new Map();
    Object.defineProperty(window, name, { value: {
        getItem: key => entries.get(String(key)) ?? null,
        setItem: (key,value) => entries.set(String(key),String(value)), removeItem: key => entries.delete(String(key)),
        clear: () => entries.clear(), key: i => [...entries.keys()][i] ?? null, get length() { return entries.size; }
    }});
}
