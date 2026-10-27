import { h } from './dom.js';
import { S, A, isLocked, savedArchitectures } from './state.js';
import {
  ARCHITECTURES, OPS, FILTER_KINDS, TEST_KINDS, UNTIL_KINDS, MAX_LOOP, validate, slotNames,
  updateStep, removeStep, moveStep, insertStep, addStepFromMenu, defaultStep, renameSlot, locate,
} from '../process.js';
import { BANKS } from '../memory.js';

const proc = () => S.config.process;
const edit = (next, what) => A.editProcess(next, what);

const sel = (value, options, onchange, label) => h('select', { value, 'aria-label': label, onchange: (e) => onchange(e.target.value) },
  options.map(([v, l]) => h('option', { value: v }, l)));
const slotSel = (value, onchange, label, types) => sel(value ?? '', [['', '—'], ...slotNames(proc(), types).map((n) => [n, n])], onchange, label);
const field = (label, ...els) => h('label', { class: 'f' }, h('span', null, label), ...els);

function summary(step) {
  switch (step.op) {
    case 'select': return `Select ${BANKS[step.bank].singular} → ${step.as}`;
    case 'derive_property': return `Derive a property of ${step.from} → ${step.as}`;
    case 'conventional_function': return `Read usual function of ${step.from} → ${step.as}`;
    case 'transform': return `Transform ${step.fn} using ${step.action} → ${step.as}`;
    case 'tension': return `Tension between ${step.a} and ${step.b} → ${step.as}`;
    case 'if': return `If ${step.slot} ${TEST_KINDS[step.test.kind] ?? '…'} “${step.test.value}”`;
    case 'repeat': return `Repeat up to ${step.max}× until ${UNTIL_KINDS[step.until?.kind] ?? '…'}`;
    case 'compose': return 'Compose the proposition';
  }
}

function detail(step) {
  if (step.op === 'select') {
    const w = step.where;
    return w && w.kind !== 'none' ? `filter: ${FILTER_KINDS[w.kind]} ${w.slots.join(' / ')}` : 'any concept eligible';
  }
  if (step.op === 'compose') return `“${step.template}”`;
  return OPS[step.op].label;
}

