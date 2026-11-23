// Door edges stay free. The selected cell must also work after a player changes room size and re-enters.
export function passageCell(room, blocked, near) {
    let best = null, shortest = Infinity;
    for (let gy = room.y0 + 1; gy < room.y1; gy++) {
        for (let gx = room.x0 + 1; gx < room.x1; gx++) {
            const distance = Math.abs(gx - near.gx) + Math.abs(gy - near.gy);
            if (distance >= shortest || blocked.has(gx + ',' + gy)) continue;
            best = {gx, gy}; shortest = distance;
        }
    }
    return best;
}

export function repositionPassages(map, sites, blocked) {
    for (const site of sites.filter(row => !row.used)) {
        const room = map.rooms.find(row => row.id === site.host);
        if (room) Object.assign(site, passageCell(room,blocked,site));
    }
}
