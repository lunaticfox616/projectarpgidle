const BANNER_MS = 2600;
const BANNER_SHADE = Object.freeze({ reach: 150, height: 44 });
const DEFENSE_LABELS = Object.freeze([['dr', '물리 피해 감소'], ['resF', '화염 저항'], ['resC', '냉기 저항'], ['resL', '번개 저항']]);

function elementLabel(element) {
    if (element === 'fire') return '화염';
    if (element === 'cold') return '냉기';
    if (element === 'light') return '번개';
    if (element === 'chaos') return '공허';
    return '물리';
}

/** Live boss specialties: >=40% and >=15 points above the weakest defense, including current traits/wards. */
function defenseHighlights(enemy) {
    if (!enemy || !enemy.isBoss) return [];
    const rows = DEFENSE_LABELS.map(([key, label]) => ({ label, value: Math.floor(Number(enemy[key]) || 0) }));
    const floor = Math.min(...rows.map(row => row.value));
    return rows.filter(row => row.value >= 40 && row.value - floor >= 15).sort((a, b) => b.value - a.value)
        .map(row => `${row.label} ${row.value}%`);
}

function guardTraits(enemy, tags) {
    if ((enemy.firstHitGuard || 0) > 0 && !enemy.firstHitConsumed) tags.push(`첫타보호 ${Math.floor((enemy.firstHitGuard || 0) * 100)}%`);
    if ((enemy.hitRateGuard || 0) > 0) tags.push(`연타경감 ${Math.floor((enemy.hitRateGuard || 0) * 100)}%/후속타`);
}

function leechTrait(enemy, tags) {
    if ((enemy.leechEffMul || 1) <= 0) tags.push('흡혈불가');
    else if ((enemy.leechEffMul || 1) < 1) tags.push(`흡혈저항 ${Math.floor((enemy.leechEffMul || 1) * 100)}%`);
}

function bannerAlpha(age) {
    if (age < 260) return age / 260;
    return Math.min(1, Math.max(0, (BANNER_MS - age) / 640));
}

function bannerPlate(ctx, mid, cy, half) {
    const rx = half + BANNER_SHADE.reach, ry = BANNER_SHADE.height;
    const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
    shade.addColorStop(0, 'rgba(6,4,4,0.84)');
    shade.addColorStop(0.55, 'rgba(6,4,4,0.6)');
    shade.addColorStop(1, 'rgba(6,4,4,0)');
    ctx.save();
    ctx.translate(mid, cy - 3);
    ctx.scale(rx / ry, 1);
    ctx.fillStyle = shade;
    ctx.fillRect(-ry, -ry, ry * 2, ry * 2);
    ctx.restore();
}

function bannerRule(ctx, left, right, y) {
    const span = right - left, solid = span * 0.6, dotted = (span - solid) / 2;
    ctx.fillStyle = 'rgba(216,166,74,0.9)';
    ctx.fillRect(left + dotted, y, solid, 2);
    for (let x = 0; x < dotted; x += 4) {
        ctx.fillRect(left + dotted - 4 - x, y, 2, 2);
        ctx.fillRect(right - dotted + 2 + x, y, 2, 2);
    }
}

/** Banner state stays in the visual-state owner, where camera framing already reads it. */
export class BattlefieldBossBanner {
    constructor(deps, body, text) { this.deps = deps; this.body = body; this.text = text; }

    displayName(enemy) {
        if (!enemy) return this.deps._t('미확인 적');
        return this.deps.stripEmoji(this.deps.i18n.enemyName(enemy.name)) || this.deps._t('미확인 적');
    }

    traits(enemy) {
        if (!enemy) return ['일반'];
        const tags = [elementLabel(enemy.ele), ...defenseHighlights(enemy)];
        if (enemy.traitName) tags.push(enemy.traitName);
        guardTraits(enemy, tags);
        leechTrait(enemy, tags);
        return Array.from(new Set(tags.filter(Boolean)));
    }

    update(enemies, now) {
        const revealed = this.deps.entrance.revealedBoss(now);
        // An invading boss takes priority over the boss already fighting.
        const boss = (revealed && revealed.redEntrance ? revealed : null) || (enemies || []).find(enemy => enemy && enemy.isBoss) || revealed;
        const visual = this.deps.visual();
        visual.bossBannerFor = null;
        if (!boss) return null;
        if (visual.bossAnnounceId !== boss.id) {
            visual.bossAnnounceId = boss.id;
            visual.bossAnnounceStart = now;
        }
        const age = now - visual.bossAnnounceStart;
        if (age < 0 || age > BANNER_MS) return null;
        visual.bossBannerFor = boss.id;
        return { boss, age };
    }

    drawnSpans(boss) {
        const entry = this.deps.drawnEntry(boss);
        return entry ? [[entry.y - this.body.barLift(boss) - 14, entry.y + 8]] : [];
    }

    y(area, banner, down) {
        const visual = this.deps.visual(), held = visual.bossBannerY;
        if (held && held.start === visual.bossAnnounceStart) return held.y;
        const spans = this.deps.entrance.enteringSpans(banner.boss).concat(this.drawnSpans(banner.boss));
        const y = this.deps.entrance.bannerLine(area, spans, { up: 38, down });
        // Latch only after the boss's actual place is known, including its drawn height.
        if (spans.length) visual.bossBannerY = { start: visual.bossAnnounceStart, y };
        return y;
    }

    subLines(ctx, boss, width) {
        const head = [this.deps._t('{ele} 속성 보스', { ele: elementLabel(boss.ele) })], defenses = defenseHighlights(boss);
        ctx.font = `12px ${this.text.font()}`;
        const one = [...head, ...defenses].join(', ');
        return !defenses.length || ctx.measureText(one).width <= width - 24 ? [one] : [head.join(', '), defenses.join(', ')];
    }

    draw(ctx, area, banner) {
        if (this.deps.bossMoves.observer.sceneActive()) return;
        this.deps.entrance.drawScreen(ctx, area);
        if (!banner) return;
        const { width } = area, lines = this.subLines(ctx, banner.boss, width);
        const cy = this.y(area, banner, 32 + (lines.length - 1) * 14);
        ctx.save();
        ctx.globalAlpha = bannerAlpha(banner.age);
        ctx.textAlign = 'center';
        ctx.font = `700 24px ${this.text.font()}`;
        const name = this.displayName(banner.boss);
        const half = Math.min(width * 0.42, ctx.measureText(name).width / 2 + 60), mid = Math.round(width / 2);
        bannerPlate(ctx, mid, cy, Math.round(half + 36));
        bannerRule(ctx, Math.round(mid - half), Math.round(mid + half), cy + 10);
        ctx.lineWidth = 4;
        ctx.lineJoin = 'miter';
        ctx.strokeStyle = 'rgba(12,4,4,.95)';
        this.deps.drawText(ctx, name, mid, cy, 'strokeText');
        ctx.fillStyle = banner.boss.redEntrance ? '#ff6a4e' : '#f0c46a';
        this.deps.drawText(ctx, name, mid, cy);
        ctx.font = `12px ${this.text.font()}`;
        lines.forEach((line, index) => this.text.tone(ctx, line, mid, cy + 25 + index * 14, '#d98a6a'));
        ctx.restore();
    }
}
