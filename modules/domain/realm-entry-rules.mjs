export function validRealmFloor(value, max) {
    const floor = Number(value);
    return Number.isInteger(floor) && floor >= 1 && floor <= max ? floor : null;
}

export function selectLabyrinthLevel(owner, value) {
    const max = Math.max(1,Math.floor(owner.labyrinthUnlockedMaxFloor || owner.labyrinthFloor || 1));
    const floor = validRealmFloor(value,max);
    if (floor === null) return {reason:'floor',max};
    owner.labyrinthFloor = floor;
    return {ok:true};
}

export function selectRealmLevel(progress, value, max) {
    const floor = validRealmFloor(value,max);
    if (floor === null) return {reason:'floor',max};
    progress.currentFloor = floor;
    return {ok:true};
}

export function strengthenSkyStone(tower, max, cost) {
    if (!tower.unlocked) return {reason:'unlock'};
    const before = Math.max(0,Math.floor((tower.skyStone || {}).level || 0));
    if (before >= max) return {reason:'max'};
    if (Math.max(0,Math.floor(tower.condensedPower || 0)) < cost) return {reason:'cost',cost};
    tower.condensedPower -= cost;
    tower.skyStone = tower.skyStone || {crafted:false,level:0};
    tower.skyStone.crafted = true;
    tower.skyStone.level = before+1;
    return {ok:true,before};
}

export function consumeBattleTrialKey(owner) {
    if ((owner.currencies.trialKey3 || 0) <= 0) return false;
    owner.currencies.trialKey3 -= 1;
    return true;
}

export function woodsmanEchoOpen(realm) { return (realm.woodsmanBestDamagePct || 0) >= 100; }

export function talentBloomAdmission(owner, echoOpen) {
    if (!echoOpen) return 'echo';
    if (!owner.ascendClass) return 'class';
    if (!((owner.currencies.chaosKey || 0) >= 1) || !((owner.currencies.coreKey || 0) >= 1)) return 'keys';
    return null;
}

export function prepareTalentBloomTrial(owner, heroId, echoOpen) {
    const reason = talentBloomAdmission(owner,echoOpen);
    if (reason) return {reason};
    owner.pendingTalentBloomHeroId = heroId;
    return {ok:true};
}

export function unlockedDeepChaosDepths(owner) {
    return Array.isArray(owner.abyssUnlockedDepths) ? owner.abyssUnlockedDepths.map(value => Math.floor(value || 0)).filter(value => value >= 21) : [];
}

export function deepChaosEntryStatus(owner, cleared) {
    if ((owner.season || 1) < 10 || !cleared) return {open:false,highestDepth:20,currentDepth:Math.floor(owner.abyssEndlessDepth || 20)};
    const currentDepth = Math.floor(owner.abyssEndlessDepth || 21);
    const unlocked = unlockedDeepChaosDepths(owner);
    return {open:true,highestDepth:Math.max(21,unlocked.length ? Math.max(...unlocked) : currentDepth),currentDepth};
}

export function toggleRootBossRepeat(owner) {
    owner.autoRepeatSeasonBoss = !owner.autoRepeatSeasonBoss;
    return owner.autoRepeatSeasonBoss;
}
