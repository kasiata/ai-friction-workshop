// PROCESS: architectures as data. A procedure is a list of steps from a small, fixed vocabulary.
// There is no eval and no user JavaScript: a procedure can only combine the operations below,
// and validate() rejects broken dataflow, nesting, and unbounded loops before anything runs.
//
// Operations (the whole vocabulary):
//   select                 pick one concept from a database, optionally filtered by earlier choices
//   derive_property        pick one property tag of a chosen object
//   conventional_function  read the object's usual function (fn: tag)
//   transform              turn "usual function" into "this action instead" (text)
//   tension                name the tension between two chosen needs (from opposes: tags)
//   if                     run one of two small step lists depending on a chosen concept
//   repeat                 bounded feedback loop (1–5 rounds) that stops early when a condition is met
//   compose                build the proposition sentence from a template (always last)

import { BANKS, norm, tagValues, propertyTags } from './memory.js';
import { distribution, sampleIndex } from './probability.js';
import { verbS, verbIng, withArticle, capitalize } from './text.js';

export const SLOT_RE = /^[a-z][a-z0-9_]*$/;
export const MAX_STEPS = 16;
export const MAX_LOOP = 5;
const MAX_EXECUTED = 200;

export const OPS = {
  select: { label: 'Select a concept', doc: 'Choose one concept from a database using the current probabilities. A filter can limit candidates using earlier choices.' },
  derive_property: { label: 'Derive a property', doc: 'Choose one property tag (a word without “:”) of an object you already chose.' },
  conventional_function: { label: 'Read conventional function', doc: 'Look up the object’s fn: tag — what it normally does.' },
  transform: { label: 'Transform function', doc: 'Write “to <action> rather than to <function>” from an action and a function.' },
  tension: { label: 'Identify tension', doc: 'Look for an opposes: relationship between two needs and name the tension.' },
  if: { label: 'If … then … else', doc: 'Test an earlier choice; run the “then” steps when true, otherwise the “else” steps.' },
  repeat: { label: 'Repeat (feedback loop)', doc: `Run the inner steps up to ${MAX_LOOP} times, stopping as soon as the stop condition is met.` },
  compose: { label: 'Compose proposition', doc: 'Fill a sentence template. {slot} inserts a choice; {slot:s} third-person verb, {slot:ing} verb-ing, {slot:a} with “a/an”.' },
};
const BODY_OPS = ['select', 'derive_property', 'conventional_function', 'transform', 'tension'];

export const FILTER_KINDS = {
  none: 'any',
  serves: 'serves the need(s)',
  served_by: 'is served by the action',
  opposes: 'opposes the need',
  different: 'differs from',
};
export const TEST_KINDS = { has_tag: 'has the tag', label_is: 'is called', weight_gt: 'has weight above' };
export const UNTIL_KINDS = { novel_combo: 'the combination is new', has_tag: 'a chosen concept has the tag' };
const TYPE_NAME = { needs: 'a human need', objects: 'an object', actions: 'an action', property: 'a property', text: 'text' };

const none = () => ({ kind: 'none', slots: [] });
const sel = (bank, as, where = none()) => ({ op: 'select', bank, as, where });

export const ARCHITECTURES = {
  need_first: {
    id: 'need_first', name: 'A · Human need first',
    blurb: 'Starts from a need, picks an object, then looks for an action that can serve that need.',
    steps: [
      sel('needs', 'n'), sel('objects', 'o'), sel('actions', 'a', { kind: 'serves', slots: ['n'] }),
      { op: 'compose', template: '{o:a} that {a:s}, so that people can experience {n}' },
    ],
  },
  object_first: {
    id: 'object_first', name: 'B · Object first',
    blurb: 'Starts from an object, derives a property, transforms its usual function, then asks which need that serves.',
    steps: [
      sel('objects', 'o'),
      { op: 'derive_property', from: 'o', as: 'p' },
      { op: 'conventional_function', from: 'o', as: 'f' },
      sel('actions', 'a'),
      { op: 'transform', fn: 'f', action: 'a', as: 't' },
      sel('needs', 'n', { kind: 'served_by', slots: ['a'] }),
      { op: 'compose', template: '{o:a} that uses its {p} quality {t}, serving {n}' },
    ],
  },
  contradiction_first: {
    id: 'contradiction_first', name: 'C · Contradiction first',
    blurb: 'Starts from two needs that pull against each other, names the tension, then looks for an object and action that hold both.',
    steps: [
      sel('needs', 'n1'),
      sel('needs', 'n2', { kind: 'opposes', slots: ['n1'] }),
      { op: 'tension', a: 'n1', b: 'n2', as: 't' },
      sel('objects', 'o'),
      sel('actions', 'a', { kind: 'serves', slots: ['n1', 'n2'] }),
      { op: 'compose', template: '{o:a} that {a:s}, holding {n1} and {n2} together ({t})' },
    ],
  },
};

