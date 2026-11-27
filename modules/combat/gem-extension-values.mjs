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
// 2026-11-27 V3.24 시뮬레이터의 93~95(불의 세례 V3.15.3, 독사의 춤 V3.16.7 리메이크). 칸으로 잰 값은 그대로, 시뮬레이터 화면 도트(72×36 칸)로 잰 값은 칸으로 옮겼다.
// 불의 세례: 향로의 단타가 놓이는 때(release, 향로 attack 동작의 타격 장) 뒤 wind를 기다렸다가 sweep 동안 한 번 가로지른다. swing: 진자의 가로 반폭(칸,
// 시뮬레이터 화면 너비 960 × 0.66 / 칸 72). reach: 판정의 가로(앞뒤 칸, 일섬과 같은 "화면 끝에서 끝까지"). depth ±칸(효과 확장 1마다 grow칸 더). push: 지나가는 쪽으로 밀어내는
// 칸(전달본 1.5칸을 정수 칸으로 올렸다). 피해는 적마다 한 번(pct).
export const PENDULUM = Object.freeze({ release: 320, wind: 120, sweep: 640, swing: 8.8, reach: 10, depth: 1, grow: 0.25, push: 2, pct: 100, hold: 200, smoke: 2100 });
// 독사의 춤: 한손검 spin 동작의 첫 타격 장(release)에 칼날을 펼쳐(spread) 둘레를 spin 동안 한 바퀴 훑는다(act: 동작 전체). 타원 radius칸(효과 확장 1마다 1칸 더)
// 안의 적은 칼날이 지나가는 순서로 pct% 한 번 맞고 출혈(물리 12% × 4)과 중독(카오스 10% × 5)에 걸린다. 지속 피해는 게임의 출혈, 중독이다(0.1초마다 깎는다):
// 합(12% × 4 = 48%, 10% × 5 = 50%)과 길이(500ms × 4 = 2초, × 5 = 2.5초)를 그대로 두고, 다시 맞으면 시간만 새로 채운다(겹치지 않는다).
export const VIPER = Object.freeze({ release: 280, spread: 110, spin: 430, act: 700, radius: 3, pct: 80, linger: 500,
    bleed: Object.freeze({ pct: 12, hits: 4, every: 500 }), poison: Object.freeze({ pct: 10, hits: 5, every: 500 }) });
// 강림: 거리 제한 없이 가장 가까운(잠근) 적 곁으로 뛰어 화면 밖으로 사라졌다가(wind 웅크림, up 솟구침, hang 안 보임, fall 내리꽂힘) 착지 둘레 radius칸을
// pct%로 치고, quake.every마다 quake.radii칸 둘레를 quake.pct%로 다시 친다(같은 적도 물결마다). 착지 둘레의 가운데는 착지한 칸에서 보는 쪽으로 ahead칸.
export const DESCENT = Object.freeze({ wind: 90, up: 200, hang: 240, fall: 130, radius: 2, pct: 60, ahead: 0.5, hold: 200,
    quake: Object.freeze({ every: 260, radii: Object.freeze([3, 4]), pct: 20, life: 620 }) });
