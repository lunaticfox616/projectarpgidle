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
        camera: { x: 0, y: 0, scale: 0.72 },
        drag: { active: false, moved: false, startX: 0, startY: 0, baseX: 0, baseY: 0 },
        installed: false,
        needsFrame: false
    };
    const GALAXY_SPECS = {
        0: { x: 0, y: 0, r: 180, label: 'G0 중심핵' },
        1: { x: 0, y: -70, r: 520, label: 'G1 관문권' },
        2: { x: 1120, y: -690, r: 540, label: 'G2 북동은하' },
        3: { x: -1160, y: -660, r: 520, label: 'G3 북서은하' },
        4: { x: 1320, y: 740, r: 560, label: 'G4 남동은하' },
        5: { x: -1260, y: 810, r: 540, label: 'G5 남서은하' }
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

    function buildCosmosAtlasData() {
        if (ATLAS.nodes.length) return;
        const galaxyCenters = Object.keys(GALAXY_SPECS).reduce((acc, key) => {
            const spec = GALAXY_SPECS[key];
            acc[key] = { x: spec.x, y: spec.y };
            return acc;
        }, {});
        const galaxySpineAngles = {
            1: -Math.PI / 2,
            2: -Math.PI / 6,
            3: -Math.PI * 5 / 6,
            4: Math.PI / 7,
            5: Math.PI * 6 / 7
        };
        const galaxyCounts = { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        const orbitBossAssigned = {1:false,2:false,3:false,4:false,5:false};
        for (let i = 0; i < COSMOS_PLANETS.length; i++) {
            const o = Math.max(0, Math.min(5, Math.floor(COSMOS_PLANETS[i].orbit || 0)));
            if (o >= 1 && COSMOS_PLANETS[i].tag === 'boss') orbitBossAssigned[o] = true;
        }
        for (let i = COSMOS_PLANETS.length - 1; i >= 0; i--) {
            const o = Math.max(0, Math.min(5, Math.floor(COSMOS_PLANETS[i].orbit || 0)));
            if (o >= 1 && !orbitBossAssigned[o]) { COSMOS_PLANETS[i].tag = 'boss'; orbitBossAssigned[o] = true; }
        }

        COSMOS_PLANETS.forEach(p => { const o = Math.max(0, Math.min(5, Math.floor(p.orbit || 0))); galaxyCounts[o] = (galaxyCounts[o] || 0) + 1; });
        const galaxyIndex = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        COSMOS_PLANETS.forEach((p, idx) => {
            const orbit = Math.max(0, Math.min(5, Math.floor(p.orbit || 0)));
            const pos = galaxyIndex[orbit]++;
            const total = Math.max(1, galaxyCounts[orbit] || 1);
            const base = galaxySpineAngles[orbit] || 0;
            const spread = Math.min(Math.PI * 1.25, Math.PI * (0.68 + Math.min(1, total / 18) * 0.55));
            const lane = total <= 1 ? 0.5 : (pos / (total - 1));
            const arc = (lane - 0.5) * spread;
            const jitter = (seeded01(p.name + ':angle') - 0.5) * 0.16;
            const angle = orbit === 0 ? 0 : base + arc + jitter;
            const ringBase = orbit === 0 ? 0 : (GALAXY_SPECS[orbit] ? GALAXY_SPECS[orbit].r * 0.42 : 220);
            const ringStep = orbit === 0 ? 0 : 34 + orbit * 4;
            const ring = orbit === 0 ? 0 : ringBase + (pos % 4) * ringStep + (seeded01(p.name + ':radius') - 0.5) * 52;
            const center = galaxyCenters[orbit] || { x: 0, y: 0 };
            const node = {
                id: `planet-${idx}`,
                kind: 'planet',
                name: p.name,
                source: p.source,
                theme: p.theme,
                tag: p.tag,
                orbit,
                tier: Math.min(25, 1 + Math.floor(idx / 5)),
                x: orbit === 0 ? 0 : center.x + Math.cos(angle) * ring,
                y: orbit === 0 ? 0 : center.y + Math.sin(angle) * ring,
                radius: orbit === 0 ? 16 : Math.max(8, 15 - orbit),
                labelPriority: orbit === 0 ? 10 : Math.max(1, 7 - orbit),
                sizeClass: 1 + Math.floor(seeded01(p.name + ':size') * 5),
                gravity: Math.max(1, Math.round((1.0 + orbit * 0.7 + seeded01(p.name + ':grav') * 2.4) * 10) / 10)
            };
            ATLAS.nodes.push(node);
        });

        COSMOS_ASTEROID_NUMBERS.forEach((no) => {
            const orbit = 1 + Math.floor(seeded01('ast-orbit-' + no) * 5);
            const angle = seeded01('ast-angle-' + no) * Math.PI * 2;
            const center = galaxyCenters[orbit] || { x: 0, y: 0 };
            const shell = GALAXY_SPECS[orbit] || { r: 520 };
            const r = shell.r + 120 + (seeded01('ast-radius-' + no) - 0.5) * 200;
            const node = {
                id: `asteroid-${no}`,
                kind: 'asteroid',
                name: `소행성 ${formatAsteroidNo(no)}`,
                source: `Asteroid #${no}`,
                theme: '소행성 지대 / 재료·별가루',
                tag: 'asteroid',
                orbit,
                tier: Math.min(25, 1 + Math.floor((50 + COSMOS_ASTEROID_NUMBERS.indexOf(no)) / 5)),
                x: center.x + Math.cos(angle) * r,
                y: center.y + Math.sin(angle) * r,
                radius: Math.max(7.2, 14 - orbit),
                labelPriority: 0,
                sizeClass: 1 + Math.floor(seeded01('ast-size-' + no) * 3),
                gravity: Math.max(0.8, Math.round((0.8 + orbit * 0.55 + seeded01('ast-grav-' + no) * 1.6) * 10) / 10)
            };
            ATLAS.nodes.push(node);
        });

        
        for (let pass = 0; pass < 160; pass++) {
            let moved = false;
            for (let i = 0; i < ATLAS.nodes.length; i++) {
                for (let j = i + 1; j < ATLAS.nodes.length; j++) {
                    const a = ATLAS.nodes[i], b = ATLAS.nodes[j];
                    const minD = (a.radius + b.radius + 22);
                    const dx = b.x - a.x, dy = b.y - a.y;
                    const d = Math.hypot(dx, dy) || 0.001;
                    if (d >= minD) continue;
                    const push = (minD - d) * 0.5;
                    const nx = dx / d, ny = dy / d;
                    if (a.orbit > 0) { a.x -= nx * push; a.y -= ny * push; }
                    if (b.orbit > 0) { b.x += nx * push; b.y += ny * push; }
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
                    const d = distance(a, b);
                    if (!best || d < best.d) best = { a, b, d };
                });
            });
            if (!best) break;
            link(best.a, best.b, 'spine');
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
        state.starDust = Math.max(0, Math.floor(state.starDust || 0));
        state.bossClears = Array.isArray(state.bossClears) ? state.bossClears : [];
        state.bossKills = state.bossKills && typeof state.bossKills === 'object' ? state.bossKills : {};
        state.bossRelics = Array.isArray(state.bossRelics) ? state.bossRelics : [];
        state.bossStones = state.bossStones && typeof state.bossStones === 'object' ? state.bossStones : {};
        state.equippedStoneGalaxy = Number.isFinite(state.equippedStoneGalaxy) ? Math.max(0, Math.min(5, Math.floor(state.equippedStoneGalaxy))) : 0;
        state.masteryPointsSpent = Math.max(0, Math.floor(state.masteryPointsSpent || 0));
        state.mastery = state.mastery && typeof state.mastery === 'object' ? state.mastery : {};
        COSMOS_MASTERY_NODES.forEach(node => {
            state.mastery[node.key] = Math.max(0, Math.min(node.max, Math.floor(state.mastery[node.key] || 0)));
        });
        if (!state.camera) state.camera = { x: 0, y: 0, scale: 0.72 };
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
        if (g <= 2) return 10;
        if (g <= 4) return 20;
        return 28;
    }


    function getBossStage(node) {
        if (!node || node.tag !== 'boss') return null;
        const state = getState();
        const clears = Math.max(0, Math.floor((state.bossKills && state.bossKills[node.id]) || 0));
        if (clears >= 3) return 3;
        if (clears >= 1) return 2;
        return 1;
    }

    function getCosmosTierFloor() {
        const state = getState();
        const g = Math.max(0, Math.min(5, Math.floor(state.equippedStoneGalaxy || 0)));
        return Math.min(21, 1 + g * 5);
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
        const tier = Math.max(1, Math.floor(getDisplayedNodeTier(node) || 1));
        const ease = getCosmosMasteryValue('challengeEase') * 0.015 + getCosmosMasteryValue('riftGuard') * 0.007;
        const risk = getCosmosMasteryValue('highRisk') * 0.02 - getCosmosMasteryValue('gravityHarness') * 0.002;
        const relief = node && node.kind === 'planet'
            ? getCosmosMasteryValue('planetRelief') * 0.012
            : getCosmosMasteryValue('voidSurvey') * 0.008;
        const finalMul = Math.max(0.65, 1 + risk - ease - relief);
        return Math.max(1, Math.floor(tier * finalMul));
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

    function tryRollBossRelic(node) {
        const state = getState();
        if (!node || node.tag !== 'boss') return null;
        const table = ['보스 전용 고유 장비', '보스 전용 주얼', '보스 전용 부적', '유물 파편', '심연 촉매'];
        const luck = Math.random();
        const relicBonus = getCosmosMasteryValue('eliteHunt') * 0.007;
        if (luck < 0.22 + relicBonus) {
            const drop = table[Math.floor(Math.random() * table.length)];
            state.bossRelics.push(`${node.id}:${Date.now()}:${drop}`);
            return drop;
        }
        return null;
    }

    function equipBossStoneByGalaxy(galaxy) {
        const state = getState();
        const g = Math.max(1, Math.min(5, Math.floor(galaxy || 1)));
        const stone = state.bossStones[String(g)];
        if (!stone) {
            if (typeof window.addLog === 'function') window.addLog(`은하 ${g} 우주석이 없습니다.`, 'attack-monster');
            return;
        }
        state.equippedStoneGalaxy = Math.max(Math.floor(state.equippedStoneGalaxy || 0), g);
        if (typeof window.addLog === 'function') window.addLog(`💠 ${stone} 장착: 우주계 난이도 바닥 Tier ${getCosmosTierFloor()} 적용`, 'season-up');
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
                <h2>🌠 우주계 아틀라스 <span class="h2-right">이름 있는 행성 50개 · 소행성 75개 · 총 125개 노드</span></h2>
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
            try { renderCosmosAtlas(); } catch (e) {}
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

    function renderCosmosAtlas() {
        if (!ATLAS.installed) {
            installCosmosAtlas();
            return;
        }
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
            ctx.strokeStyle = selected ? '#ffffff' : status === 'available' ? '#9fd4ff' : status === 'cleared' ? '#9ef0bf' : '#586780';
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

    function renderSummary() {
        if (!ATLAS.summary) return;
        const state = getState();
        const cleared = state.cleared.length;
        const available = ATLAS.nodes.filter(node => getNodeStatus(node) === 'available').length;
        const planetsCleared = ATLAS.nodes.filter(n => n.kind === 'planet' && state.cleared.includes(n.id)).length;
        const asteroidsCleared = ATLAS.nodes.filter(n => n.kind === 'asteroid' && state.cleared.includes(n.id)).length;
        const unlocked = isCosmosUnlocked();
        ATLAS.summary.innerHTML = `
            <div><b>${cleared}</b> / ${ATLAS.nodes.length} 탐사 완료</div>
            <div>행성 ${planetsCleared} / 50 · 소행성 ${asteroidsCleared} / 75</div>
            <div>탐사 가능 노드: <b>${unlocked ? available : 0}</b></div>
            <div>성도술 포인트: <b>${getCosmosMasteryFreePoints()}</b> / ${getCosmosMasteryTotalPoints()}</div>
            <div>별가루: <b>${state.starDust}</b></div>
            <div>은하 유물(랜덤): <b>${(state.bossRelics || []).length}</b></div>
            <div>우주석 슬롯: <b>${Math.max(0, Math.floor(state.equippedStoneGalaxy || 0))}</b> / 5</div>`;
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
            <div class="cosmos-detail-source">원본: ${escapeHtml(node.source)} · 궤도 ${node.orbit} · Tier ${getDisplayedNodeTier(node)}${node.tag === 'boss' ? ' · 은하 보스' : ''}</div>
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
        const firstClear = !state.cleared.includes(node.id);
        if (status === 'available') {
            if (typeof window.addLog === 'function') window.addLog('행성은 도전에 성공해야 탐사가 완료됩니다.', 'attack-monster');
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
            if (!state.bossStones[g]) state.bossStones[g] = getBossStoneName(node);
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
                if (relicDrop) window.addLog(`🎲 보스 랜덤 드랍: ${relicDrop}`, 'loot-unique');
            }
        }
        if (typeof window.saveGame === 'function') {
            try { window.saveGame({ auto: true, silent: true }); } catch (e) {}
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
            if (typeof window.addLog === 'function') window.addLog('해당 행성은 아직 도전할 수 없습니다.', 'attack-monster');
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
        ATLAS.camera.scale = Math.max(0.72, ATLAS.camera.scale);
        saveCamera();
        renderCosmosAtlas();
    }

    function resetCosmosAtlasCamera() {
        ATLAS.camera = { x: 0, y: 0, scale: 0.72 };
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
    window.switchCosmosInnerTab = switchCosmosInnerTab;
    window.focusCosmosAtlasOnSelected = focusCosmosAtlasOnSelected;
    window.resetCosmosAtlasCamera = resetCosmosAtlasCamera;
    window.zoomCosmosAtlas = zoomCosmosAtlas;
    window.installCosmosAtlas = installCosmosAtlas;

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    window.addEventListener('load', boot);
})();
