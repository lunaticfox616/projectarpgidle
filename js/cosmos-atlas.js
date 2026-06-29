(function() {
    'use strict';

    const COSMOS_PLANETS = [
        {
                "name": "시리온",
                "source": "Sirius",
                "theme": "우주계 관문 / 백색성",
                "orbit": 0,
                "tag": "gateway"
        },
        {
                "name": "베가라",
                "source": "Vega",
                "theme": "별빛 수정 / 마력",
                "orbit": 1,
                "tag": "arcane"
        },
        {
                "name": "리겔룸",
                "source": "Rigel",
                "theme": "냉기 거성 / 동결",
                "orbit": 1,
                "tag": "cold"
        },
        {
                "name": "베텔기아",
                "source": "Betelgeuse",
                "theme": "붉은 초거성 / 화염 폭발",
                "orbit": 1,
                "tag": "fire"
        },
        {
                "name": "알데바란트",
                "source": "Aldebaran",
                "theme": "추적자 / 사냥",
                "orbit": 1,
                "tag": "hunt"
        },
        {
                "name": "안타리온",
                "source": "Antares",
                "theme": "붉은 독성 / 출혈",
                "orbit": 1,
                "tag": "venom"
        },
        {
                "name": "카노푸스",
                "source": "Canopus",
                "theme": "고대 항해성 / 유물",
                "orbit": 2,
                "tag": "relic"
        },
        {
                "name": "아크투라",
                "source": "Arcturus",
                "theme": "수호자 / 방어",
                "orbit": 2,
                "tag": "guard"
        },
        {
                "name": "알타이르",
                "source": "Altair",
                "theme": "고속 궤도 / 회피",
                "orbit": 2,
                "tag": "speed"
        },
        {
                "name": "데네브라",
                "source": "Deneb",
                "theme": "백조자리 / 투사체",
                "orbit": 2,
                "tag": "projectile"
        },
        {
                "name": "폴라리스",
                "source": "Polaris",
                "theme": "길잡이 / 지도",
                "orbit": 2,
                "tag": "map"
        },
        {
                "name": "스피카르",
                "source": "Spica",
                "theme": "수확 / 씨앗",
                "orbit": 2,
                "tag": "seed"
        },
        {
                "name": "레굴론",
                "source": "Regulus",
                "theme": "왕성 / 보스",
                "orbit": 2,
                "tag": "boss"
        },
        {
                "name": "포말하우트",
                "source": "Fomalhaut",
                "theme": "심해 우주 / 보호막",
                "orbit": 2,
                "tag": "shield"
        },
        {
                "name": "프로키온",
                "source": "Procyon",
                "theme": "선행자 / 루프 가속",
                "orbit": 2,
                "tag": "loop"
        },
        {
                "name": "카펠리아",
                "source": "Capella",
                "theme": "황금빛 / 재화",
                "orbit": 3,
                "tag": "wealth"
        },
        {
                "name": "카스토라",
                "source": "Castor",
                "theme": "쌍둥이 / 분신",
                "orbit": 3,
                "tag": "mirror"
        },
        {
                "name": "폴룩시아",
                "source": "Pollux",
                "theme": "쌍둥이 / 생명력",
                "orbit": 3,
                "tag": "vital"
        },
        {
                "name": "벨라트릭스",
                "source": "Bellatrix",
                "theme": "전사성 / 치명타",
                "orbit": 3,
                "tag": "crit"
        },
        {
                "name": "알닐람",
                "source": "Alnilam",
                "theme": "오리온 허리띠 / 중심선",
                "orbit": 3,
                "tag": "belt"
        },
        {
                "name": "민타카르",
                "source": "Mintaka",
                "theme": "차원문 / 관문",
                "orbit": 3,
                "tag": "gate"
        },
        {
                "name": "알니타크",
                "source": "Alnitak",
                "theme": "사슬 / 결박",
                "orbit": 3,
                "tag": "bind"
        },
        {
                "name": "미라크라",
                "source": "Mirach",
                "theme": "거울빛 / 반사",
                "orbit": 3,
                "tag": "reflect"
        },
        {
                "name": "미르파크",
                "source": "Mirfak",
                "theme": "거대 전장 / 광역",
                "orbit": 3,
                "tag": "aoe"
        },
        {
                "name": "알골리스",
                "source": "Algol",
                "theme": "악마성 / 저주",
                "orbit": 3,
                "tag": "curse"
        },
        {
                "name": "마르카브",
                "source": "Markab",
                "theme": "돌진 / 충격파",
                "orbit": 3,
                "tag": "charge"
        },
        {
                "name": "스케아트",
                "source": "Scheat",
                "theme": "불안정 / 변질",
                "orbit": 3,
                "tag": "chaos"
        },
        {
                "name": "알페라츠",
                "source": "Alpheratz",
                "theme": "은하 관문 / 전이",
                "orbit": 3,
                "tag": "warp"
        },
        {
                "name": "두베론",
                "source": "Dubhe",
                "theme": "곰자리 / 체력",
                "orbit": 4,
                "tag": "tank"
        },
        {
                "name": "메라키온",
                "source": "Merak",
                "theme": "방향성 / 탐험",
                "orbit": 4,
                "tag": "path"
        },
        {
                "name": "페크다르",
                "source": "Phecda",
                "theme": "육체 / 재생",
                "orbit": 4,
                "tag": "regen"
        },
        {
                "name": "메그레즈",
                "source": "Megrez",
                "theme": "연결점 / 루프 노드",
                "orbit": 4,
                "tag": "node"
        },
        {
                "name": "알리오스",
                "source": "Alioth",
                "theme": "별빛 강화 / 스킬",
                "orbit": 4,
                "tag": "skill"
        },
        {
                "name": "미자르",
                "source": "Mizar",
                "theme": "이중성 / 추가 발동",
                "orbit": 4,
                "tag": "dual"
        },
        {
                "name": "알카이드",
                "source": "Alkaid",
                "theme": "끝별 / 고난도",
                "orbit": 4,
                "tag": "end"
        },
        {
                "name": "사드라",
                "source": "Sadr",
                "theme": "심장부 / 핵 보스",
                "orbit": 4,
                "tag": "core"
        },
        {
                "name": "라살하그",
                "source": "Rasalhague",
                "theme": "뱀주인 / 독",
                "orbit": 4,
                "tag": "poison"
        },
        {
                "name": "샤울라",
                "source": "Shaula",
                "theme": "전갈 꼬리 / 관통",
                "orbit": 4,
                "tag": "sting"
        },
        {
                "name": "사르가스",
                "source": "Sargas",
                "theme": "전갈성 / 치명 독",
                "orbit": 4,
                "tag": "toxiccrit"
        },
        {
                "name": "아크룩스",
                "source": "Acrux",
                "theme": "남십자 / 정화",
                "orbit": 4,
                "tag": "purify"
        },
        {
                "name": "가크룩시아",
                "source": "Gacrux",
                "theme": "붉은 십자 / 제물",
                "orbit": 5,
                "tag": "sacrifice"
        },
        {
                "name": "미모사르",
                "source": "Mimosa",
                "theme": "향기 / 꽃과 씨앗",
                "orbit": 5,
                "tag": "flower"
        },
        {
                "name": "하다리온",
                "source": "Hadar",
                "theme": "쌍성 / 동료",
                "orbit": 5,
                "tag": "companion"
        },
        {
                "name": "아케르나르",
                "source": "Achernar",
                "theme": "강의 끝 / 외곽",
                "orbit": 5,
                "tag": "outer"
        },
        {
                "name": "피코크라",
                "source": "Peacock",
                "theme": "공작별 / 화려한 보상",
                "orbit": 5,
                "tag": "reward"
        },
        {
                "name": "에니프론",
                "source": "Enif",
                "theme": "돌진 / 충격",
                "orbit": 5,
                "tag": "impact"
        },
        {
                "name": "하말리스",
                "source": "Hamal",
                "theme": "충돌 / 물리 피해",
                "orbit": 5,
                "tag": "physical"
        },
        {
                "name": "디프다르",
                "source": "Diphda",
                "theme": "고래 / 흡수",
                "orbit": 5,
                "tag": "absorb"
        },
        {
                "name": "주베누비아",
                "source": "Zubenelgenubi",
                "theme": "균형 / 선택 보상",
                "orbit": 5,
                "tag": "balance"
        },
        {
                "name": "주벤샤말",
                "source": "Zubeneschamali",
                "theme": "심판 / 최종 관문",
                "orbit": 5,
                "tag": "judgement"
        }
];
    const COSMOS_ASTEROID_NUMBERS = [32, 60, 81, 111, 115, 127, 132, 140, 155, 156, 164, 166, 168, 170, 181, 183, 195, 198, 204, 208, 211, 214, 227, 234, 241, 261, 264, 291, 299, 308, 331, 343, 349, 358, 365, 394, 406, 430, 431, 442, 463, 477, 486, 511, 533, 550, 554, 599, 681, 693, 702, 715, 726, 737, 756, 757, 761, 767, 769, 778, 781, 786, 800, 813, 824, 843, 866, 886, 900, 944, 947, 964, 969, 985, 1000];

    const COSMOS_LAYOUT_VERSION = 20260601;
    const DEFAULT_COSMOS_CAMERA_SCALE = 0.56;
    const GALAXY_SEQUENCE = [1, 2, 3, 4, 5];
    const PLANETS_PER_GALAXY = 10;
    const ASTEROIDS_PER_GALAXY = 15;
    const NODES_PER_GALAXY = PLANETS_PER_GALAXY + ASTEROIDS_PER_GALAXY;
    const GALAXY_BOSS_PLANET_INDEX = {
        1: 46,
        2: 47,
        3: 48,
        4: 49,
        5: 45
    };
    const COSMOS_BOSS_EQUIPMENT_DROP_CHANCE = 0.012;
    const COSMOS_BOSS_JEWEL_DROP_CHANCE = 0.005;
    const COSMOS_BOSS_TALISMAN_DROP_CHANCE = 0.005;
    const COSMOS_STONE_TIER_FLOORS = [1, 6, 11, 16, 21, 25];

    const ATLAS = {
        nodes: [],
        edges: [],
        byId: new Map(),
        canvas: null,
        ctx: null,
        host: null,
        detail: null,
        summary: null,
        tooltip: null,
        selectedId: 'planet-0',
        hoverId: null,
        camera: { x: 0, y: 0, scale: DEFAULT_COSMOS_CAMERA_SCALE },
        drag: { active: false, moved: false, startX: 0, startY: 0, baseX: 0, baseY: 0 },
        installed: false,
        needsFrame: false
    };

    const COSMOS_MASTERY_NODES = [
        { key: 'planetRelief', name: '행성 패널티 완화', max: 30, cost: 1, desc: '행성 진행도/중력 패널티 완화 +1.2% (최대 36%)' },
        { key: 'asteroidRelief', name: '소행성 수확 증폭', max: 24, cost: 1, desc: '소행성 클리어 별가루 +1.6% (최대 38.4%)' },
        { key: 'combatFocus', name: '전투 파밍 집중', max: 24, cost: 1, desc: '전투 드랍/전리품 기대치 +1.0% (최대 24%)' },
        { key: 'craftFocus', name: '제작 파밍 집중', max: 24, cost: 1, desc: '제작 재료 드랍 기대치 +1.0% (최대 24%)' },
        { key: 'stardustGain', name: '별가루 증폭', max: 30, cost: 1, desc: '우주계 별가루 획득 +1.0% (최대 30%)' },
        { key: 'challengeEase', name: '행성 난이도 완화', max: 22, cost: 1, desc: '행성 전투 난이도 -1.0% (최대 -22%)' },
        { key: 'highRisk', name: '고위험 난이도', max: 20, cost: 1, desc: '우주계 난이도 +1.5%(최대 +30%), 보상 +2.2%(최대 +44%)' },
        { key: 'bossBounty', name: '보스 보상 강화', max: 18, cost: 1, desc: '은하 보스 별가루 보상 +2.2% (최대 +39.6%)' },
        { key: 'routeInsight', name: '별길 통찰', max: 28, cost: 1, desc: '잠금 별길 해금 요구치 완화 +0.9% (최대 25.2%)' },
        { key: 'gravityHarness', name: '중력 제어', max: 22, cost: 1, desc: '중력 페널티 완화 +1.0% (최대 22%)' },
        { key: 'warpEfficiency', name: '항성 추진', max: 20, cost: 1, desc: '모든 우주계 클리어 별가루 +1.0% (최대 20%)' },
        { key: 'eliteHunt', name: '유물 감응', max: 20, cost: 1, desc: '보스 유물 드랍 확률 +0.7%p (최대 +14%p)' },
        { key: 'resonanceDrive', name: '공명 구동', max: 22, cost: 1, desc: '우주계 전투 최종 피해 +0.6% (최대 13.2%)' },
        { key: 'voidSurvey', name: '공허 측량', max: 20, cost: 1, desc: '소행성 보상 품질 +1.0% (최대 20%)' },
        { key: 'stellarForge', name: '항성 단조', max: 26, cost: 1, desc: '제작 재화 추가 획득 +0.9% (최대 23.4%)' },
        { key: 'echoCache', name: '에코 저장고', max: 20, cost: 1, desc: '탐사 완료 보너스 별가루 +1.0% (최대 20%)' },
        { key: 'riftGuard', name: '균열 방벽', max: 20, cost: 1, desc: '우주계 받는 피해 완화 +0.7% (최대 14%)' },
        { key: 'frontierTax', name: '개척자 세공', max: 18, cost: 1, desc: '깊은 궤도(4~5) 보상 +1.3% (최대 23.4%)' },
        { key: 'chainMastery', name: '초회 정복 보너스', max: 18, cost: 1, desc: '미클리어 노드 첫 완료 별가루 +2.0% (최대 36%)' },
        { key: 'apexProtocol', name: '은하 핵 반응', max: 22, cost: 1, desc: '보스 처치 별가루 +1.8% (최대 39.6%)' },
        { key: 'starbreaker', name: '성핵 분쇄', max: 12, cost: 1, desc: '보스 전투 피해 +1.8% (최대 21.6%)' }
    ];

    const COSMOS_MASTERY_LINKS = {
        planetRelief: [],
        asteroidRelief: ['planetRelief:6'],
        combatFocus: ['planetRelief:8'],
        craftFocus: ['asteroidRelief:8'],
        stardustGain: ['combatFocus:8', 'craftFocus:8'],
        challengeEase: ['planetRelief:12'],
        highRisk: ['challengeEase:8', 'stardustGain:10'],
        bossBounty: ['highRisk:6'],
        routeInsight: ['planetRelief:10'],
        gravityHarness: ['routeInsight:8'],
        warpEfficiency: ['routeInsight:10'],
        eliteHunt: ['combatFocus:10'],
        resonanceDrive: ['combatFocus:12', 'gravityHarness:10'],
        voidSurvey: ['asteroidRelief:10'],
        stellarForge: ['craftFocus:10', 'voidSurvey:8'],
        echoCache: ['stardustGain:10'],
        riftGuard: ['challengeEase:10', 'gravityHarness:10'],
        frontierTax: ['warpEfficiency:8', 'voidSurvey:10'],
        chainMastery: ['routeInsight:12', 'echoCache:8'],
        apexProtocol: ['bossBounty:8', 'riftGuard:8'],
        starbreaker: ['apexProtocol:10', 'resonanceDrive:10']
    };
    const GALAXY_SPECS = {
        0: { x: 0, y: 0, r: 180, angle: 0, accent: '#f8e7a0', label: 'G0 중심핵' },
        1: { x: 0, y: -760, r: 390, angle: -Math.PI / 2, accent: '#82d8ff', label: 'G1 관문권' },
        2: { x: 1110, y: -360, r: 410, angle: -Math.PI / 6, accent: '#b38cff', label: 'G2 북동은하' },
        3: { x: -1110, y: -360, r: 410, angle: -Math.PI * 5 / 6, accent: '#7cf2c8', label: 'G3 북서은하' },
        4: { x: 900, y: 820, r: 430, angle: Math.PI / 4, accent: '#ffb36e', label: 'G4 남동은하' },
        5: { x: -900, y: 820, r: 430, angle: Math.PI * 3 / 4, accent: '#ff80bc', label: 'G5 남서은하' }
    };
    function hashSeed(input) {
        let h = 2166136261;
        let s = String(input || '');
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function seeded01(seed) {
        let x = hashSeed(seed);
        x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
        return ((x >>> 0) % 100000) / 100000;
    }

    function escapeHtml(value) {
        if (typeof window.escapeHTML === 'function') return window.escapeHTML(value);
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatAsteroidNo(no) {
        return String(no).padStart(3, '0');
    }

    function getGalaxyForPlanetIndex(idx) {
        if (idx <= 0) return 0;
        return GALAXY_SEQUENCE[(idx - 1) % GALAXY_SEQUENCE.length];
    }

    function getGalaxyPlanetSlot(idx) {
        if (idx <= 0) return 0;
        return Math.floor((idx - 1) / GALAXY_SEQUENCE.length);
    }

    function getGalaxyForAsteroidIndex(idx) {
        return GALAXY_SEQUENCE[Math.max(0, Math.min(GALAXY_SEQUENCE.length - 1, Math.floor(idx / ASTEROIDS_PER_GALAXY)))];
    }

    // 은하별 티어 밴드 시작값: 시작(은하0)=1, G1=1, G2=6, G3=11, G4=16, G5=21.
    // 같은 은하 안에서는 시작점에서 멀어질수록(로컬 슬롯이 클수록) 밴드 내 +0~+4.
    function getGalaxyTierBandBase(galaxy) {
        return galaxy <= 0 ? 1 : ((Math.max(1, Math.min(5, Math.floor(galaxy))) - 1) * 5) + 1;
    }

    function getColorWithAlpha(hex, alpha) {
        const raw = String(hex || '#7fc9ff').replace('#', '');
        const full = raw.length === 3 ? raw.split('').map(ch => ch + ch).join('') : raw.padEnd(6, 'f').slice(0, 6);
        const num = parseInt(full, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, Number(alpha) || 0))})`;
    }

    function getGalaxyAccent(galaxy, alpha) {
        const spec = GALAXY_SPECS[galaxy] || GALAXY_SPECS[1];
        return alpha == null ? spec.accent : getColorWithAlpha(spec.accent, alpha);
    }

    function getGalaxySpiralPosition(galaxy, slot, seed, kind) {
        const spec = GALAXY_SPECS[galaxy] || GALAXY_SPECS[1];
        if (galaxy === 0) return { x: spec.x, y: spec.y };
        const safeSlot = Math.max(0, Math.min(NODES_PER_GALAXY - 1, Math.floor(slot || 0)));
        const normalized = NODES_PER_GALAXY <= 1 ? 0 : safeSlot / (NODES_PER_GALAXY - 1);
        const turn = spec.angle + 1.18 + safeSlot * 0.92 + seeded01(seed + ':turn') * 0.26;
        const inner = kind === 'planet' ? 58 : 130;
        const outer = spec.r * (kind === 'planet' ? 0.74 : 0.96);
        const radius = inner + (outer - inner) * Math.sqrt(normalized) + (seeded01(seed + ':radius') - 0.5) * (kind === 'planet' ? 24 : 44);
        const side = (seeded01(seed + ':side') - 0.5) * (kind === 'planet' ? 22 : 36);
        return {
            x: spec.x + Math.cos(turn) * radius + Math.cos(turn + Math.PI / 2) * side,
            y: spec.y + Math.sin(turn) * radius + Math.sin(turn + Math.PI / 2) * side
        };
    }

    function clampNodeToGalaxy(node) {
        if (!node || node.orbit === 0) return;
        const spec = GALAXY_SPECS[node.orbit] || GALAXY_SPECS[1];
        const dx = node.x - spec.x;
        const dy = node.y - spec.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const maxR = spec.r * 1.05;
        if (d <= maxR) return;
        node.x = spec.x + dx / d * maxR;
        node.y = spec.y + dy / d * maxR;
    }

    function buildCosmosAtlasData() {
        if (ATLAS.nodes.length) return;
        ATLAS.nodes.length = 0;
        ATLAS.edges.length = 0;
        ATLAS.byId.clear();


        COSMOS_PLANETS.forEach((p, idx) => {
            const galaxy = getGalaxyForPlanetIndex(idx);
            const planetSlot = getGalaxyPlanetSlot(idx);
            const localSlot = galaxy === 0 ? 0 : planetSlot;
            const pos = getGalaxySpiralPosition(galaxy, localSlot, `planet-${idx}-${p.name}`, 'planet');
            const isGalaxyBoss = galaxy > 0 && GALAXY_BOSS_PLANET_INDEX[galaxy] === idx;
            const tag = isGalaxyBoss || p.tag === 'boss' ? 'boss' : p.tag;
            const sizeSeed = seeded01(p.name + ':size');
            const gravitySeed = seeded01(p.name + ':grav');
            const sizeClass = idx === 0 ? 1 : Math.max(1, Math.min(5, 1 + Math.floor(sizeSeed * 5)));
            const gravity = idx === 0 ? 1 : Math.max(1, Math.round((1.05 + galaxy * 0.18 + sizeClass * 0.18 + gravitySeed * 1.35) * 10) / 10);
            const node = {
                id: `planet-${idx}`,
                kind: 'planet',
                name: p.name,
                source: p.source,
                theme: p.theme,
                tag,
                baseTag: p.tag,
                orbit: galaxy,
                originalOrbit: Math.max(0, Math.floor(p.orbit || 0)),
                localIndex: localSlot,
                localSlot,
                tier: idx === 0 ? 1 : Math.max(1, Math.min(25, isGalaxyBoss
                    ? getGalaxyTierBandBase(galaxy) + 4
                    : getGalaxyTierBandBase(galaxy) + Math.min(4, Math.floor(planetSlot / 2)))),
                x: pos.x,
                y: pos.y,
                radius: idx === 0 ? 18 : Math.max(9, 15.5 - galaxy * 0.45 + sizeClass * 0.35),
                labelPriority: idx === 0 ? 10 : (tag === 'boss' ? 8 : Math.max(2, 7 - Math.floor(localSlot / 2))),
                sizeClass,
                gravity
            };
            ATLAS.nodes.push(node);
        });

        COSMOS_ASTEROID_NUMBERS.forEach((no, idx) => {
            const galaxy = getGalaxyForAsteroidIndex(idx);
            const asteroidSlot = idx % ASTEROIDS_PER_GALAXY;
            const localSlot = PLANETS_PER_GALAXY + asteroidSlot;
            const pos = getGalaxySpiralPosition(galaxy, localSlot, `asteroid-${no}`, 'asteroid');
            const sizeClass = Math.max(1, Math.min(4, 1 + Math.floor(seeded01('ast-size-' + no) * 4)));
            const gravity = Math.max(0.9, Math.round((0.95 + galaxy * 0.16 + sizeClass * 0.13 + seeded01('ast-grav-' + no) * 1.05) * 10) / 10);
            const node = {
                id: `asteroid-${no}`,
                kind: 'asteroid',
                name: `소행성 ${formatAsteroidNo(no)}`,
                source: `Asteroid #${no}`,
                theme: '소행성 지대 / 재료·별가루',
                tag: 'asteroid',
                baseTag: 'asteroid',
                orbit: galaxy,
                originalOrbit: galaxy,
                localIndex: localSlot,
                localSlot,
                tier: Math.max(1, Math.min(25, getGalaxyTierBandBase(galaxy) + Math.min(4, Math.floor(asteroidSlot / 3)))),
                x: pos.x,
                y: pos.y,
                radius: Math.max(7.5, 11.5 - galaxy * 0.25 + sizeClass * 0.2),
                labelPriority: 0,
                sizeClass,
                gravity
            };
            ATLAS.nodes.push(node);
        });

        for (let pass = 0; pass < 120; pass++) {
            let moved = false;
            for (let i = 0; i < ATLAS.nodes.length; i++) {
                for (let j = i + 1; j < ATLAS.nodes.length; j++) {
                    const a = ATLAS.nodes[i];
                    const b = ATLAS.nodes[j];
                    if (a.orbit !== b.orbit) continue;
                    const minD = a.radius + b.radius + (a.orbit === 0 ? 28 : 18);
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const d = Math.hypot(dx, dy) || 0.001;
                    if (d >= minD) continue;
                    const push = (minD - d) * 0.5;
                    const nx = dx / d;
                    const ny = dy / d;
                    if (a.id !== 'planet-0') { a.x -= nx * push; a.y -= ny * push; clampNodeToGalaxy(a); }
                    if (b.id !== 'planet-0') { b.x += nx * push; b.y += ny * push; clampNodeToGalaxy(b); }
                    moved = true;
                }
            }
            if (!moved) break;
        }

        ATLAS.nodes.forEach(node => ATLAS.byId.set(node.id, node));
        buildEdges();
    }

    function addEdge(a, b, type) {
        if (!a || !b || a === b) return;
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (ATLAS.edges.some(e => e.key === key)) return;
        ATLAS.edges.push({ key, a, b, type: type || 'route' });
    }

    function distance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function buildEdges() {
        const nodes = ATLAS.nodes.slice();
        const deg = new Map(nodes.map(n => [n.id, 0]));
        const maxDeg = 4;
        const center = { x: 0, y: 0 };
        const closestToCenter = nodes.slice().sort((a, b) => distance(a, center) - distance(b, center))[0];

        function canLink(a, b) {
            return a && b && a.id !== b.id && (deg.get(a.id) || 0) < maxDeg && (deg.get(b.id) || 0) < maxDeg;
        }
        function link(a, b, type) {
            if (!canLink(a, b)) return false;
            const before = ATLAS.edges.length;
            addEdge(a.id, b.id, type);
            if (ATLAS.edges.length > before) {
                deg.set(a.id, (deg.get(a.id) || 0) + 1);
                deg.set(b.id, (deg.get(b.id) || 0) + 1);
                return true;
            }
            return false;
        }

        // 1) Minimum spanning backbone over all nodes (planet/asteroid equal role)
        const unvisited = new Set(nodes.map(n => n.id));
        const visited = new Set();
        const start = closestToCenter || nodes[0];
        if (start) { visited.add(start.id); unvisited.delete(start.id); }
        while (unvisited.size > 0) {
            let best = null;
            visited.forEach(va => {
                const a = ATLAS.byId.get(va);
                unvisited.forEach(vb => {
                    const b = ATLAS.byId.get(vb);
                    if (!canLink(a, b)) return;
                    const d = distance(a, b);
                    if (!best || d < best.d) best = { a, b, d };
                });
            });
            if (!best) break;
            if (!link(best.a, best.b, 'spine')) break;
            visited.add(best.b.id);
            unvisited.delete(best.b.id);
        }

        // 2) Fill local mesh with nearest neighbors up to degree 4
        nodes.forEach(node => {
            const near = nodes
                .filter(o => o.id !== node.id)
                .map(o => ({ o, d: distance(node, o) }))
                .sort((x, y) => x.d - y.d)
                .slice(0, 14);
            for (let i = 0; i < near.length && (deg.get(node.id) || 0) < maxDeg; i++) {
                link(node, near[i].o, 'route');
            }
        });
    }

    function getState() {
        if (!window.game) window.game = {};
        const state = window.game.cosmosAtlas && typeof window.game.cosmosAtlas === 'object'
            ? window.game.cosmosAtlas
            : (window.game.cosmosAtlas = {});
        state.cleared = Array.isArray(state.cleared) ? state.cleared : [];
        state.selectedId = state.selectedId || 'planet-0';
        state.camera = state.camera && typeof state.camera === 'object' ? state.camera : null;
        if (state.layoutVersion !== COSMOS_LAYOUT_VERSION) {
            state.cleared = state.cleared.filter(id => id !== 'planet-0');
            state.camera = { x: 0, y: 0, scale: DEFAULT_COSMOS_CAMERA_SCALE };
            state.layoutVersion = COSMOS_LAYOUT_VERSION;
        }
        state.starDust = Math.max(0, Math.floor(state.starDust || 0));
        state.bossClears = Array.isArray(state.bossClears) ? state.bossClears : [];
        state.bossKills = state.bossKills && typeof state.bossKills === 'object' ? state.bossKills : {};
        state.bossRelics = Array.isArray(state.bossRelics) ? state.bossRelics : [];
        state.bossStones = state.bossStones && typeof state.bossStones === 'object' ? state.bossStones : {};
        state.bossStoneOptions = state.bossStoneOptions && typeof state.bossStoneOptions === 'object' ? state.bossStoneOptions : {};
        state.equippedStones = state.equippedStones && typeof state.equippedStones === 'object' ? state.equippedStones : {};
        if (!hasSixthCosmosStoneUnlock()) delete state.equippedStones['6'];
        state.equippedStoneGalaxy = Number.isFinite(state.equippedStoneGalaxy) ? Math.max(0, Math.min(6, Math.floor(state.equippedStoneGalaxy))) : 0;
        state.masteryPointsSpent = Math.max(0, Math.floor(state.masteryPointsSpent || 0));
        state.mastery = state.mastery && typeof state.mastery === 'object' ? state.mastery : {};
        COSMOS_MASTERY_NODES.forEach(node => {
            state.mastery[node.key] = Math.max(0, Math.min(node.max, Math.floor(state.mastery[node.key] || 0)));
        });
        if (!state.camera) state.camera = { x: 0, y: 0, scale: DEFAULT_COSMOS_CAMERA_SCALE };
        return state;
    }
    function getCosmosMasteryValue(key) {
        const state = getState();
        return Math.max(0, Math.floor((state.mastery || {})[key] || 0));
    }
    function getCosmosMasteryTotalPoints() {
        const state = getState();
        return ATLAS.nodes.reduce((sum, node) => sum + (state.cleared.includes(node.id) ? 1 : 0), 0);
    }
    function getCosmosMasteryFreePoints() {
        const state = getState();
        const spent = COSMOS_MASTERY_NODES.reduce((sum, node) => sum + getCosmosMasteryValue(node.key) * node.cost, 0);
        state.masteryPointsSpent = spent;
        return Math.max(0, getCosmosMasteryTotalPoints() - spent);
    }
    function allocateCosmosMastery(nodeKey) {
        const state = getState();
        const node = COSMOS_MASTERY_NODES.find(n => n.key === nodeKey);
        if (!node) return;
        const reqFail = getCosmosMasteryLockReason(node.key);
        if (reqFail) return window.addLog && window.addLog(reqFail, 'attack-monster');
        const current = getCosmosMasteryValue(node.key);
        if (current >= node.max) return window.addLog && window.addLog('해당 성도술 노드는 이미 최대 단계입니다.', 'attack-monster');
        if (getCosmosMasteryFreePoints() < node.cost) return window.addLog && window.addLog(`성도술 포인트가 부족합니다. (필요: ${node.cost})`, 'attack-monster');
        state.mastery[node.key] = current + 1;
        state.masteryPointsSpent += node.cost;
        if (typeof window.addLog === 'function') window.addLog(`✨ 성도술 강화: ${node.name} ${current + 1}/${node.max}`, 'season-up');
        renderCosmosAtlas();
    }
    function getCosmosMasteryLockReason(nodeKey) {
        const node = COSMOS_MASTERY_NODES.find(n => n.key === nodeKey);
        if (!node) return null;
        const reqs = COSMOS_MASTERY_LINKS[node.key] || [];
        for (let i = 0; i < reqs.length; i++) {
            const [reqKey, reqLvRaw] = String(reqs[i]).split(':');
            const reqLv = Math.max(1, Math.floor(Number(reqLvRaw || 1)));
            if (getCosmosMasteryValue(reqKey) < reqLv) {
                const reqNode = COSMOS_MASTERY_NODES.find(n => n.key === reqKey);
                return `선행 노드 필요: ${(reqNode && reqNode.name) || reqKey} ${reqLv}레벨`;
            }
        }
        return null;
    }

    function isCosmosUnlocked() {
        if (!window.game) return false;
        if (window.game.cosmosAtlas && window.game.cosmosAtlas.unlocked) return true;
        const underworld = (window.game.underworldProgress && typeof window.game.underworldProgress === 'object')
            ? window.game.underworldProgress
            : null;
        const highestFloor = underworld ? Math.max(1, Math.floor(underworld.highestFloor || 1)) : 1;
        return highestFloor >= 30;
    }

    function getNodeStatus(node) {
        const state = getState();
        if (!isCosmosUnlocked()) return 'locked';
        if (state.cleared.includes(node.id)) return 'cleared';
        if (node.id === 'planet-0') return 'available';
        const neighbors = getNeighbors(node.id);
        return neighbors.some(id => state.cleared.includes(id)) ? 'available' : 'locked';
    }


    function getCosmosBossTier(node) {
        if (!node || node.tag !== 'boss') return null;
        const g = Math.max(1, Math.min(5, Math.floor(node.orbit || 1)));
        // 은하 보스는 해당 은하 밴드의 최고 티어 (G1→5, G2→10, G3→15, G4→20, G5→25)
        return Math.min(25, g * 5);
    }


    function getBossStage(node) {
        if (!node || node.tag !== 'boss') return null;
        const state = getState();
        const clears = Math.max(0, Math.floor((state.bossKills && state.bossKills[node.id]) || 0));
        if (clears >= 3) return 3;
        if (clears >= 1) return 2;
        return 1;
    }

    function getEquippedCosmosStoneCount(state) {
        const equipped = state && state.equippedStones && typeof state.equippedStones === 'object' ? state.equippedStones : {};
        return Object.keys(equipped).filter(key => !!equipped[key]).length;
    }

    function hasSixthCosmosStoneUnlock() {
        const jewels = Array.isArray(window.game && window.game.jewelSlots) ? window.game.jewelSlots : [];
        return jewels.some(jewel => jewel && (jewel.uniqueId === 'cbj_enifron_faded_stone' || jewel.id === 'cbj_enifron_faded_stone' || jewel.name === '바래진 우주석'));
    }

    function isCosmosStoneAcquired(state, galaxy) {
        const g = Math.max(1, Math.min(6, Math.floor(galaxy || 1)));
        if (g === 6) return hasSixthCosmosStoneUnlock();
        return !!(state && state.bossStones && state.bossStones[String(g)]);
    }

    function getCosmosTierFloor() {
        const state = getState();
        const count = Math.max(0, Math.min(5, getEquippedCosmosStoneCount(state)));
        return COSMOS_STONE_TIER_FLOORS[count] || 1;
    }


    function getCosmosStonePool(galaxy) {
        const pools = window.COSMOS_BOSS_STONE_OPTION_POOLS || {};
        return pools[String(Math.max(1, Math.min(6, Math.floor(galaxy || 1))))] || null;
    }

    function rollCosmosStoneOption(galaxy, bossOption) {
        const pool = getCosmosStonePool(galaxy);
        const source = pool ? (bossOption ? pool.bossOptions : pool.options) : [];
        if (!Array.isArray(source) || source.length <= 0) return null;
        const row = source[Math.floor(Math.random() * source.length)];
        const min = Number(row.min || 0);
        const max = Number(row.max || min);
        const value = min === max ? min : Number((min + Math.random() * (max - min)).toFixed(2));
        return { stat: row.stat, value, min, max, label: row.label || row.stat, boss: !!bossOption };
    }

    function ensureCosmosStoneOptions(state, galaxy) {
        const g = String(Math.max(1, Math.min(6, Math.floor(galaxy || 1))));
        state.bossStoneOptions = state.bossStoneOptions && typeof state.bossStoneOptions === 'object' ? state.bossStoneOptions : {};
        if (!Array.isArray(state.bossStoneOptions[g])) {
            state.bossStoneOptions[g] = [rollCosmosStoneOption(g, false), rollCosmosStoneOption(g, false), rollCosmosStoneOption(g, false)].filter(Boolean);
        }
        while (state.bossStoneOptions[g].length < 3) {
            const option = rollCosmosStoneOption(g, false);
            if (option) state.bossStoneOptions[g].push(option);
            else break;
        }
        state.bossStoneOptions[g] = state.bossStoneOptions[g].slice(0, 3);
        return state.bossStoneOptions[g];
    }

    function getCosmosStoneOptionText(option) {
        if (!option) return '빈 옵션';
        const value = Number(option.value || 0);
        const sign = value > 0 ? '+' : '';
        return `${option.boss ? '👑 ' : ''}${option.label || option.stat} ${sign}${value} (범위 ${option.min}~${option.max})`;
    }


    function getCosmosTierFloorTooltipHtml() {
        const current = getCosmosTierFloor();
        const baseFloors = COSMOS_STONE_TIER_FLOORS.slice(1, 6);
        const floorText = baseFloors.map(tier => {
            const style = tier === current ? 'color:#ffd98a;font-weight:800;text-shadow:0 0 8px rgba(255,217,138,.65);' : 'color:#b9c7dd;';
            return `<span style="${style}">${tier}</span>`;
        }).join(' / ');
        return `<div class="tooltip-line">우주계 최소 티어 보정 ${floorText}</div>`;
    }

    function startCosmosStoneEquipPulse(galaxy) {
        ATLAS.stonePulse = { galaxy: Math.max(1, Math.min(6, Math.floor(galaxy || 1))), startedAt: Date.now(), duration: 1300 };
        requestAtlasFrame();
    }

    function drawCosmosStonePulse(ctx) {
        const pulse = ATLAS.stonePulse;
        if (!pulse) return;
        const elapsed = Date.now() - pulse.startedAt;
        const progress = Math.max(0, Math.min(1, elapsed / pulse.duration));
        const spec = GALAXY_SPECS[Math.min(5, pulse.galaxy)] || GALAXY_SPECS[1];
        const center = worldToScreen({ x: spec.x, y: spec.y });
        const baseR = spec.r * ATLAS.camera.scale;
        const radius = baseR * (0.28 + progress * 0.92);
        const alpha = Math.max(0, 1 - progress);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(center.x, center.y, radius + i * 28 * ATLAS.camera.scale, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(127, 220, 255, ${alpha * (0.34 - i * 0.08)})`;
            ctx.lineWidth = Math.max(1, (5 - i) * ATLAS.camera.scale);
            ctx.stroke();
        }
        const glow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
        glow.addColorStop(0, `rgba(127,220,255,${alpha * 0.18})`);
        glow.addColorStop(1, 'rgba(127,220,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (progress >= 1) ATLAS.stonePulse = null;
        else requestAtlasFrame();
    }

    function getCosmosStoneNameByGalaxy(galaxy) {
        const pool = getCosmosStonePool(galaxy);
        return pool && pool.name ? pool.name : `G${galaxy} 우주석`;
    }

    function buildCosmosStoneTooltipHtml(galaxy) {
        const state = getState();
        const g = Math.max(1, Math.min(6, Math.floor(galaxy || 1)));
        const acquired = isCosmosStoneAcquired(state, g);
        const options = acquired ? ensureCosmosStoneOptions(state, g) : [];
        const lines = options.map(option => `<div class="tooltip-line">${escapeHtml(getCosmosStoneOptionText(option))}</div>`).join('') || '<div class="tooltip-line">아직 획득하지 않았습니다.</div>';
        return `<div class="tooltip-title">${escapeHtml(getCosmosStoneNameByGalaxy(g))}</div>${getCosmosTierFloorTooltipHtml()}<div class="tooltip-line" style="color:#9fb4d1;">보스 유물 사용: 무작위 1줄을 해당 우주석의 보스 옵션으로 리롤</div>${lines}`;
    }

    function showCosmosStoneTooltip(event, galaxy) {
        if (!event || typeof window.showInfoTooltipHtml !== 'function') return;
        window.showInfoTooltipHtml(event.clientX, event.clientY, buildCosmosStoneTooltipHtml(galaxy), '#b9e6ff');
    }


    function findCosmosBossRelicIndexForStone(relics, galaxy) {
        const g = Math.max(1, Math.min(6, Math.floor(galaxy || 1)));
        if (g === 6) return relics.findIndex(relic => relic && relic.rerollStoneOption);
        return relics.findIndex(relic => relic && relic.rerollStoneOption && Math.floor(Number(relic.galaxy) || 0) === g);
    }

    function applyCosmosBossRelicToStone(galaxy) {
        const state = getState();
        const g = Math.max(1, Math.min(6, Math.floor(galaxy || 1)));
        if (!isCosmosStoneAcquired(state, g)) return window.addLog && window.addLog('먼저 해당 우주석을 획득해야 합니다.', 'attack-monster');
        if (!Array.isArray(state.bossRelics) || state.bossRelics.length <= 0) return window.addLog && window.addLog('사용할 보스 유물이 없습니다.', 'attack-monster');
        const relicIndex = findCosmosBossRelicIndexForStone(state.bossRelics, g);
        if (relicIndex < 0) return window.addLog && window.addLog('해당 우주석에 사용할 보스 유물이 없습니다.', 'attack-monster');
        const options = ensureCosmosStoneOptions(state, g);
        const idx = Math.max(0, Math.min(2, Math.floor(Math.random() * 3)));
        const next = rollCosmosStoneOption(g, true);
        if (!next) return;
        state.bossRelics.splice(relicIndex, 1);
        options[idx] = next;
        if (typeof window.addLog === 'function') window.addLog(`💠 ${getCosmosStoneNameByGalaxy(g)} 보스 옵션 리롤: ${getCosmosStoneOptionText(next)}`, 'loot-unique');
        if (typeof window.updateStaticUI === 'function') window.updateStaticUI();
        renderCosmosAtlas();
    }

    function getDisplayedNodeTier(node) {
        const bossTier = getCosmosBossTier(node);
        if (bossTier != null) return bossTier;
        return Math.max(Math.floor(node.tier || 1), getCosmosTierFloor());
    }



    function canChallengeNode(node) {
        if (!node) return false;
        const status = getNodeStatus(node);
        if (status === 'available') return true;
        return status === 'cleared' && node.tag === 'boss';
    }

    function getCosmosEquivalentUnderworldFloor(node) {
        const tier = Math.max(1, Math.floor(getDisplayedNodeTier(node) || 1));
        return 30 + (tier - 1);
    }
    function getCosmosChallengeTier(node) {
        // 우주계 전투 난이도는 "지하계 30층 이상"을 기준으로 한다.
        // 우주계 tier 1 → 지하계 30층, tier 25 → 지하계 54층.
        // 이를 지하계와 동일한 적 스케일링 tier(getChaosRealmTier)로 환산해 적용한다.
        const equivFloor = getCosmosEquivalentUnderworldFloor(node); // 30 + (표시 tier - 1)
        const baseCombatTier = (typeof window.getChaosRealmTier === 'function')
            ? window.getChaosRealmTier(equivFloor)
            : (30 + Math.floor((equivFloor - 1) * 0.85) + Math.floor(Math.max(0, equivFloor - 10) * 0.18));
        const ease = getCosmosMasteryValue('challengeEase') * 0.015 + getCosmosMasteryValue('riftGuard') * 0.007;
        const risk = getCosmosMasteryValue('highRisk') * 0.02 - getCosmosMasteryValue('gravityHarness') * 0.002;
        const relief = node && node.kind === 'planet'
            ? getCosmosMasteryValue('planetRelief') * 0.012
            : getCosmosMasteryValue('voidSurvey') * 0.008;
        const finalMul = Math.max(0.65, 1 + risk - ease - relief);
        return Math.max(1, Math.floor(baseCombatTier * finalMul));
    }


    function getBossStoneName(node) {
        const theme = String((node && node.theme) || '');
        if (theme.includes('백색')) return '백성핵석';
        if (theme.includes('보호막')) return '장막핵석';
        if (theme.includes('블랙홀')) return '중력핵석';
        if (theme.includes('성운')) return '성운핵석';
        if (theme.includes('황혼') || theme.includes('붕괴')) return '붕괴핵석';
        return '우주석';
    }

    function getCosmosBossRewardSpec(node) {
        if (!node || node.tag !== 'boss') return null;
        const db = window.COSMOS_BOSS_REWARD_DB || {};
        return db[node.id] || null;
    }

    function createCosmosBossJewel(row) {
        if (!row) return null;
        const stats = (row.stats || []).map(stat => ({
            id: stat.id,
            val: Number(stat.val || 0),
            valMin: Number(stat.val || 0),
            valMax: Number(stat.val || 0),
            tier: 1,
            statName: typeof window.getStatName === 'function' ? window.getStatName(stat.id) : stat.id
        }));
        const jewel = { id: Date.now() + Math.floor(Math.random() * 100000), uniqueId: row.id, name: row.name, rarity: 'unique', uniqueEffect: row.uniqueEffect || '', source: 'cosmosBoss', stats };
        if (row.noEquipSocket) jewel.noEquipSocket = true;
        if (row.cosmosKeystoneJewel) {
            jewel.cosmosKeystoneJewel = true;
            // 드랍 시 무작위 전직 키스톤을 고정 배정한다. (균형/심판 주얼이 같은 키스톤이면 할당)
            jewel.cosmosKeystone = (typeof window.pickRandomAscendKeystoneId === 'function') ? window.pickRandomAscendKeystoneId() : null;
        }
        return jewel;
    }

    function createCosmosBossTalisman(row) {
        if (!row || !window.TALISMAN_SHAPES || !window.TALISMAN_SHAPES[row.shape]) return null;
        const stats = (row.stats || []).map(stat => ({ ...stat }));
        return {
            id: Date.now() + Math.floor(Math.random() * 100000),
            shape: row.shape,
            cells: window.TALISMAN_SHAPES[row.shape].map(([x, y]) => ({ x, y })),
            rarity: '고유',
            source: 'cosmosBoss',
            isUnique: true,
            uniqueId: row.id,
            name: row.name,
            special: row.special || null,
            uniqueEffect: row.uniqueEffect || '',
            stats,
            stat: stats[0] ? stats[0].stat : null,
            statName: row.name,
            value: stats[0] ? stats[0].value : 0,
            markDir: 'up'
        };
    }

    function grantCosmosBossEquipment(spec, tier) {
        if (!spec || !Array.isArray(spec.equipment) || Math.random() >= COSMOS_BOSS_EQUIPMENT_DROP_CHANCE) return false;
        const limit = typeof window.getInventoryLimit === 'function' ? window.getInventoryLimit() : 30;
        if (!window.game || !Array.isArray(window.game.inventory) || window.game.inventory.length >= limit) return false;
        if (typeof window.generateUniqueItem !== 'function') return false;
        const item = window.generateUniqueItem(Math.max(1, Math.floor(tier || 1)), null, spec.equipment[Math.floor(Math.random() * spec.equipment.length)]);
        if (!item) return false;
        window.game.inventory.push(item);
        if (typeof window.addLog === 'function') window.addLog(`🌌 우주계 보스 전용 고유 장비 획득: ${item.name}`, 'loot-unique');
        return true;
    }

    function grantCosmosBossJewel(spec) {
        if (!spec || !spec.jewel || Math.random() >= COSMOS_BOSS_JEWEL_DROP_CHANCE) return false;
        const limit = typeof window.getJewelInventoryLimit === 'function' ? window.getJewelInventoryLimit() : 60;
        if (!window.game || !Array.isArray(window.game.jewelInventory) || window.game.jewelInventory.length >= limit) return false;
        const jewel = createCosmosBossJewel(spec.jewel);
        if (!jewel) return false;
        window.game.jewelInventory.push(jewel);
        if (typeof window.addLog === 'function') window.addLog(`💠 우주계 보스 전용 주얼 획득: ${jewel.name}`, 'loot-unique');
        return true;
    }

    function grantCosmosBossTalisman(spec) {
        if (!spec || !spec.talisman || Math.random() >= COSMOS_BOSS_TALISMAN_DROP_CHANCE) return false;
        if (!window.game) return false;
        window.game.talismanInventory = Array.isArray(window.game.talismanInventory) ? window.game.talismanInventory : [];
        const talisman = createCosmosBossTalisman(spec.talisman);
        if (!talisman) return false;
        window.game.talismanInventory.push(talisman);
        if (typeof window.addLog === 'function') window.addLog(`🧿 우주계 보스 전용 부적 획득: ${talisman.name}`, 'loot-unique');
        return true;
    }

    function grantCosmosBossExclusiveDrops(node) {
        const spec = getCosmosBossRewardSpec(node);
        if (!spec) return false;
        const tier = getDisplayedNodeTier(node);
        const granted = [
            grantCosmosBossEquipment(spec, tier),
            grantCosmosBossJewel(spec),
            grantCosmosBossTalisman(spec)
        ].some(Boolean);
        if (granted && typeof window.updateStaticUI === 'function') window.updateStaticUI();
        return granted;
    }

    function cloneCosmosBossRelic(spec, node) {
        const galaxy = Math.max(1, Math.min(5, Math.floor(node.orbit || 1)));
        return {
            id: `${spec.id}-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            relicId: spec.id,
            bossId: node.id,
            galaxy: galaxy,
            name: spec.name,
            rerollStoneOption: true
        };
    }

    function tryRollBossRelic(node) {
        if (!node || node.tag !== 'boss') return null;
        const specDb = window.COSMOS_BOSS_RELIC_DB || {};
        const spec = specDb[node.id];
        if (!spec) return null;
        const state = getState();
        const relicBonus = getCosmosMasteryValue('eliteHunt') * 0.007;
        if (Math.random() >= 0.22 + relicBonus) return null;
        const relic = cloneCosmosBossRelic(spec, node);
        state.bossRelics.push(relic);
        return relic;
    }

    function equipBossStoneByGalaxy(galaxy) {
        const state = getState();
        const g = Math.max(1, Math.min(6, Math.floor(galaxy || 1)));
        const stone = getCosmosStoneNameByGalaxy(g);
        if (!isCosmosStoneAcquired(state, g)) {
            if (typeof window.addLog === 'function') window.addLog(`은하 ${g} 우주석이 없습니다.`, 'attack-monster');
            return;
        }
        ensureCosmosStoneOptions(state, g);
        state.equippedStones[String(g)] = true;
        state.equippedStoneGalaxy = getEquippedCosmosStoneCount(state);
        if (typeof window.addLog === 'function') window.addLog(`💠 ${stone} 장착: 우주계 최소 Tier ${getCosmosTierFloor()} 적용`, 'season-up');
        startCosmosStoneEquipPulse(g);
        renderCosmosAtlas();
    }

    function unequipBossStoneByGalaxy(galaxy) {
        const state = getState();
        const g = Math.max(1, Math.min(6, Math.floor(galaxy || 1)));
        delete state.equippedStones[String(g)];
        state.equippedStoneGalaxy = getEquippedCosmosStoneCount(state);
        if (typeof window.addLog === 'function') window.addLog(`💠 ${getCosmosStoneNameByGalaxy(g)} 해제`, 'season-up');
        renderCosmosAtlas();
    }

    function getNeighbors(id) {
        const out = [];
        ATLAS.edges.forEach(e => {
            if (e.a === id) out.push(e.b);
            else if (e.b === id) out.push(e.a);
        });
        return out;
    }

    function installCosmosAtlas() {
        if (ATLAS.installed) return;
        buildCosmosAtlasData();

        const mapTab = document.getElementById('tab-map');
        if (!mapTab) return;
        const subtabRow = mapTab.querySelector('.subtab-row');
        if (!subtabRow) return;

        if (!document.getElementById('btn-map-tab-cosmos')) {
            const btn = document.createElement('button');
            btn.className = 'subtab-btn cosmos-tab-btn';
            btn.id = 'btn-map-tab-cosmos';
            btn.type = 'button';
            btn.textContent = '🌠 우주계';
            btn.onclick = function() {
                if (typeof window.switchMapSubtab === 'function') window.switchMapSubtab('map-tab-cosmos');
                else activateCosmosSubtab();
            };
            subtabRow.appendChild(btn);
        }

        if (!document.getElementById('map-tab-cosmos')) {
            const panel = document.createElement('div');
            panel.id = 'map-tab-cosmos';
            panel.className = 'subtab-content cosmos-atlas-tab';
            panel.innerHTML = `
                <h2>🌠 우주계 아틀라스 <span class="h2-right">5개 은하 × 25개 노드 · 행성 50개 · 소행성 75개</span></h2>
                <div id="ui-cosmos-panel" class="cosmos-panel">
                    <div class="cosmos-header">
                        <div>
                            <div class="cosmos-kicker">Cosmic Atlas</div>
                            <div class="cosmos-title">별을 잇는 우주계 탐험 지도</div>
                            <div class="cosmos-desc">마우스 드래그: 이동 · 휠/버튼: 확대·축소 · 노드 클릭: 행성/소행성 선택 · 탐사 완료 시 연결된 별길이 열린다.</div>
                            <div class="cosmos-zoom-controls"><button class="subtab-btn" type="button" onclick="zoomCosmosAtlas(1.14)">＋</button><button class="subtab-btn" type="button" onclick="zoomCosmosAtlas(0.88)">－</button><button class="subtab-btn" type="button" onclick="resetCosmosAtlasCamera()">중앙</button></div>
                        </div>
                        <div class="cosmos-summary" id="ui-cosmos-summary"></div>
                    </div>
                    <div style="display:flex; gap:6px; margin:8px 0;"><button class="subtab-btn active" id="btn-cosmos-sub-atlas" onclick="switchCosmosInnerTab('atlas')">아틀라스</button><button class="subtab-btn" id="btn-cosmos-sub-mastery" onclick="switchCosmosInnerTab('mastery')">성도술</button></div><div id="cosmos-inner-atlas" class="cosmos-layout">
                        <div class="cosmos-canvas-wrap">
                            <canvas id="cosmos-atlas-canvas" width="2400" height="1520"></canvas>
                            <div id="cosmos-atlas-tooltip" class="cosmos-atlas-tooltip"></div>
                        </div>
                        <div class="cosmos-detail" id="ui-cosmos-detail"></div>
                    </div><div id="cosmos-inner-mastery" class="cosmos-detail" style="display:none; margin-top:8px;"></div>
                </div>`;
            const abyssTab = document.getElementById('map-tab-abyss');
            if (abyssTab && abyssTab.parentNode) abyssTab.parentNode.insertBefore(panel, abyssTab);
            else mapTab.appendChild(panel);
        }

        ATLAS.canvas = document.getElementById('cosmos-atlas-canvas');
        ATLAS.ctx = ATLAS.canvas ? ATLAS.canvas.getContext('2d') : null;
        ATLAS.host = ATLAS.canvas ? ATLAS.canvas.parentElement : null;
        ATLAS.detail = document.getElementById('ui-cosmos-detail');
        ATLAS.summary = document.getElementById('ui-cosmos-summary');
        ATLAS.tooltip = document.getElementById('cosmos-atlas-tooltip');

        bindCanvasEvents();
        patchSwitchMapSubtab();
        patchUpdateStaticUI();

        const state = getState();
        ATLAS.selectedId = state.selectedId || 'planet-0';
        ATLAS.camera = { ...ATLAS.camera, ...(state.camera || {}) };
        ATLAS.installed = true;
        renderCosmosAtlas();
    }

    function activateCosmosSubtab() {
        document.querySelectorAll('#tab-map .subtab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('#tab-map .subtab-btn').forEach(el => el.classList.remove('active'));
        const tab = document.getElementById('map-tab-cosmos');
        const btn = document.getElementById('btn-map-tab-cosmos');
        if (tab) tab.classList.add('active');
        if (btn) btn.classList.add('active');
        if (window.game) window.game.mapSubtab = 'map-tab-cosmos';
        renderCosmosAtlas();
    }

    function patchSwitchMapSubtab() {
        if (window.__cosmosSwitchMapSubtabPatched) return;
        window.__cosmosSwitchMapSubtabPatched = true;
        const original = window.switchMapSubtab;
        window.switchMapSubtab = function(subtabId) {
            const result = typeof original === 'function' ? original.apply(this, arguments) : undefined;
            if (subtabId === 'map-tab-cosmos') activateCosmosSubtab();
            return result;
        };
    }

    function patchUpdateStaticUI() {
        if (window.__cosmosUpdateStaticUiPatched) return;
        window.__cosmosUpdateStaticUiPatched = true;
        const original = window.updateStaticUI;
        window.updateStaticUI = function() {
            const result = typeof original === 'function' ? original.apply(this, arguments) : undefined;
            try { renderCosmosAtlas(); } catch (error) { console.error('cosmos atlas render failed:', error); }
            return result;
        };
    }

    function bindCanvasEvents() {
        const canvas = ATLAS.canvas;
        if (!canvas || canvas.__cosmosBound) return;
        canvas.__cosmosBound = true;

        canvas.addEventListener('pointerdown', (event) => {
            ATLAS.drag.active = true;
            ATLAS.drag.moved = false;
            ATLAS.drag.startX = event.clientX;
            ATLAS.drag.startY = event.clientY;
            ATLAS.drag.baseX = ATLAS.camera.x;
            ATLAS.drag.baseY = ATLAS.camera.y;
            canvas.setPointerCapture && canvas.setPointerCapture(event.pointerId);
        });

        canvas.addEventListener('pointermove', (event) => {
            if (ATLAS.drag.active) {
                const dx = event.clientX - ATLAS.drag.startX;
                const dy = event.clientY - ATLAS.drag.startY;
                if (Math.abs(dx) + Math.abs(dy) > 4) ATLAS.drag.moved = true;
                ATLAS.camera.x = ATLAS.drag.baseX + dx / ATLAS.camera.scale;
                ATLAS.camera.y = ATLAS.drag.baseY + dy / ATLAS.camera.scale;
                saveCamera();
                requestAtlasFrame();
                return;
            }
            const node = pickNode(event);
            ATLAS.hoverId = node ? node.id : null;
            updateTooltip(event, node);
            requestAtlasFrame();
        });

        canvas.addEventListener('pointerup', (event) => {
            canvas.releasePointerCapture && canvas.releasePointerCapture(event.pointerId);
            const moved = ATLAS.drag.moved;
            ATLAS.drag.active = false;
            if (!moved) {
                const node = pickNode(event);
                if (node) selectCosmosNode(node.id);
            }
        });

        canvas.addEventListener('pointerleave', () => {
            ATLAS.drag.active = false;
            ATLAS.hoverId = null;
            if (ATLAS.tooltip) ATLAS.tooltip.style.display = 'none';
            requestAtlasFrame();
        });

        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            const before = screenToWorld(event);
            const delta = event.deltaY < 0 ? 1.12 : 0.89;
            ATLAS.camera.scale = Math.max(0.34, Math.min(2.2, ATLAS.camera.scale * delta));
            const after = screenToWorld(event);
            ATLAS.camera.x += after.x - before.x;
            ATLAS.camera.y += after.y - before.y;
            saveCamera();
            requestAtlasFrame();
        }, { passive: false });

        window.addEventListener('resize', requestAtlasFrame);
    }

    function saveCamera() {
        const state = getState();
        state.camera = {
            x: Math.round(ATLAS.camera.x * 100) / 100,
            y: Math.round(ATLAS.camera.y * 100) / 100,
            scale: Math.round(ATLAS.camera.scale * 1000) / 1000
        };
    }

    function selectCosmosNode(id) {
        if (!ATLAS.byId.has(id)) return;
        ATLAS.selectedId = id;
        const state = getState();
        state.selectedId = id;
        renderCosmosAtlas();
    }

    function screenToWorld(event) {
        const rect = ATLAS.canvas.getBoundingClientRect();
        const w = ATLAS.canvas.width;
        const h = ATLAS.canvas.height;
        const sx = (event.clientX - rect.left) * (w / Math.max(1, rect.width));
        const sy = (event.clientY - rect.top) * (h / Math.max(1, rect.height));
        return {
            x: (sx - w / 2) / ATLAS.camera.scale - ATLAS.camera.x,
            y: (sy - h / 2) / ATLAS.camera.scale - ATLAS.camera.y
        };
    }

    function worldToScreen(node) {
        const w = ATLAS.canvas.width;
        const h = ATLAS.canvas.height;
        return {
            x: w / 2 + (node.x + ATLAS.camera.x) * ATLAS.camera.scale,
            y: h / 2 + (node.y + ATLAS.camera.y) * ATLAS.camera.scale
        };
    }

    function pickNode(event) {
        if (!ATLAS.canvas) return null;
        const rect = ATLAS.canvas.getBoundingClientRect();
        const sx = (event.clientX - rect.left) * (ATLAS.canvas.width / Math.max(1, rect.width));
        const sy = (event.clientY - rect.top) * (ATLAS.canvas.height / Math.max(1, rect.height));
        let best = null;
        let bestDist = Infinity;
        ATLAS.nodes.forEach(node => {
            const p = worldToScreen(node);
            const r = Math.max(8, node.radius * ATLAS.camera.scale + (node.kind === 'planet' ? 8 : 5));
            const dx = sx - p.x;
            const dy = sy - p.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d <= r && d < bestDist) {
                best = node;
                bestDist = d;
            }
        });
        return best;
    }

    function updateTooltip(event, node) {
        if (!ATLAS.tooltip) return;
        if (!node) {
            ATLAS.tooltip.style.display = 'none';
            return;
        }
        const status = getNodeStatus(node);
        ATLAS.tooltip.innerHTML = `<strong>${escapeHtml(node.name)}</strong><br><span>${escapeHtml(node.source)}</span><br>${escapeHtml(node.theme)}<br><em>${getStatusLabel(status)}</em>`;
        const rect = ATLAS.host.getBoundingClientRect();
        ATLAS.tooltip.style.display = 'block';
        ATLAS.tooltip.style.left = `${event.clientX - rect.left + 14}px`;
        ATLAS.tooltip.style.top = `${event.clientY - rect.top + 14}px`;
    }

    function getStatusLabel(status) {
        if (status === 'cleared') return '탐사 완료';
        if (status === 'available') return '탐사 가능';
        return '별길 잠김';
    }

    function getNodeColor(node, status) {
        if (status === 'locked') return node.kind === 'planet' ? '#344057' : '#273144';
        if (status === 'cleared') return node.kind === 'planet' ? '#9ef0bf' : '#8fb2c8';
        const map = {
            fire: '#ff9f43', cold: '#7fc9ff', venom: '#bb7cff', curse: '#b05cff',
            chaos: '#b05cff', guard: '#7ee2b8', boss: '#ffd166', judgement: '#ffd166',
            asteroid: '#90a4b8', gateway: '#ffffff', loop: '#d980fa'
        };
        return map[node.tag] || (node.kind === 'planet' ? '#7fc9ff' : '#90a4b8');
    }

    function requestAtlasFrame() {
        if (ATLAS.needsFrame) return;
        ATLAS.needsFrame = true;
        requestAnimationFrame(() => {
            ATLAS.needsFrame = false;
            drawAtlas();
        });
    }

    function syncCosmosTabVisibility() {
        const btn = document.getElementById('btn-map-tab-cosmos');
        const unlocked = isCosmosUnlocked();
        if (btn) btn.style.display = unlocked ? '' : 'none';
        if (!unlocked && window.game && window.game.mapSubtab === 'map-tab-cosmos') {
            if (typeof window.switchMapSubtab === 'function') window.switchMapSubtab('map-tab-zones');
            else window.game.mapSubtab = 'map-tab-zones';
        }
    }

    function renderCosmosAtlas() {
        if (!ATLAS.installed) {
            installCosmosAtlas();
            return;
        }
        syncCosmosTabVisibility();
        if (!ATLAS.canvas || !ATLAS.ctx) return;
        resizeCanvasToHost();
        drawAtlas();
        renderDetail();
        renderSummary();
        renderMasteryPanel();
    }

    function resizeCanvasToHost() {
        const canvas = ATLAS.canvas;
        if (!canvas || !ATLAS.host) return;
        const rect = ATLAS.host.getBoundingClientRect();
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const w = Math.max(600, Math.floor(rect.width * dpr));
        const h = Math.max(420, Math.floor(rect.height * dpr));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
    }

    function drawAtlas() {
        const canvas = ATLAS.canvas;
        const ctx = ATLAS.ctx;
        if (!canvas || !ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        drawBackground(ctx, w, h);
        drawCosmosStonePulse(ctx);
        drawEdges(ctx);
        drawNodes(ctx);
    }

    function drawBackground(ctx, w, h) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#060a12');
        g.addColorStop(0.55, '#080c16');
        g.addColorStop(1, '#030509');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.globalAlpha = 0.42;
        for (let i = 0; i < 190; i++) {
            const x = (hashSeed('star-x-' + i) % w);
            const y = (hashSeed('star-y-' + i) % h);
            const s = 0.8 + (hashSeed('star-s-' + i) % 19) / 18;
            ctx.fillStyle = i % 11 === 0 ? '#9fd4ff' : '#d8e9ff';
            ctx.fillRect(x, y, s, s);
        }
        ctx.restore();

        ctx.save();
        ctx.translate(w / 2 + ATLAS.camera.x * ATLAS.camera.scale, h / 2 + ATLAS.camera.y * ATLAS.camera.scale);
        ctx.scale(ATLAS.camera.scale, ATLAS.camera.scale);
        const galaxyShells = [1, 2, 3, 4, 5].map(key => GALAXY_SPECS[key]).filter(Boolean);
        galaxyShells.forEach((g, idx) => {
            ctx.beginPath();
            ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
            ctx.strokeStyle = idx === 0 ? 'rgba(180,220,255,0.14)' : 'rgba(127, 201, 255, 0.1)';
            ctx.lineWidth = 1.2 / ATLAS.camera.scale;
            ctx.setLineDash([3 / ATLAS.camera.scale, 10 / ATLAS.camera.scale]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(200,225,255,0.42)';
            ctx.font = `${Math.max(12, 15 / ATLAS.camera.scale)}px Malgun Gothic, sans-serif`;
            ctx.fillText(g.label, g.x - 14 / ATLAS.camera.scale, g.y - g.r - 10 / ATLAS.camera.scale);
        });
        ctx.restore();
    }

    function zoomCosmosAtlas(factor) {
        const safe = Math.max(0.5, Math.min(1.6, Number(factor) || 1));
        ATLAS.camera.scale = Math.max(0.34, Math.min(2.2, ATLAS.camera.scale * safe));
        saveCamera();
        requestAtlasFrame();
    }

    function drawEdges(ctx) {
        ctx.save();
        ATLAS.edges.forEach(edge => {
            if (edge.type === 'transition') return;
            const a = ATLAS.byId.get(edge.a);
            const b = ATLAS.byId.get(edge.b);
            if (!a || !b) return;
            const pa = worldToScreen(a);
            const pb = worldToScreen(b);
            const sa = getNodeStatus(a);
            const sb = getNodeStatus(b);
            const open = sa !== 'locked' && sb !== 'locked';
            const partial = sa !== 'locked' || sb !== 'locked';
            const mx = (pa.x + pb.x) / 2;
            const my = (pa.y + pb.y) / 2;
            const bend = (hashSeed(edge.key) % 17 - 8) * 0.7;
            const nx = pb.y - pa.y;
            const ny = -(pb.x - pa.x);
            const nl = Math.max(1, Math.hypot(nx, ny));
            const cx = mx + (nx / nl) * bend;
            const cy = my + (ny / nl) * bend;
            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            ctx.quadraticCurveTo(cx, cy, pb.x, pb.y);
            ctx.strokeStyle = open ? 'rgba(127, 201, 255, 0.48)' : partial ? 'rgba(127, 201, 255, 0.22)' : 'rgba(80, 92, 120, 0.13)';
            ctx.lineWidth = edge.type === 'spine' ? 2.6 : edge.type === 'asteroid' ? 0.85 : 1.25;
            if (open) {
                ctx.shadowColor = 'rgba(127, 201, 255, 0.25)';
                ctx.shadowBlur = edge.type === 'spine' ? 8 : 4;
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        });
        ctx.restore();
    }



    function drawPlanetSurface(ctx, node, p, r, status) {
        const seed = hashSeed(node.id + ':surface');
        const hue = seed % 360;
        const bandShift = ((seed >> 3) % 100) / 100;
        const core = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.45, Math.max(1, r * 0.1), p.x, p.y, r * 1.12);
        const locked = status === 'locked';
        core.addColorStop(0, locked ? 'rgba(122,136,162,0.9)' : `hsl(${hue}, 78%, 72%)`);
        core.addColorStop(0.55, locked ? 'rgba(82,97,123,0.92)' : `hsl(${(hue + 24) % 360}, 70%, 48%)`);
        core.addColorStop(1, locked ? 'rgba(48,58,79,0.96)' : `hsl(${(hue + 52) % 360}, 72%, 28%)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = core;
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.96, 0, Math.PI * 2);
        ctx.clip();
        for (let i = 0; i < 3; i++) {
            const yy = p.y - r * 0.58 + (i + bandShift) * r * 0.52;
            ctx.beginPath();
            ctx.ellipse(p.x + (i - 1) * r * 0.08, yy, r * (0.96 - i * 0.14), r * (0.18 + i * 0.03), 0, 0, Math.PI * 2);
            ctx.fillStyle = locked ? `rgba(140,150,172,${0.12 - i * 0.02})` : `hsla(${(hue + 70 + i * 24) % 360}, 72%, ${62 - i * 8}%, ${0.18 - i * 0.03})`;
            ctx.fill();
        }
        ctx.restore();

        if (node.tag === 'boss') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, r * 1.28, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 209, 102, 0.78)';
            ctx.lineWidth = Math.max(1, r * 0.14);
            ctx.stroke();
        }
    }

    function drawNodes(ctx) {
        ctx.save();
        ATLAS.nodes.slice().sort((a, b) => (a.kind === b.kind ? a.orbit - b.orbit : a.kind === 'asteroid' ? -1 : 1)).forEach(node => {
            const status = getNodeStatus(node);
            const p = worldToScreen(node);
            const hover = ATLAS.hoverId === node.id;
            const selected = ATLAS.selectedId === node.id;
            const r = Math.max(2.2, node.radius * ATLAS.camera.scale);
            const color = getNodeColor(node, status);
            const alpha = status === 'locked' ? 0.45 : 1;

            ctx.globalAlpha = alpha;
            if (node.kind === 'planet') {
                const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * (selected || hover ? 5.2 : 3.8));
                glow.addColorStop(0, color);
                glow.addColorStop(0.28, color + '99');
                glow.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(p.x, p.y, r * (selected || hover ? 5.2 : 3.4), 0, Math.PI * 2);
                ctx.fill();
            }

            const drawR = r * (selected ? 1.28 : hover ? 1.18 : 1);
            if (node.kind === 'planet') {
                drawPlanetSurface(ctx, node, p, drawR, status);
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, drawR, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
            }
            ctx.lineWidth = selected ? 3 : hover ? 2.4 : 1.4;
            ctx.strokeStyle = selected ? '#ffffff' : status === 'available' ? getGalaxyAccent(node.orbit, 0.95) : status === 'cleared' ? '#9ef0bf' : getGalaxyAccent(node.orbit, 0.34);
            ctx.beginPath();
            ctx.arc(p.x, p.y, drawR, 0, Math.PI * 2);
            ctx.stroke();

            const tierText = `T${getDisplayedNodeTier(node)}`;
            if (node.kind === 'planet') {
                ctx.font = `${Math.max(10, 11 * (selected ? 1.12 : 1))}px Malgun Gothic, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(6,10,18,0.88)';
                ctx.fillRect(p.x - 14, p.y - 8, 28, 16);
                ctx.fillStyle = '#ffd88a';
                ctx.fillText(tierText, p.x, p.y);
            }
            if (node.kind === 'planet' && (selected || hover || node.labelPriority >= 5 || ATLAS.camera.scale > 0.98)) {
                ctx.globalAlpha = status === 'locked' ? 0.62 : 1;
                ctx.font = `${selected ? 17 : 13}px Malgun Gothic, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.lineWidth = 4;
                ctx.strokeStyle = 'rgba(0,0,0,.82)';
                ctx.fillStyle = status === 'locked' ? '#8190a5' : '#eaf6ff';
                ctx.strokeText(node.name, p.x, p.y + r + 8);
                ctx.fillText(node.name, p.x, p.y + r + 8);
            } else if (node.kind === 'asteroid' && (hover || selected || ATLAS.camera.scale > 1.35)) {
                ctx.font = '10px Malgun Gothic, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillStyle = '#9fb9d1';
                ctx.fillText(`${node.name.replace('소행성 ', '#')} · T${getDisplayedNodeTier(node)}`, p.x, p.y + r + 5);
            }
        });
        ctx.globalAlpha = 1;
        ctx.restore();
    }


    function renderCosmosStonePanel(state) {
        const relicCount = Array.isArray(state.bossRelics) ? state.bossRelics.length : 0;
        const cardGalaxies = hasSixthCosmosStoneUnlock() ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
        const cards = cardGalaxies.map(g => {
            const acquired = isCosmosStoneAcquired(state, g);
            const equipped = !!(state.equippedStones && state.equippedStones[String(g)]);
            const options = acquired ? ensureCosmosStoneOptions(state, g) : [];
            const optionHtml = options.map(option => `<div style="font-size:11px;color:${option.boss ? '#ffd98a' : '#b9c7dd'};">${escapeHtml(getCosmosStoneOptionText(option))}</div>`).join('') || '<div style="font-size:11px;color:#6f8094;">미획득</div>';
            return `<div class="cosmos-stone-card" data-info-tooltip-anchor="1" onmouseenter="showCosmosStoneTooltip(event,${g})" onmousemove="showCosmosStoneTooltip(event,${g})" onmouseleave="hideInfoTooltip()" style="border:1px solid ${equipped ? '#8fd4ff' : '#31445c'};border-radius:8px;padding:8px;background:${acquired ? 'rgba(23,38,58,.78)' : 'rgba(18,24,34,.62)'};"><div style="display:flex;justify-content:space-between;gap:6px;align-items:center;"><b>${escapeHtml(getCosmosStoneNameByGalaxy(g))}</b><span>${equipped ? '장착' : (acquired ? '보유' : '미획득')}</span></div><div style="font-size:11px;color:#9fd6ff;">우주계 최소 티어 보정: ${getCosmosTierFloor()}</div>${optionHtml}<div style="display:flex;gap:4px;margin-top:6px;"><button onclick="equipBossStoneByGalaxy(${g})" ${acquired && !equipped ? '' : 'disabled'}>장착</button><button onclick="unequipBossStoneByGalaxy(${g})" ${equipped ? '' : 'disabled'}>해제</button><button onclick="applyCosmosBossRelicToStone(${g})" ${acquired && relicCount > 0 ? '' : 'disabled'}>보스 유물 사용</button></div></div>`;
        }).join('');
        return `<div style="grid-column:1/-1;margin-top:8px;"><div style="font-weight:700;color:#d7ebff;margin-bottom:6px;">우주석 장착 UI · 보스 유물 ${relicCount}개</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;">${cards}</div></div>`;
    }

    function renderSummary() {
        if (!ATLAS.summary) return;
        const state = getState();
        const cleared = state.cleared.length;
        const available = ATLAS.nodes.filter(node => getNodeStatus(node) === 'available').length;
        const planetsCleared = ATLAS.nodes.filter(n => n.kind === 'planet' && state.cleared.includes(n.id)).length;
        const asteroidsCleared = ATLAS.nodes.filter(n => n.kind === 'asteroid' && state.cleared.includes(n.id)).length;
        const unlocked = isCosmosUnlocked();
        const galaxyCounts = GALAXY_SEQUENCE
            .map(g => `G${g} ${ATLAS.nodes.filter(n => n.orbit === g).length}/${NODES_PER_GALAXY}`)
            .join(' · ');
        ATLAS.summary.innerHTML = `
            <div><b>${cleared}</b> / ${ATLAS.nodes.length} 탐사 완료</div>
            <div>행성 ${planetsCleared} / 50 · 소행성 ${asteroidsCleared} / 75</div>
            <div>${galaxyCounts}</div>
            <div>탐사 가능 노드: <b>${unlocked ? available : 0}</b></div>
            <div>성도술 포인트: <b>${getCosmosMasteryFreePoints()}</b> / ${getCosmosMasteryTotalPoints()}</div>
            <div>별가루: <b>${state.starDust}</b></div>
            <div>보스 유물: <b>${(state.bossRelics || []).length}</b></div>
            <div>장착 우주석: <b>${getEquippedCosmosStoneCount(state)}</b> / ${hasSixthCosmosStoneUnlock() ? 6 : 5}</div>
            ${renderCosmosStonePanel(state)}`;
    }

    function renderDetail() {
        if (!ATLAS.detail) return;
        const state = getState();
        const node = ATLAS.byId.get(ATLAS.selectedId) || ATLAS.byId.get(state.selectedId) || ATLAS.byId.get('planet-0');
        if (!node) return;
        const status = getNodeStatus(node);
        const rewardLine = node.tag === 'boss'
            ? `은하 보스 보상: 첫 클리어 시 ${getBossStoneName(node)} 획득 · 우주석 슬롯 장착 시 난이도 바닥 상승 · 현재 단계 ${getBossStage(node)}`
            : (node.kind === 'planet'
                ? `행성 보상: ${node.theme} 계열 보정 · 별가루 +${5 + node.orbit * 2}`
                : `소행성 보상: 별가루 +${2 + node.orbit} · 제작 재료 소량`);
        ATLAS.detail.innerHTML = `
            <div class="cosmos-detail-title">${node.kind === 'planet' ? '🪐' : '☄️'} ${escapeHtml(node.name)}</div>
            <div class="cosmos-detail-source">원본: ${escapeHtml(node.source)} · 은하 G${node.orbit} · Tier ${getDisplayedNodeTier(node)}${node.tag === 'boss' ? ' · 은하 보스' : ''}</div>
            <div class="cosmos-status ${status}">${getStatusLabel(status)}</div>
            <div class="cosmos-detail-section">
                <div class="cosmos-section-label">Theme</div>
                <div>${escapeHtml(node.theme)}</div>
            </div>
            <div class="cosmos-detail-section">
                <div class="cosmos-section-label">Reward</div>
                <div>${escapeHtml(rewardLine)}</div>
            </div>
            <div class="cosmos-detail-section">
                <div class="cosmos-section-label">행성 정보</div>
                <div>소속: G${node.orbit} · 은하 내 슬롯 ${Math.max(1, Math.floor((node.localSlot || 0) + 1))}/${NODES_PER_GALAXY}</div>
                <div>크기 등급: ${Math.max(1, Math.floor(node.sizeClass || 1))} · 중력: ${Number(node.gravity || 1).toFixed(1)}g</div>
                <div style="margin-top:4px; color:#a9bdd3;">진행도 요구치: +${Math.max(0, Math.floor((node.sizeClass || 1) * 18))}% · 중력 패널티 강도: +${Math.max(0, Math.floor((Number(node.gravity || 1) - 1) * 22))}%</div>
            </div>
            <!-- mastery moved -->
            <div style='display:none'><div class="cosmos-section-label">성도술 (탐사 1회당 1포인트)</div>
                <div style="margin-bottom:6px;">가용 포인트: <b>${getCosmosMasteryFreePoints()}</b> / 누적 획득 <b>${getCosmosMasteryTotalPoints()}</b></div>
                ${COSMOS_MASTERY_NODES.map(n => {
                    const lockReason = getCosmosMasteryLockReason(n.key);
                    const canSpend = getCosmosMasteryFreePoints() >= n.cost && getCosmosMasteryValue(n.key) < n.max && !lockReason;
                    const links = COSMOS_MASTERY_LINKS[n.key] || [];
                    const linkLine = links.length ? `연결 조건: ${links.map(v => {
                        const [k, lv] = String(v).split(':');
                        const r = COSMOS_MASTERY_NODES.find(row => row.key === k);
                        return `${r ? r.name : k} ${Math.max(1, Math.floor(Number(lv || 1)))}Lv`;
                    }).join(' · ')}` : '연결 조건: 시작 노드';
                    return `<div style="margin-bottom:6px;"><button onclick="allocateCosmosMastery('${n.key}')" ${canSpend ? '' : 'disabled'}>+</button> <b>${n.name}</b> ${getCosmosMasteryValue(n.key)}/${n.max}<div style="font-size:11px;color:#9cb2ca;">${n.desc}</div><div style="font-size:11px;color:${lockReason ? '#ffb3b3' : '#86a9d2'};">${lockReason || linkLine}</div></div>`;
                }).join('')}
            </div>
            <div class="cosmos-actions">
                <button onclick="challengeSelectedCosmosNode()" ${canChallengeNode(node) ? '' : 'disabled'}>${node.tag === 'boss' ? '보스 도전' : '전투 도전'}</button>
                ${node.tag === 'boss' ? `<button onclick="equipBossStoneByGalaxy(${Math.max(1, Math.min(5, Math.floor(node.orbit || 1)))})">우주석 장착</button>` : ''}<button onclick="focusCosmosAtlasOnSelected()">초점 이동</button>
                <button onclick="resetCosmosAtlasCamera()">지도 초기화</button>
            </div>
            <div class="cosmos-help">${isCosmosUnlocked() ? '탐사 완료된 노드와 연결된 노드가 다음 탐사 후보로 열린다.' : '우주계는 지하계 30층 도달 시 해금된다.'}</div>`;
    }

    function exploreSelectedCosmosNode(nodeIdOverride) {
        buildCosmosAtlasData();
        const state = getState();
        const targetId = nodeIdOverride || ATLAS.selectedId || state.selectedId || 'planet-0';
        const node = ATLAS.byId.get(targetId);
        if (!node) return;
        const status = getNodeStatus(node);
        const repeatBossRun = status === 'cleared' && node.tag === 'boss';
        const completedChallenge = state.activeChallenge && state.activeChallenge.nodeId === node.id;
        const firstClear = !state.cleared.includes(node.id);
        if ((status === 'available' || repeatBossRun) && !completedChallenge) {
            if (typeof window.addLog === 'function') window.addLog('우주계 전투 완료 후 탐사가 기록됩니다.', 'attack-monster');
            return;
        }
        if (!(status === 'available' || repeatBossRun)) {
            if (typeof window.addLog === 'function') window.addLog('아직 별길이 연결되지 않은 우주계 노드입니다.', 'attack-monster');
            return;
        }
        if (status === 'available' && !state.cleared.includes(node.id)) state.cleared.push(node.id);
        if (node.tag === 'boss' && !state.bossClears.includes(node.id)) state.bossClears.push(node.id);
        if (node.tag === 'boss') {
            const nextKill = Math.max(0, Math.floor((state.bossKills && state.bossKills[node.id]) || 0)) + 1;
            state.bossKills[node.id] = nextKill;
            const g = String(Math.max(1, Math.min(5, Math.floor(node.orbit || 1))));
            if (!state.bossStones[g]) {
                state.bossStones[g] = getBossStoneName(node);
                ensureCosmosStoneOptions(state, Number(g));
            }
        }
        const rewardBase = node.tag === 'boss' ? (30 + node.orbit * 10 + getBossStage(node) * 10) : (node.kind === 'planet' ? 5 + node.orbit * 2 : 2 + node.orbit);
        const focusMul = node.kind === 'planet'
            ? (1 + getCosmosMasteryValue('combatFocus') * 0.015)
            : (1 + getCosmosMasteryValue('craftFocus') * 0.015);
        const rewardMul = 1
            + getCosmosMasteryValue('stardustGain') * 0.015
            + getCosmosMasteryValue('highRisk') * 0.03
            + getCosmosMasteryValue('warpEfficiency') * 0.01
            + (node.kind === 'asteroid' ? getCosmosMasteryValue('asteroidRelief') * 0.016 : 0)
            + (node.tag === 'boss' ? (getCosmosMasteryValue('bossBounty') * 0.04 + getCosmosMasteryValue('apexProtocol') * 0.018) : 0)
            + getCosmosMasteryValue('echoCache') * 0.01
            + (node.kind === 'planet' ? getCosmosMasteryValue('resonanceDrive') * 0.006 : 0)
            + (node.kind === 'asteroid' ? getCosmosMasteryValue('stellarForge') * 0.009 : 0)
            + (node.orbit >= 4 ? getCosmosMasteryValue('frontierTax') * 0.013 : 0)
            + (node.tag === 'boss' ? getCosmosMasteryValue('starbreaker') * 0.018 : 0)
            + (firstClear ? getCosmosMasteryValue('chainMastery') * 0.02 : 0);
        const reward = Math.max(1, Math.floor(rewardBase * rewardMul * focusMul));
        state.starDust = Math.max(0, Math.floor(state.starDust || 0)) + reward;
        if (window.game && window.game.currencies) {
            window.game.currencies.starDust = Math.max(0, Math.floor(window.game.currencies.starDust || 0)) + reward;
        }
        if (typeof window.addLog === 'function') {
            window.addLog(`${node.tag === 'boss' ? '👑 우주계 은하 보스 격파' : '🌠 우주계 탐사 완료'}: ${node.name} · 별가루 +${reward}${node.tag === 'boss' ? ` · 난이도 바닥 Tier ${getCosmosTierFloor()} 적용` : ''}`, node.tag === 'boss' ? 'season-up' : (node.kind === 'planet' ? 'loot-unique' : 'loot-magic'));
            if (node.tag === 'boss') {
                const kills = Math.max(0, Math.floor(state.bossKills[node.id] || 0));
                if (kills === 1) window.addLog(`💠 ${node.name} 첫 격파: ${getBossStoneName(node)} 획득`, 'loot-unique');
                if (kills === 1) window.addLog(`🧩 우주석 슬롯에 장착하면 우주계 난이도 바닥이 상승합니다.`, 'season-up');
                const relicDrop = tryRollBossRelic(node);
                if (relicDrop) window.addLog(`💠 보스 유물 획득: ${relicDrop.name} (우주석 보스 옵션 리롤 재화)`, 'loot-unique');
            }
        }
        if (node.tag === 'boss') grantCosmosBossExclusiveDrops(node);
        if (typeof window.saveGame === 'function') {
            try { window.saveGame({ auto: true, silent: true }); } catch (error) { console.error('cosmos atlas save failed:', error); }
        }
        renderCosmosAtlas();
    }



    function startCosmosBattle(node) {
        if (!window.game || !node) return;
        const tier = getCosmosChallengeTier(node);
        const gravity = Math.max(1, Number(node.gravity || 1));
        const sizeClass = Math.max(1, Math.floor(node.sizeClass || 1));
        const state = getState();
        state.activeChallenge = {
            nodeId: node.id,
            name: node.name,
            tier,
            gravity,
            sizeClass,
            tag: node.tag || '',
            theme: node.theme || '',
            ele: node.tag === 'boss' ? 'chaos' : (node.tag === 'cold' ? 'cold' : (node.tag === 'fire' ? 'fire' : (node.tag === 'light' ? 'light' : 'chaos')))
        };
        window.game.currentZoneId = 'cosmos_challenge';
        window.game.killsInZone = 0;
        window.game.enemies = [];
        window.game.encounterPlan = [];
        window.game.encounterIndex = 0;
        window.game.runProgress = 0;
        window.game.moveTimer = 0;
        window.game.combatHalted = false;
        if (typeof window.startMoving === 'function') window.startMoving(true);
    }

    function challengeSelectedCosmosNode() {
        buildCosmosAtlasData();
        const state = getState();
        const node = ATLAS.byId.get(ATLAS.selectedId || state.selectedId || 'planet-0');
        if (!node) return;
        if (!canChallengeNode(node)) {
            if (typeof window.addLog === 'function') window.addLog('해당 우주계 노드는 아직 도전할 수 없습니다.', 'attack-monster');
            return;
        }
        if (typeof window.addLog === 'function') {
            window.addLog(`⚔️ ${node.name} 도전 시작: 중력 ${Number(node.gravity || 1).toFixed(1)}g · 크기 등급 ${Math.max(1, Math.floor(node.sizeClass || 1))} · 특징 ${node.theme}`, 'attack-monster');
        }
        startCosmosBattle(node);
    }


    function focusCosmosAtlasOnSelected() {
        const state = getState();
        const node = ATLAS.byId.get(ATLAS.selectedId || state.selectedId);
        if (!node) return;
        ATLAS.camera.x = -node.x;
        ATLAS.camera.y = -node.y;
        ATLAS.camera.scale = Math.max(DEFAULT_COSMOS_CAMERA_SCALE, ATLAS.camera.scale);
        saveCamera();
        renderCosmosAtlas();
    }

    function resetCosmosAtlasCamera() {
        ATLAS.camera = { x: 0, y: 0, scale: DEFAULT_COSMOS_CAMERA_SCALE };
        saveCamera();
        renderCosmosAtlas();
    }

    function boot() {
        installCosmosAtlas();
        if (window.game && window.game.mapSubtab === 'map-tab-cosmos') activateCosmosSubtab();
    }

    window.COSMOS_PLANETS = COSMOS_PLANETS;
    window.COSMOS_ASTEROID_NUMBERS = COSMOS_ASTEROID_NUMBERS;
    
    function renderMasteryPanel() {
        const el = document.getElementById('cosmos-inner-mastery'); if (!el) return;
        el.innerHTML = `<div class="cosmos-detail-title">성도술</div><div style="margin-bottom:6px;">가용 포인트: <b>${getCosmosMasteryFreePoints()}</b> / 누적 <b>${getCosmosMasteryTotalPoints()}</b></div>` + COSMOS_MASTERY_NODES.map(n=>{const lockReason=getCosmosMasteryLockReason(n.key);const canSpend=getCosmosMasteryFreePoints()>=n.cost&&getCosmosMasteryValue(n.key)<n.max&&!lockReason;return `<div style="margin-bottom:8px;"><button onclick="allocateCosmosMastery('${n.key}')" ${canSpend?'':'disabled'}>+</button> <b>${n.name}</b> ${getCosmosMasteryValue(n.key)}/${n.max} <span style="color:#ffd08a;">(비용 ${n.cost})</span><div style="font-size:11px;color:#9cb2ca;">${n.desc}</div></div>`;}).join('');
    }
    function switchCosmosInnerTab(tab) {
      const a=document.getElementById('cosmos-inner-atlas'), m=document.getElementById('cosmos-inner-mastery');
      const ba=document.getElementById('btn-cosmos-sub-atlas'), bm=document.getElementById('btn-cosmos-sub-mastery');
      if (a) a.style.display = tab==='atlas' ? '' : 'none'; if (m) m.style.display = tab==='mastery' ? '' : 'none';
      if (ba) ba.classList.toggle('active', tab==='atlas'); if (bm) bm.classList.toggle('active', tab==='mastery');
      if (tab==='mastery') renderMasteryPanel();
    }

    window.renderCosmosAtlas = renderCosmosAtlas;
    window.exploreSelectedCosmosNode = exploreSelectedCosmosNode;
    window.challengeSelectedCosmosNode = challengeSelectedCosmosNode;
    window.allocateCosmosMastery = allocateCosmosMastery;
    window.equipBossStoneByGalaxy = equipBossStoneByGalaxy;
    window.unequipBossStoneByGalaxy = unequipBossStoneByGalaxy;
    window.applyCosmosBossRelicToStone = applyCosmosBossRelicToStone;
    window.showCosmosStoneTooltip = showCosmosStoneTooltip;
    window.switchCosmosInnerTab = switchCosmosInnerTab;
    window.focusCosmosAtlasOnSelected = focusCosmosAtlasOnSelected;
    window.resetCosmosAtlasCamera = resetCosmosAtlasCamera;
    window.zoomCosmosAtlas = zoomCosmosAtlas;
    window.installCosmosAtlas = installCosmosAtlas;

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    window.addEventListener('load', boot);
})();
