/** Screen pixels per authored dot, shared by actors and their effects. */
export function scaleForStageArt(tile, heroTile) {
    return (Number(tile) || heroTile) / heroTile;
}
