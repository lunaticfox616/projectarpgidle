// Loaded before game bootstrap. This laboratory must never read/write a real save.
(() => {
    function memoryStorage() {
        const values = new Map();
        return {getItem: key => values.get(key) ?? null,
            setItem: (key, value) => values.set(key, String(value)),
            removeItem: key => values.delete(key), clear: () => values.clear(),
            key: i => [...values.keys()][i] ?? null, get length() { return values.size; }};
    }
    Object.defineProperty(window, 'localStorage', {value: memoryStorage()});
    Object.defineProperty(window, 'sessionStorage', {value: memoryStorage()});
})();