export const getArchitecture = (id) => {
  const a = ARCHITECTURES[id];
  return a ? structuredClone({ id: a.id, name: a.name, blurb: a.blurb, steps: a.steps }) : null;
};

// ---------------------------------------------------------------- validation

const TEMPLATE_RE = /\{([a-z][a-z0-9_]*)(?::([a-z]+))?\}/g;
const MODIFIERS = ['s', 'ing', 'a', 'cap'];

export function countSteps(steps) {
  return steps.reduce((n, s) => n + 1 + countSteps(s.then ?? []) + countSteps(s.else ?? []) + countSteps(s.steps ?? []), 0);
}

export function validate(proc) {
  const errors = [];
  if (!proc || !Array.isArray(proc.steps) || !proc.steps.length) return { ok: false, errors: ['The procedure has no steps.'] };
  if (countSteps(proc.steps) > MAX_STEPS) errors.push(`A procedure can have at most ${MAX_STEPS} steps in total.`);
  const last = proc.steps[proc.steps.length - 1];
  if (last.op !== 'compose') errors.push('The last step must be “Compose proposition”.');
  if (proc.steps.filter((s) => s.op === 'compose').length !== 1) errors.push('There must be exactly one “Compose proposition” step, and it must be last.');
  walk(proc.steps, new Map(), 0, '', errors);
  return { ok: errors.length === 0, errors };
}

