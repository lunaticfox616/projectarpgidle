import { huntTraits } from '../data/hunt-traits.mjs';

const regions = new Set(['act','abyss','atlasMap','chaosRealm','underworld','skyTower','cosmos','oceanDepth','labyrinth']);
const personal = /* @__PURE__ */ (()=>Object.keys(huntTraits).filter(id => !huntTraits[id].pack))();

function huntLoop(owner,zone) {
    if (owner.season < 4 || zone.pocket || !regions.has(zone.type)) return 0;
    return Math.min(owner.season, zone.fixedSeason ?? owner.season);
}

function strengthen(enemy,hp,damage) {
    enemy.maxHp = Math.ceil(enemy.maxHp * hp);
    enemy.hp = Math.ceil(enemy.hp * hp);
    enemy.damageMul *= damage;
}

function grant(enemy,id) {
    const traits = enemy.huntTraits ||= [];
    if (traits.includes(id)) return;
    traits.push(id);
    enemy.huntRisk = (enemy.huntRisk || 0) + huntTraits[id].risk;
    enemy.traitName = [enemy.traitName,huntTraits[id].name].filter(Boolean).join(' · ');
    if (id === 'leech') enemy.leechPct = Math.max(enemy.leechPct || 0,12);
    if (id === 'colossus') strengthen(enemy,2.2,1.45);
    if (id === 'bond') strengthen(enemy,1.35,1.2);
}

export function rollHuntTraits(owner,zone,enemy,random) {
    if (enemy.isBoss) return;
    const loop = huntLoop(owner,zone);
    if (!(loop>=4) || random() >= (enemy.isElite ? 0.64 : 0.12)) return;
    const pool = personal.filter(id => huntTraits[id].loop <= loop && (id !== 'volley' || enemy.attackKind === 'ranged'));
    const count = 1 + Number(loop >= 18 && random() < 0.36) + Number(loop >= 36 && random() < 0.20);
    for (let i=0; i<count && pool.length; i++) grant(enemy,pool.splice(Math.floor(random()*pool.length),1)[0]);
}

export function rollHuntPack(owner,zone,count,random) {
    const loop = huntLoop(owner,zone);
    if (loop < 16 || count < 2 || random() >= 0.14) return null;
    const pool = ['brood','colossus','bond'].filter(id => huntTraits[id].loop <= loop);
    const rule = pool[Math.floor(random()*pool.length)];
    if (rule === 'brood') return {rule,count:Math.min(9,count+2)};
    return {rule,count:rule === 'colossus' ? Math.ceil(count/2) : count};
}

export function dressHuntPack(enemies,rule,originalCount) {
    if (!rule || !enemies.length) return;
    if (rule === 'colossus' && Number.isFinite(originalCount)) {
        const share = Math.max(0,Math.min(1,originalCount/enemies.length-1));
        for (const enemy of enemies) enemy.huntReplacementShare = share;
    }
    if (rule !== 'bond') { for (const enemy of enemies) grant(enemy,rule); return; }
    if (enemies.length < 2) return;
    const [first,second] = enemies;
    grant(first,rule);
    grant(second,rule);
    first.huntPartner = second.id;
    second.huntPartner = first.id;
}

export const huntRarity = enemy => 1 + Math.min(1,(enemy.huntRisk || 0)*0.10);
export function huntExtraChance(enemy) {
    const bonus = Math.min(1.5,(enemy.huntRisk || 0)*0.15);
    if (!enemy.huntTraits?.includes('colossus')) return bonus;
    // Earlier saves lack the original pack count. A giant normally stands for two enemies.
    const share = enemy.huntReplacementShare;
    return bonus + (Number.isFinite(share) ? Math.min(1,Math.max(0,share)) : 1);
}
