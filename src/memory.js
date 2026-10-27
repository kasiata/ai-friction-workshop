// MEMORY: three editable databases (needs, objects, actions), parsing/import, presets.
//
// Tag vocabulary (plain text, edited by participants — nothing is inferred by an AI):
//   needs:    opposes:<need>   this need pulls against another need
//   objects:  fn:<function>    the object's conventional function; any untagged word is a "property"
//   actions:  serves:<need>    needs the action can address (no serves tag = eligible for any need)

import { storage } from './storage.js';

export const BANK_KEYS = ['needs', 'objects', 'actions'];

export const BANKS = {
  needs: {
    key: 'needs', title: 'Human needs', letter: 'A', singular: 'need', category: 'Human need', prefix: 'need',
    tagHelp: 'opposes:privacy — a need this one tends to pull against',
  },
  objects: {
    key: 'objects', title: 'Objects & environments', letter: 'B', singular: 'object', category: 'Object', prefix: 'obj',
    tagHelp: 'fn:rest — its usual function; other words (e.g. shared) are properties',
  },
  actions: {
    key: 'actions', title: 'Actions & relationships', letter: 'C', singular: 'action', category: 'Action', prefix: 'act',
    tagHelp: 'serves:belonging — needs it can address (none = any)',
  },
};

export const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
export const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';

/** Values of tags written as "key:value" (normalised). */
export function tagValues(item, key) {
  const k = key + ':';
  return (item?.tags ?? []).map(norm).filter((t) => t.startsWith(k)).map((t) => t.slice(k.length).trim()).filter(Boolean);
}

/** Free-form property tags: those without a "key:" prefix. */
export function propertyTags(item) {
  return (item?.tags ?? []).map((t) => String(t).trim()).filter((t) => t && !t.includes(':'));
}

export function parseTags(str) {
  if (Array.isArray(str)) return str.map((t) => String(t).trim()).filter(Boolean);
  return String(str ?? '').split(/[;,]/).map((t) => t.trim()).filter(Boolean);
}

function uniqueId(bank, label, items) {
  const base = `${BANKS[bank].prefix}-${slug(label)}`;
  let id = base, n = 2;
  while (items.some((i) => i.id === id)) id = `${base}-${n++}`;
  return id;
}

function checkWeight(w) {
  const n = Number(w);
  if (w === '' || w == null || !Number.isFinite(n) || n < 0) throw new Error(`Weight must be a number of 0 or more (got “${w}”).`);
  return n;
}

export function makeItem(bank, label, opts = {}, existing = []) {
  label = String(label ?? '').trim();
  if (!label) throw new Error('A concept needs a label.');
  if (label.length > 60) throw new Error('Labels can be at most 60 characters.');
  if (existing.some((i) => norm(i.label) === norm(label))) throw new Error(`“${label}” is already in this database.`);
  return {
    id: uniqueId(bank, label, existing),
    label,
    category: opts.category || BANKS[bank].category,
    weight: opts.weight == null ? 1 : checkWeight(opts.weight),
    tags: parseTags(opts.tags),
  };
}

const D = (label, weight, tags) => ({ label, weight, tags });

const DEFAULT_ITEMS = {
  needs: [
    D('Belonging', 3, ['opposes:privacy', 'opposes:autonomy']),
    D('Curiosity', 2, ['opposes:security']),
    D('Privacy', 1, ['opposes:belonging', 'opposes:recognition']),
    D('Autonomy', 1, ['opposes:belonging', 'opposes:security']),
    D('Recognition', 2, ['opposes:privacy', 'opposes:reflection']),
    D('Security', 1, ['opposes:curiosity', 'opposes:play', 'opposes:autonomy']),
    D('Play', 2, ['opposes:security', 'opposes:reflection']),
    D('Reflection', 1, ['opposes:play', 'opposes:recognition']),
  ],
  objects: [
    D('Bench', 3, ['fn:rest', 'shared', 'public']),
    D('Mirror', 2, ['fn:reflect', 'symmetrical', 'self-facing']),
    D('Door', 1, ['fn:separate', 'threshold', 'boundary']),
    D('Window', 2, ['fn:look through', 'transparent', 'threshold']),
    D('Clock', 1, ['fn:measure time', 'rhythmic', 'shared']),
    D('Garden', 2, ['fn:grow', 'living', 'seasonal']),
    D('Umbrella', 1, ['fn:shelter', 'portable', 'personal']),
    D('Staircase', 1, ['fn:connect levels', 'vertical', 'effortful']),
  ],
  actions: [
    D('Connect', 3, ['serves:belonging', 'serves:curiosity', 'serves:recognition']),
    D('Remember', 2, ['serves:belonging', 'serves:reflection', 'serves:recognition']),
    D('Exchange', 2, ['serves:belonging', 'serves:curiosity', 'serves:play', 'serves:recognition']),
    D('Transform', 1, ['serves:curiosity', 'serves:play', 'serves:autonomy', 'serves:reflection']),
    D('Hide', 1, ['serves:privacy', 'serves:security', 'serves:autonomy']),
    D('Reveal', 2, ['serves:curiosity', 'serves:recognition', 'serves:reflection']),
    D('Interrupt', 1, ['serves:play', 'serves:curiosity', 'serves:autonomy']),
    D('Grow', 1, ['serves:belonging', 'serves:reflection', 'serves:autonomy', 'serves:play']),
  ],
};

