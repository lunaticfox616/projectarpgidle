'use strict';

const fs = require('fs');
const path = require('path');

const VFX_LABELS = Object.freeze({
    skillFxWhirlwind: ['회오리바람', '회오리바람'],
    skillFxChainPrimary: ['연쇄 주 타격', '번개 타격·연쇄 폭풍·천뢰 분기'],
    skillFxChainJump: ['연쇄 연결', '연쇄 공격의 적 사이 점프'],
    skillFxSlamPrimary: ['강타 주 충돌', '강타·지진·용암 계열'],
    skillFxSlamAftershock: ['강타 여진', '지진 파쇄 등 후속 균열'],
    skillFxMeteorProjectile: ['유성 낙하체', '유성 낙화 비행 구간'],
    skillFxMeteorImpact: ['유성 충돌', '유성 낙화 착탄 순간'],
    skillFxMeteorGround: ['유성 잔류 지면', '유성 낙화의 불타는 지면'],
    skillFxContinuousSlash: ['속성 베기', '번개 타격·흡혈 타격 등 공용 속성 궤적'],
    skillFxBasicSlash: ['기본 공격', '기본 검격 2×2 프레임 시트'],
    skillFxDoubleSlash: ['연속 베기', '교차 검격 2×2 프레임 시트'],
    skillFxProjectile: ['공용 투사체', '얼음 창·관통 사격·연발 사격 등'],
    skillFxVenomFang: ['독니 사출', '독니 사출 전용 투사체'],
    skillFxFrostField: ['서리 장판', '냉기 범위·장판 이동 효과'],
    skillFxBlizzardAmbient: ['난타 눈보라 배경 시트', '눈보라 범위 전체 애니메이션'],
    skillFxBlizzardImpact: ['난타 눈보라 충돌 시트', '눈보라 타격 애니메이션'],
    skillFxFrostWave: ['서리 파동', '냉기 이동형 파동'],
    skillFxChaosBoomerang: ['카오스 부메랑', '왕복 투사체'],
    skillFxFrostBurst: ['서리 폭발', '중심에서 범위 끝까지 퍼지는 냉기 파동'],
    skillFxFrostWaveRing: ['서리 폭발 파동', '중앙 폭발 뒤 별도로 퍼지는 원형 파동'],
    skillFxBurst: ['준비 문양', '지뢰 준비·함성·조건 스킬'],
    skillFxImpactFlare: ['적중 섬광', '투사체·개별 피격'],
    skillFxEarthSpike: ['지진 쐐기', '지진 파쇄 여진'],
    skillFxEarthCrack: ['지진 지면 균열', '지진 파쇄의 연결된 균열'],
    skillFxRadialWave: ['원형 충격파', '불멸의 진동·삼원 파동·지뢰 폭발'],
    skillFxDotField: ['지속 피해 장판', '화염 부패·빙결 침식·저주'],
    skillFxSummonStrike: ['소환수 타격', '소환수 공격 공통'],
    skillFxFocusBeam: ['집중 광선', '집중 광선 채널링'],
    skillFxDragonBreath: ['용화 숨결', '용화 숨결 채널링'],
    skillFxVoidCutter: ['공허 절삭광', '공허 절삭광 채널링']
});

const FIXED_LAYOUT_KEYS = new Set([
    'skillFxBlizzardAmbient', 'skillFxBlizzardImpact'
]);

function parseActiveVfxAssets(source) {
    const entries = [];
    const keys = new Set();
    const paths = new Set();
    const pattern = /^\s*(skillFx[A-Za-z0-9_]+):\s*'([^']+\.(?:png|webp))',?\s*$/gm;
    for (const match of source.matchAll(pattern)) {
        const key = match[1];
        const assetPath = match[2].replace(/\\/g, '/');
        if (!assetPath.startsWith('assets/')) throw new Error(`${key}: assets 경로가 아닙니다.`);
        if (keys.has(key) || paths.has(assetPath)) throw new Error(`${key}: 중복된 이펙트 자산입니다.`);
        const [label, usage] = VFX_LABELS[key] || [key, '공격 이펙트'];
        entries.push({ key, path: assetPath, label, usage, fixedLayout: FIXED_LAYOUT_KEYS.has(key) });
        keys.add(key);
        paths.add(assetPath);
    }
    if (entries.length === 0) throw new Error('스킬 이펙트 이미지를 찾지 못했습니다.');
    return entries;
}

function loadVfxAssetCatalog(root) {
    const passivesFile = path.join(root, 'js', 'passives.js');
    const areaSource = fs.readFileSync(path.join(root, 'data', 'skills.js'), 'utf8');
    return parseActiveVfxAssets(fs.readFileSync(passivesFile, 'utf8') + '\n' + areaSource).map(entry => {
        const file = path.resolve(root, entry.path);
        if (!file.startsWith(`${path.resolve(root)}${path.sep}`) || !fs.existsSync(file)) {
            throw new Error(`${entry.path}: 실제 파일을 찾지 못했습니다.`);
        }
        const stat = fs.statSync(file);
        const maxBytes = entry.path.includes('/channel-') ? 32 * 1024 : null;
        return { ...entry, bytes: stat.size, maxBytes, modifiedAt: stat.mtime.toISOString() };
    });
}

function decodeVfxData(asset, dataUrl, maxBytes = 16 * 1024 * 1024) {
    const extension = path.extname(asset.path).toLowerCase();
    const mime = extension === '.webp' ? 'image/webp' : 'image/png';
    const escapedMime = mime.replace('/', '\\/');
    const match = new RegExp(`^data:${escapedMime};base64,([a-zA-Z0-9+/=]+)$`).exec(String(dataUrl || ''));
    if (!match) throw new Error(`${extension} 형식의 이미지 데이터가 필요합니다.`);
    const bytes = Buffer.from(match[1], 'base64');
    if (bytes.length <= 0 || bytes.length > maxBytes) throw new Error('이미지 용량이 허용 범위를 벗어났습니다.');
    const validPng = extension === '.png' && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
    const validWebp = extension === '.webp' && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
        && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
    if (!validPng && !validWebp) throw new Error(`올바른 ${extension} 이미지가 아닙니다.`);
    return bytes;
}

module.exports = { decodeVfxData, loadVfxAssetCatalog, parseActiveVfxAssets };
