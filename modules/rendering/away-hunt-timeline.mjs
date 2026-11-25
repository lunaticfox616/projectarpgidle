import { AWAY_HUNT } from '../data/away-hunt.mjs';

/** 방치 정산 창의 사냥 장면이 그 순간 보이는 모습(modules/ui/away-hunt-scene.mjs). 계산만 하고 상태를 바꾸지 않는다.
 * 동작(clip)은 { frames, ms(숫자 하나 또는 장마다), hit(타격 장들), loop } 모양이다: 주인공은 data/stage-characters.js의 칸 그대로,
 * 몬스터는 장면이 data/monster-stage-roster.js의 걷기와 공격을 같은 모양으로 옮긴 것. 그림은 늘이거나 기울이지 않고 장만 고른다. */
export class AwayHuntTimeline {
    msOf(clip, index) { return (Array.isArray(clip.ms) ? clip.ms[index] : clip.ms) || 100; }

    /** index 장 앞까지의 시간(index가 frames면 동작 전체의 길이). */
    leadOf(clip, index) {
        let total = 0;
        for (let i = 0; i < Math.min(index, clip.frames); i++) total += this.msOf(clip, i);
        return total;
    }

    lengthOf(clip) { return this.leadOf(clip, clip.frames); }

    /** t에 보이는 장. 되풀이하는 동작은 돌고, 아니면 끝 장에 멈춘다. */
    frameAt(clip, t, loop) {
        const length = Math.max(1, this.lengthOf(clip));
        let left = loop ? ((t % length) + length) % length : Math.max(0, t);
        for (let i = 0; i < clip.frames; i++) {
            left -= this.msOf(clip, i);
            if (left < 0) return i;
        }
        return clip.frames - 1;
    }

    hitsOf(clip) { return Array.isArray(clip.hit) && clip.hit.length ? clip.hit : [clip.frames - 1]; }

    /** 한 번의 맞붙음: 몬스터의 공격(그림이 있으면)이 닿고, 주인공이 받아치고, 타격마다 이펙트와 숫자, 마지막 타격 뒤 몬스터가 사라지고
     * 주인공이 다시 걷는 때들. at은 몬스터가 맞붙는 자리에 닿은 때. */
    planFight(hero, monster, at) {
        const attack = monster.attack, impact = attack ? at + this.leadOf(attack, this.hitsOf(attack)[0]) : null;
        const swing = impact === null ? at + AWAY_HUNT.leadMs : impact + AWAY_HUNT.counterMs;
        const hits = this.hitsOf(hero.strike).map(index => swing + this.leadOf(hero.strike, index));
        const last = hits[hits.length - 1], heroEnd = swing + this.lengthOf(hero.strike);
        return { at, impact, swing, hits, deathAt: last, heroEnd, resumeAt: Math.max(heroEnd, last + AWAY_HUNT.fadeMs) + AWAY_HUNT.restMs };
    }

    /** 주인공의 동작과 장: 외침(결과가 뜬 때), 걷기, 휘두르기, 그 사이는 서 있기. */
    heroPose(hero, run, now) {
        if (run.phase === 'cheer') {
            const t = now - run.cheerAt;
            return t < this.lengthOf(hero.cheer) ? { clip: hero.cheer, frame: this.frameAt(hero.cheer, t, false) } : this.standing(hero, now);
        }
        if (run.phase === 'walk') return { clip: hero.walk, frame: this.frameAt(hero.walk, now, true) };
        const plan = run.encounter.plan;
        if (now >= plan.swing && now < plan.heroEnd) return { clip: hero.strike, frame: this.frameAt(hero.strike, now - plan.swing, false) };
        return this.standing(hero, now);
    }

    standing(hero, now) { return { clip: hero.idle, frame: this.frameAt(hero.idle, now, true) }; }

    /** 몬스터의 공격이 닿은 뒤의 피격 모습(data/stage-characters.js hit: 붉은 테와 뒤로 밀린 도트), 아니면 null. */
    hurtOf(rules, plan, now) {
        if (!plan || plan.impact === null || now < plan.impact) return null;
        let age = now - plan.impact;
        for (const step of rules.steps) {
            if (age < step.ms) return step;
            age -= step.ms;
        }
        return null;
    }

