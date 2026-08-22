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

    const COSMOS_LAYOUT_VERSION = 20260811;
    const DEFAULT_COSMOS_CAMERA_SCALE = 0.56;
    const GALAXY_SEQUENCE = [1, 2, 3, 4, 5];
    const PLANETS_PER_GALAXY = 10;
    const ASTEROIDS_PER_GALAXY = 15;
    const NODES_PER_GALAXY = PLANETS_PER_GALAXY + ASTEROIDS_PER_GALAXY;
    const GALAXY_BOSS_REQUIRED_CLEARS = 15;
    const GALAXY_BOSS_PLANET_INDEX = {
        1: 46,
        2: 47,
        3: 48,
        4: 49,
        5: 45
    };
    const COSMOS_CAPSTONE_BOSS_IDS = Object.freeze(
        GALAXY_SEQUENCE.map(galaxy => `planet-${GALAXY_BOSS_PLANET_INDEX[galaxy]}`)
    );
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
        roadmap: null,
        tooltip: null,
        selectedId: 'planet-0',
        hoverId: null,
        camera: { x: 0, y: 0, scale: DEFAULT_COSMOS_CAMERA_SCALE },
        drag: { active: false, moved: false, startX: 0, startY: 0, baseX: 0, baseY: 0 },
        installed: false,
        needsFrame: false,
        dpr: 1,
        uiButtons: [],
        stoneSlot: null,
        uiArmed: null,
        stoneOverlayOpen: false
    };

    const COSMOS_MASTERY_NODES = [
        { key: 'planetRelief', name: '행성 패널티 완화', max: 30, cost: 1, desc: '10레벨마다 행성 전투 위협 티어 -1 (최대 -3)' },
        { key: 'asteroidRelief', name: '소행성 수확 증폭', max: 24, cost: 1, desc: '소행성 클리어 별가루 +1.6% (최대 38.4%)' },
        { key: 'combatFocus', name: '전투 파밍 집중', max: 24, cost: 1, desc: '행성 클리어 별가루 +1.0% (최대 24%)' },
        { key: 'craftFocus', name: '제작 파밍 집중', max: 24, cost: 1, desc: '소행성 클리어 별가루 +1.0% (최대 24%)' },
        { key: 'stardustGain', name: '별가루 증폭', max: 30, cost: 1, desc: '우주계 별가루 획득 +1.0% (최대 30%)' },
        { key: 'challengeEase', name: '행성 난이도 완화', max: 22, cost: 1, desc: '4레벨마다 우주계 전투 위협 티어 -1 (최대 -5)' },
        { key: 'highRisk', name: '고위험 난이도', max: 20, cost: 1, desc: '4레벨마다 위협 티어 +1, 보상 +2.2% (최대 +44%)' },
        { key: 'bossBounty', name: '보스 보상 강화', max: 18, cost: 1, desc: '은하 보스 별가루 보상 +2.2% (최대 +39.6%)' },
        { key: 'routeInsight', name: '별길 통찰', max: 28, cost: 1, desc: '7레벨마다 우주계 전투 위협 티어 -1 (최대 -4)' },
        { key: 'gravityHarness', name: '중력 제어', max: 22, cost: 1, desc: '중력 페널티 완화 +1.0% (최대 22%)' },
        { key: 'warpEfficiency', name: '항성 추진', max: 20, cost: 1, desc: '모든 우주계 클리어 별가루 +1.0% (최대 20%)' },
        { key: 'eliteHunt', name: '유물 감응', max: 20, cost: 1, desc: '보스 유물 드랍 확률 +0.7%p (최대 +14%p)' },
        { key: 'resonanceDrive', name: '공명 구동', max: 22, cost: 1, desc: '우주계 전투 최종 피해 +0.6% (최대 13.2%)' },
        { key: 'voidSurvey', name: '공허 측량', max: 20, cost: 1, desc: '8레벨마다 소행성 전투 위협 티어 -1 (최대 -2)' },
        { key: 'stellarForge', name: '항성 단조', max: 26, cost: 1, desc: '소행성 클리어 별가루 +0.9% (최대 23.4%)' },
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

    function getGalaxyRouteOrder(localSlot, isGalaxyBoss) {
        if (isGalaxyBoss) return 22;
        const withoutBoss = localSlot > 9 ? localSlot - 1 : localSlot;
        return withoutBoss >= 22 ? withoutBoss + 1 : withoutBoss;
    }

    function getGalaxyRoutePosition(galaxy, routeOrder) {
        const spec = GALAXY_SPECS[galaxy] || GALAXY_SPECS[1];
        if (galaxy === 0) return { x: spec.x, y: spec.y };
        const order = Math.max(0, Math.min(NODES_PER_GALAXY - 1, Math.floor(routeOrder || 0)));
        const stage = Math.floor(order / 5);
        const lane = (order % 5) - 2;
        const length = Math.max(1, Math.hypot(spec.x, spec.y));
        const dx = spec.x / length;
        const dy = spec.y / length;
        // 5x5 격자 대신 중심 줄기에서 짧은 가지가 뻗는 성좌 형태로 배치한다.
        // 진행 방향은 은하 중심의 방사 방향이며, 보스(마지막 중앙 노드)는 가장 바깥에 놓인다.
        const branchDepth = Math.abs(lane);
        const sweep = lane === 0 ? 0 : (stage % 2 === 0 ? lane : -lane) * 12;
        const progress = (stage - 2) * 154 + branchDepth * 28 + sweep;
        const side = lane * (78 + stage * 7);
        return {
            x: spec.x + dx * progress - dy * side,
            y: spec.y + dy * progress + dx * side
        };
    }

    function assignGalaxyRoutePositions() {
        GALAXY_SEQUENCE.forEach(galaxy => {
            const nodes = ATLAS.nodes.filter(node => node.orbit === galaxy);
            const boss = nodes.find(node => node.tag === 'boss');
            const routeOrders = Array.from({ length: NODES_PER_GALAXY }, (_, index) => index)
                .filter(order => order !== 22);
            nodes.filter(node => node !== boss).sort((a, b) => a.localSlot - b.localSlot).forEach((node, index) => {
                node.routeOrder = routeOrders[index];
                Object.assign(node, getGalaxyRoutePosition(galaxy, node.routeOrder));
            });
            if (boss) {
                boss.routeOrder = 22;
                Object.assign(boss, getGalaxyRoutePosition(galaxy, boss.routeOrder));
            }
        });
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
            const isGalaxyBoss = galaxy > 0 && GALAXY_BOSS_PLANET_INDEX[galaxy] === idx;
            const routeOrder = galaxy === 0 ? 0 : getGalaxyRouteOrder(localSlot, isGalaxyBoss);
            const pos = getGalaxyRoutePosition(galaxy, routeOrder);
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
                routeOrder,
                tier: idx === 0 ? 1 : Math.max(1, Math.min(25, isGalaxyBoss
                    ? getGalaxyTierBandBase(galaxy) + 4
                    : getGalaxyTierBandBase(galaxy) + Math.min(4, Math.floor(planetSlot / 2)))),
                x: pos.x,
                y: pos.y,
                radius: idx === 0 ? 19 : Math.max(11, 17 - galaxy * 0.35 + sizeClass * 0.4),
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
            const routeOrder = getGalaxyRouteOrder(localSlot, false);
            const pos = getGalaxyRoutePosition(galaxy, routeOrder);
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
                routeOrder,
                tier: Math.max(1, Math.min(25, getGalaxyTierBandBase(galaxy) + Math.min(4, Math.floor(asteroidSlot / 3)))),
                x: pos.x,
                y: pos.y,
                radius: Math.max(9, 12.5 - galaxy * 0.2 + sizeClass * 0.25),
                labelPriority: 0,
                sizeClass,
                gravity
            };
            ATLAS.nodes.push(node);
        });

        assignGalaxyRoutePositions();
        ATLAS.nodes.forEach(node => ATLAS.byId.set(node.id, node));
        buildEdges();
    }

    function addEdge(a, b, type) {
        if (!a || !b || a === b) return;
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (ATLAS.edges.some(e => e.key === key)) return;
        ATLAS.edges.push({ key, a, b, type: type || 'route' });
    }

    function buildEdges() {
        GALAXY_SEQUENCE.forEach(galaxy => {
            const route = ATLAS.nodes.filter(node => node.orbit === galaxy)
                .sort((a, b) => a.routeOrder - b.routeOrder);
            const byOrder = new Map(route.map(node => [node.routeOrder, node]));
            for (let stage = 0; stage < 5; stage++) {
                const leftOuter = byOrder.get(stage * 5);
                const leftInner = byOrder.get(stage * 5 + 1);
                const center = byOrder.get(stage * 5 + 2);
                const rightInner = byOrder.get(stage * 5 + 3);
                const rightOuter = byOrder.get(stage * 5 + 4);
                if (leftOuter && leftInner) addEdge(leftOuter.id, leftInner.id, 'branch');
                if (leftInner && center) addEdge(leftInner.id, center.id, 'branch');
                if (center && rightInner) addEdge(center.id, rightInner.id, 'branch');
                if (rightInner && rightOuter) addEdge(rightInner.id, rightOuter.id, 'branch');
                const nextCenter = byOrder.get((stage + 1) * 5 + 2);
                if (center && nextCenter) addEdge(center.id, nextCenter.id, 'spine');
                if (stage < 4 && stage % 2 === 0 && rightInner && nextCenter) addEdge(rightInner.id, nextCenter.id, 'route');
                if (stage < 4 && stage % 2 === 1 && leftInner && nextCenter) addEdge(leftInner.id, nextCenter.id, 'route');
            }
            const entry = byOrder.get(2);
            const previous = galaxy === 1 ? ATLAS.byId.get('planet-0')
                : ATLAS.byId.get(`planet-${GALAXY_BOSS_PLANET_INDEX[galaxy - 1]}`);
            if (entry && previous) addEdge(previous.id, entry.id, galaxy === 1 ? 'spine' : 'transition');
        });
    }

    function getCosmosStarDustBalance() {
        if (!window.game) window.game = {};
        if (!window.game.currencies || typeof window.game.currencies !== 'object') window.game.currencies = {};
        const balance = Math.max(0, Math.floor(Number(window.game.currencies.starDust) || 0));
        window.game.currencies.starDust = balance;
        return balance;
    }

    function migrateLegacyCosmosStarDust(state) {
        const legacyBalance = Math.max(0, Math.floor(Number(state && state.starDust) || 0));
        if (!window.game) window.game = {};
        if (!window.game.currencies || typeof window.game.currencies !== 'object') window.game.currencies = {};
        const hasWalletBalance = Object.prototype.hasOwnProperty.call(window.game.currencies, 'starDust');
        const balance = hasWalletBalance ? getCosmosStarDustBalance() : legacyBalance;
        window.game.currencies.starDust = balance;
        if (state && Object.prototype.hasOwnProperty.call(state, 'starDust')) delete state.starDust;
        return balance;
    }

    function grantCosmosStarDust(amount) {
        const gain = Math.max(0, Math.floor(Number(amount) || 0));
        window.game.currencies.starDust = getCosmosStarDustBalance() + gain;
        return gain;
    }

    function normalizeCosmosExpeditionState(state) {
        const cycles = state.directiveCycles && typeof state.directiveCycles === 'object'
            && !Array.isArray(state.directiveCycles)
            ? state.directiveCycles : {};
        Object.keys(cycles).forEach(nodeId => {
            cycles[nodeId] = Math.max(0, Math.min(999999, Math.floor(Number(cycles[nodeId]) || 0)));
        });
        const selected = state.selectedDirectives && typeof state.selectedDirectives === 'object'
            && !Array.isArray(state.selectedDirectives)
            ? state.selectedDirectives : {};
        Object.keys(selected).forEach(nodeId => {
            if (typeof selected[nodeId] !== 'string' || !selected[nodeId]) delete selected[nodeId];
        });
        state.directiveCycles = cycles;
        state.selectedDirectives = selected;
    }

    function getState() {
        if (!window.game) window.game = {};
        const state = window.game.cosmosAtlas && typeof window.game.cosmosAtlas === 'object'
            ? window.game.cosmosAtlas
            : (window.game.cosmosAtlas = {});
        state.cleared = Array.isArray(state.cleared) ? Array.from(new Set(state.cleared.filter(id => typeof id === 'string'))) : [];
        state.selectedId = state.selectedId || 'planet-0';
        state.camera = state.camera && typeof state.camera === 'object' ? state.camera : null;
        if (state.layoutVersion !== COSMOS_LAYOUT_VERSION) {
            state.camera = { x: 0, y: 0, scale: DEFAULT_COSMOS_CAMERA_SCALE };
            state.layoutVersion = COSMOS_LAYOUT_VERSION;
        }
        migrateLegacyCosmosStarDust(state);
        state.bossClears = Array.isArray(state.bossClears) ? Array.from(new Set(state.bossClears.filter(id => typeof id === 'string'))) : [];
        state.bossKills = state.bossKills && typeof state.bossKills === 'object' ? state.bossKills : {};
        Object.keys(state.bossKills).forEach(id => { state.bossKills[id] = Math.max(0, Math.floor(Number(state.bossKills[id]) || 0)); });
        state.bossRelics = Array.isArray(state.bossRelics) ? state.bossRelics.filter(relic => relic && relic.rerollStoneOption && Math.floor(Number(relic.galaxy) || 0) >= 1 && Math.floor(Number(relic.galaxy) || 0) <= 5) : [];
        state.bossExclusiveMisses = state.bossExclusiveMisses && typeof state.bossExclusiveMisses === 'object' ? state.bossExclusiveMisses : {};
        Object.keys(state.bossExclusiveMisses).forEach(id => { state.bossExclusiveMisses[id] = Math.max(0, Math.min(39, Math.floor(Number(state.bossExclusiveMisses[id]) || 0))); });
        state.bossStones = state.bossStones && typeof state.bossStones === 'object' ? state.bossStones : {};
        Object.keys(state.bossStones).forEach(g => { if (!/^[1-5]$/.test(g) || !state.bossStones[g]) delete state.bossStones[g]; });
        state.bossStoneOptions = state.bossStoneOptions && typeof state.bossStoneOptions === 'object' ? state.bossStoneOptions : {};
        state.equippedStones = state.equippedStones && typeof state.equippedStones === 'object' ? state.equippedStones : {};
        Object.keys(state.equippedStones).forEach(g => {
            const galaxy = Math.floor(Number(g) || 0);
            if (galaxy < 1 || galaxy > 6 || !state.equippedStones[g] || !isCosmosStoneAcquired(state, galaxy)) delete state.equippedStones[g];
        });
        state.equippedStoneGalaxy = getEquippedCosmosStoneCount(state);
        normalizeCosmosExpeditionState(state);
        state.masteryPointsSpent = Math.max(0, Math.floor(state.masteryPointsSpent || 0));
        state.mastery = state.mastery && typeof state.mastery === 'object' ? state.mastery : {};
        COSMOS_MASTERY_NODES.forEach(node => {
            state.mastery[node.key] = Math.max(0, Math.min(node.max, Math.floor(state.mastery[node.key] || 0)));
        });
        if (!state.camera) state.camera = { x: 0, y: 0, scale: DEFAULT_COSMOS_CAMERA_SCALE };
        return state;
    }

    function getCosmosCapstoneProgress(stateOverride) {
        const state = stateOverride && typeof stateOverride === 'object' ? stateOverride : getState();
        const clearedSet = new Set(Array.isArray(state.bossClears) ? state.bossClears : []);
        const bosses = COSMOS_CAPSTONE_BOSS_IDS.map((id, index) => {
            const planetIndex = Math.max(0, Math.floor(Number(String(id).replace('planet-', ''))) || 0);
            const def = COSMOS_PLANETS[planetIndex] || {};
            return {
                id,
                galaxy: index + 1,
                name: def.name || id,
                cleared: clearedSet.has(id)
            };
        });
        const clearedCount = bosses.filter(row => row.cleared).length;
        const keyCount = Math.max(0, Math.floor(Number(
            window.game && window.game.currencies && window.game.currencies.cosmosSovereignKey
        ) || 0));
        const season = Math.max(1, Math.floor(Number(window.game && window.game.season) || 1));
        return {
            bosses,
            clearedCount,
            total: bosses.length,
            missing: bosses.filter(row => !row.cleared),
            ready: clearedCount === bosses.length,
            eligibleSeason: season >= 31,
            keyCount,
            canChallenge: season >= 31 && clearedCount === bosses.length && keyCount > 0
        };
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
        const woodsmanCleared = Array.isArray(window.game.journalEntries)
            && window.game.journalEntries.includes('woodsman');
        const underworld = (window.game.underworldProgress && typeof window.game.underworldProgress === 'object')
            ? window.game.underworldProgress
            : null;
        const highestFloor = underworld ? Math.max(1, Math.floor(underworld.highestFloor || 1)) : 1;
        return woodsmanCleared && highestFloor >= 30;
    }

    function getNodeStatus(node) {
        const state = getState();
        if (!isCosmosUnlocked()) return 'locked';
        if (state.cleared.includes(node.id)) return 'cleared';
        if (node.id === 'planet-0') return 'available';
        if (node.orbit > 1) {
            const previousBoss = `planet-${GALAXY_BOSS_PLANET_INDEX[node.orbit - 1]}`;
            if (!state.bossClears.includes(previousBoss)) return 'locked';
        }
        if (node.tag === 'boss') {
            const galaxyClears = ATLAS.nodes.filter(row => row.orbit === node.orbit
                && row.id !== node.id && state.cleared.includes(row.id)).length;
            if (galaxyClears < GALAXY_BOSS_REQUIRED_CLEARS) return 'locked';
            return 'available';
        }
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
            const style = tier === current ? 'color:#ffd98a;font-weight:800;text-shadow:0 0 8px rgba(255,217,138,.65);' : 'color:var(--copy-bright);';
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

    // ===== 캔버스 내부 우주석 슬롯 & 지도 컨트롤 =====
    function getCosmosUiScale() {
        return Math.max(1, ATLAS.dpr || 1);
    }

    function hasEquippableCosmosStone(state) {
        const galaxies = hasSixthCosmosStoneUnlock() ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
        return galaxies.some(g => isCosmosStoneAcquired(state, g) && !(state.equippedStones && state.equippedStones[String(g)]));
    }

    function isCosmosTabActive() {
        const tab = document.getElementById('map-tab-cosmos');
        return !!(tab && tab.classList.contains('active')) && !document.hidden;
    }

    function shouldAnimateCosmos() {
        if (!isCosmosTabActive()) return false;
        if (ATLAS.stonePulse) return true;
        try { return hasEquippableCosmosStone(getState()); } catch (error) { return false; }
    }

    function tracePentagon(ctx, cx, cy, r, rotation) {
        const rot = rotation == null ? -Math.PI / 2 : rotation;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = rot + i * (Math.PI * 2 / 5);
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
    }

    function traceRoundRect(ctx, x, y, w, h, r) {
        const rr = Math.max(0, Math.min(r, w / 2, h / 2));
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
    }

    function drawCosmosControls(ctx) {
        const canvas = ATLAS.canvas;
        if (!canvas) return;
        const ui = getCosmosUiScale();
        const size = 34 * ui;
        const gap = 8 * ui;
        const margin = 14 * ui;
        const buttons = [
            { action: 'zoomIn', label: '＋' },
            { action: 'zoomOut', label: '－' },
            { action: 'reset', label: '⟲' }
        ];
        ATLAS.uiButtons = [];
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${Math.round(18 * ui)}px Malgun Gothic, sans-serif`;
        buttons.forEach((btn, i) => {
            const x = canvas.width - margin - size;
            const y = margin + i * (size + gap);
            const hovered = ATLAS.uiHover === btn.action;
            traceRoundRect(ctx, x, y, size, size, 8 * ui);
            ctx.fillStyle = hovered ? 'rgba(36,58,84,0.96)' : 'rgba(14,22,34,0.86)';
            ctx.fill();
            ctx.lineWidth = 1.2 * ui;
            ctx.strokeStyle = 'rgba(127,201,255,0.55)';
            ctx.stroke();
            ctx.fillStyle = '#cfe6ff';
            ctx.fillText(btn.label, x + size / 2, y + size / 2 + ui);
            ATLAS.uiButtons.push({ action: btn.action, x, y, w: size, h: size });
        });
        ctx.restore();
    }

    function drawCosmosStoneSlotGlow(ctx, center, r, pulse) {
        const glowR = r * (1.7 + pulse * 0.5);
        const glow = ctx.createRadialGradient(center.x, center.y, r * 0.4, center.x, center.y, glowR);
        glow.addColorStop(0, `rgba(255,221,138,${0.40 + pulse * 0.3})`);
        glow.addColorStop(1, 'rgba(255,221,138,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(center.x, center.y, glowR, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawCosmosStoneDial(ctx, center, r, visual) {
        // 지도와 같은 천구의 형태로 슬롯을 그려, 노드와 구분하면서도 같은 세계관을 유지한다.
        const body = ctx.createRadialGradient(center.x - r * .3, center.y - r * .35, r * .1, center.x, center.y, r);
        body.addColorStop(0, 'rgba(112,170,214,.92)');
        body.addColorStop(.24, 'rgba(31,57,82,.98)');
        body.addColorStop(1, 'rgba(7,13,24,.98)');
        ctx.beginPath();
        ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
        ctx.fillStyle = body;
        ctx.fill();
        ctx.lineWidth = (visual.equippable ? 2.6 : 1.8) * visual.ui;
        ctx.strokeStyle = visual.equippable ? `rgba(255,221,138,${0.7 + visual.pulse * 0.3})` : visual.hovered ? 'rgba(143,212,255,0.95)' : 'rgba(127,201,255,0.55)';
        if (visual.equippable) { ctx.shadowColor = 'rgba(255,221,138,0.85)'; ctx.shadowBlur = (10 + visual.pulse * 12) * visual.ui; }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(center.x, center.y, r * .72, -Math.PI * .85, Math.PI * .2);
        ctx.strokeStyle = 'rgba(196,226,255,.48)';
        ctx.lineWidth = 1.2 * visual.ui;
        ctx.stroke();
        for (let tick = 0; tick < 8; tick++) {
            const angle = tick / 8 * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(center.x + Math.cos(angle) * r * .88, center.y + Math.sin(angle) * r * .88);
            ctx.lineTo(center.x + Math.cos(angle) * r * 1.08, center.y + Math.sin(angle) * r * 1.08);
            ctx.strokeStyle = 'rgba(127,201,255,.46)';
            ctx.stroke();
        }

        // 라벨
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#d7ebff';
        ctx.font = `${Math.round(11 * visual.ui)}px Malgun Gothic, sans-serif`;
        ctx.fillText('우주석 슬롯', center.x, center.y - r * 0.34);
        ctx.fillStyle = visual.equippable ? '#ffd98a' : '#9fb4d1';
        ctx.font = `bold ${Math.round(16 * visual.ui)}px Malgun Gothic, sans-serif`;
        ctx.fillText(`${visual.equippedCount}/${visual.maxStones}`, center.x, center.y + r * 0.24);
    }

    function drawCosmosStoneSlot(ctx) {
        const state = getState();
        const ui = getCosmosUiScale();
        const sirion = ATLAS.byId.get('planet-0');
        const worldY = (sirion ? sirion.y + (sirion.radius || 18) : 18) + 64;
        const center = worldToScreen({ x: sirion ? sirion.x : 0, y: worldY });
        const r = (30 + 8 * Math.max(0.5, Math.min(1.6, ATLAS.camera.scale))) * ui;
        const equippable = hasEquippableCosmosStone(state);
        const pulse = equippable ? (0.5 + 0.5 * Math.sin(Date.now() / 360)) : 0;
        const visual = {
            ui, equippable, pulse, hovered: ATLAS.uiHover === 'slot',
            equippedCount: getEquippedCosmosStoneCount(state),
            maxStones: hasSixthCosmosStoneUnlock() ? 6 : 5
        };
        ctx.save();
        if (equippable) drawCosmosStoneSlotGlow(ctx, center, r, pulse);
        drawCosmosStoneDial(ctx, center, r, visual);
        ctx.restore();
        ATLAS.stoneSlot = { x: center.x, y: center.y, r: r };
    }

    function eventToCanvasXY(event) {
        const rect = ATLAS.canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (ATLAS.canvas.width / Math.max(1, rect.width)),
            y: (event.clientY - rect.top) * (ATLAS.canvas.height / Math.max(1, rect.height))
        };
    }

    function hitCosmosUiAt(cx, cy) {
        const btn = (ATLAS.uiButtons || []).find(b => cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h);
        if (btn) return btn.action;
        const slot = ATLAS.stoneSlot;
        if (slot && Math.hypot(cx - slot.x, cy - slot.y) <= slot.r * 1.05) return 'slot';
        return null;
    }

    function runCosmosUiAction(action) {
        if (action === 'zoomIn') zoomCosmosAtlas(1.14);
        else if (action === 'zoomOut') zoomCosmosAtlas(0.88);
        else if (action === 'reset') resetCosmosAtlasCamera();
        else if (action === 'slot') toggleCosmosStoneOverlay();
    }

    function buildCosmosStoneOverlayHtml(state) {
        return `<div class="cosmos-stone-overlay-inner">
            <div class="cosmos-stone-overlay-head">
                <span>💠 우주석 장착</span>
                <button type="button" class="cosmos-stone-overlay-close" onclick="closeCosmosStoneOverlay()">✕</button>
            </div>
            ${renderCosmosStonePanel(state)}
        </div>`;
    }

    function refreshCosmosStoneOverlay() {
        const el = document.getElementById('cosmos-stone-overlay');
        if (!el || !ATLAS.stoneOverlayOpen) return;
        el.innerHTML = buildCosmosStoneOverlayHtml(getState());
    }

    function openCosmosStoneOverlay() {
        const el = document.getElementById('cosmos-stone-overlay');
        if (!el) return;
        ATLAS.stoneOverlayOpen = true;
        el.style.display = 'block';
        refreshCosmosStoneOverlay();
        if (ATLAS.tooltip) ATLAS.tooltip.style.display = 'none';
    }

    function closeCosmosStoneOverlay() {
        const el = document.getElementById('cosmos-stone-overlay');
        ATLAS.stoneOverlayOpen = false;
        if (el) el.style.display = 'none';
    }

    function toggleCosmosStoneOverlay() {
        if (ATLAS.stoneOverlayOpen) closeCosmosStoneOverlay();
        else openCosmosStoneOverlay();
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
        return `<div class="tooltip-title">${escapeHtml(getCosmosStoneNameByGalaxy(g))}</div>${getCosmosTierFloorTooltipHtml()}<div class="tooltip-line" style="color:var(--copy-bright);">보스 유물 사용: 무작위 1줄을 해당 우주석의 보스 옵션으로 리롤</div>${lines}`;
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

    function getCosmosDirectiveChoicesForNode(node, stateOverride) {
        if (!node || typeof window.getCosmosExpeditionDirectiveChoices !== 'function') return [];
        const state = stateOverride || getState();
        const cycle = Math.max(0, Math.floor(Number(state.directiveCycles[node.id]) || 0));
        return window.getCosmosExpeditionDirectiveChoices(node.id, cycle);
    }

    function getSelectedCosmosDirective(node, stateOverride) {
        const state = stateOverride || getState();
        const choices = getCosmosDirectiveChoicesForNode(node, state);
        if (choices.length === 0) return null;
        const selectedId = state.selectedDirectives[node.id];
        return choices.find(row => row.id === selectedId) || choices[0];
    }

    function createCosmosDirectiveSnapshot(directive) {
        if (!directive) return null;
        return {
            id: directive.id, name: directive.name,
            enemyHpMul: directive.enemyHpMul, enemyDamageMul: directive.enemyDamageMul,
            enemyAttackSpeedMul: directive.enemyAttackSpeedMul, rewardMul: directive.rewardMul,
            jackpotChance: directive.jackpotChance, jackpotBonusMul: directive.jackpotBonusMul,
            rare: directive.rare === true
        };
    }

    function selectCosmosExpeditionDirective(nodeId, directiveId) {
        const node = ATLAS.byId.get(String(nodeId || ''));
        if (!node || getNodeStatus(node) === 'locked') return false;
        const state = getState();
        const fightingThisNode = window.game.currentZoneId === 'cosmos_challenge'
            && state.activeChallenge && state.activeChallenge.nodeId === node.id;
        if (fightingThisNode) return false;
        const choices = getCosmosDirectiveChoicesForNode(node, state);
        const selected = choices.find(row => row.id === String(directiveId || ''));
        if (!selected) return false;
        state.selectedDirectives[node.id] = selected.id;
        renderCosmosAtlas();
        return true;
    }

    function advanceCosmosDirectiveCycle(state, nodeId) {
        const current = Math.max(0, Math.floor(Number(state.directiveCycles[nodeId]) || 0));
        state.directiveCycles[nodeId] = Math.min(999999, current + 1);
        delete state.selectedDirectives[nodeId];
    }

    function getCompletedChallengeDirective(state, node) {
        const challenge = state.activeChallenge && state.activeChallenge.nodeId === node.id
            ? state.activeChallenge : null;
        if (challenge && challenge.directive) return challenge.directive;
        return createCosmosDirectiveSnapshot(getSelectedCosmosDirective(node, state));
    }



    function canChallengeNode(node) {
        if (!node) return false;
        const status = getNodeStatus(node);
        return status === 'available' || status === 'cleared';
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
        const generalEase = Math.floor(getCosmosMasteryValue('challengeEase') / 4)
            + Math.floor(getCosmosMasteryValue('routeInsight') / 7);
        const routeEase = node && node.kind === 'planet'
            ? Math.floor(getCosmosMasteryValue('planetRelief') / 10)
            : Math.floor(getCosmosMasteryValue('voidSurvey') / 8);
        const riskTier = Math.floor(getCosmosMasteryValue('highRisk') / 4);
        const tierAdjustment = Math.max(-8, Math.min(6, riskTier - generalEase - routeEase));
        const cosmosLoopBonus = Math.max(0, Math.floor((window.game && window.game.cosmosLoopCount) || 0)) * 2;
        return Math.max(1, baseCombatTier + tierAdjustment + cosmosLoopBonus);
    }

    function getCosmosNodeMechanic(node) {
        if (!node || typeof window.resolveCosmosMechanic !== 'function') return null;
        const environment = Array.isArray(window.COSMOS_GALAXY_ENVIRONMENT_DB)
            ? window.COSMOS_GALAXY_ENVIRONMENT_DB.find(row => row && row.galaxy === node.orbit) : null;
        const boss = typeof window.getCosmosGalaxyBossMechanic === 'function'
            ? window.getCosmosGalaxyBossMechanic(node.id) : null;
        if (boss) {
            const element = boss.elementRule === 'physical' ? 'phys'
                : (boss.elementRule === 'chaos' ? 'chaos' : 'weakest');
            return {
                ...boss, element,
                summary: environment ? `${environment.summary} ${boss.summary}` : boss.summary,
                counter: environment ? `${environment.counter} ${boss.counter}` : boss.counter
            };
        }
        const mechanic = window.resolveCosmosMechanic(node.tag, hashSeed(node.id));
        if (!mechanic || !environment) return mechanic;
        return {
            ...mechanic,
            name: `${environment.name} · ${mechanic.name}`,
            summary: `${environment.summary} ${mechanic.summary}`,
            counter: `${environment.counter} ${mechanic.counter}`
        };
    }

    function createCosmosEstimateZone(node, mechanic) {
        const directive = getSelectedCosmosDirective(node);
        return {
            id: 'cosmos_challenge',
            name: `우주계 ${node.name}`,
            type: 'cosmos',
            tier: getCosmosChallengeTier(node),
            lootTier: getDisplayedNodeTier(node),
            ele: mechanic && ['phys', 'fire', 'cold', 'light', 'chaos'].includes(mechanic.element)
                ? mechanic.element : 'chaos',
            cosmosNodeId: node.id,
            cosmosGalaxy: node.orbit,
            cosmosTag: node.baseTag || node.tag || '',
            cosmosMechanicId: mechanic ? mechanic.id : '',
            gravity: Math.max(1, Number(node.gravity || 1)),
            sizeClass: Math.max(1, Math.floor(node.sizeClass || 1)),
            cosmosDirective: createCosmosDirectiveSnapshot(directive)
        };
    }

    function getCosmosReadinessStats(node) {
        const stats = typeof window.getPlayerStats === 'function' ? window.getPlayerStats() : {};
        const currentZone = typeof window.getZone === 'function' ? window.getZone(window.game && window.game.currentZoneId) : null;
        const masteryAlreadyActive = currentZone && currentZone.type === 'cosmos';
        const damageBonus = masteryAlreadyActive ? 1 : 1 + getCosmosMasteryValue('resonanceDrive') * 0.006;
        const bossBonus = !masteryAlreadyActive && node && node.tag === 'boss'
            ? 1 + getCosmosMasteryValue('starbreaker') * 0.018 : 1;
        const guardMul = masteryAlreadyActive ? 1 : Math.max(0.5, 1 - getCosmosMasteryValue('riftGuard') * 0.007);
        const totalDps = Math.max(0, Number(stats.totalDps)
            || (Number(stats.dps) || 0) + (Number(stats.summonDps) || 0));
        return {
            ...stats,
            totalDps: totalDps * damageBonus * bossBonus,
            genericTakenDamageMultiplier: Math.max(0.01, Number(stats.genericTakenDamageMultiplier) || 1) * guardMul
        };
    }

    function getCosmosNodeRecommendation(nodeOrId) {
        buildCosmosAtlasData();
        const node = typeof nodeOrId === 'string' ? ATLAS.byId.get(nodeOrId) : nodeOrId;
        if (!node || typeof window.calculateCosmosDifficultyTarget !== 'function') return null;
        const mechanic = getCosmosNodeMechanic(node);
        const directive = getSelectedCosmosDirective(node);
        const estimateZone = createCosmosEstimateZone(node, mechanic);
        const actualEstimate = typeof window.estimateMapZonePowerRequirements === 'function'
            ? window.estimateMapZonePowerRequirements(estimateZone) : null;
        const target = actualEstimate || window.calculateCosmosDifficultyTarget({
            combatTier: getCosmosChallengeTier(node),
            sizeClass: node.sizeClass,
            gravity: node.gravity,
            isGalaxyBoss: node.tag === 'boss',
            element: mechanic ? mechanic.element : 'chaos',
            directive
        });
        if (mechanic && mechanic.element === 'weakest') target.element = 'weakest';
        const stats = getCosmosReadinessStats(node);
        const readiness = typeof window.getMapPowerReadiness === 'function'
            ? window.getMapPowerReadiness(stats, target) : null;
        return { nodeId: node.id, mechanic, directive, target, readiness };
    }

    function getGalaxyClearCount(state, galaxy) {
        return ATLAS.nodes.filter(node => node.orbit === galaxy && node.tag !== 'boss'
            && state.cleared.includes(node.id)).length;
    }

    function getCosmosProgressGuide() {
        buildCosmosAtlasData();
        const state = getState();
        const woodsmanCleared = Array.isArray(window.game && window.game.journalEntries)
            && window.game.journalEntries.includes('woodsman');
        if (!woodsmanCleared) return { stage: 'unlock', title: '혼돈 밖의 나무꾼 격파', detail: '나무꾼을 넘은 뒤 지하계 30층에서 우주계 관문을 찾을 수 있습니다.', targetId: null };
        if (!isCosmosUnlocked()) return { stage: 'unlock', title: '지하계 30층 도달', detail: '나무꾼 이후 지하계를 내려가 우주계 관문을 여세요.', targetId: null };
        if (!state.cleared.includes('planet-0')) return { stage: 'entry', title: '시리온 관문 돌파', detail: '중앙 관문을 클리어하면 첫 은하의 별길이 열립니다.', targetId: 'planet-0' };
        for (const galaxy of GALAXY_SEQUENCE) {
            const bossId = `planet-${GALAXY_BOSS_PLANET_INDEX[galaxy]}`;
            if (state.bossClears.includes(bossId)) continue;
            const clearCount = getGalaxyClearCount(state, galaxy);
            const bossReady = clearCount >= GALAXY_BOSS_REQUIRED_CLEARS;
            const candidates = ATLAS.nodes.filter(node => node.orbit === galaxy
                && getNodeStatus(node) === 'available' && (bossReady || node.tag !== 'boss'))
                .sort((a, b) => a.routeOrder - b.routeOrder);
            const target = bossReady ? ATLAS.byId.get(bossId) : candidates[0];
            return {
                stage: bossReady ? 'boss' : 'stabilize', galaxy,
                title: bossReady ? `G${galaxy} 은하 보스 격파` : `G${galaxy} 별길 안정화 ${clearCount}/${GALAXY_BOSS_REQUIRED_CLEARS}`,
                detail: bossReady ? '보스를 격파해 우주석과 다음 은하를 여세요.' : '연결된 노드를 클리어하고 성도술 포인트를 얻으세요.',
                targetId: target ? target.id : bossId,
                current: clearCount,
                target: GALAXY_BOSS_REQUIRED_CLEARS
            };
        }
        const capstone = getCosmosCapstoneProgress(state);
        if (!capstone.eligibleSeason) {
            return { stage: 'season', title: '루프 31 도달', detail: '다섯 은하를 정복했습니다. 루프를 이어 최종 관문이 열리는 시점에 도달하세요.', targetId: null };
        }
        return capstone.canChallenge
            ? { stage: 'capstone', title: '잔향체 아스트라 도전', detail: '다섯 은하의 준비가 끝났습니다.', targetId: null }
            : { stage: 'key', title: '표식: 잔향 확보', detail: '은하 보스를 반복 처치해 아스트라 도전권을 확보하세요.', targetId: COSMOS_CAPSTONE_BOSS_IDS[0] };
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

    function pickCosmosBossEquipmentName(spec) {
        const names = spec && Array.isArray(spec.equipment) ? spec.equipment : [];
        const uniqueDb = Array.isArray(window.UNIQUE_DB) ? window.UNIQUE_DB : [];
        const chaseNames = names.filter(name => uniqueDb.some(item => item && item.name === name && item.cosmosChase));
        const regularNames = names.filter(name => !chaseNames.includes(name));
        if (chaseNames.length > 0 && Math.random() < 0.08) {
            return chaseNames[Math.floor(Math.random() * chaseNames.length)];
        }
        const pool = regularNames.length > 0 ? regularNames : names;
        return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    }

    function grantCosmosBossEquipment(spec, tier, force) {
        if (!spec || !Array.isArray(spec.equipment) || spec.equipment.length <= 0 || (!force && Math.random() >= COSMOS_BOSS_EQUIPMENT_DROP_CHANCE)) return false;
        if (!window.game || !Array.isArray(window.game.inventory)) return false;
        if (typeof window.generateUniqueItem !== 'function') return false;
        const uniqueName = pickCosmosBossEquipmentName(spec);
        const item = uniqueName ? window.generateUniqueItem(Math.max(1, Math.floor(tier || 1)), null, uniqueName) : null;
        if (!item) return false;
        if (typeof window.addItemToInventory === 'function') window.addItemToInventory(item, { guaranteedKeep: true });
        else window.game.inventory.push(item);
        window.game.noti = window.game.noti || {};
        window.game.noti.items = true;
        if (typeof window.addLog === 'function') window.addLog(`🌌 우주계 보스 전용 고유 장비 획득: ${item.name}`, 'loot-unique', { item });
        return true;
    }

    function grantCosmosBossJewel(spec, force) {
        if (!spec || !spec.jewel || (!force && Math.random() >= COSMOS_BOSS_JEWEL_DROP_CHANCE)) return false;
        if (!window.game || !Array.isArray(window.game.jewelInventory)) return false;
        const jewel = createCosmosBossJewel(spec.jewel);
        if (!jewel) return false;
        const limit = typeof window.getJewelInventoryLimit === 'function' ? window.getJewelInventoryLimit() : 60;
        const overflow = window.game.jewelInventory.length >= limit;
        window.game.jewelInventory.push(jewel);
        window.game.noti = window.game.noti || {};
        window.game.noti.jewel = true;
        if (typeof window.addLog === 'function') window.addLog(`💠 우주계 보스 전용 주얼 획득: ${jewel.name}${overflow ? ' (공간 부족 보호)' : ''}`, 'loot-unique', { item:jewel, itemKind:'jewel' });
        return true;
    }

    function grantCosmosBossTalisman(spec, force) {
        if (!spec || !spec.talisman || (!force && Math.random() >= COSMOS_BOSS_TALISMAN_DROP_CHANCE)) return false;
        if (!window.game) return false;
        window.game.talismanInventory = Array.isArray(window.game.talismanInventory) ? window.game.talismanInventory : [];
        const talisman = createCosmosBossTalisman(spec.talisman);
        if (!talisman) return false;
        window.game.talismanInventory.push(talisman);
        window.game.noti = window.game.noti || {};
        window.game.noti.talisman = true;
        if (typeof window.addLog === 'function') window.addLog(`🧿 우주계 보스 전용 부적 획득: ${talisman.name}`, 'loot-unique', { item:talisman, itemKind:'talisman' });
        return true;
    }

    function grantCosmosBossExclusiveDrops(node) {
        const spec = getCosmosBossRewardSpec(node);
        if (!spec) return false;
        const tier = getDisplayedNodeTier(node);
        const state = getState();
        const misses = Math.max(0, Math.min(39, Math.floor((state.bossExclusiveMisses || {})[node.id] || 0)));
        const force = misses >= 39;
        let granted = false;
        if (force) {
            const candidates = [];
            if (Array.isArray(spec.equipment) && spec.equipment.length > 0) candidates.push(() => grantCosmosBossEquipment(spec, tier, true));
            if (spec.jewel) candidates.push(() => grantCosmosBossJewel(spec, true));
            if (spec.talisman) candidates.push(() => grantCosmosBossTalisman(spec, true));
            if (candidates.length > 0) granted = !!candidates[Math.floor(Math.random() * candidates.length)]();
        } else {
            granted = [
                grantCosmosBossEquipment(spec, tier, false),
                grantCosmosBossJewel(spec, false),
                grantCosmosBossTalisman(spec, false)
            ].some(Boolean);
        }
        state.bossExclusiveMisses[node.id] = granted ? 0 : Math.min(39, misses + 1);
        if (granted && force && typeof window.addLog === 'function') window.addLog('🌠 누적된 성간 공명이 우주계 보스 전용 보상을 확정했습니다.', 'loot-unique');
        if (granted && typeof window.updateStaticUI === 'function') window.updateStaticUI();
        return granted;
    }

    function getCosmosBossPityProgress(node) {
        if (!node || node.tag !== 'boss') return null;
        const misses = Math.max(0, Math.min(39, Math.floor((getState().bossExclusiveMisses || {})[node.id] || 0)));
        return { misses, guaranteeAt: 40, remaining: Math.max(1, 40 - misses) };
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
        if (state.equippedStones[String(g)]) return;
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
                <h2>🌠 우주계 아틀라스</h2>
                <div id="ui-cosmos-panel" class="cosmos-panel">
                    <div class="cosmos-header">
                        <div class="cosmos-brand">
                            <div class="cosmos-kicker">Cosmic Atlas</div>
                            <div class="cosmos-title">별을 잇는 우주계 탐험 지도</div>
                            <div class="cosmos-desc">별길을 개척하고 은하 보스를 추적하세요. 완료한 탐사마다 성도술 포인트를 얻습니다.</div>
                        </div>
                        <nav class="cosmos-mode-tabs" aria-label="우주계 화면 선택">
                            <button type="button" class="cosmos-mode-tab active" id="btn-cosmos-sub-atlas" onclick="switchCosmosInnerTab('atlas')"><span class="cosmos-mode-icon">✦</span><span><strong>아틀라스</strong><small>별길 탐사와 은하 보스</small></span></button>
                            <button type="button" class="cosmos-mode-tab" id="btn-cosmos-sub-mastery" onclick="switchCosmosInnerTab('mastery')"><span class="cosmos-mode-icon">⌘</span><span><strong>성도술</strong><small>탐사 포인트로 능력 강화</small></span></button>
                        </nav>
                    </div>
                    <div class="cosmos-summary" id="ui-cosmos-summary"></div>
                    <div id="ui-cosmos-roadmap" class="cosmos-roadmap"></div>
                    <div id="cosmos-inner-atlas" class="cosmos-layout">
                        <div class="cosmos-map-column">
                            <div class="cosmos-map-toolbar">
                                <div><strong>성도 지도</strong><span>드래그로 이동 · 노드를 눌러 상세 확인</span></div>
                                <div class="cosmos-legend cosmos-map-legend" aria-label="노드 상태 안내">
                                    <span><i class="available"></i>탐사 가능</span><span><i class="cleared"></i>완료</span><span><i class="locked"></i>미연결</span>
                                </div>
                                <div class="cosmos-map-controls">
                                    <button type="button" onclick="zoomCosmosAtlas(0.88)" title="축소">−</button>
                                    <button type="button" onclick="resetCosmosAtlasCamera()">전체 보기</button>
                                    <button type="button" onclick="zoomCosmosAtlas(1.14)" title="확대">＋</button>
                                </div>
                            </div>
                            <div class="cosmos-canvas-wrap">
                                <canvas id="cosmos-atlas-canvas" width="2400" height="1520"></canvas>
                                <div id="cosmos-atlas-tooltip" class="cosmos-atlas-tooltip"></div>
                                <div id="cosmos-stone-overlay" class="cosmos-stone-overlay" style="display:none;"></div>
                            </div>
                        </div>
                        <div class="cosmos-detail" id="ui-cosmos-detail"></div>
                    </div>
                    <div id="cosmos-inner-mastery" class="cosmos-mastery-shell" style="display:none;"></div>
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
        ATLAS.roadmap = document.getElementById('ui-cosmos-roadmap');
        ATLAS.tooltip = document.getElementById('cosmos-atlas-tooltip');
        bindCosmosDetailEvents();

        const overlayEl = document.getElementById('cosmos-stone-overlay');
        if (overlayEl && !overlayEl.__cosmosBound) {
            overlayEl.__cosmosBound = true;
            // 배경(슬롯 카드 바깥)을 누르면 오버레이를 닫는다.
            overlayEl.addEventListener('click', (event) => {
                if (event.target === overlayEl) closeCosmosStoneOverlay();
            });
        }

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

    function bindCosmosDetailEvents() {
        const detail = ATLAS.detail;
        if (!detail || detail.__cosmosDirectiveBound) return;
        detail.__cosmosDirectiveBound = true;
        detail.addEventListener('click', event => {
            const button = event.target.closest('[data-cosmos-directive-id]');
            if (!button || button.disabled) return;
            selectCosmosExpeditionDirective(
                button.dataset.cosmosDirectiveNode,
                button.dataset.cosmosDirectiveId
            );
        });
    }

    function bindCanvasEvents() {
        const canvas = ATLAS.canvas;
        if (!canvas || canvas.__cosmosBound) return;
        canvas.__cosmosBound = true;

        canvas.addEventListener('pointerdown', (event) => {
            const hit = eventToCanvasXY(event);
            const ui = hitCosmosUiAt(hit.x, hit.y);
            if (ui) {
                // 캔버스 내부 컨트롤/슬롯을 눌렀을 때는 지도 드래그를 시작하지 않는다.
                ATLAS.uiArmed = ui;
                ATLAS.drag.active = false;
                ATLAS.drag.moved = false;
                if (ATLAS.tooltip) ATLAS.tooltip.style.display = 'none';
                return;
            }
            ATLAS.uiArmed = null;
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
            const hit = eventToCanvasXY(event);
            const ui = hitCosmosUiAt(hit.x, hit.y);
            const prevUiHover = ATLAS.uiHover;
            ATLAS.uiHover = ui;
            if (ui) {
                ATLAS.hoverId = null;
                if (ATLAS.tooltip) ATLAS.tooltip.style.display = 'none';
                canvas.style.cursor = 'pointer';
                if (prevUiHover !== ui) requestAtlasFrame();
                return;
            }
            canvas.style.cursor = '';
            const node = pickNode(event);
            ATLAS.hoverId = node ? node.id : null;
            updateTooltip(event, node);
            requestAtlasFrame();
        });

        canvas.addEventListener('pointerup', (event) => {
            canvas.releasePointerCapture && canvas.releasePointerCapture(event.pointerId);
            const moved = ATLAS.drag.moved;
            const armed = ATLAS.uiArmed;
            ATLAS.drag.active = false;
            ATLAS.uiArmed = null;
            if (armed) {
                const hit = eventToCanvasXY(event);
                if (hitCosmosUiAt(hit.x, hit.y) === armed) runCosmosUiAction(armed);
                return;
            }
            if (!moved) {
                const node = pickNode(event);
                if (node) selectCosmosNode(node.id);
            }
        });

        canvas.addEventListener('pointerleave', () => {
            ATLAS.drag.active = false;
            ATLAS.uiArmed = null;
            ATLAS.uiHover = null;
            ATLAS.hoverId = null;
            canvas.style.cursor = '';
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
        const mechanic = getCosmosNodeMechanic(node);
        const mechanicLine = mechanic ? `<br>${escapeHtml(mechanic.name)}` : '';
        ATLAS.tooltip.innerHTML = `<strong>${escapeHtml(node.name)}</strong><br><span>${escapeHtml(node.source)}</span><br>${escapeHtml(node.theme)}${mechanicLine}<br><em>${getStatusLabel(status)}</em>`;
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
            if (isCosmosTabActive()) drawAtlas();
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
        if (isCosmosTabActive() && resizeCanvasToHost()) drawAtlas();
        renderDetail();
        renderSummary();
        renderRoadmap();
        renderMasteryPanel();
        refreshCosmosStoneOverlay();
    }

    function resizeCanvasToHost() {
        const canvas = ATLAS.canvas;
        if (!canvas || !ATLAS.host) return false;
        const rect = ATLAS.host.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return false;
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        ATLAS.dpr = dpr;
        const w = Math.max(600, Math.floor(rect.width * dpr));
        const h = Math.max(420, Math.floor(rect.height * dpr));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        return true;
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
        drawCosmosStoneSlot(ctx);
        drawCosmosControls(ctx);
        if (shouldAnimateCosmos()) requestAtlasFrame();
    }

    function drawBackground(ctx, w, h) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#060a12');
        g.addColorStop(0.55, '#080c16');
        g.addColorStop(1, '#030509');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        const blueMist = ctx.createRadialGradient(w * 0.18, h * 0.25, 0, w * 0.18, h * 0.25, Math.max(w, h) * 0.62);
        blueMist.addColorStop(0, 'rgba(44,91,140,.12)');
        blueMist.addColorStop(1, 'rgba(6,10,18,0)');
        ctx.fillStyle = blueMist;
        ctx.fillRect(0, 0, w, h);
        const violetMist = ctx.createRadialGradient(w * 0.82, h * 0.72, 0, w * 0.82, h * 0.72, Math.max(w, h) * 0.52);
        violetMist.addColorStop(0, 'rgba(84,55,126,.1)');
        violetMist.addColorStop(1, 'rgba(3,5,9,0)');
        ctx.fillStyle = violetMist;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.globalAlpha = 0.36;
        for (let i = 0; i < 96; i++) {
            const x = seeded01('star-x-' + i) * w;
            const y = seeded01('star-y-' + i) * h;
            const s = 0.7 + seeded01('star-s-' + i) * 1.15;
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
            ctx.strokeStyle = idx === 0 ? 'rgba(180,220,255,0.12)' : 'rgba(127, 201, 255, 0.075)';
            ctx.lineWidth = 1 / ATLAS.camera.scale;
            ctx.setLineDash([2 / ATLAS.camera.scale, 14 / ATLAS.camera.scale]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(200,225,255,0.34)';
            ctx.font = `${Math.max(11, 13 / ATLAS.camera.scale)}px Malgun Gothic, sans-serif`;
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
            const a = ATLAS.byId.get(edge.a);
            const b = ATLAS.byId.get(edge.b);
            if (!a || !b) return;
            const pa = worldToScreen(a);
            const pb = worldToScreen(b);
            const sa = getNodeStatus(a);
            const sb = getNodeStatus(b);
            if (sa === 'locked' && sb === 'locked') return;
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
            ctx.strokeStyle = edge.type === 'transition' ? 'rgba(244,211,135,.34)' : open ? 'rgba(127, 201, 255, 0.48)' : partial ? 'rgba(127, 201, 255, 0.22)' : 'rgba(80, 92, 120, 0.13)';
            ctx.lineWidth = edge.type === 'spine' ? 2.6 : edge.type === 'transition' ? 1.8 : edge.type === 'branch' ? 1.1 : 1.25;
            if (edge.type === 'transition') ctx.setLineDash([9, 8]);
            if (open) {
                ctx.shadowColor = 'rgba(127, 201, 255, 0.25)';
                ctx.shadowBlur = edge.type === 'spine' ? 8 : 4;
            }
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
        });
        ctx.restore();
    }



    function drawPlanetSurface(ctx, node, p, r, status) {
        const locked = status === 'locked';
        const accent = status === 'cleared' ? '#71d699' : getGalaxyAccent(node.orbit);
        const core = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.45, Math.max(1, r * 0.1), p.x, p.y, r * 1.12);
        core.addColorStop(0, locked ? '#718096' : '#d7efff');
        core.addColorStop(0.28, locked ? '#445064' : accent);
        core.addColorStop(1, locked ? '#202938' : '#0b1420');
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = core;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.72, -Math.PI * 0.82, Math.PI * 0.24);
        ctx.strokeStyle = locked ? 'rgba(183,196,215,.28)' : getGalaxyAccent(node.orbit, 0.72);
        ctx.lineWidth = Math.max(1, r * 0.13);
        ctx.stroke();

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
            const alpha = status === 'locked' ? 0.42 : 1;

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
                tracePentagon(ctx, p.x, p.y, drawR, Math.PI / 4);
                ctx.fillStyle = color;
                ctx.fill();
            }
            ctx.lineWidth = selected ? 3 : hover ? 2.4 : 1.4;
            ctx.strokeStyle = selected ? '#ffffff' : status === 'available' ? getGalaxyAccent(node.orbit, 0.95) : status === 'cleared' ? '#9ef0bf' : getGalaxyAccent(node.orbit, 0.34);
            if (node.kind === 'planet') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, drawR, 0, Math.PI * 2);
            } else {
                tracePentagon(ctx, p.x, p.y, drawR, Math.PI / 4);
            }
            ctx.stroke();

            if (status === 'cleared') {
                ctx.font = `900 ${Math.max(10, drawR * 0.95)}px Malgun Gothic, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#eafff1';
                ctx.fillText('✓', p.x + drawR * 0.72, p.y - drawR * 0.72);
            } else if (status === 'available') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, drawR * 1.48, 0, Math.PI * 2);
                ctx.strokeStyle = getGalaxyAccent(node.orbit, 0.72);
                ctx.lineWidth = 1.4;
                ctx.stroke();
            }

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
            if (node.kind === 'planet' && (status !== 'locked' || node.tag === 'boss')
                && (selected || hover || node.labelPriority >= 5 || ATLAS.camera.scale > 0.98)) {
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
            const usableRelic = Array.isArray(state.bossRelics) && findCosmosBossRelicIndexForStone(state.bossRelics, g) >= 0;
            const options = acquired ? ensureCosmosStoneOptions(state, g) : [];
            const optionHtml = options.map(option => `<div class="cosmos-stone-option ${option.boss ? 'boss' : ''}">${escapeHtml(getCosmosStoneOptionText(option))}</div>`).join('') || '<div class="cosmos-stone-option empty">미획득</div>';
            return `<article class="cosmos-stone-card ${acquired ? 'acquired' : 'locked'} ${equipped ? 'equipped' : ''}" data-info-tooltip-anchor="1" onmouseenter="showCosmosStoneTooltip(event,${g})" onmousemove="showCosmosStoneTooltip(event,${g})" onmouseleave="hideInfoTooltip()"><div class="cosmos-stone-orb"><i></i><b>G${g}</b></div><div class="cosmos-stone-card-body"><header><b>${escapeHtml(getCosmosStoneNameByGalaxy(g))}</b><span>${equipped ? '장착 중' : (acquired ? '보유' : '미획득')}</span></header><small>최소 티어 T${getCosmosTierFloor()}</small><div class="cosmos-stone-options">${optionHtml}</div><div class="cosmos-stone-actions"><button onclick="equipBossStoneByGalaxy(${g})" ${acquired && !equipped ? '' : 'disabled'}>장착</button><button onclick="unequipBossStoneByGalaxy(${g})" ${equipped ? '' : 'disabled'}>해제</button><button onclick="applyCosmosBossRelicToStone(${g})" ${acquired && usableRelic ? '' : 'disabled'} title="${usableRelic ? '이 우주석 전용 보스 유물 사용' : '이 우주석에 맞는 보스 유물이 없습니다'}">유물 각인</button></div></div></article>`;
        }).join('');
        return `<section class="cosmos-stone-panel"><header><strong>우주석 성좌</strong><span>보스 유물 ${relicCount}개</span></header><div class="cosmos-stone-grid">${cards}</div></section>`;
    }

    function renderRoadmap() {
        if (!ATLAS.roadmap) return;
        const guide = getCosmosProgressGuide();
        const freePoints = getCosmosMasteryFreePoints();
        const targetButton = guide.targetId
            ? `<button type="button" onclick="focusRecommendedCosmosNode()">추천 노드 보기</button>` : '';
        ATLAS.roadmap.innerHTML = `
            <div class="cosmos-roadmap-current"><span>NEXT OBJECTIVE</span><strong>${escapeHtml(guide.title)}</strong><small>${escapeHtml(guide.detail)}</small></div>
            <div class="cosmos-roadmap-steps" aria-label="우주계 진행 순서">
                <span class="complete">1 지하계 30층</span><span class="${guide.stage === 'entry' ? 'active' : ''}">2 관문</span>
                <span class="${guide.stage === 'stabilize' ? 'active' : ''}">3 은하 안정화</span><span class="${guide.stage === 'boss' ? 'active' : ''}">4 은하 보스</span>
                <span class="${guide.stage === 'season' || guide.stage === 'key' || guide.stage === 'capstone' ? 'active' : ''}">5 아스트라</span>
            </div>
            <div class="cosmos-roadmap-actions">${freePoints > 0 ? `<b>미사용 성도술 ${freePoints}</b>` : '<span>성도술 배분 완료</span>'}${targetButton}</div>`;
    }

    function focusRecommendedCosmosNode() {
        const guide = getCosmosProgressGuide();
        if (!guide.targetId) {
            if (guide.stage === 'capstone') openCosmosCapstoneBossPanel();
            return;
        }
        const node = ATLAS.byId.get(guide.targetId);
        if (!node) return;
        ATLAS.selectedId = node.id;
        getState().selectedId = node.id;
        ATLAS.camera.x = -node.x;
        ATLAS.camera.y = -node.y;
        ATLAS.camera.scale = Math.max(0.82, ATLAS.camera.scale);
        saveCamera();
        renderCosmosAtlas();
    }

    function renderSummary() {
        if (!ATLAS.summary) return;
        const state = getState();
        const cleared = state.cleared.length;
        const available = ATLAS.nodes.filter(node => getNodeStatus(node) === 'available').length;
        const planetsCleared = ATLAS.nodes.filter(n => n.kind === 'planet' && state.cleared.includes(n.id)).length;
        const asteroidsCleared = ATLAS.nodes.filter(n => n.kind === 'asteroid' && state.cleared.includes(n.id)).length;
        const unlocked = isCosmosUnlocked();
        const capstone = getCosmosCapstoneProgress(state);
        const galaxyProgress = GALAXY_SEQUENCE.map(galaxy => {
            const total = ATLAS.nodes.filter(node => node.orbit === galaxy).length;
            const complete = ATLAS.nodes.filter(node => node.orbit === galaxy && state.cleared.includes(node.id)).length;
            return `<span><b>G${galaxy}</b><i><em style="width:${total > 0 ? Math.floor(complete / total * 100) : 0}%"></em></i><small>${complete}/${total}</small></span>`;
        }).join('');
        const capstoneState = !capstone.eligibleSeason
            ? 'locked'
            : (capstone.canChallenge ? 'ready' : (capstone.ready ? 'key-needed' : 'progress'));
        const capstoneMessage = !capstone.eligibleSeason
            ? '루프 31부터 다섯 은하 보스를 같은 루프에 격파하면 최종 관문이 열립니다.'
            : (capstone.canChallenge
                ? '표식과 격파 조건을 모두 갖췄습니다. 잔향체 아스트라에 도전할 수 있습니다.'
                : (capstone.ready
                    ? '격파 조건 완료 · 은하 보스를 반복 처치해 「표식: 잔향」을 확보하세요.'
                    : `이번 루프 미격파: ${capstone.missing.map(row => row.name).join(', ')}`));
        const capstoneBosses = capstone.bosses.map(row => `
            <button type="button" class="cosmos-capstone-boss ${row.cleared ? 'cleared' : 'missing'}"
                onclick="focusCosmosCapstoneBoss('${row.id}')"
                title="${row.cleared ? '이번 루프 격파 완료' : '아틀라스에서 위치 확인'}">
                <span>G${row.galaxy}</span>${escapeHtml(row.name)}<b>${row.cleared ? '✓' : '○'}</b>
            </button>`).join('');
        const capstoneAction = capstone.ready
            ? `<button type="button" class="cosmos-capstone-action" onclick="openCosmosCapstoneBossPanel()">잔향체 아스트라 위치 열기</button>`
            : '';
        const arcanaQuest = renderArcanaQuestProgress();
        ATLAS.summary.innerHTML = `
            <div class="cosmos-summary-metrics">
                <div><span>탐사 완료</span><strong>${cleared}<small> / ${ATLAS.nodes.length}</small></strong></div>
                <div><span>탐사 가능</span><strong>${unlocked ? available : 0}<small>개</small></strong></div>
                <div><span>성도술</span><strong>${getCosmosMasteryFreePoints()}<small> / ${getCosmosMasteryTotalPoints()}</small></strong></div>
                <div title="별가루는 우주계 탐사·이상 현상에서 얻고 천문 제작에 사용합니다."><span>별가루</span><strong>${getCosmosStarDustBalance()}</strong></div>
            </div>
            <div class="cosmos-progress-overview"><div class="cosmos-galaxy-progress">${galaxyProgress}</div>
                <div class="cosmos-resource-line"><span>행성 ${planetsCleared}/50 · 소행성 ${asteroidsCleared}/75</span><span>보스 유물 ${(state.bossRelics || []).length} · 우주석 ${getEquippedCosmosStoneCount(state)}/${hasSixthCosmosStoneUnlock() ? 6 : 5}</span></div></div>
            ${arcanaQuest}
            <details class="cosmos-capstone-card ${capstoneState}">
                <summary class="cosmos-capstone-head"><span>최종 관문</span><strong>잔향체 아스트라 ${capstone.clearedCount}/${capstone.total} · 표식 ${capstone.keyCount}</strong></summary>
                <div class="cosmos-capstone-bosses">${capstoneBosses}</div>
                <p>${escapeHtml(capstoneMessage)}</p>
                <div class="cosmos-capstone-footer"><span>표식: 잔향 <b>${capstone.keyCount}</b></span>${capstoneAction}</div>
            </details>`;
    }

    function renderArcanaQuestProgress() {
        if (typeof window.getArcanaQuestProgress !== 'function') return '';
        const quest = window.getArcanaQuestProgress(window.game);
        const progress = quest.started ? quest.current : 0;
        const pct = quest.rewarded ? 100 : Math.floor(progress / Math.max(1, quest.target) * 100);
        const stateClass = quest.rewarded ? 'complete' : (quest.started ? 'active' : 'dormant');
        const title = quest.started ? quest.stage.name : '낯선 패의 흔적';
        const description = quest.started ? quest.stage.description : '첫 우주계 탐사를 완료하면 봉인의 흔적을 발견할 수 있습니다.';
        const count = quest.rewarded ? '복원 완료' : `${progress}/${quest.target} 탐사`;
        return `<section class="cosmos-arcana-quest ${stateClass}"><div><span>ARCANA QUEST</span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small></div><div class="cosmos-arcana-progress"><b>${count}</b><i><em style="width:${pct}%"></em></i><small>보상 · 봉인된 아르카나 카드 1장</small></div></section>`;
    }

    function focusCosmosCapstoneBoss(nodeId) {
        buildCosmosAtlasData();
        const state = getState();
        const node = ATLAS.byId.get(nodeId);
        if (!node || !COSMOS_CAPSTONE_BOSS_IDS.includes(node.id)) return;
        ATLAS.selectedId = node.id;
        state.selectedId = node.id;
        ATLAS.camera.x = -node.x;
        ATLAS.camera.y = -node.y;
        ATLAS.camera.scale = Math.max(0.78, ATLAS.camera.scale);
        saveCamera();
        renderCosmosAtlas();
    }

    function openCosmosCapstoneBossPanel() {
        if (typeof window.switchMapSubtab === 'function') window.switchMapSubtab('map-tab-zones');
        if (typeof window.switchMapExploreSubtab === 'function') window.switchMapExploreSubtab('map-explore-root-boss');
    }

    function renderCosmosDifficultySection(node) {
        const model = getCosmosNodeRecommendation(node);
        if (!model || !model.readiness) return '';
        const ready = model.readiness;
        return `<div class="cosmos-detail-section cosmos-readiness">
            <div class="cosmos-section-label">전투 준비도</div>
            <div class="cosmos-power-grid map-power-estimate" tabindex="0" aria-label="예상 DPS ${ready.dps.label} · 권장 EHP ${ready.ehp.label}" data-info-tooltip-anchor="1" data-player-dps="${Math.round(ready.playerDps)}" data-recommended-dps="${Math.round(ready.recommendedDps)}" data-player-ehp="${Math.round(ready.playerEhp)}" data-recommended-ehp="${Math.round(ready.recommendedEhp)}" data-limiting-element="${ready.element}" onmouseenter="showMapPowerEstimateTooltip(event)" onmousemove="showMapPowerEstimateTooltip(event)" onfocus="showMapPowerEstimateTooltip(event)" ontouchstart="event.stopPropagation(); showMapPowerEstimateTooltip(event)" onclick="event.stopPropagation(); this.focus(); showMapPowerEstimateTooltip(event)" onblur="hideInfoTooltip()" onmouseleave="if(document.activeElement!==this) hideInfoTooltip()"><span>예상 DPS<strong class="map-power-grade grade-${ready.dps.id}">${ready.dps.label}</strong></span><span>권장 EHP<strong class="map-power-grade grade-${ready.ehp.id}">${ready.ehp.label}</strong></span></div>
        </div>`;
    }

    function renderGalaxyGateLine(node, state) {
        if (!node || node.orbit <= 0) return '';
        const clears = getGalaxyClearCount(state, node.orbit);
        const ready = clears >= GALAXY_BOSS_REQUIRED_CLEARS;
        return `<div class="cosmos-gate-line ${ready ? 'ready' : ''}"><span>은하 안정도</span><strong>${Math.min(GALAXY_BOSS_REQUIRED_CLEARS, clears)}/${GALAXY_BOSS_REQUIRED_CLEARS}</strong><small>${ready ? '은하 보스 도전 가능' : `보스 해금까지 ${GALAXY_BOSS_REQUIRED_CLEARS - clears}개 노드`}</small></div>`;
    }

    function formatCosmosDirectivePressure(multiplier) {
        const pct = Math.round((Math.max(0, Number(multiplier) || 1) - 1) * 100);
        return `${pct > 0 ? '+' : ''}${pct}%`;
    }

    function renderCosmosDirectiveCard(node, directive, selected, disabled) {
        const chance = Math.round(Math.max(0, Number(directive.jackpotChance) || 0) * 100);
        const className = ['cosmos-directive-card', selected ? 'selected' : '', directive.rare ? 'rare' : '']
            .filter(Boolean).join(' ');
        return `<button type="button" class="${className}" data-cosmos-directive-node="${escapeHtml(node.id)}" data-cosmos-directive-id="${escapeHtml(directive.id)}" aria-pressed="${selected ? 'true' : 'false'}" ${disabled ? 'disabled' : ''}>
            <span class="cosmos-directive-card-head"><small>${escapeHtml(directive.signal || 'SIGNAL')}</small>${selected ? '<b>선택됨</b>' : (directive.rare ? '<b>희귀 신호</b>' : '')}</span>
            <strong>${escapeHtml(directive.name)}</strong>
            <span class="cosmos-directive-desc">${escapeHtml(directive.description)}</span>
            <span class="cosmos-directive-risk"><i>생명력 ${formatCosmosDirectivePressure(directive.enemyHpMul)}</i><i>피해 ${formatCosmosDirectivePressure(directive.enemyDamageMul)}</i><i>속도 ${formatCosmosDirectivePressure(directive.enemyAttackSpeedMul)}</i></span>
            <span class="cosmos-directive-reward"><b>별가루 ×${Number(directive.rewardMul || 1).toFixed(2)}</b><em>${chance > 0 ? `공명 잭팟 ${chance}%` : '잭팟 없음'}</em></span>
        </button>`;
    }

    function renderCosmosDirectiveSection(node, state) {
        const status = getNodeStatus(node);
        const choices = getCosmosDirectiveChoicesForNode(node, state);
        if (choices.length === 0) return '';
        const selected = getSelectedCosmosDirective(node, state);
        const fighting = window.game.currentZoneId === 'cosmos_challenge'
            && state.activeChallenge && state.activeChallenge.nodeId === node.id;
        const disabled = !canChallengeNode(node) || fighting;
        const cards = choices.map(row => renderCosmosDirectiveCard(node, row, selected && row.id === selected.id, disabled)).join('');
        let hint = status === 'cleared'
            ? '새 신호가 포착되었습니다. 원하는 항로로 재탐사하세요.'
            : '탐사 완료 후 무작위 신호 2개가 갱신됩니다.';
        if (fighting) hint = '현재 탐사에 고정됨';
        return `<section class="cosmos-directive-section"><div class="cosmos-directive-title"><span>탐사 신호 선택</span><small>${hint}</small></div><div class="cosmos-directive-list">${cards}</div></section>`;
    }

    function getCosmosChallengeButtonLabel(node, status) {
        if (node && node.tag === 'boss') return status === 'cleared' ? '은하 보스 재도전' : '은하 보스 도전';
        return status === 'cleared' ? '새 신호 재탐사' : '전투 도전';
    }

    function renderDetail() {
        if (!ATLAS.detail) return;
        const state = getState();
        const node = ATLAS.byId.get(ATLAS.selectedId) || ATLAS.byId.get(state.selectedId) || ATLAS.byId.get('planet-0');
        if (!node) return;
        const status = getNodeStatus(node);
        const pity = getCosmosBossPityProgress(node);
        const rewardLine = node.tag === 'boss'
            ? `은하 보스 보상: 첫 클리어 시 ${getBossStoneName(node)} 획득 · 현재 단계 ${getBossStage(node)} · 전용 보상 확정까지 최대 ${pity.remaining}회`
            : (node.kind === 'planet'
                ? `행성 보상: ${node.theme} 계열 보정 · 별가루 +${5 + node.orbit * 2}`
                : `소행성 보상: 별가루 +${2 + node.orbit} · 제작 재료 소량`);
        ATLAS.detail.innerHTML = `
            <div class="cosmos-detail-hero">
                <div><div class="cosmos-detail-eyebrow">G${node.orbit} · TIER ${getDisplayedNodeTier(node)}${node.tag === 'boss' ? ' · GALAXY BOSS' : ''}</div><div class="cosmos-detail-title">${node.kind === 'planet' ? '🪐' : '☄️'} ${escapeHtml(node.name)}</div></div>
                <div class="cosmos-status ${status}">${getStatusLabel(status)}</div>
            </div>
            <div class="cosmos-detail-source">관측명 ${escapeHtml(node.source)}${window.game && window.game.cosmosLoopCount ? ` · 우주계 루프 난이도 +${Math.max(0, Math.floor(window.game.cosmosLoopCount || 0)) * 2}` : ''}</div>
            <div class="cosmos-node-facts">
                <span><small>천체 테마</small><strong>${escapeHtml(node.theme)}</strong></span>
                <span><small>궤도 정보</small><strong>G${node.orbit} · ${Math.max(1, Math.floor((node.localSlot || 0) + 1))}/${NODES_PER_GALAXY}</strong></span>
                <span><small>환경</small><strong>크기 ${Math.max(1, Math.floor(node.sizeClass || 1))} · ${Number(node.gravity || 1).toFixed(1)}g</strong></span>
                <span><small>압력</small><strong>진행 +${Math.max(0, Math.floor((node.sizeClass || 1) * 18))}% · 중력 +${Math.max(0, Math.floor((Number(node.gravity || 1) - 1) * 22))}%</strong></span>
            </div>
            <div class="cosmos-reward-line"><span>탐사 보상</span>${escapeHtml(rewardLine)}</div>
            ${renderGalaxyGateLine(node, state)}
            ${renderCosmosDirectiveSection(node, state)}
            ${renderCosmosDifficultySection(node)}
            <div class="cosmos-actions">
                <button class="primary" onclick="challengeSelectedCosmosNode()" ${canChallengeNode(node) ? '' : 'disabled'}>${getCosmosChallengeButtonLabel(node, status)}</button>
                ${node.tag === 'boss' ? '<button onclick="openCosmosStoneOverlay()">우주석 관리</button>' : ''}<button onclick="focusCosmosAtlasOnSelected()">지도에서 초점</button>
            </div>
            <div class="cosmos-help">${isCosmosUnlocked() ? '첫 탐사는 별길을 열고, 완료한 천체는 갱신된 신호로 반복 탐사할 수 있습니다.' : '우주계는 나무꾼 격파 후 지하계 30층 도달 시 해금된다.'}</div>`;
    }

    function exploreSelectedCosmosNode(nodeIdOverride) {
        buildCosmosAtlasData();
        const state = getState();
        const targetId = nodeIdOverride || ATLAS.selectedId || state.selectedId || 'planet-0';
        const node = ATLAS.byId.get(targetId);
        if (!node) return;
        const status = getNodeStatus(node);
        const repeatRun = status === 'cleared';
        const completedChallenge = state.activeChallenge && state.activeChallenge.nodeId === node.id;
        const firstClear = !state.cleared.includes(node.id);
        const defeatedBossStage = node.tag === 'boss' ? getBossStage(node) : 0;
        if ((status === 'available' || repeatRun) && !completedChallenge) {
            if (typeof window.addLog === 'function') window.addLog('우주계 전투 완료 후 탐사가 기록됩니다.', 'attack-monster');
            return;
        }
        if (!(status === 'available' || repeatRun)) {
            if (typeof window.addLog === 'function') window.addLog('아직 별길이 연결되지 않은 우주계 노드입니다.', 'attack-monster');
            return;
        }
        if (status === 'available' && !state.cleared.includes(node.id)) state.cleared.push(node.id);
        if (firstClear) updateArcanaQuestAfterExploration(node);
        if (firstClear && node.kind === 'planet' && typeof window.markLoopCosmosPlanetClear === 'function') {
            const completedLoopGate = window.markLoopCosmosPlanetClear(node.id);
            if (completedLoopGate && typeof window.addLog === 'function') window.addLog('🪐 루프 대체 경로 달성: 우주계 에니프론 행성 돌파', 'season-up');
        }
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
        const directive = getCompletedChallengeDirective(state, node) || {};
        const rewardBase = node.tag === 'boss' ? (30 + node.orbit * 10 + defeatedBossStage * 10) : (node.kind === 'planet' ? 5 + node.orbit * 2 : 2 + node.orbit);
        const focusMul = node.kind === 'planet'
            ? (1 + getCosmosMasteryValue('combatFocus') * 0.01)
            : (1 + getCosmosMasteryValue('craftFocus') * 0.01);
        const rewardMul = 1
            + getCosmosMasteryValue('stardustGain') * 0.01
            + getCosmosMasteryValue('highRisk') * 0.022
            + getCosmosMasteryValue('warpEfficiency') * 0.01
            + (node.kind === 'asteroid' ? getCosmosMasteryValue('asteroidRelief') * 0.016 : 0)
            + (node.tag === 'boss' ? (getCosmosMasteryValue('bossBounty') * 0.022 + getCosmosMasteryValue('apexProtocol') * 0.018) : 0)
            + getCosmosMasteryValue('echoCache') * 0.01
            + (node.kind === 'asteroid' ? getCosmosMasteryValue('stellarForge') * 0.009 : 0)
            + (node.orbit >= 4 ? getCosmosMasteryValue('frontierTax') * 0.013 : 0)
            + (firstClear ? getCosmosMasteryValue('chainMastery') * 0.02 : 0);
        const directiveRewardMul = Math.max(0.1, Math.min(5, Number(directive.rewardMul) || 1));
        const reward = Math.max(1, Math.floor(rewardBase * rewardMul * focusMul * directiveRewardMul));
        const jackpotChance = Math.max(0, Math.min(0.5, Number(directive.jackpotChance) || 0));
        const jackpot = jackpotChance > 0 && Math.random() < jackpotChance;
        const jackpotBonus = jackpot
            ? Math.max(1, Math.floor(reward * Math.max(0, Number(directive.jackpotBonusMul) || 0))) : 0;
        grantCosmosStarDust(reward + jackpotBonus);
        if (typeof window.addLog === 'function') {
            window.addLog(`${node.tag === 'boss' ? '👑 우주계 은하 보스 격파' : '🌠 우주계 탐사 완료'}: ${node.name} · ${directive.name || '기본 탐사'} · 별가루 +${reward + jackpotBonus}${node.tag === 'boss' ? ` · 난이도 바닥 Tier ${getCosmosTierFloor()} 적용` : ''}`, node.tag === 'boss' ? 'season-up' : (node.kind === 'planet' ? 'loot-unique' : 'loot-magic'));
            if (jackpot) window.addLog(`🌌 공명 잭팟! ${directive.name || '탐사 신호'} 추가 별가루 +${jackpotBonus}`, 'loot-unique');
            if (node.tag === 'boss') {
                const kills = Math.max(0, Math.floor(state.bossKills[node.id] || 0));
                if (kills === 1) window.addLog(`💠 ${node.name} 첫 격파: ${getBossStoneName(node)} 획득`, 'loot-unique');
                if (kills === 1) window.addLog(`🧩 우주석 슬롯에 장착하면 우주계 난이도 바닥이 상승합니다.`, 'season-up');
                const relicDrop = tryRollBossRelic(node);
                if (relicDrop) window.addLog(`💠 보스 유물 획득: ${relicDrop.name} (우주석 보스 옵션 리롤 재화)`, 'loot-unique');
            }
        }
        if (jackpot && typeof window.showGameToast === 'function') {
            window.showGameToast(`공명 잭팟 · 별가루 +${jackpotBonus}`, { tone: 'success', duration: 3800 });
        }
        if (node.tag === 'boss') grantCosmosBossExclusiveDrops(node);
        advanceCosmosDirectiveCycle(state, node.id);
        if (typeof window.saveGame === 'function') {
            try { window.saveGame({ auto: true, silent: true }); } catch (error) { console.error('cosmos atlas save failed:', error); }
        }
        renderCosmosAtlas();
    }

    function updateArcanaQuestAfterExploration(node) {
        if (!node || typeof window.recordArcanaQuestCosmosExploration !== 'function') return;
        const result = window.recordArcanaQuestCosmosExploration(node.id, window.game);
        if (!result.changed) return;
        if (result.startedNow && typeof window.addLog === 'function') {
            window.addLog(`🂠 퀘스트 시작: 별길의 잔흔 · 서로 다른 우주계 탐사 ${result.current}/${result.target}`, 'season-up');
        } else if (result.stageChanged && !result.completedNow && typeof window.addLog === 'function') {
            window.addLog(`🂠 퀘스트 갱신: ${result.stage.name} · ${result.current}/${result.target}`, 'season-up');
        } else if (!result.completedNow && typeof window.addLog === 'function') {
            window.addLog(`🂠 아르카나 봉인 복원 ${result.current}/${result.target}`, 'loot-magic');
        }
        if (!result.completedNow) return;
        if (typeof window.unlockJournalEntry === 'function') window.unlockJournalEntry('arcana_first_seal');
        if (typeof window.queueTutorialNotice === 'function') {
            window.queueTutorialNotice('unlock_arcana', '아르카나 해금', '별길의 봉인을 복원했습니다. 아르카나 탭에서 카드를 확인하세요.', 'tab-arcana');
        }
        if (typeof window.addLog === 'function') window.addLog('🂠 무명의 패 복원 완료: 봉인된 아르카나 카드 1장 획득', 'loot-unique');
        if (typeof window.showGameToast === 'function') window.showGameToast('아르카나 퀘스트 완료 · 봉인 카드 1장', { tone:'success', duration:4200 });
    }



    function startCosmosBattle(node) {
        if (!window.game || !node) return;
        const tier = getCosmosChallengeTier(node);
        const lootTier = getDisplayedNodeTier(node);
        const mechanic = getCosmosNodeMechanic(node);
        const directive = getSelectedCosmosDirective(node);
        const recommendation = getCosmosNodeRecommendation(node);
        const gravity = Math.max(1, Number(node.gravity || 1));
        const sizeClass = Math.max(1, Math.floor(node.sizeClass || 1));
        const state = getState();
        state.activeChallenge = {
            nodeId: node.id,
            galaxy: node.orbit,
            name: node.name,
            tier,
            lootTier,
            gravity,
            sizeClass,
            tag: node.baseTag || node.tag || '',
            theme: node.theme || '',
            mechanicId: mechanic ? mechanic.id : '',
            recommendedDps: recommendation ? recommendation.target.dps : 0,
            recommendedEhp: recommendation ? recommendation.target.ehp : 0,
            ele: mechanic ? mechanic.element : 'chaos',
            directive: createCosmosDirectiveSnapshot(directive)
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

    function continueCosmosChallengeAfterClear(mapAction) {
        if (mapAction === 'repeatZone') {
            const state = getState();
            const currentId = state.activeChallenge && state.activeChallenge.nodeId;
            const currentNode = currentId ? ATLAS.byId.get(currentId) : null;
            if (!currentNode || !canChallengeNode(currentNode)) return false;
            ATLAS.selectedId = currentNode.id;
            state.selectedId = currentNode.id;
            if (typeof window.addLog === 'function') window.addLog(`우주계 반복 탐사: ${currentNode.name}`, 'season-up');
            startCosmosBattle(currentNode);
            return true;
        }
        if (mapAction !== 'nextZone' && mapAction !== 'nextLoopBestPlusOne') return false;
        const guide = getCosmosProgressGuide();
        const node = guide.targetId ? ATLAS.byId.get(guide.targetId) : null;
        if (!node || !canChallengeNode(node)) return false;
        const state = getState();
        ATLAS.selectedId = node.id;
        state.selectedId = node.id;
        if (typeof window.addLog === 'function') window.addLog(`🧭 다음 천체 자동 탐사: ${node.name}`, 'season-up');
        startCosmosBattle(node);
        return true;
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
            const directive = getSelectedCosmosDirective(node);
            window.addLog(`⚔️ ${node.name} 도전 시작: ${directive ? directive.name : '기본 탐사'} · 중력 ${Number(node.gravity || 1).toFixed(1)}g · 크기 등급 ${Math.max(1, Math.floor(node.sizeClass || 1))} · 특징 ${node.theme}`, 'attack-monster');
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
    window.COSMOS_CAPSTONE_BOSS_IDS = COSMOS_CAPSTONE_BOSS_IDS;
    window.getCosmosStarDustBalance = getCosmosStarDustBalance;
    window.migrateLegacyCosmosStarDust = migrateLegacyCosmosStarDust;
    window.grantCosmosStarDust = grantCosmosStarDust;
    
    function renderMasteryPanel() {
        const el = document.getElementById('cosmos-inner-mastery');
        if (!el) return;
        const freePoints = getCosmosMasteryFreePoints();
        const totalPoints = getCosmosMasteryTotalPoints();
        const cards = COSMOS_MASTERY_NODES.map(node => {
            const value = getCosmosMasteryValue(node.key);
            const lockReason = getCosmosMasteryLockReason(node.key);
            const canSpend = freePoints >= node.cost && value < node.max && !lockReason;
            const stateClass = lockReason ? 'locked' : (value >= node.max ? 'maxed' : (canSpend ? 'available' : ''));
            const links = COSMOS_MASTERY_LINKS[node.key] || [];
            const linkLine = links.length ? links.map(link => {
                const [key, level] = String(link).split(':');
                const required = COSMOS_MASTERY_NODES.find(row => row.key === key);
                return `${required ? required.name : key} ${Math.max(1, Math.floor(Number(level || 1)))}Lv`;
            }).join(' · ') : '시작 노드';
            return `<article class="cosmos-mastery-card ${stateClass}">
                <div class="cosmos-mastery-card-head"><div><span>${lockReason ? 'LOCKED' : (value >= node.max ? 'MASTERED' : 'STAR PATH')}</span><strong>${node.name}</strong></div><b>${value}/${node.max}</b></div>
                <div class="cosmos-mastery-progress"><i style="width:${Math.floor(value / node.max * 100)}%"></i></div>
                <p>${node.desc}</p>
                <div class="cosmos-mastery-card-foot"><small>${lockReason || linkLine}</small><button type="button" onclick="allocateCosmosMastery('${node.key}')" ${canSpend ? '' : 'disabled'}>+1</button></div>
            </article>`;
        }).join('');
        el.innerHTML = `<div class="cosmos-mastery-header"><div><div class="cosmos-kicker">Stellar Mastery</div><div class="cosmos-detail-title">성도술 항로</div><p>탐사 완료로 얻은 포인트를 연결된 항로에 투자하세요.</p></div><div class="cosmos-mastery-points"><span>사용 가능<strong>${freePoints}</strong></span><span>누적 획득<strong>${totalPoints}</strong></span></div></div><div class="cosmos-mastery-grid">${cards}</div>`;
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
    window.getCosmosMasteryValue = getCosmosMasteryValue;
    window.getCosmosBossPityProgress = getCosmosBossPityProgress;
    window.equipBossStoneByGalaxy = equipBossStoneByGalaxy;
    window.unequipBossStoneByGalaxy = unequipBossStoneByGalaxy;
    window.applyCosmosBossRelicToStone = applyCosmosBossRelicToStone;
    window.showCosmosStoneTooltip = showCosmosStoneTooltip;
    window.switchCosmosInnerTab = switchCosmosInnerTab;
    window.focusCosmosAtlasOnSelected = focusCosmosAtlasOnSelected;
    window.resetCosmosAtlasCamera = resetCosmosAtlasCamera;
    window.zoomCosmosAtlas = zoomCosmosAtlas;
    window.installCosmosAtlas = installCosmosAtlas;
    window.openCosmosStoneOverlay = openCosmosStoneOverlay;
    window.closeCosmosStoneOverlay = closeCosmosStoneOverlay;
    window.toggleCosmosStoneOverlay = toggleCosmosStoneOverlay;
    window.getCosmosCapstoneProgress = getCosmosCapstoneProgress;
    window.focusCosmosCapstoneBoss = focusCosmosCapstoneBoss;
    window.openCosmosCapstoneBossPanel = openCosmosCapstoneBossPanel;
    safeExposeGlobals({ getCosmosNodeRecommendation, getCosmosProgressGuide, focusRecommendedCosmosNode, continueCosmosChallengeAfterClear });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    window.addEventListener('load', boot);
})();
