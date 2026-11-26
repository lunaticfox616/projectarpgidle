export const TAU = Math.PI * 2;
export const ORB = Object.freeze({ range: 6, speed: 240 / 72, every: 50, spin: 0.62, nova: 16, past: 1.2, least: 3, stagger: 90, release: 320, fan: 0.24, stepMs: 20,
    bolt: Object.freeze({ reach: 2.6, speed: 520 / 72, pct: 22, hitX: 0.3, hitY: 0.45 }) });
export const BOLT_LIFE = ORB.bolt.reach / ORB.bolt.speed * 1000;
export const ORBIT = Object.freeze({ life: 12000, every: 900, pct: 32, reach: 3, max: Object.freeze([5, 7, 10]), first: 240, firstStep: 110, avoid: 400, retry: 200, release: 320 });
export const RIFT = Object.freeze({ middle: 2, half: 0.75, depth: 4.5, pull: 1.2, pullAt: 90, close: 520, pct: 60, impact: 630, hold: 200, grow: 0.5 });
// 일섬의 depth: 자기 줄에서 위아래로 닿는 칸(2026-11-15 사용자 "위 아래도 한칸씩 더 벨 수 있게": 0.6 → 1.6, 다가가기 표 data/skills.js의 band 1과 맞춘다)
export const ISSEN = Object.freeze({ reach: 10, depth: 1.6, grow: 0.25, delay: 220, impact: 350, hold: 200, cuts: 6 });
export const VOID = Object.freeze({ radius: 3, pullCells: 2, spirit: 40, hit: 300, gap: 30, weak: 4000, impact: 400, hold: 200, fly: 260 });
export const STORM = Object.freeze({ range: 5, radius: 2, charge: 180, stagger: 200, pct: 200 });
export const CAULDRON = Object.freeze({ range: 6, radius: 2.5, pour: 260, fall: 130, every: 250, pcts: Object.freeze([80, 50, 50]), impact: 840, hold: 200 });
export const BELL = Object.freeze({ range: 6, radius: 3, drop: 220, tolls: Object.freeze([300, 750]), pcts: Object.freeze([120, 80]), least: 35, wave: 320, impact: 320, hold: 200 });
export const CHANDELIER = Object.freeze({ range: 5, radius: 2, hang: 140, fall: 220, pct: 100, fireLag: 70, contact: 540, frame: 6, mageContact: 630, mageFrame: 7, hold: 140 });
export const GAVEL = Object.freeze({ near: 0.5, far: 3.5, depth: 1.5, grow: 0.25, length: 2.3, windup: 150, swing: 170, pct: 120, impact: 320, hold: 200,
    verdict: Object.freeze({ delay: 200, gap: 45, pct: 60, lag: 50 }) });
// 2026-11-26 전달본 V3.24 후속(96 계약)과 V3.25(97 영혼 흡수, 99 야만스러운 난격). release: 시전 동작이 놓이는 때(오브 cast, 맨손 flurry).
// 계약: 문양(seal) 뒤 주먹이 떨어져(fall) 그 순간 둘레를 친다(전달본: 연출 시작 0.34초에 적중).
export const PACT = Object.freeze({ range: 6, radius: 3, release: 320, seal: 200, fall: 140, hold: 360, pct: 170, after: 640 });
// 영혼 흡수: 둘레 reach칸(네모) 안 가까운 적 1명 + levels마다 1명, gap마다 하나씩 뽑는다. 영혼은 pull 동안 뽑혀 나와 fly 동안 시전자에게 난다.
// 보호막은 준 피해의 shieldPct%, 최대 생명력의 capLifePct%까지, lifeMs 동안(다시 얻으면 새로 찬다).
export const SOUL = Object.freeze({ reach: 5, release: 320, gap: 70, pull: 140, fly: 420, pct: 130, levels: Object.freeze([5, 10, 15, 20]),
    shieldPct: 40, capLifePct: 40, lifeMs: 8000, hold: 200 });
// 야만스러운 난격: 앞 depth칸, 위아래 band줄. 레벨(hits의 열쇠 이상 가운데 가장 높은 것)마다 친 횟수, 간격은 gap과 maxDur / 횟수 가운데 짧은 쪽(least 아래로는 안 줄어든다).
export const FLURRY = Object.freeze({ depth: 2, band: 1, release: 210, gap: 120, maxDur: 1800, least: 40,
    hits: Object.freeze([[1, 3], [5, 6], [10, 9], [15, 12], [20, 15], [25, 30]]) });
