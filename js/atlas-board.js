/** 보드의 순수 상태 전이. 이동·전투·지갑 지급은 atlas / atlasRun / UI가 담당한다.
 * pending.id는 진입과 완료를 연결하는 영속 토큰이다. 같은 지도의 보상은 한 번만 적립된다. */
const atlasBoard = (() => {
    const C = ATLAS_BOARD, T = C.text, keys = Object.keys(C.baseRewards).concat('goldenRule');
    const count = (v, max = 1000000) => Math.min(max, Math.max(0, Math.floor(Number(v) || 0)));
    const tile = pos => C.tiles[pos];
    const defaults = () => ({ version: 2, started: false, dice: 0, position: 0, lap: 0, risk: 0, boost: 0,
        bank: {}, gear: 0, pending: null, choice: false, promise: false, serial: 0, lastRoll: 0, trail: [], message: '' });
    const ledger = state => state.atlas.board;
    const unlocked = state => state.season >= C.minLoop;
    function normalize(raw) {
        const s = { ...defaults(), ...(raw && typeof raw === 'object' ? raw : {}) };
        const out = { ...defaults(), started: s.started === true, dice: count(s.dice, C.diceCap), position: count(s.position, 23),
            lap: count(s.lap), risk: count(s.risk, C.maxRisk), boost: count(s.boost, C.maxBoost),
            bank: Object.fromEntries(keys.map(key => [key, count(s.bank?.[key])]).filter(([, n]) => n)),
            gear: count(s.gear, C.tiles.length), promise: s.promise === true, serial: count(s.serial, 1000000000), lastRoll: count(s.lastRoll, 6),
            message: typeof s.message === 'string' ? s.message.slice(0, 220) : '' };
        restorePending(out, s);
        out.trail = (Array.isArray(s.trail) ? s.trail : []).filter(n => Number.isInteger(n) && n >= 0 && n < 24).slice(-6);
        return out;
    }
    function restorePending(out, s) {
        const kind = tile(out.position).kind;
        out.choice = s.choice === true && kind === 'choice';
        if (s.pending?.failed) { out.message = T.messages.legacyFailure; return; }
        if (s.pending && ['map', 'boss'].includes(kind) && count(s.pending.id) > 0) {
            out.pending = { id: count(s.pending.id, 1000000000), position: out.position, diceFound: kind === 'boss' && s.pending.diceFound === true };
            out.serial = Math.max(out.serial, out.pending.id);
        }
    }
    function sync(state) {
        const b = ledger(state);
        if (!unlocked(state) || b.started) return;
        b.started = true; b.dice = Math.min(C.diceCap, b.dice + 3);
        b.message = '첫 심재 주사위 3개를 받았습니다. 혼돈 20층 이상 또는 아틀라스 8등급 이상에서 길잡이를 찾으세요.';
    }
    function reason(state) {
        if (!unlocked(state)) return `루프 ${C.minLoop}에 열립니다.`;
        const b = ledger(state);
        if (state.atlas.run) return '열린 지도를 먼저 마치거나 닫으세요.';
        if (b.pending) return '도착한 지도를 클리어하면 다시 굴릴 수 있습니다.';
        if (b.choice) return '갈림길에서 먼저 선택하세요.';
        return b.dice > 0 ? '' : '주사위가 없습니다. 혼돈 20 이상 또는 8등급 이상 지도에서 길잡이를 처치하세요.';
    }
    function payout(b, share, bonusPct = 0) {
        const rewards = [];
        for (const key of keys) {
            const base = Math.floor((b.bank[key] || 0) * share);
            if (!base) continue;
            const bonus = Object.hasOwn(C.baseRewards, key) ? Math.floor(base * bonusPct / 100) : 0;
            b.bank[key] -= base; rewards.push([key, base + bonus]);
        }
        return rewards;
    }
    function roll(state, random = Math.random) {
        sync(state);
        const why = reason(state);
        if (why) return { reason: why, rewards: [] };
        const b = ledger(state), value = 1 + Math.min(5, Math.floor(random() * 6));
        const from = b.position;
        b.dice -= 1; b.position = Math.min(23, from + value); b.lastRoll = value;
        b.trail = Array.from({ length: b.position - from }, (_, i) => from + i + 1);
        const current = tile(b.position);
        b.message = from === 23 ? '문지기에게 다시 도전합니다.' : `${b.position - from}칸 이동, ${current.name}`;
        // Roll the rare refund once when opening the final path, never on entry/load/completion.
        if (['map', 'boss'].includes(current.kind)) b.pending = { id: ++b.serial, position: b.position,
            diceFound: current.kind === 'boss' && random() < C.diceReturnChance };
        else if (current.kind === 'choice') b.choice = true;
        else return { reason: '', rewards: applyEvent(b, current.kind) };
        return { reason: '', rewards: [] };
    }
    function applyEvent(b, kind) {
        if (kind === 'boost') {
            const added = Math.min(20, C.maxBoost - b.boost); b.boost += added;
            b.message += added ? `, 보상 증폭 +${added}%` : ', 보상 증폭 한계';
        }
        if (kind === 'risk') {
            if (b.risk >= C.maxRisk) { b.message = T.messages.riskCap; return []; }
            const added = Math.min(15, C.maxBoost - b.boost);
            b.risk += 1; b.boost += added;
            b.message = `강행 돌파, 위험 +1, 보상 증폭 +${added}%.`;
        }
        if (kind === 'rest') b.risk = Math.max(0, b.risk - 1);
        if (kind === 'claim') {
            const rewards = payout(b, .3);
            b.message += rewards.length ? ', 보관 재화 30%를 거뒀습니다.' : ', 거둘 재화가 없습니다.';
            return rewards;
        }
        return [];
    }
    function choose(state, choice) {
        const b = ledger(state);
        if (!unlocked(state) || !b.choice || state.atlas.run || !['risk', 'rest', 'promise'].includes(choice)) return false;
        if (choice === 'risk' && (b.risk >= C.maxRisk || b.boost >= C.maxBoost)) return false;
        if (choice === 'promise') {
            return swear(b);
        }
        applyEvent(b, choice); b.choice = false;
        if (choice === 'rest') b.message = `정비를 마쳤습니다. 심재 위험 ${b.risk}.`;
        return true;
    }
    function swear(b) {
        if (b.promise || b.risk + C.promise.risk > C.maxRisk) return false;
        b.risk += C.promise.risk; b.promise = true; b.choice = false;
        b.message = T.messages.promiseTaken;
        return true;
    }
    const tierFor = b => Math.min(20, 8 + b.risk + Math.min(6, b.lap));
    const lossPctFor = (b, boss) => C.lossPct + (b.promise && boss ? C.promise.lossPct : 0);
    function plan(state) {
        const b = ledger(state), p = b.pending;
        if (!unlocked(state) || !p) return null;
        const t = tile(p.position), boss = t.kind === 'boss';
        return { id: p.id, node: t.node, boss, name: t.name, tier: tierFor(b),
            risk: b.risk, boost: b.boost, diceFound: boss && p.diceFound === true };
    }
    function normalizeRun(raw, state) {
        const p = plan(state);
        return raw && p && raw.id === p.id ? p : null;
    }
    function fail(state, run) {
        const b = ledger(state);
        if (!run || !b.pending || b.pending.id !== run.id) return false;
        const loss = lossPctFor(b, run.boss);
        payout(b, loss / 100); b.pending = null;
        if (run.boss) b.promise = false;
        b.message = T.messages.fail(loss);
        return true;
    }
    function complete(state, run) {
        const b = ledger(state);
        if (!run || !b.pending || b.pending.id !== run.id) return null;
        const scale = (1 + run.boost / 100) * (run.boss ? 2 : 1);
        for (const [key, value] of Object.entries(C.baseRewards)) b.bank[key] = (b.bank[key] || 0) + Math.ceil(value * scale);
        b.gear += 1;
        b.pending = null;
        if (!run.boss) { b.message = T.messages.clear; return { rewards: [], gear: 0, boss: false }; }
        return settleBoss(b, run);
    }
    function settleBoss(b, run) {
        b.bank.goldenRule = (b.bank.goldenRule || 0) + 1;
        const dice = run.diceFound ? Math.min(1, C.diceCap - b.dice) : 0;
        const result = { rewards: payout(b, 1, b.promise ? C.promise.rewardPct : 0), gear: b.gear, boss: true, dice };
        b.dice += dice;
        b.position = 0; b.lap += 1; b.risk = 0; b.boost = 0; b.gear = 0; b.trail = []; b.promise = false;
        b.message = T.messages.complete(b.lap) + (dice ? ' ' + T.messages.diceFound : '');
        return result;
    }
    function eligible(state, zone) {
        return unlocked(state) && !state.atlas.run?.board && zone &&
            ((zone.type === 'abyss' && zone.depth >= 20) || (zone.type === 'atlasMap' && zone.atlasTier >= 8));
    }
    function markCarrier(state, enemy, zone, random = Math.random) {
        if (!eligible(state, zone) || enemy.isBoss || enemy.isSummon || enemy.boardCarrier || random() >= (enemy.isElite ? .12 : .012)) return;
        enemy.boardCarrier = true;
        enemy.name = `나이테 길잡이: ${enemy.name}`;
    }
    function onKill(state, enemy, zone) {
        if (!enemy.boardCarrier || enemy.boardDiceClaimed || !eligible(state, zone)) return 0;
        enemy.boardDiceClaimed = true;
        sync(state);
        const b = ledger(state), n = Math.min(1, C.diceCap - b.dice);
        b.dice += n;
        return n;
    }
    return Object.freeze({ defaults, normalize, sync, unlocked, reason, roll, choose, plan, tierFor, lossPctFor, normalizeRun, fail, complete, markCarrier, onKill });
})();
safeExposeGlobals({ atlasBoard });
