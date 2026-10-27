// INTERACTION HISTORY: an append-only event log for the local session, plus export and comparison helpers.
// Records stay in this browser (localStorage). Nothing is transmitted anywhere.

import { storage } from './storage.js';
import { BANK_KEYS } from './memory.js';

const SESSION_KEY = 'bb.session.v1';

export function createSession() {
  return {
    id: 'sess-' + Math.random().toString(36).slice(2, 10), // pseudonymous, random, not linked to any person
    startedAt: Date.now(),
    events: [],       // [{id, t, ts, stage, type, data}]
    generations: [],  // full records, referenced from events by id
    rules: [],        // participant-written rules with their linked propositions
  };
}

export function logEvent(session, type, data = {}, stage = 'free') {
  const e = { id: session.events.length + 1, t: Date.now() - session.startedAt, ts: new Date().toISOString(), stage, type, data };
  session.events.push(e);
  return e;
}

export const formatElapsed = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function saveSession(session, extra = {}) {
  const payload = { session, ...extra };
  let json = JSON.stringify(payload);
  // keep within browser quota: drop traces of the oldest generations first
  for (let i = 0; json.length > 3_500_000 && i < session.generations.length; i++) {
    if (session.generations[i].trace) { delete session.generations[i].trace; json = JSON.stringify(payload); }
  }
  return storage.set(SESSION_KEY, payload);
}

export const loadSession = () => storage.get(SESSION_KEY, null);
export const clearSession = () => storage.remove(SESSION_KEY);

const short = (s, n = 90) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export function describeEvent(e, session) {
  const d = e.data;
  const gen = (id) => session?.generations.find((g) => g.id === id);
  switch (e.type) {
    case 'session_start': return 'Session started';
    case 'mode': return `Mode: ${d.mode}`;
    case 'stage': return `Workshop stage → ${d.stage}`;
    case 'question': return `Design question edited: “${short(d.question)}”`;
    case 'generate': return `Generated #${d.n}: “${short(gen(d.id)?.proposition ?? '')}”`;
    case 'reproduce': return `Reproduced #${d.n}: ${d.identical ? 'identical result' : 'DIFFERENT result'}`;
    case 'sample': return `Sampled ${d.n} generations (${d.unique} different propositions)`;
    case 'save': return `${d.saved ? 'Saved' : 'Unsaved'} idea #${d.n}`;
    case 'param': return `Probability: ${d.key} ${d.from} → ${d.to}`;
    case 'memory': return `Memory: ${d.what}`;
    case 'process': return `Process: ${d.what}`;
    case 'rule': return `Rule added: ${d.description}`;
    case 'rule_toggle': return `Rule ${d.enabled ? 'enabled' : 'disabled'}: ${d.description}`;
    case 'intervention': return `Intuition → rule on #${d.n}: “${short(d.interest || '(no note)')}”`;
    case 'prediction': return `Prediction: “${short(d.text)}”`;
    case 'observation': return `Observation: “${short(d.text)}”`;
    case 'reflection': return `Reflection (${d.prompt}): “${short(d.text)}”`;
    case 'self_report': return `Self-report: ${d.label}`;
    case 'friction': return `Friction marked${d.note ? `: “${short(d.note)}”` : ''}`;
    case 'restore': return `Restored configuration of #${d.n}`;
    case 'compare': return `Compared #${d.a} with #${d.b}`;
    case 'baseline': return 'Pinned distribution baseline';
    default: return e.type;
  }
}

// ---------------------------------------------------------------- export

export function exportJSON(session, config) {
  return JSON.stringify({
    format: 'beautifully-broken-experiment-log', version: 1, exportedAt: new Date().toISOString(),
    note: 'Self-reported experiences only. Nothing here measures cognitive states.',
    currentConfiguration: config, session,
  }, null, 2);
}

const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function exportCSV(session) {
  const head = ['event_id', 'elapsed_s', 'timestamp', 'stage', 'type', 'summary', 'generation_n', 'seed', 'proposition', 'process', 'mode', 'details_json'];
  const rows = session.events.map((e) => {
    const g = session.generations.find((x) => x.id === (e.data.id ?? e.data.genId));
    return [e.id, Math.round(e.t / 1000), e.ts, e.stage, e.type, describeEvent(e, session), g?.n ?? '', g?.seed ?? '', g?.proposition ?? '',
      g?.config.process?.name ?? '', g?.config.params.mode ?? '', JSON.stringify(e.data)].map(q).join(',');
  });
  return [head.join(','), ...rows].join('\n');
}

// ---------------------------------------------------------------- comparison

export function diffConfigs(a, b) {
  const out = [];
  for (const k of Object.keys({ ...a.params, ...b.params })) {
    if (a.params[k] !== b.params[k]) out.push({ area: 'Probability', what: k, a: a.params[k], b: b.params[k] });
  }
  if ((a.process?.name ?? '') !== (b.process?.name ?? '') || JSON.stringify(a.process?.steps) !== JSON.stringify(b.process?.steps)) {
    out.push({ area: 'Process', what: 'architecture', a: a.process?.name ?? 'custom', b: b.process?.name ?? 'custom' });
  }
  for (const bank of BANK_KEYS) {
    const la = new Map(a.memory[bank].map((i) => [i.id, i])), lb = new Map(b.memory[bank].map((i) => [i.id, i]));
    for (const [id, i] of lb) if (!la.has(id)) out.push({ area: 'Memory', what: bank, a: '—', b: `+ ${i.label}` });
    for (const [id, i] of la) {
      if (!lb.has(id)) out.push({ area: 'Memory', what: bank, a: `− ${i.label}`, b: '—' });
      else if (lb.get(id).weight !== i.weight) out.push({ area: 'Memory', what: `${i.label} weight`, a: i.weight, b: lb.get(id).weight });
    }
  }
  const ra = (a.rules ?? []).length, rb = (b.rules ?? []).length;
  if (ra !== rb) out.push({ area: 'Rules', what: 'active rules', a: ra, b: rb });
  return out;
}

export function sharedConcepts(g1, g2) {
  const ids = (g) => new Map(Object.values(g.slots).filter((s) => s.kind === 'item').map((s) => [s.id, s.label]));
  const A = ids(g1), B = ids(g2);
  return { shared: [...A].filter(([id]) => B.has(id)).map(([, l]) => l), onlyA: [...A].filter(([id]) => !B.has(id)).map(([, l]) => l), onlyB: [...B].filter(([id]) => !A.has(id)).map(([, l]) => l) };
}
