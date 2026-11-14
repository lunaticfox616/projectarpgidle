export function highlightSearchText(runtime, text, query) {

    let raw = String(text || '');
    let lower = raw.toLowerCase();
    let tokens = (0, runtime.deps.getSearchTokens)(query).sort((a,b)=>b.length-a.length);
    if (tokens.length <= 0) return (0, runtime.deps.escapeHTML)(raw);

    let ranges = [];
    tokens.forEach(tok => {
        if (!tok) return;
        let needle = tok.toLowerCase();
        let from = 0;
        while (from < lower.length) {
            let idx = lower.indexOf(needle, from);
            if (idx < 0) break;
            let start = idx;
            let end = idx + needle.length;
            if (needle.length > 0) ranges.push([start, end]);
            from = idx + Math.max(1, needle.length);
        }
    });
    if (ranges.length <= 0) return (0, runtime.deps.escapeHTML)(raw);

    ranges.sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
    let merged = [];
    for (let i=0;i<ranges.length;i++) {
        let cur = ranges[i];
        if (merged.length <= 0) { merged.push(cur.slice()); continue; }
        let last = merged[merged.length-1];
        if (cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
        else merged.push(cur.slice());
    }

    let out = '';
    let cursor = 0;
    merged.forEach(([start,end]) => {
        if (start > cursor) out += (0, runtime.deps.escapeHTML)(raw.slice(cursor, start));
        out += `<mark style="background:#5a4a1a;color:#ffe8a3;padding:0 1px;border-radius:2px;">${(0, runtime.deps.escapeHTML)(raw.slice(start, end))}</mark>`;
        cursor = end;
    });
    if (cursor < raw.length) out += (0, runtime.deps.escapeHTML)(raw.slice(cursor));
    return out;

}
