

export function* loopFlowApplyLoopHeroSelection(env, owner, classId, previousClassId) {
    owner.pendingLoopHeroSelection = false;
    (yield { kind: 'loopSave', args: [{ skipCloudSync: true }] });
    (yield { kind: 'loopCloudSave', args: ['루프 직업 선택 완료'] });
    env.deps.startMoving(true);
    (yield { kind: 'loopEvent', args: ['loop-hero-selection-completed', {
        classId,
        changed: classId !== previousClassId
    }] });
}

export function* loopFlowRequestLoopHeroSelection(owner, options = {}) {
    let previousClassId = owner.selectedClassId || 'archer';
    return yield { kind: 'loopHeroRequest', args: [previousClassId, options] };
}
