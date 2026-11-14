

export function atlasBoardRuleCount(v, max = 1000000) { return Math.min(max, Math.max(0, Math.floor(Number(v) || 0))); }

export function atlasBoardRuleTile(env, pos) { return env.C.tiles[pos]; }

export function atlasBoardRuleDefaults() { return { version: 2, started: false, dice: 0, position: 0, lap: 0, risk: 0, boost: 0,
    bank: {}, gear: 0, pending: null, choice: false, promise: false, serial: 0, lastRoll: 0, trail: [], message: '' }; }

export function atlasBoardRuleLedger(state) { return state.atlas.board; }

export function atlasBoardRuleUnlocked(env, state) { return env.deps.contentProgression.holds('ringRoute', state); }

export function atlasBoardRuleNormalize(env, raw) {
    const s = { ...atlasBoardRuleDefaults(), ...(raw && typeof raw === 'object' ? raw : {}) };
    const out = { ...atlasBoardRuleDefaults(), started: s.started === true, dice: atlasBoardRuleCount(s.dice, env.C.diceCap), position: atlasBoardRuleCount(s.position, 23),
        lap: atlasBoardRuleCount(s.lap), risk: atlasBoardRuleCount(s.risk, env.C.maxRisk), boost: atlasBoardRuleCount(s.boost, env.C.maxBoost),
        bank: Object.fromEntries(env.keys.map(key => [key, atlasBoardRuleCount(s.bank?.[key])]).filter(([, n]) => n)),
        gear: atlasBoardRuleCount(s.gear, env.C.tiles.length), promise: s.promise === true, serial: atlasBoardRuleCount(s.serial, 1000000000), lastRoll: atlasBoardRuleCount(s.lastRoll, 6),
        message: typeof s.message === 'string' ? s.message.slice(0, 220) : '' };
    atlasBoardRuleRestorePending(env, out, s);
    out.trail = (Array.isArray(s.trail) ? s.trail : []).filter(n => Number.isInteger(n) && n >= 0 && n < 24).slice(-6);
    return out;
}

export function atlasBoardRuleRestorePending(env, out, s) {
    const kind = atlasBoardRuleTile(env, out.position).kind;
    out.choice = s.choice === true && kind === 'choice';
    if (s.pending?.failed) { out.message = env.T.messages.legacyFailure; return; }
    if (s.pending && ['map', 'boss'].includes(kind) && atlasBoardRuleCount(s.pending.id) > 0) {
        out.pending = { id: atlasBoardRuleCount(s.pending.id, 1000000000), position: out.position, diceFound: kind === 'boss' && s.pending.diceFound === true };
        out.serial = Math.max(out.serial, out.pending.id);
    }
}

export function atlasBoardRuleSync(env, state) {
    const b = atlasBoardRuleLedger(state);
    if (!atlasBoardRuleUnlocked(env, state) || b.started) return;
    b.started = true; b.dice = Math.min(env.C.diceCap, b.dice + 3);
    b.message = '첫 심재 주사위 3개를 받았습니다.';
}

export function atlasBoardRuleReason(env, state) {
    if (!atlasBoardRuleUnlocked(env, state)) return '나이테 원정 해금 뒤에 열립니다.';
    const b = atlasBoardRuleLedger(state);
    if (state.atlas.run) return env.deps.atlas.runOpenReason(state);
    if (b.pending) return '도착한 지도를 클리어하면 다시 굴릴 수 있습니다.';
    if (b.choice) return '갈림길에서 먼저 선택하세요.';
    return b.dice > 0 ? '' : '주사위가 없습니다. 혼돈 20 이상 또는 8등급 이상 지도에서 길잡이를 처치하세요.';
}

export function atlasBoardRulePayout(env, b, share, bonusPct = 0) {
    const rewards = [];
    for (const key of env.keys) {
        const base = Math.floor((b.bank[key] || 0) * share);
        if (!base) continue;
        const bonus = Object.hasOwn(env.C.baseRewards, key) ? Math.floor(base * bonusPct / 100) : 0;
        b.bank[key] -= base; rewards.push([key, base + bonus]);
    }
    return rewards;
}

export function atlasBoardRuleRoll(env, state, random = Math.random) {
    atlasBoardRuleSync(env, state);
    const why = atlasBoardRuleReason(env, state);
    if (why) return { reason: why, rewards: [] };
    const b = atlasBoardRuleLedger(state), value = 1 + Math.min(5, Math.floor(random() * 6));
    const from = b.position;
    b.dice -= 1; b.position = Math.min(23, from + value); b.lastRoll = value;
    b.trail = Array.from({ length: b.position - from }, (_, i) => from + i + 1);
    const current = atlasBoardRuleTile(env, b.position);
    b.message = from === 23 ? '문지기에게 다시 도전합니다.' : env.deps._t('{value}칸 이동, {name}', { value: b.position - from, name: current.name });
    // Roll the rare refund once when opening the final path, never on entry/load/completion.
    if (['map', 'boss'].includes(current.kind)) b.pending = { id: ++b.serial, position: b.position,
        diceFound: current.kind === 'boss' && random() < env.C.diceReturnChance };
    else if (current.kind === 'choice') b.choice = true;
    else return { reason: '', rewards: atlasBoardRuleApplyEvent(env, b, current.kind) };
    return { reason: '', rewards: [] };
}

