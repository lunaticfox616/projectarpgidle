const ghostDuelReplayRuntime = { frameId: 0, token: 0, assets: new Map(), state: null };
const GHOST_DUEL_FRAME_COUNTS = Object.freeze({ idle: 1, attack: 7 });
const GHOST_DUEL_ELEMENT_COLORS = Object.freeze({ phys: '#e8d4b0', fire: '#ff7048', cold: '#80d9ff', light: '#d9f36a', chaos: '#c770ff' });

function getGhostReplayFighter(duel, side) {
    let fighter = duel && duel[side] && typeof duel[side] === 'object' ? duel[side] : {};
    let snapshot = fighter.snapshot && typeof fighter.snapshot === 'object' ? fighter.snapshot : {};
    return { ...fighter, snapshot };
}

function renderGhostDuelReplay(duel) {
    if (!duel || !Array.isArray(duel.events)) return '';
    let left = getGhostReplayFighter(duel, 'left');
    let right = getGhostReplayFighter(duel, 'right');
    return `<section class="ghost-duel-replay" data-duel-seed="${escapeHTML(String(duel.seed || ''))}">
        <div class="ghost-duel-hud left"><strong>${escapeHTML(String(left.nickname || '도전자'))}</strong><span>${escapeHTML(String(left.snapshot.activeSkill || '기본 공격'))}</span><div><i data-ghost-hp="left"></i></div><em data-ghost-hp-label="left">100%</em></div>
        <div class="ghost-duel-hud right"><strong>${escapeHTML(String(right.nickname || '수비자'))}</strong><span>${escapeHTML(String(right.snapshot.activeSkill || '기본 공격'))}</span><div><i data-ghost-hp="right"></i></div><em data-ghost-hp-label="right">100%</em></div>
        <canvas class="ghost-duel-canvas" width="720" height="320" aria-label="고스트 실전투 재생"></canvas>
        <div class="ghost-duel-status" aria-live="polite">실전투 준비</div>
        <div class="ghost-duel-controls"><button type="button" data-ghost-action="toggle">일시정지</button><button type="button" data-ghost-action="speed">1×</button><button type="button" data-ghost-action="restart">다시 보기</button><button type="button" data-ghost-action="skip">결과 보기</button></div>
    </section>`;
}

function stopGhostDuelReplay() {
    ghostDuelReplayRuntime.token++;
    if (ghostDuelReplayRuntime.frameId) cancelAnimationFrame(ghostDuelReplayRuntime.frameId);
    ghostDuelReplayRuntime.frameId = 0;
    ghostDuelReplayRuntime.state = null;
}

function loadGhostDuelImage(path) {
    if (ghostDuelReplayRuntime.assets.has(path)) return ghostDuelReplayRuntime.assets.get(path);
    let promise = new Promise(resolve => {
        let image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = path;
    });
    ghostDuelReplayRuntime.assets.set(path, promise);
    return promise;
}

function loadGhostDuelFighterAssets(fighter) {
    let heroId = /^hero(?:10|[1-9])$/.test(String(fighter.snapshot.heroId || '')) ? fighter.snapshot.heroId : 'hero1';
    return Promise.all(['idle', 'attack'].map(action => loadGhostDuelImage(`assets/playable/${heroId}/${action}.png`)))
        .then(([idle, attack]) => ({ idle, attack }));
}

function updateGhostDuelHealth(root, side, value) {
    let pct = clampNumber(Number(value) || 0, 0, 100);
    let bar = root.querySelector(`[data-ghost-hp="${side}"]`);
    let label = root.querySelector(`[data-ghost-hp-label="${side}"]`);
    if (bar) bar.style.width = `${pct}%`;
    if (label) label.textContent = `${pct.toFixed(1)}%`;
}

