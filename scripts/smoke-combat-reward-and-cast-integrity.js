const assert = require('node:assert/strict');
const { prepare } = require('./audit-combat-20260905');

function attack(skill, keystones, hp = 10000, fanatic = false) {
    const { runtime: r, run, state, enemy } = prepare();
    r.Math.random = () => 0.5;
    state.skills = ['기본 공격', skill];
    state.activeSkill = skill;
    state.gemData[skill] = { level: 1, quality: 0, exp: 0 };
    state.ascendClass = 'warlock';
    state.ascendKeystones = [];
    state.playerHp = hp;
    const stats = r.getPlayerStats();
    Object.assign(stats, { baseDmg: 1000, maxHp: 10000, crit: 0, critDmg: 150,
        resPen: 50, minDmgRoll: 100, maxDmgRoll: 100, passiveAlwaysHit: true,
        flatElementHitDamage: {}, addedDamagePctByElement: {}, dotDamageScale: 1 });
    state.ascendKeystones = keystones;
    if (fanatic) {
        state.passives.push('pt_core_keystone_02');
        stats.devotion = 10;
    }
    const inputDamage = stats.baseDmg;
    r.performPlayerAttack(stats, { forcedCrit: false });
    const afterCastHp = state.playerHp;
    for (let tick = 1; tick <= 80; tick++) {
        state.combatTimeMs += 100;
        run('processPendingSkillStageHits();');
        r.castStats = stats;
        run('updateSkillGemCombat(castStats);');
    }
    assert.equal(state.playerHp, afterCastHp, 'delayed contacts never charge the attack cost again');
    assert.equal(stats.baseDmg, inputDamage, 'attack modifiers do not mutate the caller snapshot');
    const dealt = enemy.maxHp - enemy.hp;
    run('processPendingSkillStageHits();updateSkillGemCombat(castStats);');
    assert.equal(enemy.maxHp - enemy.hp, dealt, 'consumed contacts cannot deal damage twice');
    return { dealt, hp: state.playerHp };
}

for (const skill of ['기본 공격', '탄성 플라스크', '시간 가속']) {
    const base = attack(skill, []);
    const pact = attack(skill, ['wlk7']);
    assert.equal(pact.hp, 9600, `${skill}: blood pact costs exactly one 4% life payment`);
    // 2026-10-07 직업 밸런스: 피의 계약 1.5배 → 10% 증폭, 공허 특이점의 무작위 폭 절반(ASCENDANCY_KEYSTONE_VALUES).
    assert.ok(Math.abs(pact.dealt / base.dealt - 1.1) < 0.002,
        `${skill}: the paid attack retains its blood pact bonus through delayed contacts`);
    const singularity = attack(skill, ['wlk6']);
    assert.ok(Math.abs(singularity.dealt / base.dealt - 1.5) < 0.002,
        `${skill}: the seeded singularity roll is retained by every contact`);
    const together = attack(skill, ['wlk6', 'wlk7']);
    assert.ok(Math.abs(together.dealt / base.dealt - 1.65) < 0.002,
        `${skill}: independent start modifiers multiply once`);
    const unable = attack(skill, ['wlk7'], 400);
    assert.equal(unable.hp, 400, `${skill}: a lethal blood pact payment is not made`);
    assert.equal(unable.dealt, base.dealt, `${skill}: an unpaid attack gains no blood pact bonus`);
    const firstStack = attack(skill, [], 10000, true);
    assert.ok(Math.abs(firstStack.dealt / base.dealt - 1.015) < 0.002,
        `${skill}: the newly earned fanaticism stack affects this cast once`);
}

function deaths(chained, count = 2) {
    const { runtime: r, run, state } = prepare();
    r.Math.random = () => 0.5;
    state.level = 50;
    state.exp = 0;
    state.loopKills = 0;
    state.actExploration = null;
    state.stumpBox.acquired = true;
    const seed = r.stumpBox.createItem(state, { family: 'seed', color: 'fire', roll: 1 });
    assert.ok(r.stumpBox.place(state, seed.id, 12, 'flower'));
    state.enemies = Array.from({ length: count }, (_, i) => Object.assign(
        r.createEnemy(r.getZone(1), { at: 0, count: 1 }, i),
        { id: 7000 + i, gx: i + 2, gy: 4, hp: 1, maxHp: 100, energyShield: 0 }));
    const enemies = [...state.enemies];
    const stats = r.getPlayerStats();
    if (chained) Object.assign(stats, { runeCorpseExplodeChance: 100, runeCorpseExplodeLifePct: 10 });
    for (const enemy of enemies) {
        enemy.hp = 0;
        r.handleEnemyDeath(enemy, stats);
    }
    const result = { kills: state.loopKills, exp: state.exp, level: state.level, growth: seed.xp,
        currencies: JSON.parse(JSON.stringify(state.currencies)), remaining: state.enemies.length };
    for (const enemy of enemies) r.handleEnemyDeath(enemy, stats);
    assert.equal(state.loopKills, result.kills, 'repeated stale death notifications grant nothing');
    assert.equal(state.exp, result.exp, 'repeated stale death notifications grant no experience');
    assert.equal(seed.xp, result.growth, 'repeated stale death notifications cannot grow the box');
    assert.equal(run('game.stumpBox.items.length'), 1, 'deterministic non-drop roll retains only the seed');
    return result;
}

for (const count of [2, 5]) {
    const separate = deaths(false, count);
    const chained = deaths(true, count);
    assert.equal(chained.kills, count, 'each victim of recursive corpse explosions counts once');
    assert.equal(chained.growth, count, 'each real kill grows the box once');
    assert.deepEqual(chained, separate, 'recursive and separate deaths give identical rewards');
}
console.log('combat cast bonuses and recursive death reward integrity passed');