function walk(steps, defined, depth, prefix, errors) {
  const cur = new Map(defined);
  const typeOf = (slot) => cur.get(slot)?.type;
  steps.forEach((step, i) => {
    const at = `Step ${prefix}${i + 1}`;
    if (!step || !OPS[step.op]) { errors.push(`${at}: unknown operation.`); return; }
    if (depth > 0 && !BODY_OPS.includes(step.op)) { errors.push(`${at}: “${OPS[step.op].label}” cannot sit inside another conditional or loop.`); return; }

    const need = (slot, types, what) => {
      const d = cur.get(slot);
      if (!slot || !d) { errors.push(`${at}: needs ${what} “${slot || '?'}”, but no earlier step creates it.`); return false; }
      if (d.maybe) { errors.push(`${at}: “${slot}” is only set in one branch of a conditional, so it may be missing here.`); return false; }
      if (types && !types.includes(d.type)) { errors.push(`${at}: “${slot}” holds ${TYPE_NAME[d.type]}, but this step needs ${types.map((t) => TYPE_NAME[t]).join(' or ')}.`); return false; }
      return true;
    };
    const define = (slot, type) => {
      if (!SLOT_RE.test(slot ?? '')) { errors.push(`${at}: the name “${slot ?? ''}” is not valid — use lowercase letters, digits or _, starting with a letter.`); return; }
      if (cur.has(slot)) { errors.push(`${at}: the name “${slot}” is already used by an earlier step.`); return; }
      cur.set(slot, { type });
    };

    switch (step.op) {
      case 'select': {
        if (!BANKS[step.bank]) { errors.push(`${at}: choose a database to select from.`); break; }
        const w = step.where ?? none();
        const wantType = { serves: 'needs', served_by: 'actions', opposes: 'needs', different: step.bank };
        if (w.kind !== 'none') {
          if (!(w.kind in wantType)) { errors.push(`${at}: unknown filter.`); break; }
          if (w.kind === 'serves' && step.bank !== 'actions') errors.push(`${at}: “serves” filters actions only.`);
          if (w.kind === 'served_by' && step.bank !== 'needs') errors.push(`${at}: “is served by” filters needs only.`);
          if (w.kind === 'opposes' && step.bank !== 'needs') errors.push(`${at}: “opposes” filters needs only.`);
          if (!w.slots?.length) errors.push(`${at}: the filter needs at least one earlier choice to refer to.`);
          (w.slots ?? []).forEach((s) => need(s, [wantType[w.kind]], 'the earlier choice'));
        }
        define(step.as, step.bank);
        break;
      }
      case 'derive_property': need(step.from, ['objects'], 'the object'); define(step.as, 'property'); break;
      case 'conventional_function': need(step.from, ['objects'], 'the object'); define(step.as, 'text'); break;
      case 'transform': need(step.fn, ['text', 'property'], 'the function'); need(step.action, ['actions'], 'the action'); define(step.as, 'text'); break;
      case 'tension':
        need(step.a, ['needs'], 'the first need'); need(step.b, ['needs'], 'the second need');
        if (step.a && step.a === step.b) errors.push(`${at}: pick two different needs.`);
        define(step.as, 'text'); break;
      case 'if': {
        if (need(step.slot, ['needs', 'objects', 'actions'], 'the concept to test')) {
          if (!(step.test?.kind in TEST_KINDS)) errors.push(`${at}: choose a test.`);
          else if (step.test.kind === 'weight_gt' ? !Number.isFinite(+step.test.value) : !String(step.test.value ?? '').trim()) errors.push(`${at}: the test needs a value.`);
        }
        const t = walk(step.then ?? [], cur, depth + 1, `${prefix}${i + 1}.then `, errors);
        const e = walk(step.else ?? [], cur, depth + 1, `${prefix}${i + 1}.else `, errors);
        for (const slot of new Set([...t.keys(), ...e.keys()])) {
          if (cur.has(slot)) continue;
          const inT = t.get(slot), inE = e.get(slot), d = inT || inE;
          const both = inT && inE && inT.type === inE.type && !inT.maybe && !inE.maybe;
          cur.set(slot, both ? { type: d.type } : { type: d.type, maybe: true });
        }
        break;
      }
      case 'repeat': {
        const max = step.max;
        if (!Number.isInteger(max) || max < 1 || max > MAX_LOOP) errors.push(`${at}: a loop must repeat between 1 and ${MAX_LOOP} times (so it can never run forever).`);
        if (!step.steps?.length) errors.push(`${at}: the loop has no steps inside.`);
        const body = walk(step.steps ?? [], cur, depth + 1, `${prefix}${i + 1}.loop `, errors);
        for (const [slot, d] of body) if (!cur.has(slot)) cur.set(slot, { type: d.type });
        const u = step.until ?? {};
        if (!(u.kind in UNTIL_KINDS)) errors.push(`${at}: choose a stop condition.`);
        else if (u.kind === 'has_tag') {
          need(u.slot, ['needs', 'objects', 'actions'], 'the concept to check');
          if (!String(u.value ?? '').trim()) errors.push(`${at}: the stop condition needs a tag.`);
        }
        break;
      }
      case 'compose': {
        const tpl = String(step.template ?? '');
        if (!tpl.trim()) { errors.push(`${at}: the template is empty.`); break; }
        for (const m of tpl.matchAll(TEMPLATE_RE)) {
          if (!cur.has(m[1])) errors.push(`${at}: the template uses {${m[1]}}, but no step creates “${m[1]}”.`);
          else if (cur.get(m[1]).maybe) errors.push(`${at}: {${m[1]}} is only set in one branch of a conditional.`);
          if (m[2] && !MODIFIERS.includes(m[2])) errors.push(`${at}: unknown modifier “:${m[2]}” (use ${MODIFIERS.join(', ')}).`);
        }
        break;
      }
    }
  });
  return cur;
}

export const slotNames = (proc, types) => {
  const out = [];
  const visit = (steps) => steps.forEach((s) => {
    const t = { select: s.bank, derive_property: 'property', conventional_function: 'text', transform: 'text', tension: 'text' }[s.op];
    if (t && s.as && (!types || types.includes(t))) out.push(s.as);
    [s.then, s.else, s.steps].filter(Boolean).forEach(visit);
  });
  visit(proc.steps);
  return [...new Set(out)];
};

// ---------------------------------------------------------------- execution

const itemOf = (slots, name) => (slots[name]?.kind === 'item' ? slots[name].item : null);

function matchesFilter(step, cand, slots) {
  const w = step.where ?? none();
  const refs = (w.slots ?? []).map((s) => slots[s]).filter(Boolean);
  switch (w.kind) {
    case 'serves': {
      const serves = tagValues(cand, 'serves');
      return !serves.length || refs.some((r) => r.kind === 'item' && serves.includes(norm(r.item.label)));
    }
    case 'served_by': {
      const act = refs[0]?.item;
      const serves = act ? tagValues(act, 'serves') : [];
      return !serves.length || serves.includes(norm(cand.label));
    }
    case 'opposes': {
      const x = refs[0]?.item;
      if (!x || x.id === cand.id) return false;
      return tagValues(cand, 'opposes').includes(norm(x.label)) || tagValues(x, 'opposes').includes(norm(cand.label));
    }
    case 'different': return refs.every((r) => r.item?.id !== cand.id);
    default: return true;
  }
}