    /** 몬스터의 그림과 장, 투명도, 번쩍임. 다가오는 동안은 걷기, 맞붙으면 공격을 한 번(쓰러진 순간의 장에 멈춘다), 그 뒤로는
     * 공격 첫 장(무대의 서 있는 모습과 같다). 공격 그림이 없으면 걷기 첫 장으로 선다. */
    monsterPose(encounter, now) {
        const plan = encounter.plan, cast = encounter.cast;
        if (!plan) return { clip: 'walk', index: this.frameAt(cast.walk, now + encounter.seed, true), alpha: 1, flash: false };
        const t = Math.min(now, plan.deathAt) - plan.at, attack = cast.attack;
        const index = attack && t < this.lengthOf(attack) ? this.frameAt(attack, t, false) : 0;
        const fade = now <= plan.deathAt ? 1 : 1 - (now - plan.deathAt) / AWAY_HUNT.fadeMs;
        return { clip: attack ? 'attack' : 'walk', index, alpha: Math.max(0, Math.min(1, fade)), flash: plan.hits.some(hit => now >= hit && now - hit < AWAY_HUNT.flashMs) };
    }

    /** 타격마다 몸 위에 터지는 이펙트의 장(effect.frames의 몇째인지). */
    effectsOf(plan, count, now) {
        const out = [];
        if (!plan) return out;
        for (const hit of plan.hits) {
            const index = Math.floor((now - hit) / AWAY_HUNT.effectMs);
            if (now >= hit && index < count) out.push(index);
        }
        return out;
    }

    /** 타격마다 머리 위로 떠오르는 피해 숫자: 몇째 타격인지, 오른 도트, 가로로 비킨 도트(이어지는 타격은 왼쪽, 오른쪽, 가운데를
     * 번갈아 조금 높게 떠 앞 숫자와 겹치지 않는다: AWAY_HUNT.floatSpots), 투명도(끝의 40% 동안 사라진다). */
    floatsOf(plan, now) {
        const out = [];
        if (!plan) return out;
        plan.hits.forEach((hit, order) => {
            const age = now - hit, fadeFrom = AWAY_HUNT.floatMs * 0.6, spot = AWAY_HUNT.floatSpots[order % AWAY_HUNT.floatSpots.length];
            if (age < 0 || age >= AWAY_HUNT.floatMs) return;
            out.push({ order, lift: spot[1] + Math.round(age / AWAY_HUNT.floatMs * AWAY_HUNT.floatLift), shift: spot[0],
                alpha: age > fadeFrom ? 1 - (age - fadeFrom) / (AWAY_HUNT.floatMs - fadeFrom) : 1 });
        });
        return out;
    }

    /** 주인공 발의 가로 자리. */
    heroX(width) { return Math.max(AWAY_HUNT.heroMinX, Math.round(width * AWAY_HUNT.heroAt)); }

    /** 몬스터가 멈춰 맞붙는 발 자리: 주인공 앞으로 무기 거리만큼, 몬스터의 등이 캔버스를 넘지 않게. 몬스터는 왼쪽을 보므로 앞끝은
     * 그림의 오른쪽 품(reach[1])이다. */
    contactX(hero, actor, width) {
        const front = this.heroX(width) + (hero.ranged ? AWAY_HUNT.reachGap.ranged : AWAY_HUNT.reachGap.melee) + actor.reach[1];
        const back = width - AWAY_HUNT.edgeFade / 2 - actor.reach[0];
        return Math.round(Math.max(this.heroX(width) + actor.reach[1] + 12, Math.min(front, back)));
    }

    /** 몬스터가 들어오는 발 자리: 앞끝이 캔버스 오른쪽 끝에 막 걸친 곳. */
    spawnX(actor, width) { return width + actor.reach[1] - AWAY_HUNT.edgeFade / 2; }
}
