// GENERATED from modules/canvas-stage-pictures*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/stage-pictures.mjs
  var StagePictures = class {
    constructor(deps) {
      this.deps = deps;
      this.canDecodeAway = () => typeof this.deps.createImageBitmap === "function" && typeof this.deps.fetch === "function" && this.deps.location.protocol !== "file:";
    }
    /** 그림이 왔다: source는 drawImage에 넘기는 것(ImageBitmap 또는 Image). */
    pictureArrived(row, source, width, height) {
      if (row.closed) return;
      Object.assign(row, { source, width, height, ready: width > 0, failed: !(width > 0) });
    }
    /** 받지 못했다: 잠시 뒤 같은 그림을 다시 받는다(닫은 그림은 그만둔다). 다시 받기는 그 그림을 연 곳이 준 row.restart가 한다. */
    retryPicture(row) {
      row.failed = true;
      const wait = this.deps.stageAssetRetry.waitMs(row.tries);
      row.tries += 1;
      this.deps.setTimeout(() => {
        if (row.closed) return;
        row.failed = false;
        row.restart(this.deps.stageAssetRetry.retryUrl(row.url, row.tries));
      }, wait);
    }
    /** 예전 방식: Image로 불러온다(처음 그릴 때 풀린다). */
    loadPlainPicture(row, url) {
      const image = new this.deps.Image();
      image.decoding = "async";
      image.onload = () => this.pictureArrived(row, image, image.naturalWidth, image.naturalHeight);
      image.onerror = () => {
        if (!row.closed) this.retryPicture(row);
      };
      image.src = url;
      row.plain = image;
    }
    /** 파일을 받아 메인 스레드 밖에서 푼다. 받은 응답이 실패(404, 503)면 다시 받고, 받기 자체가 안 되면 예전 방식으로 불러온다. */
    decodePictureAway(row, url) {
      this.deps.fetch(url).then((response) => response.ok ? response.blob() : null).then((blob) => {
        if (!blob) {
          if (!row.closed) this.retryPicture(row);
          return null;
        }
        return this.deps.createImageBitmap(blob);
      }).then((bitmap) => {
        if (!bitmap) return;
        if (row.closed) {
          bitmap.close();
          return;
        }
        this.pictureArrived(row, bitmap, bitmap.width, bitmap.height);
      }).catch(() => {
        if (!row.closed && !row.failed) this.loadPlainPicture(row, url);
      });
    }
    startPicture(row, url) {
      if (this.canDecodeAway()) this.decodePictureAway(row, url);
      else this.loadPlainPicture(row, url);
    }
    /** @param {string} url 그림의 주소
     * @returns {{url:string, source:?CanvasImageSource, ready:boolean, failed:boolean, width:number, height:number}} 그림 한 장.
     *   ready가 참이 되면 source를 그릴 수 있다. 다 쓰면 closePicture로 닫는다. */
    openPicture(url) {
      const row = { url, source: null, ready: false, failed: false, width: 0, height: 0, closed: false, plain: null, tries: 0, restart: null };
      row.restart = (next) => this.startPicture(row, next);
      this.startPicture(row, url);
      return row;
    }
    /** 풀어 둔 화소를 놓는다. 닫은 그림은 다시 쓰지 않는다. */
    closePicture(row) {
      row.closed = true;
      row.ready = false;
      if (row.source && typeof row.source.close === "function") row.source.close();
      if (row.plain) row.plain.src = "";
      row.source = null;
    }
  };
  function createStagePictures(deps) {
    const instance = new StagePictures(deps);
    return Object.freeze({ openPicture: instance.openPicture.bind(instance), closePicture: instance.closePicture.bind(instance) });
  }

  // modules/canvas-stage-pictures-classic.mjs
  var native = createStagePictures({
    get createImageBitmap() {
      return typeof createImageBitmap === "function" ? createImageBitmap.bind(globalThis) : void 0;
    },
    get fetch() {
      return typeof fetch === "function" ? fetch.bind(globalThis) : void 0;
    },
    get location() {
      return location;
    },
    get stageAssetRetry() {
      return stageAssetRetry;
    },
    get setTimeout() {
      return setTimeout.bind(globalThis);
    },
    get Image() {
      return Image;
    }
  });
  var stagePictures = Object.freeze({
    openPicture: native.openPicture,
    closePicture: native.closePicture
  });
  safeExposeGlobals({ stagePictures });
})();
