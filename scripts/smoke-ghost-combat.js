const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = vm.createContext({
    console,
    game: { activeSkill: '독니 사출', selectedHeroId: 'hero6', ascendClass: 'assassin' },
    SKILL_DB: { '독니 사출': { ele: 'chaos', tags: ['attack', 'projectile', 'chaos'] } },
    clampNumber(value, min, max) { return Math.max(min, Math.min(max, value)); },
    calculatePlayerEhpProfile() {
        return { elements: {
            phys: { direct: 1200 }, fire: { direct: 1500 }, cold: { direct: 1450 },
            light: { direct: 1400 }, chaos: { direct: 900 }
        } };
    },
    getHeroAppearanceId() { return 'hero4'; },
    safeExposeGlobals(entries) { Object.assign(context, entries); }
});

vm.runInContext(fs.readFileSync('js/ghost-combat.js', 'utf8'), context, { filename: 'ghost-combat.js' });

const snapshot = context.getGhostCombatSnapshot({
    sSkill: context.SKILL_DB['독니 사출'], totalDps: 2400, directDps: 1900, skillDotDps: 300, summonDps: 200,
    maxHp: 800, energyShield: 200, aspd: 2, crit: 25, critDmg: 180, minDmgRoll: 70, maxDmgRoll: 130,
    ds: 35, accuracy: 500, evasion: 650, blockChance: 18, deflectChance: 12, deflectDamageReduce: 25,
    leech: 1.5, regen: 2, energyShieldRegenRate: 10
});

assert.strictEqual(snapshot.schemaVersion, 1, 'snapshot contract must be versioned');
assert.strictEqual(snapshot.ascendClass, 'assassin', 'the current ascendancy must travel with the build snapshot');
assert.strictEqual(snapshot.heroId, 'hero4', 'registered ghost should use the visible character appearance');
assert.strictEqual(snapshot.activeSkill, '독니 사출');
assert.strictEqual(snapshot.style, 'projectile', 'skill delivery style must survive registration for replay');
assert.strictEqual(snapshot.directEhpByElement.chaos, 900, 'direct elemental EHP must be registered before entropy avoidance');
assert.strictEqual(snapshot.dps, 2400);
assert.strictEqual(snapshot.directDps, 1900);
assert.strictEqual(snapshot.recoveryPct, 3.6, 'life and energy-shield recovery must be weighted by their pools');
assert.strictEqual(snapshot.deflectDamageReduce, 65, 'deflect must include its base forty-percent reduction');
assert.deepStrictEqual(Array.from(snapshot.tags), ['attack', 'projectile'], 'only supported combat tags should cross the cloud boundary');

const capped = context.getGhostCombatSnapshot({
    sSkill: { ele: 'invalid', tags: ['spell'] }, totalDps: 1, maxHp: 1, aspd: 99,
    crit: 200, critDmg: 99999, blockChance: 100, deflectChance: 100, leech: 100
});
assert.strictEqual(capped.skillElement, 'phys');
assert.strictEqual(capped.attackSpeed, 8);
assert.strictEqual(capped.blockChance, 75);
assert.strictEqual(capped.leechPct, 20);

async function verifyDirectRegistrationFromCurrentBuild() {
    const calls = [];
    const arenaHost = {
        htmlWrites: 0,
        get innerHTML() { return this.html || ''; },
        set innerHTML(value) { this.html = value; this.htmlWrites++; }
    };
    const integrationContext = {
        console,
        cloudState: { user: { id: 'ghost-user' } },
        game: {
            activeSkill: '독니 사출', selectedHeroId: 'hero6', season: 8,
            currentZoneId: 4, ascendClass: 'assassin'
        },
        SKILL_DB: context.SKILL_DB,
        document: {
            readyState: 'complete',
            head: { appendChild() {} },
            querySelector: () => ({ content: 'ghost-test-build' }),
            getElementById: id => id === 'map-ghost-arena' ? arenaHost : null,
            createElement: () => ({ style: {}, setAttribute() {} }),
            addEventListener() {}
        },
        requestAnimationFrame() {},
        getPlayerStats: () => ({
            totalDps: 2400, directDps: 1900, maxHp: 800, energyShield: 200,
            aspd: 2, crit: 25, critDmg: 180, sSkill: context.SKILL_DB['독니 사출']
        }),
        clampNumber: context.clampNumber,
        calculatePlayerEhpProfile: context.calculatePlayerEhpProfile,
        getHeroAppearanceId: context.getHeroAppearanceId,
        socialCloudReady: () => true,
        restoreNicknameFromServer: async () => {},
        getMyNickname: () => '테스터',
        promptAndSetNickname: async () => {},
        uploadPlayerProfile: async () => { calls.push({ path: 'profile-uploaded' }); },
        showGameToast() {},
        escapeHTML: value => String(value),
        async cloudJsonRequest(path, options) {
            calls.push({ path, options });
            if (path === '/rest/v1/rpc/get_ghost_arena') return { combatProtocolVersion: 4, me: null, leaderboard: [] };
            return null;
        },
        safeExposeGlobals(entries) { Object.assign(integrationContext, entries); }
    };

    vm.createContext(integrationContext);
    vm.runInContext(fs.readFileSync('js/ghost-combat.js', 'utf8'), integrationContext, { filename: 'ghost-combat.js' });
    vm.runInContext(fs.readFileSync('js/ghost-pvp.js', 'utf8'), integrationContext, { filename: 'ghost-pvp.js' });
    await integrationContext.loadGhostArena();
    calls.length = 0;

    await integrationContext.registerMyGhost();
    const registration = calls.find(call => call.path === '/rest/v1/rpc/register_my_ghost');
    assert(registration, 'registration must call the dedicated ghost RPC without requiring a combat run');
    assert.strictEqual(registration.options.body.p_combat_version, 'ghost-combat-rules-v1');
    assert.strictEqual(registration.options.body.p_snapshot.schemaVersion, 1);
    assert.strictEqual(registration.options.body.p_snapshot.ascendClass, 'assassin');
    assert.strictEqual(registration.options.body.p_snapshot.activeSkill, '독니 사출');
    assert.strictEqual(registration.options.body.p_snapshot.dps, 2400);
    assert(!calls.some(call => call.path === '/rest/v1/playtest_runs'), 'ghost registration must stay independent from playtest records');
    assert(calls.findIndex(call => call.path === 'profile-uploaded') < calls.indexOf(registration),
        'the social profile must exist before registering its current build');
    const writesBeforeRepeat = arenaHost.htmlWrites;
    integrationContext.renderGhostArena();
    integrationContext.renderGhostArena();
    assert.strictEqual(arenaHost.htmlWrites, writesBeforeRepeat,
        'unchanged inventory or static UI refreshes must not replace the ghost arena DOM');
}

verifyDirectRegistrationFromCurrentBuild()
    .then(() => console.log('smoke-ghost-combat passed'))
    .catch(error => { console.error(error); process.exitCode = 1; });
