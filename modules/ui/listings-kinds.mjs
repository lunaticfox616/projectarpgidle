/**
 * 새 출품의 방식 셋: 가판대, 경매장, 장비 전당. 장비를 먼저 고르고 방식을 고른다. 못 쓰는 방식은 지금의 규칙이 주는 까닭을 단다(해금, 로그인,
 * 장비 조건, 칸). 출품 칸(가판대와 경매장이 같이 쓰는 7칸)은 playerStall.shelfBlock, 전당 3칸은 서버의 것이다(modules/ui/listings-hall.mjs).
 */
import { hallIssue } from './listings-hall.mjs';

export const LISTING_WAYS = Object.freeze([['stall', '가판대'], ['auction', '경매장'], ['hall', '장비 전당']]);

function stallIssue(runtime, item) {
    const { playerStall, game, _t } = runtime.deps;
    if (!playerStall.unlocked(game)) return _t('가판대가 아직 열리지 않았습니다.');
    return _t(playerStall.listBlockReason(item, game)) || playerStall.shelfBlock(game);
}

function auctionIssue(runtime, item) {
    const { auctionHouse, playerStall, game, _t } = runtime.deps;
    const issue = auctionHouse.useBlock(game) || auctionHouse.listIssue(game, item);
    if (issue) return _t(issue);
    return auctionHouse.listQuote(game, item).listable ? playerStall.shelfBlock(game) : _t('감정가가 낮아 출품할 수 없습니다.');
}

/** Why item cannot go up the way kind now, or ''. */
export function wayIssue(runtime, item, kind) {
    if (kind === 'stall') return stallIssue(runtime, item);
    return kind === 'auction' ? auctionIssue(runtime, item) : hallIssue(runtime, item);
}

/** The three ways for item: [{ kind, label, reason }]. */
export function waysFor(runtime, item) {
    return LISTING_WAYS.map(([kind, label]) => ({ kind, label, reason: wayIssue(runtime, item, kind) }));
}

/** The way a fresh pick of item starts on: the last chosen one when it is open for the item, else the first open one, else the stall. */
export function startingWay(runtime, item) {
    const ways = waysFor(runtime, item), last = ways.find(way => way.kind === runtime.state.kind && !way.reason);
    return (last || ways.find(way => !way.reason) || ways[0]).kind;
}

/** A bag item's pick for the shared bag (modules/ui/shop-markup.mjs bagHtml): pickable when one way is open, else dimmed with the stall's
 * reason (the broadest rule: worn, preset, flags, sockets) or the first reason there is. */
export function bagPick(runtime, item) {
    const chosen = runtime.state.pick === `bag:${item.id}`;
    let first = '';
    for (const [kind] of LISTING_WAYS) {
        const reason = wayIssue(runtime, item, kind);
        if (!reason) return { key: `bag:${item.id}`, chosen, reason: '' };
        first = first || reason;
    }
    return { key: '', chosen, reason: first };
}
