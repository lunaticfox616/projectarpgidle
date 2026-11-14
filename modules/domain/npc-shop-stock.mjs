import { npcTradeRollGemWares, npcTradeRollUniqueWares, npcTradeRollGearWares } from './npc-shop-rolls.mjs';
import { npcTradePackShopWares } from './npc-shop-layout.mjs';

/** One meeting with npc ({ id, tone }) in zoneId: counted (kept across loops), and the stock rolled anew ('npc-shop-stocked'
 * tells an open shop window). */
export function* npcTradeMeetShopNpc(env, owner, npc, zoneId) {
    const shop = NPC_SHOPS[npc.id];
    if (!shop) return null;
    const before = owner.npcMet[npc.id] || { count: 0 };
    owner.npcMet[npc.id] = { count: before.count + 1, loop: owner.season || 1, zoneId, tone: npc.tone || 'gold' };
    owner.unlocks.npcs = true;
    // Saves from before the count met Haken in loop 1 already: only loop 1 has a first meeting.
    const first = before.count === 0 && (owner.season || 1) === 1;
    if (!npcTradeAllRunesOpen(env, owner, npc.id) && !(shop.firstMeetingClosed && first)) {
        owner.npcShops[npc.id] = npcTradeRollShopStock(env, owner, npc.id, zoneId);
        (yield { kind: 'npcNotify', args: ['npc-shop-stocked', { id: npc.id }] });
    }
    return owner.npcMet[npc.id];
}

export function npcTradeAllRunesOpen(env, owner, id = env.ALL_RUNES.npc) { return id === env.ALL_RUNES.npc && !!owner.npcMet[id] && (owner.maxZoneId || 0) >= env.ALL_RUNES.act; }

/** What the whole shelf holds: supports join once their unlock opens, so the mark tells when to lay it again. */
// 이름이 달라지면 진열대를 다시 편다(2026-11-02: 가진 룬도 팔게 되어 옛 진열대에는 빠진 룬이 있다. 2026-11-04: 호박석 값이 뿌리와 덩굴이 됐다).
export function npcTradeAllRunesMark(env, owner) { return env.deps.contentProgression.isUnlocked('support', owner) ? 'full-roots' : 'attacks-roots'; }

export function npcTradeRollAllRunes(env, owner) {
    const runes = env.deps.gemDropRewards.attackRunes(), weights = env.deps.getSkillRuneRewardWeights(runes);
    const attacks = runes.sort((a, b) => weights.get(b) - weights.get(a)).map(name => ({ kind: 'attack', name, awakened: false }));
    const supports = env.deps.contentProgression.isUnlocked('support', owner) ? Object.keys(env.deps.SUPPORT_GEM_DB).map(name => env.deps.gemDropRewards.nextSupport(owner, name)).filter(Boolean) : [];
    // 칸 자리는 저장하지 않는다: 검색과 쪽에 맞춰 화면이 채운다(js/npc-shop-ui.js runeShelfHtml).
    const offers = [...attacks, ...supports].map(gem => ({ gem, priceKey: npcTradeAllRunePriceKey(env, gem), price: 1, columns: 1, rows: 1 }));
    return { loop: owner.season || 1, zoneId: owner.currentZoneId, offers, allRunes: npcTradeAllRunesMark(env, owner) };
}

export function npcTradeAllRunePriceKey(env, gem) {
    if (gem.kind === 'support') return env.deps.stumpBox.harvestPriceKey(Object.keys(env.deps.SUPPORT_GEM_DB).indexOf(gem.name) % 2 ? 'vine' : 'root');
    const def = env.deps.SKILL_DB[gem.name];
    if (env.deps.isMobilityRuneName(gem.name) || (def.tags || []).includes('summon')) return env.deps.stumpBox.harvestPriceKey('fruit');
    return env.deps.stumpBox.harvestPriceKey('flower', env.ELEMENT_FLOWER[def.ele]);
}

/** Lays the whole shelf when the condition has just been met ('npc-shop-all-runes' tells the hero once a loop). */
export function* npcTradeSyncAllRunes(env, owner) {
    if (!npcTradeAllRunesOpen(env, owner)) return;
    const shop = owner.npcShops[env.ALL_RUNES.npc], current = shop && shop.loop === (owner.season || 1);
    if (current && shop.allRunes === npcTradeAllRunesMark(env, owner)) return;
    const first = !(current && shop.allRunes);
    owner.npcShops[env.ALL_RUNES.npc] = npcTradeRollAllRunes(env, owner);
    (yield { kind: 'npcNotify', args: ['npc-shop-stocked', { id: env.ALL_RUNES.npc }] });
    if (first) (yield { kind: 'npcNotify', args: ['npc-shop-all-runes', { id: env.ALL_RUNES.npc }] });
}

export function npcTradeRollShopStock(env, owner, id, zoneId) {
    const shop = NPC_SHOPS[id], zone = env.deps.getZone(zoneId) || env.deps.getZone(0), tier = Math.max(1, Math.floor(Number(zone.tier) || 1));
    const wares = shop.kind === 'gem' ? npcTradeRollGemWares(env, owner, shop.count) : shop.kind === 'unique' ? npcTradeRollUniqueWares(env, shop.count, tier) : npcTradeRollGearWares(env, shop, zone);
    return { loop: owner.season || 1, zoneId, offers: npcTradePackShopWares(env, wares) };
}

/** The NPC's stock of this loop, or null (never met yet here, or Haken at his first meeting). */
export function* npcTradeShopStock(env, owner, id) {
    if (id === env.ALL_RUNES.npc) (yield* npcTradeSyncAllRunes(env, owner));
    const shop = owner.npcShops[id];
    return shop && shop.loop === (owner.season || 1) && Array.isArray(shop.offers) ? shop : null;
}
import { NPC_SHOPS } from '../data/npc-shops.mjs';