export function describeFilter(step, proc) {
  const w = step.where ?? none();
  if (w.kind === 'none') return 'no filter — any concept is eligible';
  return `${FILTER_KINDS[w.kind]} ${(w.slots ?? []).map((s) => `“${s}”`).join(' or ')}`;
}

function testHolds(test, item) {
  const v = norm(test.value);
  if (test.kind === 'label_is') return norm(item.label) === v;
  if (test.kind === 'weight_gt') return (+item.weight || 0) > +test.value;
  return (item.tags ?? []).map(norm).some((t) => t === v || t.endsWith(':' + v));
}

const chosenIdsFrom = (slots, except) => Object.entries(slots).filter(([k, v]) => k !== except && v.kind === 'item').map(([, v]) => v.item.id);
const isNovel = (slots, usage) => {
  const ids = chosenIdsFrom(slots);
  return !usage.combos.some((cb) => ids.every((id) => cb.includes(id)));
};

/**
 * env: { memory, params, usage, rng, extraFactorsFor?: (bankKey, slots) => (candidate) => [{name,value}] }
 * Returns { text, slots, trace, usedIds }.
 */
export function runProcess(proc, env) {
  const check = validate(proc);
  if (!check.ok) throw new Error('Invalid procedure: ' + check.errors[0]);
  const st = { slots: {}, trace: [], executed: 0 };
  exec(proc.steps, st, env, null);
  const used = [];
  for (const v of Object.values(st.slots)) {
    if (v.kind === 'item') used.push(v.item.id);
    else if (v.propId) used.push(v.propId);
  }
  const text = st.trace[st.trace.length - 1].text;
  return { text, slots: st.slots, trace: st.trace, usedIds: [...new Set(used)] };
}

function exec(steps, st, env, iteration) {
  for (const step of steps) {
    if (++st.executed > MAX_EXECUTED) throw new Error('Procedure ran too many operations and was stopped.');
    const base = { op: step.op, iteration };
    switch (step.op) {
      case 'select': execSelect(step, st, env, base); break;
      case 'derive_property': {
        const obj = itemOf(st.slots, step.from);
        const props = propertyTags(obj);
        if (!props.length) {
          st.slots[step.as] = { kind: 'text', text: 'defining' };
          st.trace.push({ ...base, as: step.as, text: `“${obj.label}” has no property tags, so its property defaults to “defining”.`, note: 'fallback' });
          break;
        }
        const cands = props.map((t) => ({ id: 'prop:' + norm(t), label: t, weight: 1 }));
        const entries = distribution(cands, env.params, env.usage, { chosenIds: chosenIdsFrom(st.slots) });
        const u = env.rng();
        const idx = sampleIndex(entries.map((e) => e.p), u);
        st.slots[step.as] = { kind: 'text', text: entries[idx].label, propId: entries[idx].id };
        st.trace.push({ ...base, as: step.as, bank: 'properties', title: `Derived a property of “${obj.label}”`, entries, u, chosen: entries[idx], text: `Property: ${entries[idx].label}` });
        break;
      }
      case 'conventional_function': {
        const obj = itemOf(st.slots, step.from);
        const fn = tagValues(obj, 'fn')[0];
        const text = fn || 'serve its usual purpose';
        st.slots[step.as] = { kind: 'text', text };
        st.trace.push({ ...base, as: step.as, text: fn ? `Conventional function of “${obj.label}”: ${text}` : `“${obj.label}” has no fn: tag, so its function defaults to “${text}”.`, note: fn ? null : 'fallback' });
        break;
      }
      case 'transform': {
        const act = itemOf(st.slots, step.action);
        const fnText = st.slots[step.fn].text;
        const text = `to ${norm(act.label)} rather than to ${fnText}`;
        st.slots[step.as] = { kind: 'text', text };
        st.trace.push({ ...base, as: step.as, text: `Transformed function: ${text}` });
        break;
      }
      case 'tension': {
        const a = itemOf(st.slots, step.a), b = itemOf(st.slots, step.b);
        const declared = tagValues(a, 'opposes').includes(norm(b.label)) || tagValues(b, 'opposes').includes(norm(a.label));
        const text = declared ? `${norm(a.label)} pulls against ${norm(b.label)}` : `no declared tension between ${norm(a.label)} and ${norm(b.label)} — yours to find`;
        st.slots[step.as] = { kind: 'text', text };
        st.trace.push({ ...base, as: step.as, text: `Tension: ${text}`, note: declared ? null : 'fallback' });
        break;
      }
      case 'if': {
        const item = itemOf(st.slots, step.slot);
        const result = testHolds(step.test, item);
        st.trace.push({ ...base, text: `Test: “${item.label}” ${TEST_KINDS[step.test.kind]} “${step.test.value}” → ${result ? 'true, running THEN steps' : 'false, running ELSE steps'}`, result });
        exec(result ? (step.then ?? []) : (step.else ?? []), st, env, iteration);
        break;
      }
      case 'repeat': {
        for (let round = 1; round <= step.max; round++) {
          st.trace.push({ ...base, op: 'loop', text: `Loop round ${round} of at most ${step.max}` });
          exec(step.steps, st, env, round);
          const u = step.until;
          const met = u.kind === 'novel_combo' ? isNovel(st.slots, env.usage) : testHolds({ kind: 'has_tag', value: u.value }, itemOf(st.slots, u.slot));
          st.trace.push({ ...base, op: 'loop-check', text: `Stop condition (${UNTIL_KINDS[u.kind]}${u.kind === 'has_tag' ? ` “${u.value}”` : ''}): ${met ? 'met — loop ends' : round === step.max ? 'not met — round limit reached, keeping the last result' : 'not met — going round again'}`, met });
          if (met) break;
        }
        break;
      }
      case 'compose': {
        const text = render(step.template, st.slots);
        st.trace.push({ ...base, text, title: 'Composed proposition', template: step.template });
        break;
      }
    }
  }
}