export function atlasBoardRuleApplyEvent(env, b, kind) {
    if (kind === 'boost') {
        const added = Math.min(20, env.C.maxBoost - b.boost); b.boost += added;
        b.message += added ? env.deps._t(', 보상 증폭 +{added}%', { added }) : ', 보상 증폭 한계';
    }
    if (kind === 'risk') {
        if (b.risk >= env.C.maxRisk) { b.message = env.T.messages.riskCap; return []; }
        const added = Math.min(15, env.C.maxBoost - b.boost);
        b.risk += 1; b.boost += added;
        b.message = `강행 돌파, 위험 +1, ${added ? env.deps._t('보상 증폭 +{added}%', { added }) : env.T.boostFull}.`;
    }
    if (kind === 'rest') b.risk = Math.max(0, b.risk - 1);
    if (kind === 'claim') {
        const rewards = atlasBoardRulePayout(env, b, .3);
        b.message += rewards.length ? ', 보관 재화 30%를 거뒀습니다.' : ', 거둘 재화가 없습니다.';
        return rewards;
    }
    return [];
}

export function atlasBoardRuleChoose(env, state, choice) {
    const b = atlasBoardRuleLedger(state);
    if (!atlasBoardRuleUnlocked(env, state) || !b.choice || state.atlas.run || !['risk', 'rest', 'promise'].includes(choice)) return false;
    if (choice === 'risk' && (b.risk >= env.C.maxRisk || b.boost >= env.C.maxBoost)) return false;
    if (choice === 'promise') {
        return atlasBoardRuleSwear(env, b);
    }
    atlasBoardRuleApplyEvent(env, b, choice); b.choice = false;
    if (choice === 'rest') b.message = env.deps._t('정비를 마쳤습니다. 심재 위험 {risk}.', { risk: b.risk });
    return true;
}

export function atlasBoardRuleSwear(env, b) {
    if (b.promise || b.risk + env.C.promise.risk > env.C.maxRisk) return false;
    b.risk += env.C.promise.risk; b.promise = true; b.choice = false;
    b.message = env.T.messages.promiseTaken;
    return true;
}

export function atlasBoardRuleTierFor(b) { return Math.min(20, 8 + b.risk + Math.min(6, b.lap)); }

export function atlasBoardRuleLossPctFor(env, b, boss) { return env.C.lossPct + (b.promise && boss ? env.C.promise.lossPct : 0); }

export function atlasBoardRulePlan(env, state) {
    const b = atlasBoardRuleLedger(state), p = b.pending;
    if (!atlasBoardRuleUnlocked(env, state) || !p) return null;
    const t = atlasBoardRuleTile(env, p.position), boss = t.kind === 'boss';
    return { id: p.id, node: t.node, boss, name: t.name, tier: atlasBoardRuleTierFor(b),
        risk: b.risk, boost: b.boost, diceFound: boss && p.diceFound === true };
}

export function atlasBoardRuleNormalizeRun(env, raw, state) {
    const p = atlasBoardRulePlan(env, state);
    return raw && p && raw.id === p.id ? p : null;
}

export function atlasBoardRuleFail(env, state, run) {
    const b = atlasBoardRuleLedger(state);
    if (!run || !b.pending || b.pending.id !== run.id) return false;
    const loss = atlasBoardRuleLossPctFor(env, b, run.boss);
    atlasBoardRulePayout(env, b, loss / 100); b.pending = null;
    if (run.boss) b.promise = false;
    b.message = env.T.messages.fail(loss);
    return true;
}

export function atlasBoardRuleComplete(env, state, run) {
    const b = atlasBoardRuleLedger(state);
    if (!run || !b.pending || b.pending.id !== run.id) return null;
    const scale = (1 + run.boost / 100) * (run.boss ? 2 : 1);
    for (const [key, value] of Object.entries(env.C.baseRewards)) b.bank[key] = (b.bank[key] || 0) + Math.ceil(value * scale);
    b.gear += 1;
    b.pending = null;
    if (!run.boss) { b.message = env.T.messages.clear; return { rewards: [], gear: 0, boss: false }; }
    return atlasBoardRuleSettleBoss(env, b, run);
}

export function atlasBoardRuleSettleBoss(env, b, run) {
    b.bank.goldenRule = (b.bank.goldenRule || 0) + 1;
    const dice = run.diceFound ? Math.min(1, env.C.diceCap - b.dice) : 0;
    const result = { rewards: atlasBoardRulePayout(env, b, 1, b.promise ? env.C.promise.rewardPct : 0), gear: b.gear, boss: true, dice };
    b.dice += dice;
    b.position = 0; b.lap += 1; b.risk = 0; b.boost = 0; b.gear = 0; b.trail = []; b.promise = false;
    b.message = env.T.messages.complete(b.lap) + (dice ? ' ' + env.T.messages.diceFound : '');
    return result;
}

/** 주사위가 나오는 곳: 아틀라스 지도 안(원정이 연 지도는 빼고). */
export function atlasBoardRuleEligible(env, state, zone) {
    return atlasBoardRuleUnlocked(env, state) && !state.atlas.run?.board && !!zone && zone.type === 'atlasMap';
}

/** 아틀라스 지도의 몬스터(보스와 소환수는 빼고)를 잡을 때마다 C.diceDrop의 확률로 주사위 하나. 한 몬스터는 한 번만 굴린다. */
export function atlasBoardRuleOnKill(env, state, enemy, zone, random = Math.random) {
    if (enemy.boardDiceClaimed || enemy.isBoss || enemy.isSummon || !atlasBoardRuleEligible(env, state, zone)) return 0;
    enemy.boardDiceClaimed = true;
    if (random() >= (enemy.isElite ? env.C.diceDrop.elite : env.C.diceDrop.normal)) return 0;
    atlasBoardRuleSync(env, state);
    const b = atlasBoardRuleLedger(state), n = Math.min(1, env.C.diceCap - b.dice);
    b.dice += n;
    return n;
}
