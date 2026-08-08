// 백그라운드 복귀 정산의 "남은 구간 예상" 행동 검사.
//
// 왜 중요한가: 정산이 45초를 넘거나 [빠른 계산]을 누르면 남은 구간을 표본으로 예상한다.
// 예전에는 표본에서 얻은 재화에 배율(최대 9~10배)을 그대로 곱했다. 재화마다 확률이
// 자릿수 단위로 다르므로(황금률 일반 0.01375% / 보스 1.25%, 나무꾼의 손길은 그 1/1200),
// 표본에서 우연히 하나 나오면 그 우연이 10배로 증폭돼 "10%는 잭팟, 90%는 0"이 됐다.
// 지금은 남은 처치 수만큼 실제 드랍을 다시 굴린다.
const assert = require('assert');
const fs = require('fs');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
const { extrapolateBackgroundRemainder, rollBackgroundCurrencyRemainder, roundStochastic, getCurrencyDrops } = runtime;

assert.strictEqual(typeof extrapolateBackgroundRemainder, 'function');
assert.strictEqual(typeof rollBackgroundCurrencyRemainder, 'function');
assert.strictEqual(typeof getCurrencyDrops, 'function');

const SAMPLE_MS = 108 * 1000;
const REMAINDER_MS = 972 * 1000;   // 표본 10% / 남은 90% = 최대 배율 9배

function makeState(extra) {
    return {
        currencies: { goldenRule: 0, ouroboros: 0, magicBud: 0, fossil: 0 },
        exp: 0, level: 1, loopKills: 0, loopDeaths: 0,
        ...extra
    };
}

// 1) 회귀: 표본의 희귀 재화가 배율로 증폭되지 않는다.
// 처치 구성을 0으로 두면 남은 구간에서 굴릴 것이 없으므로, 표본 실측이 그대로 남아야 한다.
{
    const state = makeState({
        currencies: { goldenRule: 1, ouroboros: 1, magicBud: 3, fossil: 2 },
        backgroundKillMix: { normal: 0, elite: 0, boss: 0 }
    });
    extrapolateBackgroundRemainder(state, { kills: 0, deaths: 0, exp: 0, expLost: 0 }, SAMPLE_MS, REMAINDER_MS);
    assert.strictEqual(state.currencies.goldenRule, 1, '표본의 황금률 1개가 곱해지면 안 된다');
    assert.strictEqual(state.currencies.ouroboros, 1, '나무꾼의 손길도 마찬가지');
    assert.strictEqual(state.currencies.magicBud, 3, '흔한 재화도 곱하지 않는다(굴려서 얻는다)');
}

// 2) 처치 구성을 모르면 굴리지 않는다(구버전 저장/경로 안전).
// 희귀 재화를 부풀리느니 덜 주는 쪽이 안전하다.
{
    const state = makeState({ currencies: { goldenRule: 1 } });
    const rolled = rollBackgroundCurrencyRemainder(state, null, 9);
    assert.strictEqual(rolled, false, '처치 구성이 없으면 굴리지 않는다');
    assert.strictEqual(state.currencies.goldenRule, 1, '표본 실측만 남는다');
}

// 3) 남은 구간의 재화는 실제로 굴려서 늘어난다(흔한 재화로 확인).
{
    const state = makeState({ backgroundKillMix: { normal: 2000, elite: 100, boss: 5 } });
    const rolled = rollBackgroundCurrencyRemainder(state, state.backgroundKillMix, 9);
    assert.strictEqual(rolled, true, '처치 구성이 있으면 굴린다');
    assert.ok(state.currencies.magicBud > 0, '흔한 재화는 남은 구간에서 실제로 나온다');
}

// 4) 기대값 보존: 확률적 반올림이 소수 처치를 계통적으로 버리지 않는다.
// 그냥 Math.round를 쓰면 0.4마리는 항상 0마리가 되어, 표본에 적게 잡히는 보스가
// 통째로 사라진다. 보스는 일반 몹보다 재화 확률이 90배라 곧바로 기대값이 반토막 났다.
{
    const trials = 4000;
    let sum = 0;
    for (let i = 0; i < trials; i++) sum += roundStochastic(0.3);
    const mean = sum / trials;
    assert.ok(Math.abs(mean - 0.3) < 0.03, `확률적 반올림의 평균이 0.3에 가까워야 한다(실측 ${mean.toFixed(3)})`);
    assert.ok(Number.isInteger(roundStochastic(0.7)), '결과는 정수여야 한다');
    assert.strictEqual(roundStochastic(4), 4, '정수는 그대로 둔다');
}

