export function isStumpKind(runtime, kind) { return kind === 'stump' || kind === 'wallet'; }

export function esc(runtime, text) { return (0, runtime.deps.escapeHTML)(String(text)); }

export function itemName(runtime, kind, item) {
        if (kind === 'currency') return (0, runtime.deps._t)(runtime.deps.ORB_DB[item.currency].name);
        return isStumpKind(runtime, kind) ? runtime.deps.stumpBox.label(item) : String(item.name || runtime.state.KIND_LABELS[kind]);
    }

export function itemTone(runtime, kind, item) {
        if (kind === 'stump' && item.albino) return runtime.deps.STUMP_BOX_RIPENING.albino.tone;
        if (isStumpKind(runtime, kind) && item.color) return runtime.deps.STUMP_BOX_COLORS[item.color].tone;
        if (kind === 'stump' && item.family === 'scar') return runtime.deps.STUMP_BOX_SCAR.tone;
        return (0, runtime.deps.getRarityColor)(item.rarity || 'normal');
    }
