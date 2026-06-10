// ============================================================================
// 재능 개화 카드 시스템 (P3)
// 재능(10) × 직업(12) = 120종. 개화 시련 클리어로 카드를 획득/강화한다.
// 카드 점수는 계정 진행도(여러 무한 콘텐츠의 최고 도달 + 나무꾼 잔상 전투력)로 매겨지고,
// 점수가 카드 레벨을 결정한다. 표면(직업 테마)·이면(재능 테마) 효과는 레벨에 비례한다.
// 카드/조합 기록은 루프(시즌 리셋)로 초기화되지 않는다.
// (효과의 실제 스탯 반영 및 장착 슬롯은 P4에서 연결)
// ============================================================================

// 카드 레벨 임계값(점수 기준). 점수는 "층 환산" 단위(무한 콘텐츠 최고층 합 + DPS 로그 환산).
const TALENT_CARD_LEVEL_THRESHOLDS = [0, 20, 45, 80, 125, 180, 250, 340, 450, 600];
const TALENT_CARD_MAX_LEVEL = TALENT_CARD_LEVEL_THRESHOLDS.length;
const TALENT_BLOOM_TOTAL_CARDS = 120;

// 나무꾼 잔상 전투력(최고 DPS)의 로그 환산 기준. DPS가 2배 될 때마다 +1점(층과 동일 스케일).
const TALENT_BLOOM_DPS_BASE = 1000;

// 이면(재능) 효과: 캐릭터(재능)별 주력 스탯. 레벨당 perLevel(%) 증가.
const TALENT_CARD_TALENT_EFFECT = {
    hero1: { stat: 'projectilePctDmg', perLevel: 3 },
    hero2: { stat: 'meleePctDmg', perLevel: 3 },
    hero3: { stat: 'elementalPctDmg', perLevel: 3 },
    hero4: { stat: 'chaosPctDmg', perLevel: 3 },
    hero5: { stat: 'physPctDmg', perLevel: 3 },
    hero6: { stat: 'projectilePctDmg', perLevel: 3 },
    hero7: { stat: 'summonPctDmg', perLevel: 3 },
    hero8: { stat: 'pctHp', perLevel: 2 },
    hero9: { stat: 'elementalPctDmg', perLevel: 3 },
    hero10: { stat: 'dotPctDmg', perLevel: 3 }
};

// 표면(직업) 효과: 직업별 키스톤 테마. 레벨당 perLevel(%) 증가하는 스탯 묶음.
const TALENT_CARD_CLASS_EFFECT = {
    warrior: { title: '⚔️ 불굴의 격타', stats: [{ stat: 'physPctDmg', perLevel: 4 }, { stat: 'critDmg', perLevel: 5 }] },
    gladiator: { title: '🌀 연격의 투기', stats: [{ stat: 'meleePctDmg', perLevel: 4 }, { stat: 'aspd', perLevel: 2 }] },
    assassin: { title: '🗡️ 암살 본능', stats: [{ stat: 'crit', perLevel: 2 }, { stat: 'critDmg', perLevel: 6 }] },
    ranger: { title: '🏹 정밀 사격', stats: [{ stat: 'projectilePctDmg', perLevel: 4 }, { stat: 'move', perLevel: 2 }] },
    elementalist: { title: '🔥 원소 공명', stats: [{ stat: 'elementalPctDmg', perLevel: 4 }, { stat: 'resPen', perLevel: 1 }] },
    warlock: { title: '☠️ 부패 가속', stats: [{ stat: 'chaosPctDmg', perLevel: 4 }, { stat: 'dotPctDmg', perLevel: 3 }] },
    guardian: { title: '🛡️ 수호 의지', stats: [{ stat: 'armorPct', perLevel: 3 }, { stat: 'pctHp', perLevel: 2 }] },
    inquisitor: { title: '⚖️ 심판의 빛', stats: [{ stat: 'elementalPctDmg', perLevel: 4 }, { stat: 'crit', perLevel: 1 }] },
    soulbinder: { title: '👻 영혼 결속', stats: [{ stat: 'dotPctDmg', perLevel: 4 }, { stat: 'summonPctDmg', perLevel: 3 }] },
    catalyst: { title: '✨ 촉매 반응', stats: [{ stat: 'elementalPctDmg', perLevel: 4 }, { stat: 'aspd', perLevel: 1 }] },
    hunter: { title: '🎯 추적자', stats: [{ stat: 'projectilePctDmg', perLevel: 4 }, { stat: 'critDmg', perLevel: 4 }] },
    crusader: { title: '✝️ 성전 가호', stats: [{ stat: 'lightPctDmg', perLevel: 4 }, { stat: 'armorPct', perLevel: 2 }] }
};

