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
        const ringRadius = [0, 170, 300, 430, 560, 700];
        const ringCounts = { 0: 1, 1: 5, 2: 9, 3: 13, 4: 12, 5: 10 };
        const ringIndex = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        COSMOS_PLANETS.forEach((p, idx) => {
            const orbit = Math.max(0, Math.min(5, Math.floor(p.orbit || 0)));
            const pos = ringIndex[orbit]++;
            const total = ringCounts[orbit] || 1;
            const jitter = (seeded01(p.name + ':angle') - 0.5) * 0.22;
            const angle = orbit === 0 ? 0 : ((Math.PI * 2 * pos) / total) + jitter + orbit * 0.23;
            const r = ringRadius[orbit] + (seeded01(p.name + ':radius') - 0.5) * (orbit === 0 ? 0 : 52);
            const node = {
                id: `planet-${idx}`,
                kind: 'planet',
                name: p.name,
                source: p.source,
                theme: p.theme,
                tag: p.tag,
                orbit,
                tier: Math.max(1, orbit * 4 + 1 + Math.floor(seeded01(p.name + ':tier') * 4)),
                x: orbit === 0 ? 0 : Math.cos(angle) * r,
                y: orbit === 0 ? 0 : Math.sin(angle) * r,
                radius: orbit === 0 ? 16 : Math.max(8, 15 - orbit),
                labelPriority: orbit === 0 ? 10 : Math.max(1, 7 - orbit)
            };
            ATLAS.nodes.push(node);
        });

        COSMOS_ASTEROID_NUMBERS.forEach((no) => {
            const orbit = 1 + Math.floor(seeded01('ast-orbit-' + no) * 5);
            const angle = seeded01('ast-angle-' + no) * Math.PI * 2;
            const r = ringRadius[orbit] + (seeded01('ast-radius-' + no) - 0.5) * 110;
            const node = {
                id: `asteroid-${no}`,
                kind: 'asteroid',
                name: `소행성 ${formatAsteroidNo(no)}`,
                source: `Asteroid #${no}`,
                theme: '소행성 지대 / 재료·별가루',
                tag: 'asteroid',
                orbit,
                tier: Math.max(1, orbit * 3 + Math.floor(seeded01('ast-tier-' + no) * 4)),
                x: Math.cos(angle) * r,
                y: Math.sin(angle) * r,
                radius: 4.8,
                labelPriority: 0
            };
            ATLAS.nodes.push(node);
        });

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
        const planets = ATLAS.nodes.filter(n => n.kind === 'planet');
        const asteroids = ATLAS.nodes.filter(n => n.kind === 'asteroid');

        for (let i = 0; i < planets.length - 1; i++) addEdge(planets[i].id, planets[i + 1].id, 'spine');

        ATLAS.nodes.forEach(node => {
            if (node.id === 'planet-0') return;
            const candidates = ATLAS.nodes
                .filter(other => other.id !== node.id && other.orbit <= node.orbit && Math.abs(other.orbit - node.orbit) <= 1)
                .map(other => [other, distance(node, other)])
                .sort((a, b) => a[1] - b[1])
                .slice(0, node.kind === 'planet' ? 3 : 2);
            candidates.forEach(pair => addEdge(node.id, pair[0].id, node.kind === 'planet' ? 'route' : 'asteroid'));
        });

        asteroids.forEach(ast => {
            const nearestPlanet = planets
                .map(p => [p, distance(ast, p)])
                .sort((a, b) => a[1] - b[1])[0];
            if (nearestPlanet) addEdge(ast.id, nearestPlanet[0].id, 'asteroid');
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
        if (!state.camera) state.camera = { x: 0, y: 0, scale: 0.72 };
        return state;
    }

    function isCosmosUnlocked() {
        if (!window.game) return false;
        if (window.game.cosmosAtlas && window.game.cosmosAtlas.unlocked) return true;
        return Math.max(1, Math.floor(window.game.season || 1)) >= 10
            || !!(window.game.chaosRealm && window.game.chaosRealm.unlocked);
    }

    function getNodeStatus(node) {
        const state = getState();
        if (!isCosmosUnlocked()) return 'locked';
        if (state.cleared.includes(node.id)) return 'cleared';
        if (node.id === 'planet-0') return 'available';
        const neighbors = getNeighbors(node.id);
        return neighbors.some(id => state.cleared.includes(id)) ? 'available' : 'locked';
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
                            <div class="cosmos-desc">마우스 드래그: 이동 · 휠: 확대/축소 · 노드 클릭: 행성/소행성 선택 · 탐사 완료 시 연결된 별길이 열린다.</div>
                        </div>
                        <div class="cosmos-summary" id="ui-cosmos-summary"></div>
                    </div>
                    <div class="cosmos-layout">
                        <div class="cosmos-canvas-wrap">
                            <canvas id="cosmos-atlas-canvas" width="1200" height="760"></canvas>
                            <div id="cosmos-atlas-tooltip" class="cosmos-atlas-tooltip"></div>
                        </div>
                        <div class="cosmos-detail" id="ui-cosmos-detail"></div>
                    </div>
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
        const sx = event.clientX - rect.left;
        const sy = event.clientY - rect.top;
        const w = ATLAS.canvas.width;
        const h = ATLAS.canvas.height;
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
        [170, 300, 430, 560, 700].forEach((r, idx) => {
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.strokeStyle = idx % 2 ? 'rgba(91, 152, 215, 0.10)' : 'rgba(127, 201, 255, 0.14)';
            ctx.lineWidth = 1.2 / ATLAS.camera.scale;
            ctx.stroke();
        });
        ctx.restore();
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
            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
            ctx.strokeStyle = open ? 'rgba(127, 201, 255, 0.48)' : partial ? 'rgba(127, 201, 255, 0.22)' : 'rgba(80, 92, 120, 0.13)';
            ctx.lineWidth = edge.type === 'spine' ? 2.3 : edge.type === 'asteroid' ? 0.9 : 1.35;
            ctx.stroke();
        });
        ctx.restore();
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

            ctx.beginPath();
            ctx.arc(p.x, p.y, r * (selected ? 1.28 : hover ? 1.18 : 1), 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.lineWidth = selected ? 3 : hover ? 2.4 : 1.4;
            ctx.strokeStyle = selected ? '#ffffff' : status === 'available' ? '#9fd4ff' : status === 'cleared' ? '#9ef0bf' : '#586780';
            ctx.stroke();

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
                ctx.fillText(node.name.replace('소행성 ', '#'), p.x, p.y + r + 5);
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
            <div>별가루: <b>${state.starDust}</b></div>`;
    }

    function renderDetail() {
        if (!ATLAS.detail) return;
        const state = getState();
        const node = ATLAS.byId.get(ATLAS.selectedId) || ATLAS.byId.get(state.selectedId) || ATLAS.byId.get('planet-0');
        if (!node) return;
        const status = getNodeStatus(node);
        const neighbors = getNeighbors(node.id).map(id => ATLAS.byId.get(id)).filter(Boolean);
        const rewardLine = node.kind === 'planet'
            ? `행성 보상: ${node.theme} 계열 보정 · 별가루 +${5 + node.orbit * 2}`
            : `소행성 보상: 별가루 +${2 + node.orbit} · 제작 재료 소량`;
        ATLAS.detail.innerHTML = `
            <div class="cosmos-detail-title">${node.kind === 'planet' ? '🪐' : '☄️'} ${escapeHtml(node.name)}</div>
            <div class="cosmos-detail-source">원본: ${escapeHtml(node.source)} · 궤도 ${node.orbit} · Tier ${node.tier}</div>
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
                <div class="cosmos-section-label">Linked Stars</div>
                <div>${neighbors.slice(0, 8).map(n => escapeHtml(n.name)).join(' · ') || '없음'}${neighbors.length > 8 ? ' ...' : ''}</div>
            </div>
            <div class="cosmos-actions">
                <button onclick="exploreSelectedCosmosNode()" ${status === 'available' ? '' : 'disabled'}>탐사 완료 처리</button>
                <button onclick="focusCosmosAtlasOnSelected()">초점 이동</button>
                <button onclick="resetCosmosAtlasCamera()">지도 초기화</button>
            </div>
            <div class="cosmos-help">${isCosmosUnlocked() ? '탐사 완료된 노드와 연결된 노드가 다음 탐사 후보로 열린다.' : '우주계는 루프 10 이상 또는 혼돈계 해금 후 표시된다. 조건은 나중에 조정 가능.'}</div>`;
    }

    function exploreSelectedCosmosNode() {
        buildCosmosAtlasData();
        const state = getState();
        const node = ATLAS.byId.get(ATLAS.selectedId || state.selectedId || 'planet-0');
        if (!node) return;
        const status = getNodeStatus(node);
        if (status !== 'available') {
            if (typeof window.addLog === 'function') window.addLog('아직 별길이 연결되지 않은 우주계 노드입니다.', 'attack-monster');
            return;
        }
        if (!state.cleared.includes(node.id)) state.cleared.push(node.id);
        const reward = node.kind === 'planet' ? 5 + node.orbit * 2 : 2 + node.orbit;
        state.starDust = Math.max(0, Math.floor(state.starDust || 0)) + reward;
        if (window.game && window.game.currencies) {
            window.game.currencies.starDust = Math.max(0, Math.floor(window.game.currencies.starDust || 0)) + reward;
        }
        if (typeof window.addLog === 'function') {
            window.addLog(`🌠 우주계 탐사 완료: ${node.name} · 별가루 +${reward}`, node.kind === 'planet' ? 'loot-unique' : 'loot-magic');
        }
        if (typeof window.saveGame === 'function') {
            try { window.saveGame({ auto: true, silent: true }); } catch (e) {}
        }
        renderCosmosAtlas();
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
    window.renderCosmosAtlas = renderCosmosAtlas;
    window.exploreSelectedCosmosNode = exploreSelectedCosmosNode;
    window.focusCosmosAtlasOnSelected = focusCosmosAtlasOnSelected;
    window.resetCosmosAtlasCamera = resetCosmosAtlasCamera;
    window.installCosmosAtlas = installCosmosAtlas;

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    window.addEventListener('load', boot);
})();
