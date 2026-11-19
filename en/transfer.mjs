import {normalize,validate,generate} from './engine.mjs?v=f284fc9fa3fa';
export function transferKey(language="nl"){return 'breaking-prompt-transfer-'+(language==="en"?"en":"nl");}
export function validateTransfer(payload){
 if(!payload||payload.version!==1||!payload.system||!payload.baselineSystem)throw Error("Invalid transfer. Analyse your text again.");
 const system=validate(normalize(payload.system));const baselineSystem=validate(normalize(payload.baselineSystem));
 generate(system);generate(baselineSystem);
 return {version:1,system,baselineSystem};
}
export function saveTransfer(storage,payload,language){const valid=validateTransfer(payload);storage.setItem(transferKey(language),JSON.stringify(valid));return valid;}
export function takeTransfer(storage,language){const key=transferKey(language),raw=storage.getItem(key);if(!raw)return null;const valid=validateTransfer(JSON.parse(raw));storage.removeItem(key);return valid;}
