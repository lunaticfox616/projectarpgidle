import { EQUIPMENT_TRIAGE_FILTER_IDS as FILTER_IDS } from '../domain/equipment-triage.mjs';
class EquipmentTriageUi {
  constructor(model, deps) {
    this.model = model;
    this.deps = deps;
    this.state = this.model.view;
    this.getCounts = this.model.getCounts;
    this.getRecommendedCandidate = () => this.model.getRecommendedCandidate(this.deps.getOwner());
    this.changedIds = () => this.model.changedIds(this.deps.getOwner());
    this.AUTO_DELAY_MS = 300;
    this.timer = null;
    this.autoTimer = null;
    this.autoArmed = false;
    this.wantsFullRun = () => ['idle', 'stale'].includes(this.state.status) || (this.autoArmed && ['cancelled', 'error'].includes(this.state.status));
  }

  getStatusCopy() {
      if (this.state.status === 'running') return this.deps._t('{index}/{length} 분석 중', { index: this.state.work.index, length: this.state.work.items.length });
      if (this.state.status === 'ready') {
          const counts = this.getCounts();
          return this.deps._t('{all}개 완료, 균형 {balanced}, 공격 {damage}, 생존 {defense}', { all: counts.all, balanced: counts.balanced, damage: counts.damage, defense: counts.defense });
      }
      if (this.state.status === 'error') return this.deps._t('분석 중 오류가 발생했습니다. 다시 시도하세요.');
      if (this.state.status === 'stale') return this.deps._t('세팅이 바뀌어 다시 분석합니다.');
      if (this.state.status === 'cancelled') return this.deps._t('분석을 중단했습니다.');
      return this.deps._t('분석 시작 시점의 세팅/전투 상태로 비교합니다.');
  }

  getFilterOptionsHtml(counts) {
      const labels = {
          all: this.deps._t('전체'), balanced: this.deps._t('균형 상승'), damage: this.deps._t('공격 상승'), defense: this.deps._t('생존 상승'),
          special: this.deps._t('특수 장비'), keep: this.deps._t('현 세팅 유지')
      };
      return FILTER_IDS.map(id => `<option value="${id}" ${this.state.filter === id ? 'selected' : ''}>${labels[id]} ${counts[id] || 0}</option>`).join('');
  }

  isInventoryNearFull() {
      if (typeof this.deps.getInventoryLimit !== 'function' || typeof this.deps.getInventoryUsedCellCount !== 'function') return false;
      const limit = Math.max(1, Math.floor(this.deps.getInventoryLimit(this.deps.getOwner())));
      return this.deps.getInventoryUsedCellCount(this.deps.getOwner()) >= Math.floor(limit * 0.9);
  }

  getRecommendTitle(recommendation) {
      if (recommendation) return this.state.filter === 'all' ? this.deps._t('공격과 생존이 함께 오르는 장비만 추천합니다.') : this.deps._t('현재 판단 기준에서 가장 높은 장비를 추천합니다.');
      if (this.state.status !== 'ready') return this.deps._t('현재 세팅으로 일괄 분석을 완료하면 추천을 확인할 수 있습니다.');
      if (['all', 'balanced'].includes(this.state.filter)) return this.deps._t('공격과 생존이 함께 오르는 장비가 없습니다. 공격 상승/생존 상승 필터로 각각 비교할 수 있습니다.');
      if (['special', 'keep'].includes(this.state.filter)) return this.deps._t('이 목록에서는 장비를 직접 선택해 효과를 비교하세요.');
      return this.deps._t('선택한 판단 기준에서 상승하는 장비가 없습니다.');
  }

  getRecommendLabel(recommendation) {
      if (recommendation) return ['all', 'balanced'].includes(this.state.filter) ? this.deps._t('균형 추천 교체') : this.deps._t('추천 교체');
      if (this.state.status === 'running') return this.deps._t('분석 중');
      if (this.state.status !== 'ready') return this.state.status === 'idle' ? this.deps._t('분석 먼저') : this.deps._t('재분석 필요');
      return { all: this.deps._t('균형 상승 없음'), balanced: this.deps._t('균형 상승 없음'), damage: this.deps._t('공격 상승 없음'),
          defense: this.deps._t('생존 상승 없음'), special: this.deps._t('직접 비교'), keep: this.deps._t('직접 비교') }[this.state.filter];
  }

