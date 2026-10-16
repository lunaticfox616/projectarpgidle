/** 시전 마법진 (2026-10-13 사용자가 준 스킬 이펙트 인계의 castSigil을 옮긴 것). 주문을 쓰는 예비 동작 동안 손 앞에 그 속성의
 * 룬과 켈트 매듭 고리가 선다: 화염 ᛝ 불타오름, 번개 ᛊ 파지직, 카오스 ᛒ 보라 방울, 냉기 ᛁ 각진 얼음 가시, 물리 ᚢ 나뭇결.
 * 고리는 위에서부터 한 바퀴 그려지며 나타나고, 끝날 때는 같은 방향으로 지워진다. 분광은 화염, 냉기, 번개를 돌아가며 보인다.
 * 그림 없이 도트로 직접 찍는다(도트 하나가 캐릭터 도트 하나). 표시만 한다.
 */
const stageSkillSigil = (() => {
    const TAU = Math.PI * 2;
    /** 속성마다 가운데에 서는 룬의 획(5×7 격자의 선분): 물리 우루즈, 화염 잉구즈, 냉기 이사, 번개 소윌로, 카오스 베르카노. 색은 표(elements)에 있다. */
    const RUNES = Object.freeze({
        phys: [[0, 6, 0, 0], [0, 0, 4, 2], [4, 2, 4, 6]],
        fire: [[2, 1, 0, 3], [0, 3, 2, 5], [2, 5, 4, 3], [4, 3, 2, 1]],
        cold: [[2, 0, 2, 6], [1, 0, 3, 0], [1, 6, 3, 6]],
        light: [[3, 0, 1, 3], [1, 3, 3, 3], [3, 3, 1, 6]],
        chaos: [[1, 0, 1, 6], [1, 0, 3, 2], [3, 2, 1, 3], [1, 3, 3, 4], [3, 4, 1, 6]]
    });
    const PRISM = Object.freeze(['fire', 'cold', 'light']);
    /** 고리: 가운데 반지름, 두 가닥이 물결치는 폭, 매듭의 수. 손 앞 자리(도트): 앞으로, 위로. */
    const RING = Object.freeze({ radius: 24, wave: 2.4, knots: 8 });
    const HAND = Object.freeze({ forward: 46, up: 56 });
    const live = [];                              // 떠 있는 마법진: { spot, face, element, start, ms }

    const mix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) + (parseInt(b.slice(i, i + 2), 16) - parseInt(a.slice(i, i + 2), 16)) * t).toString(16).padStart(2, '0')).join('');
    function palette(element) {
        const look = STAGE_SKILL_VFX.elements[element] || STAGE_SKILL_VFX.elements.phys;
        return { rim: mix(look.c3, '#000000', 0.5), dark: look.c3, mid: look.c2, lit: look.c1, white: mix(look.c1, '#ffffff', 0.6), rune: RUNES[element] || RUNES.phys };
    }
    /** 정수 격자의 선분(브레젠험). */
    function sigilLine(x0, y0, x1, y1, put) {
        let x = Math.round(x0), y = Math.round(y0);
        const tx = Math.round(x1), ty = Math.round(y1), dx = Math.abs(tx - x), dy = -Math.abs(ty - y), sx = x < tx ? 1 : -1, sy = y < ty ? 1 : -1;
        for (let error = dx + dy; ; ) {
            put(x, y);
            if (x === tx && y === ty) return;
            const twice = 2 * error;
            if (twice >= dy) { error += dy; x += sx; }
            if (twice <= dx) { error += dx; y += sy; }
        }
    }
    function sigilRandom(seed) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

    // ---------------------------------------------------------------- the knot ring
    /** 고리의 한 점이 어느 가닥의 어디인가 → 색. 두 가닥(밝은색, 중간색)이 매듭마다 위아래로 엮인다. */
    function strandColour(r, th, ink) {
        const wave = Math.sin(RING.knots * th), d = [Math.abs(r - (RING.radius + RING.wave * wave)), Math.abs(r - (RING.radius - RING.wave * wave))];
        const turn = th * RING.knots / Math.PI, knot = Math.round(turn), off = Math.abs(turn - knot), over = ((knot % 2) + 2) % 2;
        const strand = strandAt(d);
        if (strand < 0 || (off < 0.26 && strand !== over && d[over] < 2.3)) return null;   // 아래로 지나는 가닥은 매듭에서 끊겨 보인다
        const shades = strand === 0 ? [ink.white, ink.lit, ink.mid] : [ink.lit, ink.mid, ink.dark];
        return shades[off < 0.26 ? 0 : off < 0.42 ? 2 : 1];   // 매듭 위를 지나는 곳은 밝게, 매듭 바로 옆은 어둡게
    }
    /** 그 점이 놓인 가닥: 0 바깥으로 물결치는 가닥, 1 안쪽 가닥, -1 가닥이 아니다. 두 가닥이 겹치는 곳은 가까운 쪽이다. */
    function strandAt(d) {
        if (d[0] < 1.05 && (d[0] <= d[1] || d[1] >= 1.05)) return 0;
        return d[1] < 1.05 ? 1 : -1;
    }
    /** 물리 속성의 가닥에는 나뭇결이 진다(한 단 어둡게). */
    function grain(colour, r, th, ink) {
        if (Math.sin(th * 26 + r * 2.2 + Math.sin(th * 7) * 1.5) <= 0.55) return colour;
        return colour === ink.white ? ink.lit : colour === ink.lit ? ink.mid : ink.dark;
    }
    /** 고리의 한 점의 색: 안팎의 어두운 테, 그 사이의 두 가닥(물리 속성은 나뭇결). 가닥 사이의 빈 곳은 null. */
    function ringColour(r, th, ink, band) {
        if (Math.abs(r - band.outer) < 0.55 || Math.abs(r - band.inner) < 0.55) return ink.rim;
        const colour = strandColour(r, th, ink);
        return colour && band.grained ? grain(colour, r, th, ink) : colour;
    }
    function ringDots(put, element, ink, shown) {
        const outer = RING.radius + RING.wave + 2.6, inner = RING.radius - RING.wave - 2.6, reach = Math.ceil(outer) + 1;
        const band = { outer, inner, grained: element === 'phys' };
        for (let y = -reach; y <= reach; y++) for (let x = -reach; x <= reach; x++) {
            const r = Math.hypot(x + 0.5, y + 0.5), th = Math.atan2(y + 0.5, x + 0.5);
            if (r > outer + 0.6 || r < inner - 0.6 || !shown(th)) continue;
            const colour = ringColour(r, th, ink, band);
            if (colour) put(x, y, colour, 1);
        }
        return outer;
    }
    /** 가운데 룬: 5×7 격자의 획을 세 배로 키워 두 도트 굵기로 긋고 어두운 테를 두른다. 밝기가 맥동한다. */
    function runeDots(put, ink, age) {
        const colour = 0.5 + 0.5 * Math.sin(age / 160) > 0.5 ? ink.white : ink.lit, S = 3, ox = -6, oy = -9;
        for (const [x0, y0, x1, y1] of ink.rune) sigilLine(ox + x0 * S, oy + y0 * S, ox + x1 * S, oy + y1 * S, (x, y) => {
            for (const [dx, dy] of [[-1, 0], [2, 0], [0, -1], [0, 2]]) put(x + dx, y + dy, ink.rim, 3);
            for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) put(x + dx, y + dy, colour, 4);
        });
    }

    // ---------------------------------------------------------------- what each element adds
    /** 불꽃 혀 하나: 밑동은 희고 굵게, 위로 갈수록 가늘고 어둡게, 위쪽 절반은 옆으로 흔들린다. */
    function flameTongue(put, ink, tongue) {
        const shades = [ink.white, ink.lit, ink.mid, ink.dark];
        for (let j = 0; j < tongue.height; j++) {
            const part = j / tongue.height, x = tongue.x + (part > 0.45 ? tongue.sway : 0), y = tongue.y - j;
            put(x, y, shades[part < 0.3 ? 0 : part < 0.6 ? 1 : part < 0.85 ? 2 : 3], 2);
            if (part < 0.6) for (const side of [-1, 1]) put(x + side, y, part < 0.3 ? ink.lit : ink.mid, 2);
        }
    }
    /** 화염: 고리 위쪽에서 흔들리는 불꽃 혀 아홉과 튀어 오르는 불티. */
    function fireDots(put, ink, age, outer, random) {
        for (let i = 0; i < 9; i++) {
            const th = -Math.PI * (0.08 + 0.84 * i / 8), height = 7 + Math.round(4 * Math.sin(age / 90 + i * 1.7) + 3 * random());
            flameTongue(put, ink, { x: Math.round(Math.cos(th) * (outer - 1)), y: Math.round(Math.sin(th) * (outer - 1)), height, sway: Math.round(Math.sin(age / 70 + i) * 1.6) });
        }
        for (let i = 0; i < 6; i++) {
            const th = -Math.PI * random(), step = Math.floor(age / 60) + i, far = outer + 2 + (step % 5);
            put(Math.round(Math.cos(th) * far), Math.round(Math.sin(th) * far) - (step % 7), i % 2 ? ink.lit : ink.white, 2);
        }
    }
    /** 번개: 고리 둘레에 짧은 번개 가지 다섯이 60ms마다 자리를 바꾼다. */
    function lightDots(put, ink, age, outer, random) {
        for (let i = 0; i < 5; i++) {
            const th = random() * TAU, length = 4 + Math.floor(random() * 5), dx = Math.cos(th), dy = Math.sin(th);
            let x = dx * outer, y = dy * outer;
            for (let j = 0; j < length; j++) {
                const nx = x + dx * 1.4 + (random() - 0.5) * 2.4, ny = y + dy * 1.4 + (random() - 0.5) * 2.4, colour = j < 2 ? ink.white : ink.lit;
                sigilLine(x, y, nx, ny, (px, py) => put(px, py, colour, 2));
                x = nx; y = ny;
            }
        }
        if (Math.floor(age / 60) % 3 === 0) for (const [sx, sy] of [[outer + 3, 0], [-outer - 3, 0], [0, -outer - 3]]) put(Math.round(sx), Math.round(sy), ink.white, 2);
    }
    /** 카오스: 고리 아래쪽에서 보라 방울이 늘어졌다 떨어진다. */
    function chaosDots(put, ink, age, outer) {
        for (let i = 0; i < 4; i++) {
            const th = Math.PI * (0.25 + 0.5 * i / 3), bx = Math.round(Math.cos(th) * outer), by = Math.round(Math.sin(th) * outer);
            const phase = ((age / 900) + i * 0.27) % 1, drop = Math.round(phase * phase * 26);
            for (let j = 0; j < Math.min(drop, 6); j++) put(bx, by + j, j < 2 ? ink.mid : ink.dark, 2);
            put(bx, by + drop, ink.lit, 3);
            for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) put(bx + dx, by + drop + dy, ink.mid, 3);
        }
    }
    /** 냉기: 고리 바깥에 각진 얼음 가시 여덟과 돌아가는 반짝임. */
    function coldDots(put, ink, age, outer) {
        for (let i = 0; i < 8; i++) {
            const th = i / 8 * TAU + Math.PI / 8, length = 5 + (i % 2) * 2, c = Math.cos(th), s = Math.sin(th);
            const bx = c * (outer + 0.5), by = s * (outer + 0.5), tx = c * (outer + length), ty = s * (outer + length), nx = -s * 1.6, ny = c * 1.6;
            sigilLine(bx + nx, by + ny, tx, ty, (x, y) => put(x, y, ink.lit, 2));
            sigilLine(bx - nx, by - ny, tx, ty, (x, y) => put(x, y, ink.mid, 2));
            sigilLine(bx + nx, by + ny, bx - nx, by - ny, (x, y) => put(x, y, ink.dark, 2));
            if (Math.floor(age / 140) % 8 === i) put(Math.round(tx), Math.round(ty), ink.white, 3);
        }
    }
    const EXTRAS = Object.freeze({ fire: fireDots, light: lightDots, chaos: chaosDots, cold: coldDots });

    // ---------------------------------------------------------------- drawing
    /** 마법진 하나의 도트들: 자리 → { 색, 앞뒤 }. 같은 자리에는 앞에 놓이는 것이 남는다. */
    function sigilDots(element, age, total) {
        const ink = palette(element), dots = new Map();
        const put = (x, y, colour, order) => { const key = x * 512 + y, old = dots.get(key); if (!old || old.order < order) dots.set(key, { x, y, colour, order }); };
        const drawn = Math.min(1, age / 220), wiped = total - age < 160 ? 1 - (total - age) / 160 : 0;
        const shown = th => { const turn = (((th + Math.PI / 2) % TAU) + TAU) % TAU / TAU; return turn <= drawn && turn >= wiped; };
        const outer = ringDots(put, element, ink, shown);
        runeDots(put, ink, age);
        if (EXTRAS[element]) EXTRAS[element](put, ink, age, outer, sigilRandom(1234 + Math.floor(age / 60)));
        return dots;
    }
    function drawSigil(ctx, row, p, dot, age) {
        const element = row.element === 'prism' ? PRISM[Math.floor(age / 220) % 3] : row.element, base = p.cellToScreen(row.spot.gx, row.spot.gy);
        const x0 = Math.round(base.x + row.face * HAND.forward * dot), y0 = Math.round(base.y + (p.actorGroundOffsetY || 0) - HAND.up * dot), size = Math.max(1, Math.ceil(dot));
        for (const one of sigilDots(element, age, row.ms).values()) {
            ctx.fillStyle = one.colour;
            ctx.fillRect(x0 + Math.round(one.x * dot), y0 + Math.round(one.y * dot), size, size);
        }
    }
    /** 마법진을 세운다. @param {{spot:{gx:number,gy:number}, face:number, element:string, ms:number}} cast */
    function castSigil(cast) {
        if (live.length < 4) live.push({ ...cast, start: stageSkillVfx.now() });
    }
    /** 떠 있는 마법진을 그린다(전장의 위쪽 층). 끝난 것은 걷는다. */
    function drawSigils(ctx, p) {
        const now = stageSkillVfx.now(), dot = stageActors.scaleFor(p.tileW);
        for (let i = live.length - 1; i >= 0; i--) {
            const age = now - live[i].start;
            if (age >= live[i].ms || age < -50) live.splice(i, 1);
            else if (age >= 0) drawSigil(ctx, live[i], p, dot, age);
        }
    }
    /** 시전 오라의 지금 색: 떠 있는 마법진의 속성 색 둘이 120ms마다 번갈아 돈다(분광은 속성이 돌아간다). 마법진이 없으면 null. */
    function sigilAura() {
        const row = live[live.length - 1], age = row ? stageSkillVfx.now() - row.start : -1;
        if (!row || age < 0 || age >= row.ms) return null;
        const element = row.element === 'prism' ? PRISM[Math.floor(age / 200) % 3] : row.element, look = STAGE_SKILL_VFX.elements[element] || STAGE_SKILL_VFX.elements.phys;
        return Math.floor(age / 120) % 2 ? look.c1 : look.c2;
    }
    return Object.freeze({ cast: castSigil, draw: drawSigils, aura: sigilAura });
})();
safeExposeGlobals({ stageSkillSigil });