function parseTalentComboKey(comboKey) {
    let parts = String(comboKey || '').split('__');
    return { heroId: parts[0] || 'hero1', classKey: parts[1] || 'none' };
}
function makeTalentComboKey(heroId, classKey) {
    return `${heroId || 'hero1'}__${classKey || 'none'}`;
}

// 계정 진행도 기반 개화 점수. (무한 콘텐츠 최고층 합 + 나무꾼 잔상 전투력 로그 환산)
function getTalentBloomScore() {
    let deepChaos = Math.max(0, Math.floor(Number(game.abyssEndlessDepth) || 0));
    let labyrinth = Math.max(0, Math.floor(Number(game.labyrinthUnlockedMaxFloor) || 0));
    let chaosFloor = (typeof ensureChaosRealmState === 'function')
        ? Math.max(0, Math.floor(Number(ensureChaosRealmState().highestFloor) || 0)) : 0;
    let underFloor = Math.max(0, Math.floor(Number(game.underworldProgress && game.underworldProgress.highestFloor) || 0));
    let cosmos = (game.cosmosAtlas && Array.isArray(game.cosmosAtlas.cleared))
        ? game.cosmosAtlas.cleared.length + ((game.cosmosAtlas.bossClears || []).length) : 0;
    let bestDps = Math.max(0, Number((game.woodsmanEchoRun && game.woodsmanEchoRun.bestDps) || 0));
    let dpsTerm = bestDps > TALENT_BLOOM_DPS_BASE ? Math.floor(Math.log2(bestDps / TALENT_BLOOM_DPS_BASE)) : 0;
    return deepChaos + labyrinth + chaosFloor + underFloor + cosmos + Math.max(0, dpsTerm);
}

function getTalentBloomScoreBreakdown() {
    let deepChaos = Math.max(0, Math.floor(Number(game.abyssEndlessDepth) || 0));
    let labyrinth = Math.max(0, Math.floor(Number(game.labyrinthUnlockedMaxFloor) || 0));
    let chaosFloor = (typeof ensureChaosRealmState === 'function')
        ? Math.max(0, Math.floor(Number(ensureChaosRealmState().highestFloor) || 0)) : 0;
    let underFloor = Math.max(0, Math.floor(Number(game.underworldProgress && game.underworldProgress.highestFloor) || 0));
    let cosmos = (game.cosmosAtlas && Array.isArray(game.cosmosAtlas.cleared))
        ? game.cosmosAtlas.cleared.length + ((game.cosmosAtlas.bossClears || []).length) : 0;
    let bestDps = Math.max(0, Number((game.woodsmanEchoRun && game.woodsmanEchoRun.bestDps) || 0));
    let dpsTerm = bestDps > TALENT_BLOOM_DPS_BASE ? Math.floor(Math.log2(bestDps / TALENT_BLOOM_DPS_BASE)) : 0;
    return { deepChaos, labyrinth, chaosFloor, underFloor, cosmos, dpsTerm: Math.max(0, dpsTerm) };
}

function getTalentCardLevel(score) {
    let s = Math.max(0, Math.floor(Number(score) || 0));
    let level = 1;
    for (let i = 0; i < TALENT_CARD_LEVEL_THRESHOLDS.length; i++) {
        if (s >= TALENT_CARD_LEVEL_THRESHOLDS[i]) level = i + 1;
    }
    return Math.min(TALENT_CARD_MAX_LEVEL, level);
}

// 개화 시련 클리어 시 호출: 조합 카드의 점수를 최고값으로 갱신하고 레벨을 다시 계산한다.
function recordTalentBloomCard(comboKey) {
    if (!game.talentCards || typeof game.talentCards !== 'object') game.talentCards = {};
    let score = getTalentBloomScore();
    let card = game.talentCards[comboKey] || { score: 0, level: 1, count: 0 };
    card.count = Math.max(0, Math.floor(card.count || 0)) + 1;
    if (score > (card.score || 0)) card.score = score;
    let prevLevel = Math.max(1, Math.floor(card.level || 1));
    card.level = getTalentCardLevel(card.score);
    game.talentCards[comboKey] = card;
    return { card, leveledUp: card.level > prevLevel, score };
}