function buildMemory(spec) {
  const memory = {};
  for (const bank of BANK_KEYS) {
    memory[bank] = [];
    for (const d of spec[bank]) memory[bank].push(makeItem(bank, d.label, { weight: d.weight, tags: d.tags }, memory[bank]));
  }
  return memory;
}

export const createDefaultMemory = () => buildMemory(DEFAULT_ITEMS);

const RITUAL_ITEMS = {
  needs: [D('Trust', 2, ['opposes:security']), D('Surprise', 2, ['opposes:security']), D('Rest', 1, ['opposes:play']),
    D('Memory', 2, []), D('Courage', 1, ['opposes:security']), D('Security', 2, ['opposes:surprise', 'opposes:courage', 'opposes:trust'])],
  objects: [D('Threshold', 2, ['fn:mark an entrance', 'liminal']), D('Table', 3, ['fn:hold things', 'shared']),
    D('Lantern', 1, ['fn:light', 'warm']), D('Bridge', 2, ['fn:cross a gap', 'linking']), D('Fountain', 1, ['fn:gather', 'flowing']),
    D('Noticeboard', 2, ['fn:announce', 'public'])],
  actions: [D('Offer', 3, []), D('Borrow', 1, []), D('Pause', 1, []), D('Echo', 2, []), D('Gather', 2, []), D('Disguise', 1, [])],
};

export const BUILT_IN_PRESETS = {
  'Default — public space': createDefaultMemory,
  'Rituals & thresholds': () => buildMemory(RITUAL_ITEMS),
};

// ---------- editing (pure: returns a new memory object) ----------

const clone = (x) => structuredClone(x);

export function addItem(memory, bank, label, opts = {}) {
  const m = clone(memory);
  const item = makeItem(bank, label, opts, m[bank]);
  m[bank].push(item);
  return { memory: m, item };
}

export function updateItem(memory, bank, id, patch) {
  const m = clone(memory);
  const item = m[bank].find((i) => i.id === id);
  if (!item) throw new Error('That concept no longer exists.');
  if ('label' in patch) {
    const label = String(patch.label).trim();
    if (!label) throw new Error('A concept needs a label.');
    if (m[bank].some((i) => i.id !== id && norm(i.label) === norm(label))) throw new Error(`“${label}” is already in this database.`);
    item.label = label;
  }
  if ('weight' in patch) item.weight = checkWeight(patch.weight);
  if ('tags' in patch) item.tags = parseTags(patch.tags);
  if ('category' in patch) item.category = String(patch.category).trim() || BANKS[bank].category;
  return m;
}

export function deleteItem(memory, bank, id) {
  const m = clone(memory);
  if (m[bank].length <= 1) throw new Error('Keep at least one concept in each database.');
  m[bank] = m[bank].filter((i) => i.id !== id);
  return m;
}

// ---------- text & CSV import ----------

const clean = (s) => String(s).replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim();

/**
 * Pasted lists. One concept per line, or several separated by commas / semicolons.
 * Optional weight: "bench*3". Optional full form: "label | weight | tag; tag".
 */
export function parseTextList(text, bank, existingItems = []) {
  const items = [], errors = [], skipped = [];
  const seen = new Set(existingItems.map((i) => norm(i.label)));
  const lines = String(text ?? '').split(/\r?\n/);
  lines.forEach((raw, idx) => {
    const lineNo = idx + 1;
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const entries = line.includes('|') ? [line] : line.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    for (const entry of entries) {
      let label, weight = 1, tags = [];
      if (entry.includes('|')) {
        const [l, w, t] = entry.split('|').map((s) => s.trim());
        label = clean(l);
        if (w) weight = Number(w);
        tags = parseTags(t);
        if (w && !Number.isFinite(weight)) { errors.push(`Line ${lineNo}: the weight “${w}” is not a number.`); continue; }
      } else {
        const m = clean(entry).match(/^(.*?)\s*\*\s*(\S+)$/);
        if (m) {
          label = m[1].trim(); weight = Number(m[2]);
          if (!Number.isFinite(weight)) { errors.push(`Line ${lineNo}: the weight “${m[2]}” is not a number.`); continue; }
        } else label = clean(entry);
      }
      if (!label) { errors.push(`Line ${lineNo}: empty concept.`); continue; }
      if (label.length > 60) { errors.push(`Line ${lineNo}: “${label.slice(0, 20)}…” is longer than 60 characters.`); continue; }
      if (weight < 0) { errors.push(`Line ${lineNo}: weights cannot be negative.`); continue; }
      if (seen.has(norm(label))) { skipped.push(label); continue; }
      seen.add(norm(label));
      items.push({ bank, label, weight, tags });
    }
  });
  if (!items.length && !errors.length && !skipped.length) errors.push('Nothing to import — paste one concept per line.');
  return { items, errors, skipped };
}

