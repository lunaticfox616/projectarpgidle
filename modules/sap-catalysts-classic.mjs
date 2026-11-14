import { createSapCatalysts } from './domain/sap-catalysts.mjs';

const rules = createSapCatalysts({
    get contentProgression() { return contentProgression; },
    get getItemQualityAttributeMode() { return getItemQualityAttributeMode; },
    get _t() { return _t; },
    get STUMP_CUBE_CATALYST_EXCHANGE() { return STUMP_CUBE_CATALYST_EXCHANGE; },
    get SAP_CATALYSTS() { return SAP_CATALYSTS; }
});
const sapCatalysts = rules;
safeExposeGlobals({ sapCatalysts });