function editors(step, path) {
  const set = (patch, what) => edit(updateStep(proc(), path, patch), what ?? `edited step ${path.filter((x) => typeof x === 'number').map((x) => x + 1).join('.')}`);
  switch (step.op) {
    case 'select': {
      const w = step.where ?? { kind: 'none', slots: [] };
      const kinds = Object.entries(FILTER_KINDS);
      const wantType = { serves: ['needs'], served_by: ['actions'], opposes: ['needs'], different: [step.bank] }[w.kind];
      return [
        field('From', sel(step.bank, Object.values(BANKS).map((b) => [b.key, b.title]), (v) => set({ bank: v }), 'Database')),
        field('Name', h('input', { value: step.as, size: 6, 'aria-label': 'Slot name', onchange: (e) => edit(renameSlot(updateStep(proc(), path, {}), step.as, e.target.value.trim()), `renamed ${step.as}`) })),
        field('Filter', sel(w.kind, kinds, (v) => set({ where: { kind: v, slots: v === 'none' ? [] : w.slots.slice(0, 1) } }), 'Filter')),
        w.kind !== 'none' && field('refers to', slotSel(w.slots[0], (v) => set({ where: { ...w, slots: [v, ...w.slots.slice(1)].filter(Boolean) } }), 'First reference', wantType),
          w.kind === 'serves' && slotSel(w.slots[1], (v) => set({ where: { ...w, slots: [w.slots[0], v].filter(Boolean) } }), 'Second reference (optional)', wantType)),
      ];
    }
    case 'derive_property':
    case 'conventional_function':
      return [field('Object', slotSel(step.from, (v) => set({ from: v }), 'Object', ['objects'])), nameField(step, path)];
    case 'transform':
      return [field('Function', slotSel(step.fn, (v) => set({ fn: v }), 'Function', ['text', 'property'])), field('Action', slotSel(step.action, (v) => set({ action: v }), 'Action', ['actions'])), nameField(step, path)];
    case 'tension':
      return [field('Need 1', slotSel(step.a, (v) => set({ a: v }), 'First need', ['needs'])), field('Need 2', slotSel(step.b, (v) => set({ b: v }), 'Second need', ['needs'])), nameField(step, path)];
    case 'if':
      return [
        field('Test', slotSel(step.slot, (v) => set({ slot: v }), 'Concept to test', ['needs', 'objects', 'actions']),
          sel(step.test.kind, Object.entries(TEST_KINDS), (v) => set({ test: { ...step.test, kind: v } }), 'Test kind'),
          h('input', { value: step.test.value, size: 8, 'aria-label': 'Test value', onchange: (e) => set({ test: { ...step.test, value: e.target.value } }) })),
      ];
    case 'repeat':
      return [
        field('Rounds (max)', h('input', { type: 'number', min: 1, max: MAX_LOOP, value: step.max, 'aria-label': 'Maximum rounds', onchange: (e) => set({ max: parseInt(e.target.value, 10) }) })),
        field('Stop when', sel(step.until.kind, Object.entries(UNTIL_KINDS), (v) => set({ until: v === 'has_tag' ? { kind: v, slot: slotNames(proc())[0], value: 'public' } : { kind: v } }), 'Stop condition'),
          step.until.kind === 'has_tag' && [slotSel(step.until.slot, (v) => set({ until: { ...step.until, slot: v } }), 'Concept', ['needs', 'objects', 'actions']),
            h('input', { value: step.until.value, size: 8, 'aria-label': 'Tag', onchange: (e) => set({ until: { ...step.until, value: e.target.value } }) })]),
      ];
    case 'compose': {
      const names = slotNames(proc());
      return [field('Template', h('textarea', { rows: 2, 'aria-label': 'Sentence template', onchange: (e) => set({ template: e.target.value }) }, step.template)),
        h('div', { class: 'tiny' }, 'Available: ', names.map((n) => h('code', { class: 'slotchip' }, `{${n}}`)), ' modifiers: ', h('code', null, ':s :ing :a :cap'))];
    }
  }
  return [];
}
const nameField = (step, path) => field('Name', h('input', { value: step.as, size: 6, 'aria-label': 'Slot name', onchange: (e) => edit(renameSlot(proc(), step.as, e.target.value.trim()), `renamed ${step.as}`) }));

const BODY_MENU = [['', '＋ add step…'], ['select_needs', 'Select a need'], ['select_objects', 'Select an object'], ['select_actions', 'Select an action'],
  ['derive_property', 'Derive a property'], ['conventional_function', 'Read usual function'], ['transform', 'Transform function'], ['tension', 'Identify tension']];

function addInto(parentPath, key, count) {
  return sel('', BODY_MENU, (v) => {
    if (!v) return;
    const r = defaultStep(v, proc());
    if (r.error) return A.ui({ toast: { msg: r.error, kind: 'error' } });
    edit(insertStep(proc(), [...parentPath, key], count, r.step), 'added a step inside a block');
  }, 'Add step inside');
}

function stepCard(step, path, idx, total, editing) {
  const isCompose = step.op === 'compose';
  const nested = [];
  const body = (key, title) => {
    const arr = step[key] ?? [];
    const p = [...path, key];
    nested.push(h('div', { class: 'nest' }, h('div', { class: 'nest-title' }, title),
      arr.map((s, i) => stepCard(s, [...p, i], i, arr.length, editing)),
      editing && h('div', { class: 'add-in' }, addInto(path, key, arr.length))));
  };
  if (step.op === 'if') { body('then', 'THEN'); body('else', 'ELSE'); }
  if (step.op === 'repeat') body('steps', 'EACH ROUND');
  const num = path.filter((x) => typeof x === 'number').map((x) => x + 1).join('.');

  return h('div', { class: `node op-${step.op}` },
    h('div', { class: 'node-main' },
      h('span', { class: 'node-n' }, num),
      h('div', { class: 'node-text' }, h('strong', null, summary(step)), h('small', null, detail(step))),
      editing && !isCompose && h('span', { class: 'node-ctl' },
        h('button', { class: 'icon-btn', title: 'Move up', 'aria-label': 'Move step up', disabled: idx === 0, onclick: () => edit(moveStep(proc(), path, -1), 'reordered steps') }, '↑'),
        h('button', { class: 'icon-btn', title: 'Move down', 'aria-label': 'Move step down', disabled: idx >= total - (path.length === 1 ? 2 : 1), onclick: () => edit(moveStep(proc(), path, 1), 'reordered steps') }, '↓'),
        h('button', { class: 'icon-btn', title: 'Remove step', 'aria-label': 'Remove step', onclick: () => edit(removeStep(proc(), path), 'removed a step') }, '×'))),
    editing && h('div', { class: 'node-edit' }, editors(step, path)),
    nested);
}