function splitCSV(text) {
  const firstLine = text.split(/\r?\n/)[0] ?? '';
  const delim = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (q) return { error: 'A quoted value is never closed (a " is missing).' };
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return { rows: rows.filter((r) => r.some((c) => c.trim() !== '')) };
}

const HEADER_ALIASES = {
  label: ['label', 'name', 'concept', 'term', 'item'],
  bank: ['bank', 'database', 'type', 'memory'],
  weight: ['weight', 'w', 'probability'],
  tags: ['tags', 'tag', 'relationships'],
  category: ['category'],
};
const BANK_ALIASES = {
  needs: ['need', 'needs', 'human need', 'human needs', 'a'],
  objects: ['object', 'objects', 'environment', 'environments', 'objects and environments', 'b'],
  actions: ['action', 'actions', 'relationship', 'relationships', 'c'],
};

/** CSV with header row. Columns: label (required), bank, weight, tags (; separated), category. */
export function parseCSV(text, { defaultBank = null } = {}) {
  const errors = [];
  text = String(text ?? '').replace(/^﻿/, '');
  if (!text.trim()) return { rows: [], errors: ['The file is empty.'] };
  const split = splitCSV(text);
  if (split.error) return { rows: [], errors: [split.error] };
  const [header, ...body] = split.rows;
  const col = {};
  header.forEach((h, i) => {
    for (const [key, names] of Object.entries(HEADER_ALIASES)) if (names.includes(norm(h)) && !(key in col)) col[key] = i;
  });
  if (!('label' in col)) {
    return { rows: [], errors: [`The first row must name the columns, and one must be “label” (or “name” / “concept”). I found: ${header.map((h) => `“${h.trim()}”`).join(', ')}.`] };
  }
  if (!('bank' in col) && !defaultBank) errors.push('There is no “bank” column, so I don’t know which database to import into. Add a “bank” column (needs / objects / actions) or choose a database first.');
  if (!body.length) errors.push('The file has a header row but no concepts below it.');

  const rows = [];
  body.forEach((r, i) => {
    const n = i + 2;
    if (r.length !== header.length) errors.push(`Row ${n}: has ${r.length} columns but the header has ${header.length}.`);
    const label = (r[col.label] ?? '').trim();
    if (!label) { errors.push(`Row ${n}: the label is empty.`); return; }
    let bank = defaultBank;
    if ('bank' in col) {
      const raw = norm(r[col.bank]);
      const found = raw ? BANK_KEYS.find((k) => BANK_ALIASES[k].includes(raw)) : defaultBank;
      if (!found) { errors.push(`Row ${n}: “${r[col.bank]}” is not a database — use needs, objects or actions.`); return; }
      bank = found;
    }
    let weight = 1;
    if ('weight' in col && (r[col.weight] ?? '').trim() !== '') {
      weight = Number(r[col.weight]);
      if (!Number.isFinite(weight) || weight < 0) { errors.push(`Row ${n}: the weight “${r[col.weight]}” must be a number of 0 or more.`); return; }
    }
    rows.push({ bank, label, weight, tags: parseTags('tags' in col ? r[col.tags] : ''), category: 'category' in col ? (r[col.category] ?? '').trim() : '' });
  });
  return { rows, errors };
}

/** Merge parsed rows (each with .bank) into memory. Duplicates by label are skipped. */
export function mergeImport(memory, rows) {
  let m = clone(memory);
  const added = [], skipped = [];
  for (const r of rows) {
    try {
      const item = makeItem(r.bank, r.label, { weight: r.weight, tags: r.tags, category: r.category }, m[r.bank]);
      m[r.bank].push(item);
      added.push(item);
    } catch (e) { skipped.push(`${r.label} (${e.message})`); }
  }
  return { memory: m, added, skipped };
}

const csvCell = (v) => (/[",\n;]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

export function memoryToCSV(memory) {
  const lines = ['bank,label,weight,tags,category'];
  for (const bank of BANK_KEYS) for (const i of memory[bank]) lines.push([bank, i.label, i.weight, i.tags.join(';'), i.category].map(csvCell).join(','));
  return lines.join('\n');
}

// ---------- presets (browser-local) ----------

const PRESET_KEY = 'bb.memoryPresets.v1';
export const listUserPresets = () => storage.get(PRESET_KEY, {});
export function savePreset(name, memory) {
  name = String(name ?? '').trim();
  if (!name) throw new Error('Give the preset a name.');
  if (BUILT_IN_PRESETS[name]) throw new Error('That name belongs to a built-in preset.');
  const all = listUserPresets();
  all[name] = clone(memory);
  storage.set(PRESET_KEY, all);
}
export function deletePreset(name) {
  const all = listUserPresets();
  delete all[name];
  storage.set(PRESET_KEY, all);
}
export function loadPreset(name) {
  if (BUILT_IN_PRESETS[name]) return BUILT_IN_PRESETS[name]();
  const p = listUserPresets()[name];
  if (!p) throw new Error('Preset not found.');
  return clone(p);
}
export const presetNames = () => [...Object.keys(BUILT_IN_PRESETS), ...Object.keys(listUserPresets())];
