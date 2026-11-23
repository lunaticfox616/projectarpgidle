/** The board and loop roadmap identify new content one loop before it becomes eligible. */
export function beyondUnlockPreview(targetLoop, currentLoop) {
    return targetLoop > currentLoop + 1;
}