// 카드의 표면/이면 효과를 레벨에 맞춰 스탯 묶음으로 반환. (P4: 스탯 반영에 사용)
function getTalentCardStatBonuses(heroId, classKey, level) {
    let lv = Math.max(1, Math.min(TALENT_CARD_MAX_LEVEL, Math.floor(level || 1)));
    let out = [];
    let talent = TALENT_CARD_TALENT_EFFECT[heroId];
    if (talent) out.push({ stat: talent.stat, val: talent.perLevel * lv, kind: 'hidden' });
    let cls = TALENT_CARD_CLASS_EFFECT[classKey];
    if (cls) cls.stats.forEach(s => out.push({ stat: s.stat, val: s.perLevel * lv, kind: 'surface' }));
    return out;
}

function getTalentStatLabel(stat) {
    if (typeof P_STATS !== 'undefined' && P_STATS[stat] && P_STATS[stat].name) return P_STATS[stat].name;
    if (typeof getStatName === 'function') return getStatName(stat);
    return stat;
}

function getTalentCardEffectLines(heroId, classKey, level) {
    return getTalentCardStatBonuses(heroId, classKey, level).map(b => {
        let label = getTalentStatLabel(b.stat);
        let tag = b.kind === 'surface' ? '표면' : '이면';
        return `<span style="color:${b.kind === 'surface' ? '#ffd36b' : '#9fe0ff'};">[${tag}] ${label} +${b.val}%</span>`;
    });
}

function getTalentCardName(heroId, classKey) {
    let heroLabel = (typeof getHeroSelectionDef === 'function') ? getHeroSelectionDef(heroId).label : heroId;
    let classLabel = (typeof CLASS_TEMPLATES !== 'undefined' && CLASS_TEMPLATES[classKey]) ? CLASS_TEMPLATES[classKey].name : '무직';
    return { heroLabel, classLabel };
}

function getOwnedTalentCardCount() {
    return (game.talentCards && typeof game.talentCards === 'object') ? Object.keys(game.talentCards).length : 0;
}

function renderTalentTab() {
    let summaryEl = document.getElementById('ui-talent-summary');
    let gridEl = document.getElementById('ui-talent-card-grid');
    if (!summaryEl || !gridEl) return;
    let owned = (game.talentCards && typeof game.talentCards === 'object') ? game.talentCards : {};
    let ownedKeys = Object.keys(owned);
    let bd = getTalentBloomScoreBreakdown();
    let curScore = getTalentBloomScore();
    summaryEl.innerHTML = `보유 카드 <strong>${ownedKeys.length}</strong> / ${TALENT_BLOOM_TOTAL_CARDS} · 총 개화 ${Math.max(0, Math.floor(game.talentBloomClears || 0))}회`
        + `<br><span style="font-size:0.85em; color:#9fb4d1;">현재 개화 점수 <strong>${curScore}</strong> = 혼돈심화 ${bd.deepChaos} + 미궁 ${bd.labyrinth} + 혼돈계 ${bd.chaosFloor} + 지하계 ${bd.underFloor} + 우주계 ${bd.cosmos} + 전투력 ${bd.dpsTerm}</span>`;

    if (ownedKeys.length === 0) {
        gridEl.innerHTML = `<div style="grid-column:1/-1; color:#9fb4d1; padding:18px; text-align:center;">아직 개화한 카드가 없습니다. 지도 탭의 🌸 <strong>혹독한 겨울의 미궁</strong>(재능 개화 시련)을 클리어하면 현재 재능 × 직업 조합의 카드를 얻습니다.</div>`;
        return;
    }
    // 레벨 내림차순 정렬
    ownedKeys.sort((a, b) => (owned[b].level - owned[a].level) || (owned[b].score - owned[a].score));
    gridEl.innerHTML = ownedKeys.map(key => {
        let card = owned[key];
        let { heroId, classKey } = parseTalentComboKey(key);
        let { heroLabel, classLabel } = getTalentCardName(heroId, classKey);
        let level = Math.max(1, Math.floor(card.level || 1));
        let lines = getTalentCardEffectLines(heroId, classKey, level);
        let nextThreshold = level < TALENT_CARD_MAX_LEVEL ? TALENT_CARD_LEVEL_THRESHOLDS[level] : null;
        let nextText = nextThreshold !== null ? `다음 레벨 점수 ${nextThreshold}` : '최대 레벨';
        return `<div class="talent-card">
            <div class="talent-card-head">
                <span class="talent-card-title">${heroLabel} × ${classLabel}</span>
                <span class="talent-card-level">Lv.${level}/${TALENT_CARD_MAX_LEVEL}</span>
            </div>
            <div class="talent-card-effects">${lines.join('<br>')}</div>
            <div class="talent-card-foot">점수 ${Math.max(0, Math.floor(card.score || 0))} · 개화 ${Math.max(0, Math.floor(card.count || 0))}회 · ${nextText}</div>
        </div>`;
    }).join('');
}