function execSelect(step, st, env, base) {
  const bank = step.bank;
  const all = env.memory[bank];
  let cands = all.filter((c) => matchesFilter(step, c, st.slots));
  let relaxed = false;
  if (!cands.length) {
    relaxed = true;
    cands = step.where?.kind === 'opposes' ? all.filter((c) => c.id !== st.slots[step.where.slots[0]]?.item?.id) : all;
    if (!cands.length) cands = all;
  }
  const entries = distribution(cands, env.params, env.usage, {
    chosenIds: chosenIdsFrom(st.slots, step.as),
    extraFactors: env.extraFactorsFor?.(bank, st.slots),
  });
  const u = env.rng();
  const idx = sampleIndex(entries.map((e) => e.p), u);
  const item = all.find((i) => i.id === entries[idx].id);
  st.slots[step.as] = { kind: 'item', bank, item };
  st.trace.push({
    ...base, as: step.as, bank, entries, u, chosen: entries[idx], eligible: cands.length, total: all.length, relaxed,
    filter: describeFilter(step), title: `Selected ${BANKS[bank].singular}`, text: `${BANKS[bank].singular}: ${item.label}`,
  });
}

export function render(template, slots) {
  const out = String(template).replace(TEMPLATE_RE, (_, name, mod) => {
    const v = slots[name];
    let s = v?.kind === 'item' ? norm(v.item.label) : v?.text ?? '';
    if (mod === 's') s = verbS(s);
    else if (mod === 'ing') s = verbIng(s);
    else if (mod === 'a') s = withArticle(s);
    else if (mod === 'cap') s = capitalize(s);
    return s;
  });
  const sentence = capitalize(out.trim());
  return /[.!?]$/.test(sentence) ? sentence : sentence + '.';
}

// ---------------------------------------------------------------- editing helpers (immutable)

export function locate(proc, path) {
  let arr = proc.steps;
  for (let i = 0; i < path.length - 1; i += 2) arr = arr[path[i]][path[i + 1]];
  return { arr, idx: path[path.length - 1] };
}

function edited(proc, fn) {
  const p = structuredClone(proc);
  fn(p);
  return p;
}

export const updateStep = (proc, path, patch) => edited(proc, (p) => { const { arr, idx } = locate(p, path); arr[idx] = { ...arr[idx], ...patch }; });
export const removeStep = (proc, path) => edited(proc, (p) => { const { arr, idx } = locate(p, path); arr.splice(idx, 1); });
export const moveStep = (proc, path, dir) => edited(proc, (p) => {
  const { arr, idx } = locate(p, path);
  const j = idx + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[idx], arr[j]] = [arr[j], arr[idx]];
});
export const insertStep = (proc, parentPath, index, step) => edited(proc, (p) => {
  const arr = parentPath.length ? locate(p, [...parentPath, 0]).arr : p.steps;
  arr.splice(index, 0, step);
});

