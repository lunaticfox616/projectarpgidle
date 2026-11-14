import { COSMOS_ROUTE_G1, COSMOS_ROUTE_GALAXIES } from './cosmos-route.mjs';
export const COSMOS_ASTEROID_NUMBERS = Object.values(COSMOS_ROUTE_GALAXIES).flatMap(route=>route.asteroids.map(id=>Number(id.split('-')[1])));
export const COSMOS_LAYOUT_VERSION = 20260811;
export const DEFAULT_COSMOS_CAMERA_SCALE = 0.56;
export const GALAXY_SEQUENCE = [1, 2, 3, 4, 5];
export const PLANETS_PER_GALAXY = 10;
export const ASTEROIDS_PER_GALAXY = 15;
export const NODES_PER_GALAXY = PLANETS_PER_GALAXY + ASTEROIDS_PER_GALAXY;
export const GALAXY_BOSS_REQUIRED_CLEARS = COSMOS_ROUTE_G1.requiredClears;
export const GALAXY_BOSS_PLANET_INDEX = Object.fromEntries(Object.entries(COSMOS_ROUTE_GALAXIES).map(([id,route])=>[id,Number(route.boss.split('-')[1])]));
export const COSMOS_CAPSTONE_BOSS_IDS = Object.freeze(
        GALAXY_SEQUENCE.map(galaxy => `planet-${GALAXY_BOSS_PLANET_INDEX[galaxy]}`)
    );
export const COSMOS_BOSS_EQUIPMENT_DROP_CHANCE = 0.012;
export const COSMOS_BOSS_JEWEL_DROP_CHANCE = 0.005;
export const COSMOS_BOSS_TALISMAN_DROP_CHANCE = 0.005;
export const COSMOS_STONE_TIER_FLOORS = [1, 6, 11, 16, 21, 25];
export const COSMOS_MASTERY_NODES = [
        { key: 'planetRelief', name: '행성 패널티 완화', max: 30, cost: 1, desc: '10레벨마다 행성 전투 위협 티어 -1 (최대 -3, 위협 티어 완화는 모두 합쳐 -8까지)' },
        { key: 'asteroidRelief', name: '소행성 수확 증폭', max: 24, cost: 1, desc: '소행성 클리어 보상 +1.6% (최대 38.4%)' },
        { key: 'combatFocus', name: '전투 파밍 집중', max: 24, cost: 1, desc: '행성 클리어 보상 +1.0% (최대 24%)' },
        { key: 'craftFocus', name: '제작 파밍 집중', max: 24, cost: 1, desc: '소행성 클리어 보상 +1.0% (최대 24%)' },
        { key: 'stardustGain', name: '탐사 보상 증폭', max: 30, cost: 1, desc: '우주계 탐사 보상 +1.0% (최대 30%)' },
        { key: 'challengeEase', name: '행성 난이도 완화', max: 22, cost: 1, desc: '4레벨마다 우주계 전투 위협 티어 -1 (최대 -5, 위협 티어 완화는 모두 합쳐 -8까지)' },
        { key: 'highRisk', name: '고위험 난이도', max: 20, cost: 1, desc: '4레벨마다 위협 티어 +1, 보상 +2.2% (최대 +44%)' },
        { key: 'bossBounty', name: '보스 보상 강화', max: 18, cost: 1, desc: '은하 보스 보상 +2.2% (최대 +39.6%)' },
        { key: 'routeInsight', name: '별길 통찰', max: 28, cost: 1, desc: '7레벨마다 우주계 전투 위협 티어 -1 (최대 -4, 위협 티어 완화는 모두 합쳐 -8까지)' },
        { key: 'gravityHarness', name: '중력 제어', max: 22, cost: 1, desc: '중력 페널티 완화 +1.0% (최대 22%)' },
        { key: 'warpEfficiency', name: '항성 추진', max: 20, cost: 1, desc: '모든 우주계 클리어 보상 +1.0% (최대 20%)' },
        { key: 'eliteHunt', name: '유물 감응', max: 20, cost: 1, desc: '보스 유물 드랍 확률 +0.7%p (최대 +14%p)' },
        { key: 'resonanceDrive', name: '공명 구동', max: 22, cost: 1, desc: '우주계 전투 최종 피해 +0.6% (최대 13.2%)' },
        { key: 'voidSurvey', name: '공허 측량', max: 20, cost: 1, desc: '8레벨마다 소행성 전투 위협 티어 -1 (최대 -2, 위협 티어 완화는 모두 합쳐 -8까지)' },
        { key: 'stellarForge', name: '항성 단조', max: 26, cost: 1, desc: '소행성 클리어 보상 +0.9% (최대 23.4%)' },
        { key: 'echoCache', name: '에코 저장고', max: 20, cost: 1, desc: '탐사 완료 보상 +1.0% (최대 20%)' },
        { key: 'riftGuard', name: '균열 방벽', max: 20, cost: 1, desc: '우주계 받는 피해 완화 +0.7% (최대 14%)' },
        { key: 'frontierTax', name: '개척자 세공', max: 18, cost: 1, desc: '깊은 궤도(4~5) 보상 +1.3% (최대 23.4%)' },
        { key: 'chainMastery', name: '초회 정복 보너스', max: 18, cost: 1, desc: '미클리어 노드 첫 완료 보상 +2.0% (최대 36%)' },
        { key: 'apexProtocol', name: '은하 핵 반응', max: 22, cost: 1, desc: '보스 처치 보상 +1.8% (최대 39.6%)' },
        { key: 'starbreaker', name: '성핵 분쇄', max: 12, cost: 1, desc: '보스 전투 피해 +1.8% (최대 21.6%)' }
    ];
export const COSMOS_MASTERY_LINKS = {
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
export const GALAXY_SPECS = {
        0: { x: 0, y: 0, r: 180, angle: 0, accent: '#f8e7a0', label: 'G0 중심핵' },
        1: { x: 0, y: -760, r: 390, angle: -Math.PI / 2, accent: '#82d8ff', label: 'G1 관문권' },
        2: { x: 1110, y: -360, r: 410, angle: -Math.PI / 6, accent: '#b38cff', label: 'G2 북동은하' },
        3: { x: -1110, y: -360, r: 410, angle: -Math.PI * 5 / 6, accent: '#7cf2c8', label: 'G3 북서은하' },
        4: { x: 900, y: 820, r: 430, angle: Math.PI / 4, accent: '#ffb36e', label: 'G4 남동은하' },
        5: { x: -900, y: 820, r: 430, angle: Math.PI * 3 / 4, accent: '#ff80bc', label: 'G5 남서은하' }
    };
