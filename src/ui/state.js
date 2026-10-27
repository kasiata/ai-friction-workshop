// Application state and every action that changes it. Panels only read S and call A.*;
// all consequential steps are written to the interaction history here, in one place.

import { createDefaultMemory, addItem, updateItem, deleteItem, parseTextList, parseCSV, mergeImport, loadPreset, savePreset, deletePreset, BANKS } from '../memory.js';
import { DEFAULT_PARAMS, emptyUsage, normaliseParams, distribution } from '../probability.js';
import { getArchitecture, validate, ARCHITECTURES } from '../process.js';
import { generate, generationSeed, commitUsage, sample, bankDistribution } from '../generator.js';
import { applyRule, validateRule, newRuleId, describeRule } from '../rules.js';
import { createSession, logEvent, saveSession, loadSession, clearSession, exportJSON, exportCSV } from '../history.js';
import { STAGES, stageByNumber, stageLabel } from '../workshop.js';
import { selfReportLabel } from '../reflection.js';
import { storage } from '../storage.js';
import { BANK_KEYS } from '../memory.js';

export const DEFAULT_QUESTION = 'How might we help strangers connect in public spaces?';
const clone = (x) => structuredClone(x);
const SAVED_ARCH_KEY = 'bb.architectures.v1';

export const S = {
  config: null, usage: null, session: null,
  mode: 'free', stage: 0, stageStartedAt: null, enforceLocks: true,
  frozenMemory: false, currentId: null,
  ui: { tab: 'memory', memBank: 'needs', distBank: 'needs', baseline: null, sampled: null, procEdit: false, toast: null,
        drafts: {}, selfReport: null, compare: null, reproduce: null, interventionId: null, afterRule: null, nl: null, showResearch: false, showHelp: false },
};

const listeners = new Set();
export const subscribe = (fn) => listeners.add(fn);
let toastTimer;

function emit() { listeners.forEach((f) => f()); }
function persist() {
  saveSession(S.session, { config: S.config, usage: S.usage, mode: S.mode, stage: S.stage, stageStartedAt: S.stageStartedAt, frozenMemory: S.frozenMemory, currentId: S.currentId, baseline: S.ui.baseline });
}
const stageKey = () => (S.mode === 'workshop' ? S.stage : 'free');
const log = (type, data) => logEvent(S.session, type, data, stageKey());

function toast(msg, kind = 'info') {
  S.ui.toast = { msg, kind };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { S.ui.toast = null; emit(); }, 5200);
}

/** Run a mutation; on a user-facing error show it instead of crashing. Re-render unless opts.silent. */
function run(fn, { silent = false } = {}) {
  try { fn(); persist(); }
  catch (e) { toast(e.message, 'error'); silent = false; }
  if (!silent) emit();
}

export const stage = () => (S.mode === 'workshop' ? stageByNumber(S.stage) : null);
export const isLocked = (what) => {
  if (what === 'memory' && S.frozenMemory) return 'Memory is frozen.';
  const st = stage();
  if (S.enforceLocks && st?.locks[what]) return `Locked in stage ${st.n} (“${st.title}”) so only the other variable changes.`;
  return '';
};

export const currentGen = () => S.session.generations.find((g) => g.id === S.currentId) ?? null;
export const genById = (id) => S.session.generations.find((g) => g.id === id) ?? null;
export const previousGen = (id) => { const i = S.session.generations.findIndex((g) => g.id === id); return i > 0 ? S.session.generations[i - 1] : null; };

export const savedArchitectures = () => storage.get(SAVED_ARCH_KEY, []);

function freshConfig() {
  return { question: DEFAULT_QUESTION, memory: createDefaultMemory(), params: { ...DEFAULT_PARAMS }, process: getArchitecture('need_first'), rules: [] };
}

export function pinBaselineNow() {
  const dists = {};
  for (const b of BANK_KEYS) dists[b] = Object.fromEntries(bankDistribution(S.config, S.usage, b).map((e) => [e.id, e.p]));
  S.ui.baseline = { at: Date.now(), mode: S.config.params.mode, dists, labels: Object.fromEntries(BANK_KEYS.flatMap((b) => S.config.memory[b].map((i) => [i.id, i.label]))) };
}

