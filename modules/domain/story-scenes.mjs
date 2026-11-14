/** Story history belongs to an explicit save; the presentation layer consumes scenes without owning progress. */
export function createStoryScenes(defs) {
    return Object.freeze({
        sync: owner => storyScenesToQueue(defs, owner),
        foldPassed: (owner, queue) => storyFoldPassedScenes(defs, owner, queue),
        setAutoShow(owner, enabled) { owner.settings.showActJournal = enabled === true; }
    });
}

function storySceneAvailable(defs, owner, scene) {
    if (scene.id === 'prologue') return true;
    if (owner.journalEntries.includes(scene.journal)) return true;
    if (scene.phase === 'end') return false;
    return Number.isInteger(owner.currentZoneId) && owner.currentZoneId < defs.acts.length && owner.currentZoneId >= scene.act - 1;
}

export function storySceneAllowsNotice(owner, key) {
    return !key.startsWith('story_act_') || owner.settings.showActJournal !== false;
}

function markIllustratedScenes(defs, owner) {
    const marker = 'story_illustrations_v1';
    if (owner.seenTutorials.includes(marker)) return;
    const fresh = owner.season === 1 && owner.level === 1 && !owner.seenTutorials.includes('tutorial_battle_basics');
    owner.seenTutorials.push(marker);
    if (!fresh) for (const scene of defs.scenes.filter(scene => storySceneAvailable(defs, owner, scene))) owner.seenTutorials.push('story_' + scene.id);
}

function markPassedBridges(defs, owner) {
    const marker = 'story_bridges_v2';
    if (typeof defs.bridges !== 'object' || owner.seenTutorials.includes(marker)) return;
    owner.seenTutorials.push(marker);
    const reached = Math.max(Number(owner.maxZoneId) || 0, Number.isInteger(owner.currentZoneId) ? owner.currentZoneId : 0);
    for (const scene of defs.bridges) {
        const key = 'story_' + scene.id;
        if ((reached > scene.act - 1 || (owner.season || 1) > 1) && !owner.seenTutorials.includes(key)) owner.seenTutorials.push(key);
    }
}

/** Yield one scene at a time, preserving notice enqueue/history-update ordering. */
function* storyScenesToQueue(defs, owner) {
    if (owner.isBackgroundCalculation) return;
    markIllustratedScenes(defs, owner);
    markPassedBridges(defs, owner);
    for (const scene of defs.scenes.filter(scene => storySceneAvailable(defs, owner, scene))) {
        const key = 'story_' + scene.id;
        if (storySceneAllowsNotice(owner, key)) yield scene;
        else if (!owner.seenTutorials.includes(key)) owner.seenTutorials.push(key);
    }
}

/** Offline return retains the latest scene, marks older scenes read, and removes only their queued notices. */
function storyFoldPassedScenes(defs, owner, queue) {
    const queued = new Set(queue.map(notice => notice.key));
    const pending = defs.scenes.filter(scene => scene.id !== 'prologue'
        && (queued.has('story_' + scene.id) || (storySceneAvailable(defs, owner, scene) && !owner.seenTutorials.includes('story_' + scene.id))));
    const passed = pending.slice(0, -1), keys = new Set(passed.map(scene => 'story_' + scene.id));
    keys.forEach(key => { if (!owner.seenTutorials.includes(key)) owner.seenTutorials.push(key); });
    for (let i = queue.length - 1; i >= 0; i--) if (keys.has(queue[i].key)) queue.splice(i, 1);
    return passed;
}
