export function supportRuneTone(name, tables) {
    return tables.behaviors[name] || tables.statTones[(tables.supports[name] || {}).stat] || 'neutral';
}
export function supportRuneArtCell(name, order) {
    const index = order.indexOf(name);
    return index < 0 ? null : { col: index % 10, row: Math.floor(index / 10) };
}
