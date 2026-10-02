'use strict';
/* 액트별 색표(그린 화풍, 2026-10-02). 단계는 어두움 → 밝음, 그림자는 푸른 보라로, 밝은 쪽은 따뜻한 노랑으로 기운다.
 * P는 한 번에 한 액트씩 채운다(useAct). 그리는 모듈은 모두 그리는 순간의 P를 읽는다. */
const { fromLch } = require('./oklab.cjs');

const DEG = Math.PI / 180;
const turn = (h, target, t) => h + ((((target - h) % 360) + 540) % 360 - 180) * t;
/** n단계: 밝기 l0..l1, 채도 c는 가운데가 가장 높고 어두울수록 낮게, 색상 h는 어두운 쪽 285°, 밝은 쪽 80°로 조금씩. */
function ramp(h, c, l0, l1, n = 6, drift = 0.18) {
    return Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1), L = l0 + (l1 - l0) * t;
        const hue = t < 0.5 ? turn(h, 285, drift * (0.5 - t) * 2) : turn(h, 80, drift * (t - 0.5) * 2);
        const C = c * (0.65 + 0.35 * Math.sin(Math.PI * t)) * Math.min(1, 0.4 + L);
        return '#' + fromLch(L, C, hue * DEG).toString(16).padStart(6, '0');
    });
}

const SHARED = {
    ink: ['#120e16'],
    bone: ['#4e463f', '#6e6458', '#a39780', '#cfc4ab', '#ece5d2'],
    iron: ['#16141a', '#28252e', '#3d3944', '#57525e'],
    fire: ['#a8341c', '#e0612f', '#ffa43c', '#ffd66a', '#fff4c8'],
    wax: ['#8a7c6e', '#c9bba4', '#ece2cc', '#fffaf0'],
    gold: ['#6e5222', '#9c7a2e', '#c9a240', '#e8c862', '#fbe9a6'],
    glow: ['#2c5a62', '#3f8a90', '#6cc4c4', '#b4f0ec', '#efffff'],
    web: ['#c8c2cc']
};

