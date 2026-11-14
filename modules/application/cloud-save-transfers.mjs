

export class CloudSaveTransfers {
    constructor(account, deps, links) { this.account = account; this.deps = deps; this.links = links;  }

    /** Uploads this device's copy of the account save as the next revision. The server refuses it when another device committed since
     * (commitCloudSavePayload); clocks and loop numbers decide nothing. Only the signed-in account's own slot goes up. */
    async pushCloudSave() {
        const context = this.links.runtime.captureCloudSaveContext();
        const uploadOwner = this.deps.game, uploadUserId = this.account.userId();
        this.assertUploadAllowed(uploadUserId);
        let t0 = Date.now();
        if (!(0, this.deps.persistLocalSave)({ touchModifiedAt: false })) throw new Error('로컬 저장에 실패하여 클라우드 업로드를 중단했습니다.');
        const requestBody = (0, this.deps.createCloudSaveRequestBody)(uploadUserId, uploadOwner);
        let payloadSize = requestBody.length;
        if (payloadSize > 900000 && typeof this.deps.addLog === 'function') (0, this.deps.addLog)((0, this.deps._t)('☁️ 클라우드 저장 데이터 최적화 적용 ({round}KB)', { round: Math.round(payloadSize / 1024) }), 'attack-monster', { noToast: true });
        let tSerialize = Date.now();
        let request = JSON.parse(requestBody);
        let row = await this.links.repository.commitCloudSavePayload(request.save_data, { expectedUserId: uploadUserId });
        this.links.runtime.assertCloudSaveContext(context);
        let tUpload = Date.now();
        this.links.runtime.rememberCloudCommit(row, (0, this.deps.cloudSaveFingerprint)(request.save_data));
        this.links.runtime.rememberCloudUploadProfile({ at: uploadOwner.saveMeta.lastCloudSyncAt, serializeMs: tSerialize - t0, uploadMs: tUpload - tSerialize, totalMs: tUpload - t0, payloadBytes: payloadSize }, uploadOwner);
        (0, this.deps.persistLocalSave)({ touchModifiedAt: false });
        (0, this.deps.updateCloudSaveUI)();
        if (!this.deps.game.isGuideReplay && typeof this.deps.syncPlayerProfileQuiet === 'function') (0, this.deps.syncPlayerProfileQuiet)();
        return row;
    }

    assertUploadAllowed(userId) {
        if (!userId) throw new Error('로그인이 필요합니다.');
        if (this.links.runtime.getCloudSaveOwnerId() !== userId || (0, this.deps.getSaveSlot)().userId !== userId) throw new Error('이 계정의 저장 칸이 아니라 서버에 올리지 않았습니다.');
        if (typeof this.deps.canPersistLocalSave === 'function' && !(0, this.deps.canPersistLocalSave)()) {
            throw new Error((0, this.deps.getLocalSaveStatus)().message || '로컬 저장이 차단되어 클라우드 업로드를 중단했습니다.');
        }
    }

    /** The server save replaces this device's copy of the account save (설정의 서버 저장 다시 받기). */
    async pullCloudSave(options = {}) {
        const context = this.links.runtime.captureCloudSaveContext();
        let record = this.links.runtime.cloudRecordForThisBuild(await this.links.repository.fetchCloudSaveRecord());
        this.links.runtime.assertCloudSaveContext(context);
        if (!record || !record.save_data) {
            (0, this.deps.setCloudMessage)((0, this.deps._t)('서버에 저장이 없습니다.'));
            return null;
        }
        this.links.runtime.applyExternalSave(record.save_data, this.links.repository.getRemoteSaveStamp(record));
        (0, this.deps.setCloudMessage)((0, this.deps._t)('서버 저장을 이 기기에 받았습니다.'));
        if (!options.silent) (0, this.deps.addLog)((0, this.deps._t)('서버 저장을 받았습니다.'), 'loot-magic');
        return record;
    }
}
