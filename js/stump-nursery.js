// 묘목장과 고대 씨앗(12번 루프 39, 42, 2026-10-08, data/stump-nursery.js): 묘목 무리의 처치 드롭(js/combat.js recordKillProgress),
// 묘목장 정리의 선물(js/atlas-run.js clearRoom), 최종 보스의 고대 씨앗(js/atlas-endgame.js onComplete). 받은 것은 그루터기 함 보관함으로
// 가고(stumpBox.createItem), 그 소식은 보통 드롭처럼 'stump-box-changed'로 알린다. 고대 씨앗의 효과는 js/stump-box.js가 계산한다.
const stumpNursery = (() => {
    const N = STUMP_NURSERY;
    const loopOf = state => Number(state.season) || 1;
    const open = state => loopOf(state) >= N.minLoop;
    const ancientOpen = state => loopOf(state) >= N.ancient.minLoop;
    const acquired = state => !!(state.stumpBox && state.stumpBox.acquired);
    const between = ([min, max], random) => min + random() * (max - min);
    const COLORS = Object.freeze(Object.keys(STUMP_BOX_COLORS));
    const anyColor = random => COLORS[Math.min(COLORS.length - 1, Math.floor(random() * COLORS.length))];
    /** The colour a nursery in this zone grows: the map region's (the trunk: any). */
    const colorOf = (zone, random) => N.regionColors[zone && zone.atlasRegion] || anyColor(random);

    function give(state, spec) {
        const item = stumpBox.createItem(state, spec);
        if (item) dispatchRuntimeEvent('stump-box-changed', { ripened: [], drop: item, compost: null });
        return item;
    }
    function nurserySpec(zone, roll, random) {
        return { family: random() < N.sapShare ? 'sap' : 'seed', color: colorOf(zone, random), roll: between(roll, random),
            golden: random() < STUMP_BOX_RIPENING.golden.dropChance * N.goldenMul };
    }
    const ancientSpec = (color, random) => ({ family: 'seed', color, roll: between(N.ancient.roll, random), ancient: true });
    /** A nursery pack kill (data/atlas.js encounters.nursery): by chance a seed or sap of the region's colour. */
    function onKilled(state, enemy, random = Math.random) {
        if (!enemy || enemy.atlasEncounter !== 'nursery' || enemy.isBoss || !acquired(state)) return null;
        if (random() >= N.killChance[enemy.isElite ? 'elite' : 'normal']) return null;
        return give(state, nurserySpec(getZone(state.currentZoneId), N.killRoll, random));
    }
    /** An emptied nursery: one seed or sap for sure (from loop 42 sometimes an ancient seed), and by chance a scar. @returns {object[]} */
    function clearGift(state, zone, random = Math.random) {
        if (!acquired(state)) return [];
        const ancient = ancientOpen(state) && random() < N.ancient.roomChance;
        const out = [give(state, ancient ? ancientSpec(colorOf(zone, random), random) : nurserySpec(zone, N.clearRoll, random))];
        if (random() < N.scarChance && stumpBox.devourOpen(state)) out.push(stumpBox.rollScarDrop(state, () => 0));
        return out.filter(Boolean);
    }
    /** A final boss falls: from loop 42, by chance, an ancient seed of any colour. */
    function ancientFromBoss(state, random = Math.random) {
        if (!acquired(state) || !ancientOpen(state) || random() >= N.ancient.apexChance) return null;
        return give(state, ancientSpec(anyColor(random), random));
    }
    return Object.freeze({ open, ancientOpen, colorOf, onKilled, clearGift, ancientFromBoss });
})();
safeExposeGlobals({ stumpNursery });