const ACTS = {
    1: { // 뿌리끝 성소: 회색 돌, 모브빛 흙, 차분한 이끼(손으로 고른 색, 2026-10-02 확정)
        dark: ['#141018', '#1a151f', '#211b27'],
        stone: ['#1c1822', '#2b2633', '#3a3443', '#4a4352', '#5b5361', '#6e6571', '#857b84'],
        moss: ['#1d241f', '#27312a', '#323f33', '#3e4c3b', '#4d5b44', '#606c50'],
        earth: ['#231b1f', '#33272b', '#433438', '#544246', '#665256', '#7c676a'],
        wood: ['#24181c', '#3a2626', '#55382f', '#714c39', '#8f6446', '#ad8058']
    },
    2: { // 가지치기의 중정: 푸른 회녹색 돌, 다듬은 생울타리
        dark: ['#0e1215', '#13191c', '#192024'],
        stone: ramp(205, 0.026, 0.17, 0.72, 7), moss: ramp(150, 0.045, 0.2, 0.58), hedge: ramp(145, 0.075, 0.2, 0.66),
        earth: ramp(175, 0.02, 0.15, 0.5), wood: ramp(50, 0.05, 0.16, 0.62)
    },
    3: { // 허공뿌리 현수림: 깊은 푸른 허공 위 뼈빛 돌과 뿌리
        dark: ['#07080d', '#0c0f17', '#121724'],
        stone: ramp(75, 0.024, 0.22, 0.86, 7), moss: ramp(115, 0.04, 0.25, 0.62),
        earth: ramp(62, 0.02, 0.18, 0.56), wood: ramp(62, 0.045, 0.2, 0.78)
    },
    4: { // 갈림뿌리 미궁: 적갈색 서재 겸 연금실, 초록 물약
        dark: ['#120b0d', '#180f12', '#1f1418'],
        stone: ramp(22, 0.032, 0.15, 0.62, 7), moss: ramp(130, 0.04, 0.2, 0.55),
        earth: ramp(28, 0.03, 0.13, 0.5), wood: ramp(35, 0.07, 0.15, 0.66),
        glow: ramp(150, 0.12, 0.35, 0.92, 5), book: ['#7a2e2e', '#2e4a7a', '#3c6a3a', '#8a6a2a', '#5a3a6a', '#a8946a']
    },
    5: { // 지주근의 침묵 성소: 갈색 신전 돌, 검은 물
        dark: ['#110d0c', '#171211', '#1e1816'],
        stone: ramp(50, 0.03, 0.15, 0.68, 7), moss: ramp(125, 0.04, 0.2, 0.55),
        earth: ramp(45, 0.025, 0.13, 0.5), wood: ramp(45, 0.05, 0.15, 0.6),
        water: ['#06080c', '#0c1218', '#13202a', '#1e3440', '#3a6a74', '#8ac6c4']
    },
    6: { // 무너진 중정: 어두운 갈색 폐허, 마른 풀, 부러진 흰 자작나무
        dark: ['#100d0b', '#16120f', '#1d1814'],
        stone: ramp(55, 0.02, 0.15, 0.64, 7), moss: ramp(100, 0.05, 0.25, 0.62),
        earth: ramp(60, 0.03, 0.14, 0.52), wood: ramp(50, 0.05, 0.15, 0.6),
        grass: ramp(88, 0.08, 0.32, 0.82), birch: ['#2c2a2e', '#6e6a68', '#a8a49c', '#d2cec4', '#efece4'],
        leaf: ramp(52, 0.12, 0.38, 0.8, 5)
    },
    7: { // 말라가는 큰 줄기: 줄기 속 세피아와 호박빛 나무, 보랏빛 수액
        dark: ['#120c08', '#1a110c', '#221710'],
        stone: ramp(55, 0.03, 0.16, 0.66, 7), moss: ramp(95, 0.045, 0.22, 0.6),
        earth: ramp(52, 0.04, 0.14, 0.52), wood: ramp(60, 0.075, 0.16, 0.74),
        glow: ramp(312, 0.13, 0.3, 0.88, 5), fungus: ramp(72, 0.06, 0.35, 0.88, 5)
    },
    8: { // 끝없는 장막의 줄기: 보랏빛 허공 위 보라 회색 판석, 등나무꽃
        dark: ['#0a0810', '#100d18', '#161222'],
        stone: ramp(300, 0.03, 0.16, 0.66, 7), moss: ramp(165, 0.035, 0.2, 0.55),
        earth: ramp(310, 0.025, 0.14, 0.5), wood: ramp(30, 0.05, 0.18, 0.62),
        wisteria: ramp(305, 0.1, 0.38, 0.9, 5)
    },
    9: { // 비탄의 교차: 모브빛 바위, 분홍 꽃잎
        dark: ['#120b10', '#191016', '#20151d'],
        stone: ramp(340, 0.03, 0.16, 0.64, 7), moss: ramp(140, 0.035, 0.2, 0.55),
        earth: ramp(350, 0.026, 0.14, 0.5), wood: ramp(30, 0.05, 0.16, 0.6),
        blossom: ramp(352, 0.09, 0.42, 0.9, 5)
    },
    10: { // 합일의 차륜: 별 뜬 허공 위 흑요석과 금
        dark: ['#05050b', '#0a0a14', '#100f1e'],
        stone: ramp(275, 0.022, 0.1, 0.5, 7), moss: ramp(200, 0.03, 0.15, 0.45),
        earth: ramp(275, 0.02, 0.1, 0.38), wood: ramp(40, 0.04, 0.14, 0.5),
        glow: ramp(240, 0.1, 0.45, 0.95, 5)
    }
};

const hex = s => parseInt(s.slice(1), 16);
const P = {};
/** P를 그 액트의 색표(0xRRGGBB)로 채운다. 공통 색표 위에 액트 색표를 덮는다. */
function useAct(act) {
    for (const k of Object.keys(P)) delete P[k];
    for (const [k, list] of Object.entries({ ...SHARED, ...ACTS[act] })) P[k] = list.map(hex);
}
/** 그 액트의 색표를 #hex 그대로(Palette와 관문 그림용). 'teal'은 관문 봉인 빛이라 glow를 쓴다. */
function rampsOf(act) {
    const ramps = { ...SHARED, ...ACTS[act] };
    return { ...ramps, teal: ramps.glow };
}
function mix(a, b, t) {
    const ch = s => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
    return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
const TORCH = hex('#ff9a48'), SKY = hex('#cdd6f2'), COOL = hex('#7fe0dc'), GREEN = hex('#8ff0a0'), VIOLET = hex('#d49cff');
const ambient = () => P.dark[0];
module.exports = { P, useAct, rampsOf, mix, ambient, TORCH, SKY, COOL, GREEN, VIOLET };