export function processPanel() {
  const lock = isLocked('process');
  const p = proc();
  const v = validate(p);
  const editing = S.ui.procEdit;
  const saved = savedArchitectures();
  const nameIn = h('input', { placeholder: 'Name this architecture…', 'aria-label': 'Architecture name' });

  const cards = Object.values(ARCHITECTURES).map((a) => h('button', { class: 'arch' + (p.id === a.id ? ' on' : ''), disabled: !!lock, 'aria-pressed': String(p.id === a.id), onclick: () => A.setArchitecture(a.id) },
    h('strong', null, a.name), h('span', null, a.blurb)));

  const addMenu = sel('', [['', '＋ add step…'], ['select_needs', 'Select a need'], ['select_objects', 'Select an object'], ['select_actions', 'Select an action'],
    ['derive_property', 'Derive a property'], ['conventional_function', 'Read usual function'], ['transform', 'Transform function'], ['tension', 'Identify tension'],
    ['if', 'Conditional (if / then / else)'], ['repeat', 'Feedback loop around the last selection']], (val) => {
    if (!val) return;
    const r = addStepFromMenu(p, val);
    if (r.error) return A.ui({ toast: { msg: r.error, kind: 'error' } });
    edit(r.proc, `added step (${val})`);
  }, 'Add a step');

  return h('div', { class: 'panel-body' },
    lock && h('p', { class: 'lock-note' }, '🔒 ', lock),
    h('p', { class: 'hint' }, 'The process decides the order and dependencies of choices. The three architectures start from different places, so their ideas relate the same concepts differently.'),
    h('div', { class: 'archs' }, cards),
    saved.length > 0 && h('div', { class: 'saved-archs' }, h('small', null, 'Saved by you: '), saved.map((a) => h('span', { class: 'chip-btn' },
      h('button', { class: 'chip' + (p.id === a.id ? ' on' : ''), onclick: () => A.setArchitecture(a.id) }, a.name),
      h('button', { class: 'icon-btn', title: 'Delete saved architecture', 'aria-label': `Delete ${a.name}`, onclick: () => A.deleteArchitecture(a.id) }, '×')))),
    h('div', { class: 'flow-head' }, h('strong', null, p.name), h('span', { class: 'spacer' }),
      h('label', { class: 'switch small' }, h('input', { type: 'checkbox', checked: editing, disabled: !!lock, onchange: (e) => A.ui({ procEdit: e.target.checked }) }), h('span', null, 'Edit procedure (advanced)'))),
    h('div', { class: 'flow' }, p.steps.map((s, i) => h('div', { class: 'flow-item' }, stepCard(s, [i], i, p.steps.length, editing && !lock), i < p.steps.length - 1 && h('div', { class: 'arrow', 'aria-hidden': 'true' }, '↓')))),
    !v.ok && h('div', { class: 'msg error', role: 'alert' }, h('strong', null, 'This procedure cannot run:'), h('ul', null, v.errors.map((e) => h('li', null, e)))),
    editing && !lock && h('div', { class: 'row wrap' }, addMenu, h('span', { class: 'spacer' }), nameIn, h('button', { class: 'btn', onclick: () => A.saveArchitecture(nameIn.value) }, 'Save architecture')),
    h('details', { class: 'fold' }, h('summary', null, 'Vocabulary of operations'),
      h('dl', { class: 'vocab' }, Object.entries(OPS).map(([k, o]) => [h('dt', null, o.label), h('dd', null, o.doc)])),
      h('p', { class: 'tiny' }, 'Procedures can only combine these operations. They are checked before every run: each step may only use choices made earlier, loops stop after at most ', MAX_LOOP, ' rounds, and no code can be entered.')),
  );
}