// 5) 통계적 타당성: 표본을 실제로 1/10 뽑아 외삽한 결과가 전체 시뮬과 같은 수준이어야 한다.
// (표본에 보스가 잡힐 확률까지 재현해야 공정한 비교가 된다.)
{
    const full = { normal: 200, elite: 10, boss: 1 };
    const trials = 120;
    const sampleOf = n => {
        const base = Math.floor(n / 10);
        return base + (Math.random() < ((n / 10) - base) ? 1 : 0);
    };
    const rollGoldenRule = mix => {
        let total = 0;
        [[mix.normal, { isBoss: false, isElite: false }], [mix.elite, { isBoss: false, isElite: true }], [mix.boss, { isBoss: true, isElite: false }]]
            .forEach(([count, enemy]) => {
                for (let i = 0; i < count; i++) {
                    (getCurrencyDrops(enemy) || []).forEach(drop => { if (drop && drop[0] === 'goldenRule') total += drop[1]; });
                }
            });
        return total;
    };
    let extrapolated = 0;
    let direct = 0;
    for (let i = 0; i < trials; i++) {
        const sample = { normal: sampleOf(full.normal), elite: sampleOf(full.elite), boss: sampleOf(full.boss) };
        const state = makeState({ currencies: { goldenRule: rollGoldenRule(sample) }, backgroundKillMix: sample });
        extrapolateBackgroundRemainder(state, { kills: 0, deaths: 0, exp: 0, expLost: 0 }, SAMPLE_MS, REMAINDER_MS);
        extrapolated += state.currencies.goldenRule;
        direct += rollGoldenRule(full);
    }
    // 극저확률 사건이라 표본 오차가 크다. 자릿수가 뒤집히지 않는지만 고정한다.
    const ratio = (extrapolated + 1) / (direct + 1);
    assert.ok(ratio > 0.4 && ratio < 2.5,
        `외삽이 전체 시뮬과 같은 수준이어야 한다(외삽 ${extrapolated} / 직접 ${direct}, 비 ${ratio.toFixed(2)})`);
}

// 6) 아이템은 여전히 외삽하지 않는다(고유 하나가 9개로 늘면 안 된다).
{
    const state = makeState({
        inventory: [{ name: '고유', rarity: 'unique' }],
        jewelInventory: [{ name: '주얼' }],
        backgroundKillMix: { normal: 500, elite: 20, boss: 1 }
    });
    extrapolateBackgroundRemainder(state, { kills: 500, deaths: 0, exp: 1000, expLost: 0 }, SAMPLE_MS, REMAINDER_MS);
    assert.strictEqual(state.inventory.length, 1, '아이템은 표본 실측만 유지한다');
    assert.strictEqual(state.jewelInventory.length, 1, '주얼도 마찬가지');
}

// 7) 경험치·처치·사망은 예전처럼 비례 반영한다(고빈도·저분산이라 곱해도 안전하다).
{
    const state = makeState({ backgroundKillMix: { normal: 10, elite: 0, boss: 0 }, loopKills: 100, exp: 0 });
    extrapolateBackgroundRemainder(state, { kills: 100, deaths: 2, exp: 1000, expLost: 0 }, SAMPLE_MS, REMAINDER_MS);
    assert.strictEqual(state.loopKills, 100 + 900, '처치 수는 비례 반영');
    assert.strictEqual(state.loopDeaths, 18, '사망도 비례 반영');
}

// 8) 굴림 상한: 표본이 매우 커도 복귀가 매달리지 않는다.
{
    const state = makeState({ backgroundKillMix: { normal: 100000, elite: 3000, boss: 50 } });
    const startedAt = Date.now();
    rollBackgroundCurrencyRemainder(state, state.backgroundKillMix, 9);
    const elapsed = Date.now() - startedAt;
    assert.ok(elapsed < 8000, `굴림에 상한이 있어야 한다(실측 ${elapsed}ms)`);
    assert.ok(state.currencies.magicBud > 0, '상한을 넘겨도 보상은 나온다');
}

// ── 배선 ────────────────────────────────────────────────────────────
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
assert.ok(/game\.isBackgroundCalculation[\s\S]{0,400}backgroundKillMix/.test(combatSource),
    '시뮬레이션 중에만 처치 구성을 세야 한다');
assert.ok(/game\.backgroundKillMix = \{ normal: 0, elite: 0, boss: 0 \}/.test(uiSource),
    '시뮬레이션 시작 시 처치 구성을 초기화해야 한다');
assert.ok(/delete simGame\.backgroundKillMix/.test(uiSource),
    '집계용 필드를 저장 상태에 남기지 않아야 한다');
assert.ok(!/gain \* ratio/.test(uiSource),
    '재화를 표본 결과에 배율로 곱하는 경로가 남아 있으면 안 된다');

console.log('smoke-background-extrapolation passed');
