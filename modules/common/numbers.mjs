/** UI 스킨은 도트 HUD 배치(균열 등불) 하나다. 예전 스킨(검은 성유물함 · 녹청 성당 · 핏빛 참회)은 옛 세로 칸 배치라 새 HUD를
 * 담지 못해(PC에서 생명 구슬이 화면 밖으로 밀렸다) 저장에 남아 있어도 균열 등불로 읽는다. */
function normalizeUiSkin() {
    return 'rift';
}

/** Stored user scale in percent, independent of the current monitor's pixel ratio. */
function normalizeUiScale(value) {
    const number = Number(value);
    return [80, 90, 100, 110, 125, 150, 175, 200, 225, 250].includes(number) ? number : 100;
}

// TODO: expose shared utility functions incrementally.

// Phase-3 extracted shared utility/stat formatting helpers.
function clampNumber(value, min, max) { return Math.max(min, Math.min(max, value)); }

/** 도트 글꼴의 제 크기: base(갈무리11 12, 갈무리14 15, 갈무리9 10px)의 정수배 가운데 size에 가장 가까운 크기. 사이 크기는 도트가 번진다(2026-10-21). */
function pixelFontSize(size, base) { return base * Math.max(1, Math.round(size / base)); }

function lerpNumber(start, end, t) { return start + (end - start) * t; }

function approachNumber(current, target, rate, dt) {
    if (!Number.isFinite(current)) return target;
    if (!Number.isFinite(target)) return current;
    let blend = 1 - Math.exp(-Math.max(0, rate || 0) * Math.max(0, dt || 0));
    return current + (target - current) * blend;
}

function rndChoice(list) { return list[Math.floor(Math.random() * list.length)]; }

function hashSeed(value) {
    let str = String(value);
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function createSeededRng(seedValue) {
    let state = hashSeed(seedValue) || 1;
    return function() {
        state += 0x6D2B79F5;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * 도감처럼 같은 기본 확률을 보강하는 보너스를 합연산한다.
 * 지역 티어·몬스터 특성처럼 드랍 환경 자체의 배율은 호출부에서 별도로 곱한다.
 * @param {number} codexBonusPct
 * @param {number} challengeBonusPct
 * @returns {number}
 */
function getAdditiveDropBonusMultiplier(codexBonusPct, challengeBonusPct) {
    let codexRatio = Math.max(0, Number(codexBonusPct) || 0) / 100;
    let challengeRatio = Math.max(0, Number(challengeBonusPct) || 0) / 100;
    return 1 + codexRatio + challengeRatio;
}

export { normalizeUiSkin, normalizeUiScale, clampNumber, pixelFontSize, lerpNumber, approachNumber, rndChoice, hashSeed, createSeededRng, getAdditiveDropBonusMultiplier };
