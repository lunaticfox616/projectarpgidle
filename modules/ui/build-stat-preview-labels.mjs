export function buildStatPreviewParts(meta, preview) {
    const format = meta.dps.format;
    const part = (label, [before, after]) => (format(before) === format(after) ? ''
        : `<span style="color:${after > before ? '#8fe0a8' : '#ff9b92'}; white-space:nowrap;">${label} ${format(before)} → ${format(after)}</span>`);
    return [part('DPS', preview.dps), part('생명력', preview.life)].filter(Boolean).join(', ');
}
