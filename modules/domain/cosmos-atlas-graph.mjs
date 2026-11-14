import { GALAXY_SEQUENCE, ASTEROIDS_PER_GALAXY, GALAXY_SPECS, NODES_PER_GALAXY, COSMOS_ASTEROID_NUMBERS, GALAXY_BOSS_PLANET_INDEX, PLANETS_PER_GALAXY } from '../data/cosmos-atlas.mjs';
import { COSMOS_PLANETS } from '../data/cosmos-atlas-planets.mjs';

/** Native atlas graph; no DOM or renderer dependency. */
export class CosmosAtlasGraph {
    constructor(deps) { this.deps = deps;  this.nodes = []; this.edges = []; this.byId = new Map(); }

    hashSeed(input) {
        let h = 2166136261;
        let s = String(input || '');
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    seeded01(seed) {
        let x = this.hashSeed(seed);
        x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
        return ((x >>> 0) % 100000) / 100000;
    }

    formatAsteroidNo(no) {
        return String(no).padStart(3, '0');
    }

    getGalaxyForPlanetIndex(idx) {
        if (idx <= 0) return 0;
        return GALAXY_SEQUENCE[(idx - 1) % GALAXY_SEQUENCE.length];
    }

    getGalaxyPlanetSlot(idx) {
        if (idx <= 0) return 0;
        return Math.floor((idx - 1) / GALAXY_SEQUENCE.length);
    }

    getGalaxyForAsteroidIndex(idx) {
        return GALAXY_SEQUENCE[Math.max(0, Math.min(GALAXY_SEQUENCE.length - 1, Math.floor(idx / ASTEROIDS_PER_GALAXY)))];
    }

    getGalaxyTierBandBase(galaxy) {
        return galaxy <= 0 ? 1 : ((Math.max(1, Math.min(5, Math.floor(galaxy))) - 1) * 5) + 1;
    }

    getGalaxyRouteOrder(localSlot, isGalaxyBoss) {
        if (isGalaxyBoss) return 22;
        const withoutBoss = localSlot > 9 ? localSlot - 1 : localSlot;
        return withoutBoss >= 22 ? withoutBoss + 1 : withoutBoss;
    }

    getGalaxyRoutePosition(galaxy, routeOrder) {
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

    assignGalaxyRoutePositions() {
        GALAXY_SEQUENCE.forEach(galaxy => {
            const nodes = this.nodes.filter(node => node.orbit === galaxy);
            const boss = nodes.find(node => node.tag === 'boss');
            const routeOrders = Array.from({ length: NODES_PER_GALAXY }, (_, index) => index)
                .filter(order => order !== 22);
            nodes.filter(node => node !== boss).sort((a, b) => a.localSlot - b.localSlot).forEach((node, index) => {
                node.routeOrder = routeOrders[index];
                Object.assign(node, this.getGalaxyRoutePosition(galaxy, node.routeOrder));
            });
            if (boss) {
                boss.routeOrder = 22;
                Object.assign(boss, this.getGalaxyRoutePosition(galaxy, boss.routeOrder));
            }
        });
    }

    buildCosmosAtlasData() {
        if (this.nodes.length) return;
        this.nodes.length = 0;
        this.edges.length = 0;
        this.byId.clear();


        COSMOS_PLANETS.forEach((p, idx) => this.addCosmosPlanet(p, idx));
        COSMOS_ASTEROID_NUMBERS.forEach((no, idx) => this.addCosmosAsteroid(no, idx));
        this.assignGalaxyRoutePositions();
        this.nodes.forEach(node => this.byId.set(node.id, node));
        this.buildEdges();
    }

    addCosmosPlanet(p, idx) {
        const galaxy = this.getGalaxyForPlanetIndex(idx);
            const planetSlot = this.getGalaxyPlanetSlot(idx);
            const localSlot = galaxy === 0 ? 0 : planetSlot;
            const isGalaxyBoss = galaxy > 0 && GALAXY_BOSS_PLANET_INDEX[galaxy] === idx;
            const routeOrder = galaxy === 0 ? 0 : this.getGalaxyRouteOrder(localSlot, isGalaxyBoss);
            const pos = this.getGalaxyRoutePosition(galaxy, routeOrder);
            const tag = isGalaxyBoss || p.tag === 'boss' ? 'boss' : p.tag;
            const {sizeClass, gravity} = this.planetPhysicalSize(p, idx, galaxy);
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
                tier: this.planetTier(idx, galaxy, isGalaxyBoss, planetSlot),
                x: pos.x,
                y: pos.y,
                radius: idx === 0 ? 19 : Math.max(11, 17 - galaxy * 0.35 + sizeClass * 0.4),
                labelPriority: idx === 0 ? 10 : (tag === 'boss' ? 8 : Math.max(2, 7 - Math.floor(localSlot / 2))),
                sizeClass,
                gravity
            };
            this.nodes.push(node);
    }

    planetPhysicalSize(planet, index, galaxy) {
        const sizeSeed = this.seeded01(planet.name + ':size');
        const gravitySeed = this.seeded01(planet.name + ':grav');
        const sizeClass = index === 0 ? 1 : Math.max(1, Math.min(5, 1 + Math.floor(sizeSeed * 5)));
        const gravity = index === 0 ? 1 : Math.max(1, Math.round((1.05 + galaxy * 0.18 + sizeClass * 0.18 + gravitySeed * 1.35) * 10) / 10);
        return { sizeClass, gravity };
    }

    planetTier(index, galaxy, boss, slot) {
        if (index === 0) return 1;
        const offset = boss ? 4 : Math.min(4, Math.floor(slot / 2));
        return Math.max(1, Math.min(25, this.getGalaxyTierBandBase(galaxy) + offset));
    }

    addCosmosAsteroid(no, idx) {
        const galaxy = this.getGalaxyForAsteroidIndex(idx);
            const asteroidSlot = idx % ASTEROIDS_PER_GALAXY;
            const localSlot = PLANETS_PER_GALAXY + asteroidSlot;
            const routeOrder = this.getGalaxyRouteOrder(localSlot, false);
            const pos = this.getGalaxyRoutePosition(galaxy, routeOrder);
            const sizeClass = Math.max(1, Math.min(4, 1 + Math.floor(this.seeded01('ast-size-' + no) * 4)));
            const gravity = Math.max(0.9, Math.round((0.95 + galaxy * 0.16 + sizeClass * 0.13 + this.seeded01('ast-grav-' + no) * 1.05) * 10) / 10);
            const node = {
                id: `asteroid-${no}`,
                kind: 'asteroid',
                name: this.deps._t('소행성 {no}', { no: this.formatAsteroidNo(no) }),
                source: `Asteroid #${no}`,
                theme: '소행성 지대 / 재료/창공의 정수',
                tag: 'asteroid',
                baseTag: 'asteroid',
                orbit: galaxy,
                originalOrbit: galaxy,
                localIndex: localSlot,
                localSlot,
                routeOrder,
                tier: Math.max(1, Math.min(25, this.getGalaxyTierBandBase(galaxy) + Math.min(4, Math.floor(asteroidSlot / 3)))),
                x: pos.x,
                y: pos.y,
                radius: Math.max(9, 12.5 - galaxy * 0.2 + sizeClass * 0.25),
                labelPriority: 0,
                sizeClass,
                gravity
            };
            this.nodes.push(node);

    }

    addEdge(a, b, type) {
        if (!a || !b || a === b) return;
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (this.edges.some(e => e.key === key)) return;
        this.edges.push({ key, a, b, type: type || 'route' });
    }

    buildEdges() {
        GALAXY_SEQUENCE.forEach(galaxy => {
            const route = this.nodes.filter(node => node.orbit === galaxy)
                .sort((a, b) => a.routeOrder - b.routeOrder);
            const byOrder = new Map(route.map(node => [node.routeOrder, node]));
            for (let stage = 0; stage < 5; stage++) this.connectGalaxyStage(byOrder, stage);
            const entry = byOrder.get(2);
            const previous = galaxy === 1 ? this.byId.get('planet-0')
                : this.byId.get(`planet-${GALAXY_BOSS_PLANET_INDEX[galaxy - 1]}`);
            if (entry && previous) this.addEdge(previous.id, entry.id, galaxy === 1 ? 'spine' : 'transition');
        });
    }

    connectGalaxyStage(byOrder, stage) {
        const row = Array.from({ length: 5 }, (_, lane) => byOrder.get(stage * 5 + lane));
        for (let lane = 0; lane < 4; lane++) this.connectNodes(row[lane], row[lane + 1], 'branch');
        const nextCenter = byOrder.get((stage + 1) * 5 + 2);
        this.connectNodes(row[2], nextCenter, 'spine');
        if (stage < 4) this.connectNodes(row[stage % 2 === 0 ? 3 : 1], nextCenter, 'route');
    }

    connectNodes(a, b, type) {
        if (a && b) this.addEdge(a.id, b.id, type);
    }

    getNeighbors(id) {
        const out = [];
        this.edges.forEach(e => {
            if (e.a === id) out.push(e.b);
            else if (e.b === id) out.push(e.a);
        });
        return out;
    }
}
