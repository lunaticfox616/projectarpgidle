// 장비 소켓 화면(2026-09-30, 주얼 창을 대신함): 장비 상세의 [소켓] 대화 상자에서 주얼을 끼우고 빼며, 같은 대화 상자 아래에
// 가방의 주얼(끼우기, 해체)과 주얼 뽑기가 있다(2026-10-10부터 주얼은 가방에 들어간다, js/bag-items.js). 장비 칸의 소켓 표시와
// 장비 툴팁의 소켓 줄도 여기서 만든다. 규칙은 equipment-sockets.js.
const equipmentSocketsUi = (() => {
    const OVERLAY_ID = 'equipment-socket-overlay';
    const REFINE_COST = 12;

    function jewelLines(jewel) {
        return getJewelStats(jewel).map(stat => `${isJewelPetiteStat(stat) ? '쁘띠 ' : ''}${getStatName(stat.id)} +${formatJewelStatValue(stat.id, stat.val)}`);
    }

    function jewelHtml(jewel) {
        const lines = jewelLines(jewel).map(line => `<li>${escapeHTML(line)}</li>`).join('');
        const text = getJewelUniqueEffectText(jewel), effect = text ? `<p class="socket-jewel-effect">${escapeHTML(text)}</p>` : '';
        return `<strong class="${getJewelRarityClass(jewel.rarity)}">${escapeHTML(jewel.name || '주얼')}</strong>${effect}<ul class="socket-jewel-lines">${lines || '<li>옵션 없음</li>'}</ul>`;
    }

    const socketLabel = equipmentSockets.label;

    /** Equipment detail button: once jewels are unlocked, for items with a socket, or without one while a chisel is at hand. */
    function actionHtml(item, slot) {
        if (!item || !contentProgression.isUnlocked('jewel')) return '';
        const sockets = equipmentSockets.list(item);
        const canOpen = (game.currencies.voidChisel || 0) > 0 && equipmentSockets.canChisel(item);
        if (!sockets.length && !canOpen) return '';
        const label = sockets.length ? `소켓 ${sockets.filter(contentOf).length}/${sockets.length}` : '소켓 뚫기';
        const ref = slot ? `'${slot}',true` : `${item.id},false`;
        return `<button type="button" data-content-action="sockets" onclick="equipmentInventoryInteraction.focus(null);equipmentSocketsUi.open(${ref})"><span class="px-center">${label}</span></button>`;
    }

    // 장비 그림 위의 소켓(2026-11-03 사용자: 소켓이 실제로 생겨서 거기 끼웠다 뺐다): 장착 칸과 가방 칸의 그림 오른쪽 아래에 소켓이 하나씩
    // 뚫려 있다. 주얼을 끌어 놓으면 그 소켓에 끼우고(js/equipment-inventory-grid-ui.js dropOnSocket), 찬 소켓을 누르면 가방으로 뺀다.
    // 빈 소켓을 누르면 소켓 대화 상자가 열린다. 무엇이 끼워졌는지는 장비 툴팁의 소켓 줄이 알린다(칸 안이라 따로 툴팁을 달지 않는다).
    // host: 'slot:반지1'(장착 칸) 또는 'item:123'(가방의 장비 id).
    function hostItem(host) {
        const [kind, key] = String(host).split(':');
        return kind === 'slot' ? (game.equipment || {})[key] || null : game.inventory.find(item => String(item.id) === key) || null;
    }
    /** What sits in a socket: { name, art } of its jewel or grown item, or null when empty. */
    function contentOf(row) {
        if (row.jewel) return { name: row.jewel.name || '주얼', art: bagItems.jewelArt(row.jewel) };
        return row.harvest ? { name: stumpBox.shortName(row.harvest), art: stumpBox.iconPath(row.harvest) } : null;
    }
    // 수확물을 받는 소켓은 테두리 색이 그 종류다(꽃, 열매, 덩굴, 뿌리). 공허 소켓은 보라 테두리에 그 종류의 안쪽 빛을 더한다.
    const socketClass = row => [`is-${row.kind}`, ...row.accepts.map(kind => `takes-${kind}`), contentOf(row) ? 'is-filled' : '', row.fused ? 'is-fused' : ''].filter(Boolean).join(' ');
    function socketBadgeHtml(row, host) {
        const content = contentOf(row), art = content ? `<img src="${content.art}" alt="" aria-hidden="true" draggable="false">` : '';
        const name = content ? `${socketLabel(row)}: ${content.name}` : `빈 ${socketLabel(row)}`;
        return `<span class="item-socket ${socketClass(row)}" role="button" aria-label="${escapeHTML(name)}"
            data-socket-kind="${row.kind}" data-socket-index="${row.index}" onpointerdown="event.stopPropagation()" ondblclick="event.stopPropagation()"
            onclick="equipmentSocketsUi.socketClick(event,'${host}','${row.kind}',${row.index})">${art}</span>`;
    }
    /** The item's sockets drawn on its picture (worn slot or bag cell); '' before jewels open or without a socket. */
    function badgesHtml(item, host) {
        if (!item || !contentProgression.isUnlocked('jewel')) return '';
        const sockets = equipmentSockets.list(item);
        return sockets.length ? `<span class="item-sockets" data-socket-host="${host}">${sockets.map(row => socketBadgeHtml(row, host)).join('')}</span>` : '';
    }
    function socketChanged(message) {
        addLog(message, 'loot-magic');
        hideItemTooltip();
        updateStaticUI();
    }
    /** The log line for what came out of a socket: a jewel goes to the bag, a grown item back to the stump box. */
    function removedMessage(item, result) {
        if (result.jewel) return `💠 [${item.name}]에서 [${result.jewel.name}]${pickParticle(result.jewel.name, '을', '를')} 뺐습니다.`;
        const name = stumpBox.shortName(result.harvest);
        return `🌱 [${item.name}]에서 [${name}]${pickParticle(name, '을', '를')} 빼 그루터기 함 보관함에 넣었습니다.`;
    }
    /** A socket on a picture was pressed: a filled one gives its jewel or grown item back, an empty one opens the socket dialog. */
    function socketClick(event, host, kind, index) {
        event.stopPropagation();
        const item = hostItem(host), row = item && equipmentSockets.list(item).find(entry => entry.kind === kind && entry.index === index);
        if (!row) return;
        if (!contentOf(row)) {
            const [where, key] = host.split(':');
            return where === 'slot' ? open(key, true) : open(Number(key), false);
        }
        const result = equipmentSockets.remove(item, kind, index);
        if (!result.ok) return addLog(result.reason, 'attack-monster', { toast: true });
        playUiFeedbackSound('gemSocket');
        socketChanged(removedMessage(item, result));
    }
    /** A bag jewel let go over an item's picture: into the socket under the pointer (at) or its first empty one. true when handled. */
    function dropJewel(jewel, host, at) {
        const item = hostItem(host);
        if (!item || !bagItems.isJewel(jewel)) return false;
        const result = equipmentSockets.insert(item, jewel.id, game, at);
        if (!result.ok) {
            addLog(result.reason, 'attack-monster', { toast: true });
            return true;
        }
        playUiFeedbackSound('gemSocket');
        socketChanged(`💠 [${item.name}]에 [${result.jewel.name}] 장착`);
        return true;
    }

    const harvestLines = grown => stumpBox.socketLines(grown).map(line => stumpBox.lineText(line.stat, line.value));
    /** A grown item's card: its name and the lines it gives in a socket. */
    function harvestHtml(grown) {
        const lines = harvestLines(grown).map(line => `<li>${escapeHTML(line)}</li>`).join('');
        return `<strong class="socket-harvest-name">${escapeHTML(stumpBox.shortName(grown))}</strong><ul class="socket-jewel-lines">${lines}</ul>`;
    }
    /** "주얼, 뿌리": what an empty socket takes, for its tooltip line. */
    const takesText = row => [row.kind === 'harvest' ? '' : '주얼', ...row.accepts.map(kind => STUMP_BOX_STAGES[kind].label)].filter(Boolean).join(', ');

    /** Item tooltip section: what sits in each socket. */
    function tooltipHtml(item) {
        const sockets = contentProgression.isUnlocked('jewel') ? equipmentSockets.list(item) : [];
        return sockets.map(row => {
            if (row.jewel) return `<div class="tooltip-line tooltip-socket-line">◆ ${socketLabel(row)}: <span class="${getJewelRarityClass(row.jewel.rarity)}">${escapeHTML(row.jewel.name || '주얼')}</span>, ${escapeHTML(jewelLines(row.jewel).join(', '))}</div>`;
            if (row.harvest) return `<div class="tooltip-line tooltip-socket-line is-harvest">◆ ${socketLabel(row)}: ${escapeHTML(stumpBox.shortName(row.harvest))}, ${escapeHTML(harvestLines(row.harvest).join(', '))}</div>`;
            return `<div class="tooltip-line tooltip-socket-line is-empty">◇ 빈 ${socketLabel(row)}${row.accepts.length ? ` (${takesText(row)})` : ''}</div>`;
        }).join('');
    }

    function socketRowHtml(row) {
        const filled = contentOf(row), body = row.jewel ? jewelHtml(row.jewel) : row.harvest ? harvestHtml(row.harvest) : `<span>빈 소켓${row.accepts.length ? ` (${takesText(row)})` : ''}</span>`;
        return `<div class="socket-row${filled ? '' : ' is-empty'}${row.kind === 'corrupt' ? ' is-corrupt' : ''}${row.accepts.length ? ' takes-harvest' : ''}"><span class="socket-row-label">${socketLabel(row)}</span>
            <div class="socket-row-jewel">${body}</div>
            ${filled && !row.fused ? `<button type="button" onclick="equipmentSocketsUi.remove('${row.kind}',${row.index})">빼기</button>` : ''}</div>`;
    }

    function socketsHtml(item) {
        const rows = equipmentSockets.list(item).map(socketRowHtml).join('');
        const chisels = game.currencies.voidChisel || 0;
        const chisel = equipmentSockets.canChisel(item)
            ? `<button type="button" class="socket-chisel" onclick="equipmentSocketsUi.chisel()" ${chisels > 0 ? '' : 'disabled'}>공허의 끌로 소켓 뚫기 (보유 ${chisels})</button>` : '';
        const bonus = Math.round((getSocketJewelMultiplier() - 1) * 100);
        const bonusNote = bonus > 0 ? `<p class="selection-overlay-help">소켓 주얼 옵션 +${bonus}% (심연 군주, 재물욕)</p>` : '';
        return `${rows || '<p class="selection-overlay-help">이 장비에는 아직 소켓이 없습니다.</p>'}${chisel}${bonusNote}`;
    }

    /** The bag's jewels: socket one into this item or salvage it; jewel shards draw a new one into the bag. */
    function storeHtml(item) {
        const store = bagItems.jewels();
        const canInsert = equipmentSockets.list(item).some(equipmentSockets.takesJewel);
        const cards = store.map(jewel => `<article class="socket-jewel-card">${jewelHtml(jewel)}<div class="socket-jewel-actions">
            ${canInsert ? `<button type="button" onclick="equipmentSocketsUi.insert(${jewel.id})">끼우기</button>` : ''}
            <button type="button" onclick="equipmentSocketsUi.salvage(${jewel.id})">해체 +${getJewelSalvageShardGain(jewel)}</button></div></article>`).join('');
        const shards = game.currencies.jewelShard || 0;
        return `<div class="selection-overlay-section-title">가방의 주얼 ${store.length}개</div>
            <div class="socket-jewel-list">${cards || '<p class="selection-overlay-help">가방에 주얼이 없습니다. 정예와 보스가 가끔 떨어뜨립니다.</p>'}</div>
            <div class="socket-store-footer"><span>주얼 결정 ${shards}</span><button type="button" onclick="equipmentSocketsUi.refine()" ${shards >= REFINE_COST ? '' : 'disabled'}>주얼 뽑기 (결정 ${REFINE_COST})</button></div>`;
    }

    /** The stump box's grown items this unique's sockets take, with a 끼우기 button while a fitting socket is empty ('' for other gear). */
    function harvestStoreHtml(item) {
        const rows = equipmentSockets.list(item), kinds = [...new Set(rows.flatMap(row => row.accepts))];
        if (!kinds.length) return '';
        const open = new Set(rows.filter(row => !contentOf(row)).flatMap(row => row.accepts));
        const store = stumpBox.socketCandidates(game, kinds);
        const cards = store.map(grown => `<article class="socket-jewel-card is-harvest">${harvestHtml(grown)}<div class="socket-jewel-actions">
            ${open.has(stumpBox.yieldKind(grown)) ? `<button type="button" onclick="equipmentSocketsUi.insertHarvest(${grown.id})">끼우기</button>` : ''}</div></article>`).join('');
        const names = kinds.map(kind => STUMP_BOX_STAGES[kind].label).join(', ');
        return `<div class="selection-overlay-section-title">그루터기 함의 ${names} ${store.length}개</div>
            <div class="socket-jewel-list">${cards || `<p class="selection-overlay-help">그루터기 함 보관함에 다 자란 ${names}${pickParticle(names, '이', '가')} 없습니다.</p>`}</div>`;
    }

    /** 풍작의 갑주처럼 소켓이 모두 수확물 소켓이면 가방의 주얼 목록은 보이지 않는다. */
    const takesNoJewel = item => { const rows = equipmentSockets.list(item); return rows.length > 0 && rows.every(row => row.kind === 'harvest'); };

    /** Opens the dialog for the selected item, or redraws it in place after a change. */
    function render() {
        const item = getSelectedCraftItem();
        if (!item) return close();
        selectionDialog.show({ id: OVERLAY_ID, title: `소켓: [${escapeHTML(getItemSlotDisplayLabel(item))}] ${escapeHTML(item.name)}`,
            panelClass: 'equipment-socket-panel', body: `${socketsHtml(item)}
            ${harvestStoreHtml(item)}${takesNoJewel(item) ? '' : storeHtml(item)}` });
    }

    function open(ref, isEquip) {
        if (selectForCrafting(ref, isEquip)) render();
    }

    function close() {
        selectionDialog.close(OVERLAY_ID);
    }

    function report(result, message) {
        if (!result.ok) return addLog(result.reason, 'attack-monster');
        addLog(message, 'loot-magic');
        updateStaticUI();
        render();
    }

    function insert(jewelId) {
        const item = getSelectedCraftItem();
        if (!item) return;
        const result = equipmentSockets.insert(item, jewelId);
        if (result.ok) playUiFeedbackSound('gemSocket');
        report(result, result.ok ? `💠 [${item.name}]에 [${result.jewel.name}] 장착` : '');
    }

    /** A stored grown flower, fruit, vine or root into the selected unique's socket that takes it. */
    function insertHarvest(stumpId) {
        const item = getSelectedCraftItem();
        if (!item) return;
        const result = equipmentSockets.insertHarvest(item, stumpId);
        if (result.ok) playUiFeedbackSound('gemSocket');
        report(result, result.ok ? `🌱 [${item.name}]에 [${stumpBox.shortName(result.harvest)}] 장착` : '');
    }

    function remove(kind, index) {
        const item = getSelectedCraftItem();
        if (!item) return;
        const result = equipmentSockets.remove(item, kind, index);
        report(result, result.ok ? removedMessage(item, result) : '');
    }

    function chisel() {
        const item = getSelectedCraftItem();
        if (!item) return;
        report(equipmentSockets.chisel(item), `🕳️ [${item.name}]에 공허 소켓을 뚫었습니다.`);
    }

    async function salvage(jewelId) {
        if (await salvageJewel(jewelId)) render();
    }

    function refine() {
        drawJewelRefine();
        render();
    }

    return Object.freeze({ actionHtml, badgesHtml, socketClick, dropJewel, tooltipHtml, open, close, insert, insertHarvest, remove, chisel, salvage, refine });
})();
safeExposeGlobals({ equipmentSocketsUi });