function getGhostDuelActionCue(side, action, elapsed, fighter) {
    let outcome = action && action.outcome || 'hit';
    let damage = Math.max(0, Math.floor(Number(action && action.damage) || 0));
    let labels = { evade: '회피!', block: '막아냄!', deflect: '비껴냄!' };
    return {
        side, start: elapsed, outcome, damage,
        text: labels[outcome] || (action && action.crit ? `치명타 ${damage.toLocaleString('ko-KR')}` : damage.toLocaleString('ko-KR')),
        element: fighter.snapshot.skillElement || 'phys', style: fighter.snapshot.style || 'melee'
    };
}

function applyGhostDuelEvent(state, event) {
    state.leftPct = clampNumber(Number(event.leftPct), 0, 100);
    state.rightPct = clampNumber(Number(event.rightPct), 0, 100);
    if (event.left) state.cues.push(getGhostDuelActionCue('left', event.left, state.elapsed, state.left));
    if (event.right) state.cues.push(getGhostDuelActionCue('right', event.right, state.elapsed, state.right));
    state.cues = state.cues.slice(-20);
    updateGhostDuelHealth(state.root, 'left', state.leftPct);
    updateGhostDuelHealth(state.root, 'right', state.rightPct);
}

function drawGhostDuelBackdrop(ctx, width, height) {
    let gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#12162a'); gradient.addColorStop(0.55, '#1d2235'); gradient.addColorStop(1, '#090d16');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(91,69,135,.18)'; ctx.beginPath(); ctx.ellipse(width / 2, height - 42, width * 0.43, 54, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(180,154,230,.15)'; ctx.lineWidth = 1;
    for (let ring = 0; ring < 3; ring++) { ctx.beginPath(); ctx.ellipse(width / 2, height - 42, 90 + ring * 90, 18 + ring * 17, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = 'rgba(205,185,255,.18)'; ctx.fillRect(width / 2 - 1, 62, 2, height - 92);
}

function drawGhostDuelSprite(ctx, image, action, frameProgress, x, y, flip) {
    if (!image) return;
    let count = GHOST_DUEL_FRAME_COUNTS[action] || 1;
    let index = action === 'attack' ? Math.min(count - 1, Math.floor(clampNumber(frameProgress, 0, 0.999) * count)) : 0;
    let sx = Math.round(index * image.width / count);
    let nextX = index === count - 1 ? image.width : Math.round((index + 1) * image.width / count);
    let sw = Math.max(1, nextX - sx); let drawHeight = 235; let scale = drawHeight / Math.max(1, image.height); let dw = sw * scale;
    ctx.save(); ctx.translate(x, 0); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(image, sx, 0, sw, image.height, -dw / 2, y - drawHeight, dw, drawHeight); ctx.restore();
}

function drawGhostDuelDelivery(ctx, cue, progress, fromX, toX, y, color) {
    let x = fromX + (toX - fromX) * progress;
    ctx.save(); ctx.globalAlpha = 0.9; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12;
    if (cue.style === 'channel') {
        ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(fromX, y); ctx.lineTo(x, y); ctx.stroke();
    } else if (cue.style === 'dot') {
        ctx.globalAlpha = 0.45 + progress * 0.35; ctx.beginPath(); ctx.ellipse(toX, y + 34, 13 + progress * 26, 5 + progress * 8, 0, 0, Math.PI * 2); ctx.fill();
    } else if (cue.style === 'summon') {
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(x - i * 12, y + i * 8, 4 + progress * 2, 0, Math.PI * 2); ctx.fill(); }
    } else if (cue.style === 'spell') {
        ctx.beginPath(); ctx.moveTo(x + 13, y); ctx.lineTo(x - 9, y - 10); ctx.lineTo(x - 4, y); ctx.lineTo(x - 9, y + 10); ctx.closePath(); ctx.fill();
    } else {
        ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - (toX > fromX ? 24 : -24), y); ctx.lineTo(x, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (toX > fromX ? 11 : -11), y - 6); ctx.lineTo(x - (toX > fromX ? 8 : -8), y + 6); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
}

function drawGhostDuelCue(ctx, cue, elapsed, width, height) {
    let age = elapsed - cue.start; if (age < 0 || age > 620) return;
    let fromX = cue.side === 'left' ? 170 : width - 170; let toX = cue.side === 'left' ? width - 170 : 170;
    let progress = clampNumber(age / 260, 0, 1); let color = GHOST_DUEL_ELEMENT_COLORS[cue.element] || GHOST_DUEL_ELEMENT_COLORS.phys;
    if (cue.style !== 'melee' && progress < 1) {
        drawGhostDuelDelivery(ctx, cue, progress, fromX, toX, height - 112, color);
    }
    if (age < 180 || progress < 1) return;
    let fade = 1 - clampNumber((age - 180) / 440, 0, 1); ctx.save(); ctx.globalAlpha = fade;
    ctx.font = '900 17px "Malgun Gothic",sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#070911';
    let targetX = cue.side === 'left' ? width - 170 : 170; let targetY = height - 170 - (age - 180) * 0.035;
    ctx.strokeText(cue.text, targetX, targetY); ctx.fillStyle = cue.outcome === 'hit' ? color : '#c9d5e8'; ctx.fillText(cue.text, targetX, targetY); ctx.restore();
}

function drawGhostDuelFrame(state) {
    let ctx = state.context; let width = state.width; let height = state.height;
    ctx.clearRect(0, 0, width, height); drawGhostDuelBackdrop(ctx, width, height);
    let recentLeft = [...state.cues].reverse().find(cue => cue.side === 'left' && state.elapsed - cue.start < 360);
    let recentRight = [...state.cues].reverse().find(cue => cue.side === 'right' && state.elapsed - cue.start < 360);
    let leftProgress = recentLeft ? clampNumber((state.elapsed - recentLeft.start) / 360, 0, 1) : 0;
    let rightProgress = recentRight ? clampNumber((state.elapsed - recentRight.start) / 360, 0, 1) : 0;
    let leftLunge = recentLeft ? Math.sin(leftProgress * Math.PI) * 28 : 0;
    let rightLunge = recentRight ? Math.sin(rightProgress * Math.PI) * 28 : 0;
    drawGhostDuelSprite(ctx, recentLeft ? state.leftAssets.attack : state.leftAssets.idle, recentLeft ? 'attack' : 'idle', leftProgress, 170 + leftLunge, height - 30, false);
    drawGhostDuelSprite(ctx, recentRight ? state.rightAssets.attack : state.rightAssets.idle, recentRight ? 'attack' : 'idle', rightProgress, width - 170 - rightLunge, height - 30, true);
    state.cues.forEach(cue => drawGhostDuelCue(ctx, cue, state.elapsed, width, height));
    state.cues = state.cues.filter(cue => state.elapsed - cue.start <= 650);
}

function finishGhostDuelReplay(state) {
    if (state.finished) return;
    state.finished = true; state.playing = false;
    let result = state.root.parentElement && state.root.parentElement.querySelector('[data-ghost-duel-result]');
    if (result) result.classList.remove('ghost-duel-result-pending');
    let labels = { left: '도전자 승리', right: '수비자 승리', draw: '무승부' };
    let status = state.root.querySelector('.ghost-duel-status');
    if (status) status.textContent = labels[state.duel.winner] || '전투 종료';
    let toggle = state.root.querySelector('[data-ghost-action="toggle"]');
    if (toggle) toggle.textContent = '재생 완료';
}

function resetGhostDuelReplay(state) {
    state.elapsed = 0; state.index = 0; state.leftPct = 100; state.rightPct = 100; state.cues = [];
    state.finished = false; state.playing = true; state.lastNow = performance.now();
    updateGhostDuelHealth(state.root, 'left', 100); updateGhostDuelHealth(state.root, 'right', 100);
    let result = state.root.parentElement && state.root.parentElement.querySelector('[data-ghost-duel-result]');
    if (result) result.classList.add('ghost-duel-result-pending');
    let status = state.root.querySelector('.ghost-duel-status'); if (status) status.textContent = '실전투 진행 중';
    let toggle = state.root.querySelector('[data-ghost-action="toggle"]'); if (toggle) toggle.textContent = '일시정지';
}

function scheduleGhostDuelReplay(state) {
    if (!state || state.finished || !state.playing || ghostDuelReplayRuntime.frameId) return;
    state.lastNow = performance.now();
    let token = ghostDuelReplayRuntime.token;
    ghostDuelReplayRuntime.frameId = requestAnimationFrame(now => runGhostDuelReplayFrame(token, now));
}

function bindGhostDuelControls(state) {
    state.root.querySelectorAll('[data-ghost-action]').forEach(button => button.addEventListener('click', () => {
        let action = button.dataset.ghostAction;
        if (action === 'toggle' && !state.finished) { state.playing = !state.playing; button.textContent = state.playing ? '일시정지' : '계속'; scheduleGhostDuelReplay(state); }
        if (action === 'speed') { state.speed = state.speed === 1 ? 2 : (state.speed === 2 ? 4 : 1); button.textContent = `${state.speed}×`; }
        if (action === 'restart') { resetGhostDuelReplay(state); scheduleGhostDuelReplay(state); }
        if (action === 'skip') { state.index = state.duel.events.length; state.elapsed = state.duration + 800; state.leftPct = Number(state.duel.leftFinalPct) || 0; state.rightPct = Number(state.duel.rightFinalPct) || 0; updateGhostDuelHealth(state.root,'left',state.leftPct); updateGhostDuelHealth(state.root,'right',state.rightPct); finishGhostDuelReplay(state); }
    }));
}

function runGhostDuelReplayFrame(token, now) {
    ghostDuelReplayRuntime.frameId = 0;
    let state = ghostDuelReplayRuntime.state;
    if (!state || token !== ghostDuelReplayRuntime.token || !document.contains(state.root)) return;
    let delta = Math.min(50, Math.max(0, now - state.lastNow)); state.lastNow = now;
    if (state.playing && !document.hidden) state.elapsed += delta * state.speed;
    while (state.index < state.duel.events.length && Number(state.duel.events[state.index].t) <= state.elapsed) applyGhostDuelEvent(state, state.duel.events[state.index++]);
    drawGhostDuelFrame(state);
    if (!state.finished && state.elapsed >= state.duration + 650) finishGhostDuelReplay(state);
    scheduleGhostDuelReplay(state);
}

async function mountGhostDuelReplay(duel) {
    let root = document.querySelector('.ghost-duel-replay');
    if (!root || !duel || !Array.isArray(duel.events)) return false;
    stopGhostDuelReplay(); let token = ghostDuelReplayRuntime.token;
    let canvas = root.querySelector('canvas'); let context = canvas && canvas.getContext('2d'); if (!context) return false;
    let left = getGhostReplayFighter(duel, 'left'); let right = getGhostReplayFighter(duel, 'right');
    let [leftAssets, rightAssets] = await Promise.all([loadGhostDuelFighterAssets(left), loadGhostDuelFighterAssets(right)]);
    if (token !== ghostDuelReplayRuntime.token || !document.contains(root)) return false;
    let state = { root, duel, left, right, leftAssets, rightAssets, context, width: canvas.width, height: canvas.height,
        duration: Math.max(0, Number(duel.durationMs) || 0), elapsed: 0, index: 0, leftPct: 100, rightPct: 100,
        cues: [], speed: 1, playing: true, finished: false, lastNow: performance.now() };
    ghostDuelReplayRuntime.state = state; bindGhostDuelControls(state); resetGhostDuelReplay(state);
    scheduleGhostDuelReplay(state);
    return true;
}

safeExposeGlobals({ renderGhostDuelReplay, mountGhostDuelReplay, stopGhostDuelReplay });