export const A = {
  init() {
    const saved = loadSession();
    if (saved?.session && saved.config) {
      Object.assign(S, { session: saved.session, config: saved.config, usage: saved.usage ?? emptyUsage(), mode: saved.mode ?? 'free', stage: saved.stage ?? 0,
        stageStartedAt: saved.stageStartedAt ?? null, frozenMemory: !!saved.frozenMemory, currentId: saved.currentId ?? null });
      S.config.params = normaliseParams(S.config.params);
      S.ui.baseline = saved.baseline ?? null;
    } else A.reset(true);
  },
  reset(first = false) {
    clearSession();
    S.config = freshConfig(); S.usage = emptyUsage(); S.session = createSession();
    Object.assign(S, { mode: 'free', stage: 0, stageStartedAt: null, frozenMemory: false, currentId: null });
    Object.assign(S.ui, { baseline: null, sampled: null, compare: null, reproduce: null, interventionId: null, afterRule: null, nl: null, drafts: {}, selfReport: null });
    log('session_start', {});
    persist();
    if (!first) { toast('New session started. The previous one is no longer stored in this browser.'); emit(); }
  },
  ui(patch) { Object.assign(S.ui, patch); emit(); },
  view(id) { S.currentId = id; S.ui.reproduce = null; persist(); emit(); },
  draft(key, value) { S.ui.drafts[key] = value; }, // silent: no re-render while typing

  // ---------- design question
  setQuestion(q) { run(() => { q = q.trim() || DEFAULT_QUESTION; if (q !== S.config.question) { S.config.question = q; log('question', { question: q }); } }, { silent: true }); },

  // ---------- probability
  setParam(key, value, { silent = false } = {}) {
    const lock = isLocked('probability');
    if (lock) return toast(lock, 'error'), emit();
    run(() => {
      const from = S.config.params[key];
      const next = normaliseParams({ ...S.config.params, [key]: value });
      if (next[key] === from) return;
      S.config.params = next;
      log('param', { key, from, to: next[key] });
    }, { silent });
  },

  // ---------- memory
  _memEdit(fn, what, { silent = false } = {}) {
    const lock = isLocked('memory');
    if (lock) return toast(lock, 'error'), emit();
    run(() => { S.config.memory = fn(S.config.memory); log('memory', { what }); }, { silent });
  },
  addConcept(bank, label, weight, tags) { A._memEdit((m) => addItem(m, bank, label, { weight, tags }).memory, `added “${label}” to ${BANKS[bank].title}`); },
  editConcept(bank, id, patch) {
    const item = S.config.memory[bank].find((i) => i.id === id);
    A._memEdit((m) => updateItem(m, bank, id, patch), `edited “${item?.label}” (${Object.keys(patch).join(', ')})`, { silent: true });
  },
  removeConcept(bank, id) {
    const item = S.config.memory[bank].find((i) => i.id === id);
    A._memEdit((m) => deleteItem(m, bank, id), `deleted “${item?.label}” from ${BANKS[bank].title}`);
  },
  importText(bank, text) {
    const lock = isLocked('memory');
    if (lock) return toast(lock, 'error'), emit();
    const r = parseTextList(text, bank, S.config.memory[bank]);
    if (r.errors.length) { S.ui.importResult = { errors: r.errors }; return emit(); }
    run(() => {
      S.config.memory = mergeImport(S.config.memory, r.items).memory;
      log('memory', { what: `imported ${r.items.length} concept(s) into ${BANKS[bank].title}` });
      S.ui.importResult = { ok: `Imported ${r.items.length} concept(s).${r.skipped.length ? ` Skipped duplicates: ${r.skipped.join(', ')}.` : ''}` };
      S.ui.drafts.importText = '';
    });
  },
  importCSV(text, bank) {
    const lock = isLocked('memory');
    if (lock) return toast(lock, 'error'), emit();
    const r = parseCSV(text, { defaultBank: bank });
    if (r.errors.length) { S.ui.importResult = { errors: r.errors }; return emit(); }
    run(() => {
      const m = mergeImport(S.config.memory, r.rows);
      S.config.memory = m.memory;
      log('memory', { what: `imported ${m.added.length} concept(s) from CSV` });
      S.ui.importResult = { ok: `Imported ${m.added.length} concept(s).${m.skipped.length ? ` Skipped: ${m.skipped.join('; ')}.` : ''}` };
    });
  },
  loadPreset(name) { A._memEdit(() => loadPreset(name), `loaded preset “${name}”`); },
  savePreset(name) { run(() => { savePreset(name, S.config.memory); toast(`Preset “${name}” saved in this browser.`); }); },
  deletePreset(name) { run(() => deletePreset(name)); },
  toggleFreezeMemory() { run(() => { S.frozenMemory = !S.frozenMemory; log('memory', { what: S.frozenMemory ? 'memory frozen' : 'memory unfrozen' }); }); },

  // ---------- process
  setArchitecture(id) {
    const lock = isLocked('process');
    if (lock) return toast(lock, 'error'), emit();
    run(() => {
      const proc = ARCHITECTURES[id] ? getArchitecture(id) : (() => { const s = savedArchitectures().find((a) => a.id === id); if (!s) throw new Error('Architecture not found.'); return clone(s); })();
      S.config.process = proc;
      log('process', { what: `architecture → ${proc.name}` });
    });
  },
  editProcess(next, what) {
    const v = validate(next);
    if (!v.ok) { toast(v.errors[0], 'error'); return emit(); }
    run(() => {
      S.config.process = { ...next, id: 'custom', name: S.config.process.name.endsWith('(edited)') ? S.config.process.name : `${S.config.process.name} (edited)` };
      log('process', { what });
    });
  },
  saveArchitecture(name) {
    run(() => {
      name = name.trim();
      if (!name) throw new Error('Give the architecture a name.');
      const list = savedArchitectures().filter((a) => a.name !== name);
      const entry = { ...clone(S.config.process), id: 'saved-' + Date.now().toString(36), name };
      storage.set(SAVED_ARCH_KEY, [...list, entry]);
      S.config.process = clone(entry);
      log('process', { what: `saved architecture “${name}”` });
      toast(`Architecture “${name}” saved in this browser.`);
    });
  },
  deleteArchitecture(id) { run(() => storage.set(SAVED_ARCH_KEY, savedArchitectures().filter((a) => a.id !== id))); },

  // ---------- generation
  generate() {
    run(() => {
      const v = validate(S.config.process);
      if (!v.ok) throw new Error('The process has a problem: ' + v.errors[0]);
      const n = S.session.generations.length + 1;
      const seed = generationSeed(S.config.params, n);
      const usageBefore = clone(S.usage);
      const res = generate(S.config, S.usage, seed);
      const rec = {
        id: 'g' + n, n, t: Date.now() - S.session.startedAt, stage: stageKey(), seed: res.seed, proposition: res.proposition,
        trace: res.trace, slots: res.slots, usedIds: res.usedIds, config: clone(S.config), usageBefore, saved: false,
        prediction: S.ui.drafts.prediction?.trim() || '', observation: '',
      };
      S.usage = commitUsage(S.usage, res, S.config.params);
      S.session.generations.push(rec);
      S.currentId = rec.id;
      S.ui.reproduce = null;
      if (rec.prediction) log('prediction', { text: rec.prediction, genId: rec.id });
      S.ui.drafts.prediction = '';
      log('generate', { id: rec.id, n });
    });
  },
  reproduce(id) {
    run(() => {
      const g = genById(id);
      const again = generate(g.config, g.usageBefore, g.seed);
      const identical = again.proposition === g.proposition && JSON.stringify(again.usedIds) === JSON.stringify(g.usedIds);
      S.ui.reproduce = { id, identical, proposition: again.proposition };
      log('reproduce', { id, n: g.n, identical });
    });
  },
  toggleSave(id) { run(() => { const g = genById(id); g.saved = !g.saved; log('save', { id, n: g.n, saved: g.saved }); }); },
  restore(id) {
    run(() => {
      const g = genById(id);
      S.config = clone(g.config); S.usage = clone(g.usageBefore);
      S.ui.reproduce = null;
      log('restore', { id, n: g.n });
      toast(`Restored the configuration and learned state from before idea #${g.n}.`);
    });
  },
  sample(n) {
    run(() => {
      const r = sample(S.config, S.usage, `${S.config.params.seed}@sample`, n);
      S.ui.sampled = { ...r, bank: S.ui.distBank, mode: S.config.params.mode };
      log('sample', { n, unique: r.unique });
    });
  },
  pinBaseline() { run(() => { pinBaselineNow(); log('baseline', {}); }); },
  resetLearned() { run(() => { S.usage = emptyUsage(); log('param', { key: 'learned state', from: 'accumulated', to: 'reset' }); }); },

  // ---------- compare
  compare(a, b) { run(() => { S.ui.compare = [a, b]; log('compare', { a: genById(a).n, b: genById(b).n }); }); },
  closeCompare() { S.ui.compare = null; emit(); },

  // ---------- human intervention
  applyIntuitionRule({ genId, interest, ruleText, rule }) {
    run(() => {
      const errors = validateRule(rule, S.config.memory);
      if (errors.length) throw new Error(errors[0]);
      if (['boost_item', 'boost_tag', 'affinity'].includes(rule.type) || rule.type === 'set_params' || rule.type === 'novelty_loop') {
        if (rule.type === 'set_params' && isLocked('probability')) throw new Error(isLocked('probability'));
      }
      const full = { id: newRuleId(), ...rule };
      S.config = applyRule(S.config, full);
      const rec = { ...full, description: describeRule(full), genId, interest, ruleText, createdAt: Date.now() - S.session.startedAt, enabled: true };
      S.session.rules.push(rec);
      const g = genById(genId);
      log('intervention', { genId, n: g?.n, interest, ruleText, ruleId: full.id });
      log('rule', { ruleId: full.id, description: rec.description, genId, type: rule.type });
      S.ui.afterRule = { ruleId: full.id, genId };
      S.ui.drafts.interest = ''; S.ui.drafts.ruleText = '';
      S.ui.nl = null;
      toast('Rule applied — it now shapes every new generation. Generate to see its effect.');
    });
  },
  toggleRule(id) {
    run(() => {
      const r = S.config.rules.find((x) => x.id === id);
      if (!r) return;
      r.enabled = r.enabled === false;
      log('rule_toggle', { ruleId: id, enabled: r.enabled, description: describeRule(r) });
    });
  },

  // ---------- reflection (all optional, all self-reported)
  saveObservation(genId, text) {
    run(() => { const g = genById(genId); g.observation = text.trim(); if (g.observation) log('observation', { text: g.observation, genId }); });
  },
  saveReflection(prompt, text) {
    text = text.trim();
    if (!text) return;
    run(() => { log('reflection', { prompt, text }); toast('Reflection saved in this browser.'); });
  },
  selfReport(id) { run(() => { S.ui.selfReport = id; log('self_report', { id, label: selfReportLabel(id) }); }); },
  markFriction(note) { run(() => { log('friction', { note: note.trim(), genId: S.currentId }); S.ui.drafts.friction = ''; toast('Friction moment marked.'); }); },

  // ---------- workshop
  setMode(mode) {
    run(() => {
      S.mode = mode;
      if (mode === 'workshop' && !S.stage) { S.stage = 1; S.stageStartedAt = Date.now(); log('stage', { stage: stageLabel(1) }); }
      log('mode', { mode });
      const st = stage();
      if (st) S.ui.tab = st.tab;
    });
  },
  goStage(n) {
    run(() => {
      n = Math.max(1, Math.min(STAGES.length, n));
      S.stage = n; S.stageStartedAt = Date.now();
      S.ui.tab = stageByNumber(n).tab;
      log('stage', { stage: stageLabel(n) });
    });
  },
  toggleLocks() { run(() => { S.enforceLocks = !S.enforceLocks; }); },

  // ---------- export
  exportJSON() { return exportJSON(S.session, S.config); },
  exportCSV() { return exportCSV(S.session); },
};