  render() {
      const host = this.deps.document.getElementById('ui-equipment-triage');
      if (!host) return;
      const counts = this.getCounts();
      const running = this.state.status === 'running';
      const ready = this.state.status === 'ready';
      const recommendation = this.getRecommendedCandidate();
      // 가방이 거의 차면 자동해체로 바로 간다(자동해체는 장비창 도구 줄의 해체 단추 창에 있다)
      const autoSalvageButton = this.isInventoryNearFull()
          ? `<button type="button" onclick="equipmentWindowUi.openSalvage()">${this.deps._t('자동 해체 설정')}</button>` : '';
      const fillable = this.deps.countFillableEmptySlots();
      const fillButton = fillable ? `<button type="button" class="equipment-fill-empty" onclick="fillEmptyEquipmentSlots()">${this.deps._t('빈 칸 채우기 {fillable}', { fillable })}</button>` : '';
      const html = `<div class="equipment-triage-copy" data-tip="${this.deps._t('분석 시작 시점의 세팅/전투 상태를 기준으로 비교합니다.')}"><strong>${this.deps._t('현재 세팅 분석')}</strong><small>${this.getStatusCopy()}</small></div>
          <div class="equipment-triage-controls">
              <label>${this.deps._t('판단')} <select onchange="equipmentTriage.setFilter(this.value)" ${ready ? '' : 'disabled'}>${this.getFilterOptionsHtml(counts)}</select></label>
              <button type="button" onclick="equipmentTriage.${running ? 'cancel' : 'start'}()">${running ? this.deps._t('분석 중단') : (this.state.status === 'idle' ? this.deps._t('일괄 분석') : this.deps._t('다시 분석'))}</button>
              <button type="button" onclick="equipmentTriage.equipRecommended()" ${recommendation ? '' : 'disabled'} data-tip="${this.getRecommendTitle(recommendation)}">${this.getRecommendLabel(recommendation)}</button>
              ${fillButton}${autoSalvageButton}
          </div>`;
      const renderSignature = this.renderSignature(counts, recommendation, fillable);
      if (host.dataset.renderSig === renderSignature) return;
      host.innerHTML = html;
      host.dataset.renderSig = renderSignature;
  }

  renderSignature(counts, recommendation, fillable) {
      // Language changes must invalidate the rendered copy even when the build is unchanged.
      return `${this.deps.i18n.language}|${this.state.status}|${this.state.filter}|${this.state.work ? this.state.work.index : 0}|${JSON.stringify(counts)}|${recommendation ? recommendation.item.id : ''}|${this.isInventoryNearFull()}|${fillable}`;
  }

  failAnalysis(error) {
      this.deps.console.error('equipment triage failed:', error);
      this.clearResults('error');
      if (typeof this.deps.showGameToast === 'function') {
          this.deps.showGameToast(this.deps._t('장비 분석에 실패했습니다. 다시 시도해 주세요.'), { tone: 'error', duration: 3200 });
      }
  }

  cancel() {
      if (this.state.status !== 'running') return false;
      this.clearResults('cancelled');
      return true;
  }

  later(run, wait = this.AUTO_DELAY_MS) {
      this.autoTimer = this.deps.setTimeout(() => {
          this.autoTimer = null;
          if (!this.state.work) run();
      }, wait);
  }

