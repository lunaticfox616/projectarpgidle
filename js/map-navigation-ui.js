// GENERATED from modules/map-navigation-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/map-navigation-actions.mjs
  function collectDestinations(runtime, selector) {
    return Array.from(runtime.deps.document.querySelectorAll(selector)).filter((button) => button.style.display !== "none" && !button.hidden && !["btn-map-tab-zones", "btn-map-explore-atlas"].includes(button.id)).map((button) => ({
      id: button.id,
      label: button.textContent.trim().replace(/^[^가-힣a-zA-Z0-9]+/, ""),
      disabled: button.disabled,
      condition: button.dataset.entryCondition || ""
    }));
  }
  function changeDestination(runtime, event) {
    const button = runtime.deps.document.getElementById(event.target.value);
    if (button.id.startsWith("btn-map-explore-")) (0, runtime.deps.switchMapSubtab)("map-tab-zones");
    button.click();
    (0, runtime.deps.updateStaticUI)();
  }
  function renderMobileMapNavigation(runtime) {
    const root = runtime.deps.document.getElementById("mobile-map-navigation");
    let select = root.querySelector("select");
    if (!select) {
      select = runtime.deps.document.createElement("select");
      select.id = "mobile-map-destination";
      select.setAttribute("aria-label", (0, runtime.deps._t)("목적지 선택"));
      root.appendChild(select);
    }
    if (runtime.select !== select) {
      runtime.select?.removeEventListener("change", runtime.handlers.changeDestination);
      runtime.select = select;
      select.addEventListener("change", runtime.handlers.changeDestination);
    }
    const groups = [
      ["탐험", collectDestinations(runtime, "#map-tab-zones .vertical-tab-sidebar > button")],
      ["별도 지역", collectDestinations(runtime, "#tab-map .map-primary-tabs > button")]
    ];
    const signature = JSON.stringify(groups);
    if (select.dataset.optionsSignature !== signature) {
      select.replaceChildren(...groups.filter(([, rows]) => rows.length).map(([label, rows]) => {
        const group = runtime.deps.document.createElement("optgroup");
        group.label = label;
        rows.forEach((row) => {
          const option = runtime.deps.document.createElement("option");
          option.value = row.id;
          option.textContent = row.label + (row.condition ? ", " + row.condition : "");
          option.disabled = row.disabled;
          group.appendChild(option);
        });
        return group;
      }));
      select.dataset.optionsSignature = signature;
    }
    select.value = "btn-" + (runtime.deps.game.mapSubtab === "map-tab-zones" ? runtime.deps.game.mapExploreSubtab : runtime.deps.game.mapSubtab);
  }

  // modules/ui/map-navigation-view.mjs
  function createMapNavigationView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { changeDestination, renderMobileMapNavigation };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    runtime.select = null;
    runtime.api = { renderMobileMapNavigation: runtime.handlers.renderMobileMapNavigation };
    runtime.api.dispose = () => disposeMapNavigationView(runtime);
    return runtime.api;
  }
  function disposeMapNavigationView(runtime) {
    runtime.select?.removeEventListener("change", runtime.handlers.changeDestination);
    runtime.select = null;
  }

  // modules/map-navigation-ui-classic.mjs
  var mapNavigationView = createMapNavigationView({
    get document() {
      return document;
    },
    get switchMapSubtab() {
      return switchMapSubtab;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get _t() {
      return _t;
    }
  });
  window.GameModules.mapNavigationView = mapNavigationView;
  safeExposeGlobals({ renderMobileMapNavigation: mapNavigationView.renderMobileMapNavigation });
})();