export function newSlotName(proc, base = 'x') {
  const used = new Set(slotNames(proc));
  if (!used.has(base)) return base;
  for (let i = 2; ; i++) if (!used.has(base + i)) return base + i;
}

/** Wrap the last top-level select in a bounded "retry until the combination is new" loop. */
export function addNoveltyLoop(proc, max = 3) {
  const p = structuredClone(proc);
  for (let i = p.steps.length - 1; i >= 0; i--) {
    const s = p.steps[i];
    if (s.op === 'repeat') { s.max = max; return p; }
    if (s.op === 'select') {
      p.steps[i] = { op: 'repeat', max, until: { kind: 'novel_combo' }, steps: [{ ...s }] };
      return p;
    }
  }
  throw new Error('This procedure has no selection step to wrap in a loop.');
}

/** Ready-made steps for the "add step" menu. Returns {step} or {error}. */
export function defaultStep(kind, proc) {
  const names = (t) => slotNames(proc, t);
  const topSlots = (t) => names(t).filter((n) => !proc.steps.some((s) => s.op === 'repeat' && s.steps.some((x) => x.as === n)));
  const objects = topSlots(['objects']), needs = topSlots(['needs']), actions = topSlots(['actions']), texts = topSlots(['text', 'property']);
  const any = topSlots(['needs', 'objects', 'actions']);
  const fail = (m) => ({ error: m });
  switch (kind) {
    case 'select_needs': return { step: sel('needs', newSlotName(proc, 'n')) };
    case 'select_objects': return { step: sel('objects', newSlotName(proc, 'o')) };
    case 'select_actions': return { step: sel('actions', newSlotName(proc, 'a')) };
    case 'derive_property': return objects.length ? { step: { op: 'derive_property', from: objects[0], as: newSlotName(proc, 'p') } } : fail('Add an object selection first.');
    case 'conventional_function': return objects.length ? { step: { op: 'conventional_function', from: objects[0], as: newSlotName(proc, 'f') } } : fail('Add an object selection first.');
    case 'transform': return texts.length && actions.length ? { step: { op: 'transform', fn: texts[0], action: actions[0], as: newSlotName(proc, 't') } } : fail('Transform needs a function (text) and an action first.');
    case 'tension': return needs.length >= 2 ? { step: { op: 'tension', a: needs[0], b: needs[1], as: newSlotName(proc, 't') } } : fail('Tension needs two need selections first.');
    case 'if': {
      if (!any.length) return fail('Add a selection first so there is something to test.');
      const x = newSlotName(proc, 'x');
      const thenSel = needs.length ? sel('actions', x, { kind: 'serves', slots: [needs[0]] }) : sel('actions', x);
      return { step: { op: 'if', slot: any[0], test: { kind: 'weight_gt', value: 1.5 }, then: [thenSel], else: [sel('actions', x)] } };
    }
    case 'repeat': return { loop: true };
    default: return fail('Unknown step type.');
  }
}

export function addStepFromMenu(proc, kind, max = 3) {
  const r = defaultStep(kind, proc);
  if (r.error) return r;
  let next;
  try {
    next = r.loop ? addNoveltyLoop(proc, max) : insertStep(proc, [], proc.steps.length - 1, r.step);
  } catch (e) { return { error: e.message }; }
  return { proc: next };
}

/** Rename a slot everywhere it is written or read, including {placeholders} in templates. */
export function renameSlot(proc, from, to) {
  const p = structuredClone(proc);
  const fix = (v) => (v === from ? to : v);
  const visit = (steps) => steps.forEach((s) => {
    for (const k of ['as', 'from', 'fn', 'action', 'a', 'b', 'slot']) if (k in s) s[k] = fix(s[k]);
    if (s.where?.slots) s.where.slots = s.where.slots.map(fix);
    if (s.until?.slot) s.until.slot = fix(s.until.slot);
    if (s.template) s.template = s.template.replace(new RegExp(`\\{${from}(:[a-z]+)?\\}`, 'g'), (_, m) => `{${to}${m ?? ''}}`);
    [s.then, s.else, s.steps].filter(Boolean).forEach(visit);
  });
  visit(p.steps);
  return p;
}