  autoStart() {
      this.sync(true);
      if (this.deps.getOwner().itemSubtab !== 'item-tab-equip') return;
      const opening = this.autoArmed;
      const full = this.wantsFullRun();
      this.autoArmed = false;
      if (this.autoTimer || this.state.work) return;
      if (full) {
          this.later(() => { if (this.state.status !== 'ready') this.start(); }, opening ? 0 : this.AUTO_DELAY_MS);
          return;
      }
      const changed = this.state.status === 'ready' ? this.changedIds() : new Set();
      if (changed.size) this.later(() => { this.sync(true); if (this.state.status === 'ready') this.begin(changed); }, opening ? 0 : this.AUTO_DELAY_MS);
  }

  equipRecommended() {
      this.sync(true);
      const recommendation = this.getRecommendedCandidate();
      if (!recommendation || typeof this.deps.equipItemById !== 'function') return false;
      const equipped = this.deps.equipItemById(recommendation.item.id, recommendation.slot);
      if (!equipped) return false;
      if (typeof this.deps.showGameToast === 'function') {
          this.deps.showGameToast(this.deps._t('{item} 장착, {slot}', { item: this.deps._t(recommendation.item.name || '추천 장비'), slot: this.deps._t(recommendation.slot) }), { tone: 'success' });
      }
      this.start();
      return true;
  }

  clearResults(status) {
      this.deps.clearTimeout(this.timer); this.deps.clearTimeout(this.autoTimer);
      this.timer = null; this.autoTimer = null;
      this.model.clearResults(status);
      this.render();
  }

  sync(force) { if (this.model.sync(this.deps.getOwner(), force, this.deps.Date.now())) this.clearResults('stale'); }

  finishAnalysis(token) {
      const result = this.model.finish(this.deps.getOwner(), token, () => this.deps.Date.now());
      if (result === 'stale') return this.clearResults('stale');
      if (!result) return;
      this.render();
      if (typeof this.deps.updateStaticUI === 'function') this.deps.updateStaticUI();
  }

  runChunk(token) {
      if (token !== this.state.token || !this.state.work) return;
      this.timer = null;
      const started = this.deps.performance.now();
      try {
          this.sync();
          if (!this.state.work) return;
          this.model.step(token, () => this.deps.performance.now(), started);
      } catch (error) { this.failAnalysis(error); return; }
      this.render();
      if (this.state.work.index >= this.state.work.items.length) return this.finishAnalysis(token);
      this.timer = this.deps.setTimeout(() => this.runChunk(token), 0);
  }

  begin(ids) {
      try { this.model.begin(this.deps.getOwner(), () => this.deps.getCombatTime(), ids, () => this.deps.Date.now()); }
      catch (error) { this.failAnalysis(error); return false; }
      this.render();
      if (!this.state.work.items.length) { this.finishAnalysis(this.state.token); return true; }
      const token = this.state.token;
      this.timer = this.deps.setTimeout(() => this.runChunk(token), 0);
      return true;
  }

  start() {
      if (this.state.status === 'running') return false;
      this.deps.clearTimeout(this.autoTimer); this.autoTimer = null;
      this.model.prepareStart();
      return this.begin(null);
  }

  setFilter(filterId) {
      this.sync(true);
      if (!this.model.setFilter(filterId)) return false;
      this.render();
      if (typeof this.deps.updateStaticUI === 'function') this.deps.updateStaticUI();
      return true;
  }

  onOpen() { this.autoArmed = true; }
}

export function createEquipmentTriageUi(model, deps) {
  const instance = new EquipmentTriageUi(model, deps);
  return Object.freeze({ render: instance.render.bind(instance), start: instance.start.bind(instance), cancel: instance.cancel.bind(instance), autoStart: instance.autoStart.bind(instance), onOpen: instance.onOpen.bind(instance), setFilter: instance.setFilter.bind(instance), filterRows: instance.model.filterRows,
    currentFilter: instance.model.currentFilter, getResult: instance.model.getResult, equipRecommended: instance.equipRecommended.bind(instance),
    rate: item => instance.model.rate(instance.deps.getOwner(), item, () => instance.deps.getCombatTime()),
    checkFreshGear: () => instance.model.checkFreshGear(instance.deps.getOwner(), instance.deps.Date.now(), () => instance.deps.getCombatTime()) });
}
