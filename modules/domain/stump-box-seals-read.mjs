

export function stumpIsSealed(box, cell) { return Array.isArray(box.sealed) && box.sealed.includes(cell); }
