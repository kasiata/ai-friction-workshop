import { h } from './dom.js';
import { S, A, genById, currentGen, isLocked } from './state.js';
import { PROMPTS } from '../reflection.js';
import { RULE_TEMPLATES, validateRule, describeRule, proposeRuleFromText } from '../rules.js';
import { BANKS, BANK_KEYS } from '../memory.js';
import { PARAM_DEFS } from '../probability.js';

const draft = () => (S.ui.drafts.rt ??= { templateId: 'boost_item', fields: {}, changes: null });
const tpl = () => RULE_TEMPLATES.find((t) => t.id === draft().templateId);

function fieldsFor(t) {
  const d = draft();
  const f = { ...t.defaults, ...d.fields };
  if (!d.fields.bank && f.bank === undefined) f.bank = 'objects';
  if (!f.ifBank) f.ifBank = 'needs';
  if (!f.thenBank) f.thenBank = 'objects';
  return f;
}

function buildRule() {
  const t = tpl(), d = draft();
  const f = fieldsFor(t);
  const mem = S.config.memory;
  const firstLabel = (bank) => mem[bank][0]?.label;
  switch (t.type) {
    case 'boost_item': return { type: t.type, bank: f.bank, label: f.label ?? mem[f.bank].find((i) => true)?.label, factor: +f.factor };
    case 'boost_tag': return { type: t.type, bank: f.bank, tag: String(f.tag ?? '').trim(), factor: +f.factor };
    case 'affinity': return { type: t.type, ifBank: f.ifBank, ifLabel: f.ifLabel ?? firstLabel(f.ifBank), thenBank: f.thenBank, thenLabel: f.thenLabel ?? firstLabel(f.thenBank), factor: +f.factor };
    case 'set_params': return { type: t.type, changes: d.changes ?? t.defaults.changes };
    case 'novelty_loop': return { type: t.type, max: +f.max };
  }
}

function previewText() {
  const rule = buildRule();
  const errors = validateRule(rule, S.config.memory);
  const blocked = rule.type === 'set_params' && isLocked('probability');
  return { rule, errors, blocked, text: errors.length ? errors[0] : describeRule(rule) + (blocked ? ' — ' + isLocked('probability') : '') };
}
function refreshPreview() {
  const el = document.querySelector('.preview .pv-text');
  if (!el) return;
  const p = previewText();
  el.textContent = p.text;
  el.parentElement.classList.toggle('bad', !!(p.errors.length || p.blocked));
  const b = document.getElementById('apply-rule');
  if (b) b.disabled = !!(p.errors.length || p.blocked);
}

const sel = (value, options, onchange, label) => h('select', { 'aria-label': label, value, onchange: (e) => onchange(e.target.value) }, options.map(([v, l]) => h('option', { value: v }, l)));

function ruleForm() {
  const t = tpl(), d = draft();
  const f = fieldsFor(t);
  const set = (patch, rerender = true) => { Object.assign(d.fields, patch); if (rerender) A.ui({}); else refreshPreview(); };
  const bankOpts = BANK_KEYS.map((b) => [b, BANKS[b].title]);
  const labelOpts = (bank) => S.config.memory[bank].map((i) => [i.label, i.label]);
  const L = (text, el) => h('label', { class: 'f' }, h('span', null, text), el);
  const factor = L('Likelihood multiplier', h('input', { type: 'number', min: 0, max: 20, step: 0.5, value: f.factor, 'aria-label': 'Likelihood multiplier', onchange: (e) => set({ factor: e.target.value }) }));
  const hint = h('p', { class: 'tiny' }, '×1 = no change · ×3 = three times as likely · ×0 = never.');
  switch (t.type) {
    case 'boost_item': return [L('Database', sel(f.bank, bankOpts, (v) => set({ bank: v, label: S.config.memory[v][0]?.label }), 'Database')), L('Concept', sel(f.label ?? S.config.memory[f.bank][0]?.label, labelOpts(f.bank), (v) => set({ label: v }, false), 'Concept')), factor, hint];
    case 'boost_tag': return [L('Database', sel(f.bank, bankOpts, (v) => set({ bank: v }), 'Database')), L('Quality (tag)', h('input', { value: f.tag ?? '', placeholder: 'e.g. shared or threshold', 'aria-label': 'Tag', onchange: (e) => set({ tag: e.target.value }, false) })), factor, hint];
    case 'affinity': return [
      L('When this is chosen', h('span', { class: 'inline' }, sel(f.ifBank, bankOpts, (v) => set({ ifBank: v, ifLabel: S.config.memory[v][0]?.label }), 'If database'), sel(f.ifLabel ?? S.config.memory[f.ifBank][0]?.label, labelOpts(f.ifBank), (v) => set({ ifLabel: v }, false), 'If concept'))),
      L('favour this', h('span', { class: 'inline' }, sel(f.thenBank, bankOpts, (v) => set({ thenBank: v, thenLabel: S.config.memory[v][0]?.label }), 'Then database'), sel(f.thenLabel ?? S.config.memory[f.thenBank][0]?.label, labelOpts(f.thenBank), (v) => set({ thenLabel: v }, false), 'Then concept'))), factor, hint];
    case 'set_params': {
      const ch = d.changes ?? structuredClone(t.defaults.changes);
      d.changes = ch;
      return [h('div', { class: 'f-grid' },
        L('Distribution', sel(ch.mode ?? S.config.params.mode, [['uniform', 'Uniform'], ['weighted', 'Weighted'], ['reinforcement', 'Reinforcement'], ['exploration', 'Exploration']], (v) => { ch.mode = v; }, 'Distribution')),
        PARAM_DEFS.filter((p) => p.key in ch || ['novelty', 'repetition'].includes(p.key)).map((p) => L(p.label, h('input', { type: 'number', min: p.min, max: p.max, step: p.step, value: ch[p.key] ?? S.config.params[p.key], onchange: (e) => { ch[p.key] = +e.target.value; } }))))];
    }
    case 'novelty_loop': return [L('Maximum retries', h('input', { type: 'number', min: 1, max: 5, value: f.max, onchange: (e) => set({ max: e.target.value }, false) })), h('p', { class: 'tiny' }, 'Adds a bounded feedback loop to the process: the last selection is redrawn until the combination has not appeared before (at most this many rounds).')];
  }
}

function proposalCard(p, i) {
  const toTemplate = { boost_item: 'boost_item', boost_tag: 'boost_tag', affinity: 'affinity', novelty_loop: 'novelty_loop', set_params: p.changes?.repetition ? 'familiar' : 'novelty' }[p.type];
  const errs = validateRule(p, S.config.memory);
  return h('div', { class: 'proposal' }, h('strong', null, describeRule(p)), errs.length ? h('small', { class: 'bad' }, ' — ', errs[0]) : null,
    h('button', { class: 'btn ghost', disabled: errs.length > 0, onclick: () => {
      const d = draft();
      d.templateId = toTemplate; d.fields = {}; d.changes = null;
      if (p.type === 'set_params') d.changes = structuredClone(p.changes);
      else { const { type, ...rest } = p; d.fields = rest; }
      A.ui({ nl: { ...S.ui.nl, loaded: i } });
    } }, 'Load into the form to edit'));
}

export function interventionPanel() {
  const gens = S.session.generations;
  const g = genById(S.ui.interventionId) ?? currentGen();
  const lockedP = isLocked('probability');
  const t = tpl();
  const rule = g ? buildRule() : null;
  const errors = rule ? validateRule(rule, S.config.memory) : [];
  const blocked = rule?.type === 'set_params' && lockedP;
  const interest = h('textarea', { rows: 2, placeholder: 'In your own words…', 'aria-label': PROMPTS.interest, oninput: (e) => A.draft('interest', e.target.value) }, S.ui.drafts.interest ?? '');
  const ruleText = h('textarea', { rows: 2, placeholder: 'Describe the rule as you would explain it to a colleague…', 'aria-label': PROMPTS.rule, oninput: (e) => A.draft('ruleText', e.target.value) }, S.ui.drafts.ruleText ?? '');
  const nlIn = h('input', { placeholder: 'e.g. when belonging appears, favour garden', 'aria-label': 'Describe a rule in words', value: S.ui.drafts.nlText ?? '',
    oninput: (e) => A.draft('nlText', e.target.value), onkeydown: (e) => { if (e.key === 'Enter') propose(); } });
  const propose = () => A.ui({ nl: { text: nlIn.value, ...proposeRuleFromText(nlIn.value, S.config.memory) } });
  const after = S.ui.afterRule;
  const afterNote = h('textarea', { rows: 2, placeholder: 'Optional', 'aria-label': PROMPTS.intention, oninput: (e) => A.draft('afterRule', e.target.value) }, S.ui.drafts.afterRule ?? '');

  return h('section', { class: 'card', id: 'intervention', 'aria-labelledby': 'h-int' },
    h('div', { class: 'card-head' }, h('h2', { id: 'h-int' }, 'Turn an intuition into a rule'), h('small', { class: 'meta' }, 'Your interpretation, written down — the machine does not guess it for you.')),
    !gens.length ? h('p', { class: 'hint' }, 'Generate at least one idea first, then choose one that surprised or interested you.') : h('div', { class: 'int-grid' },
      h('div', null,
        h('label', { class: 'lbl' }, '1 · Choose an idea', sel(g?.id, gens.slice().reverse().map((x) => [x.id, `#${x.n} ${x.saved ? '★ ' : ''}${x.proposition.slice(0, 60)}`]), (v) => A.ui({ interventionId: v }), 'Idea to work from')),
        g && h('blockquote', { class: 'quote' }, g.proposition),
        h('label', { class: 'lbl' }, '2 · ' + PROMPTS.interest), interest,
        h('label', { class: 'lbl' }, '3 · ' + PROMPTS.rule), ruleText),
      h('div', null,
        h('label', { class: 'lbl' }, '4 · Make the rule explicit — pick a template',
          sel(t.id, RULE_TEMPLATES.map((x) => [x.id, x.label]), (v) => { const d = draft(); d.templateId = v; d.fields = {}; d.changes = null; A.ui({}); }, 'Rule template')),
        h('div', { class: 'rule-form' }, ruleForm()),
        h('details', { class: 'fold' }, h('summary', null, 'Or describe it in words (limited, rule-based helper — no AI)'),
          h('div', { class: 'row' }, nlIn, h('button', { class: 'btn', onclick: propose }, 'Propose')),
          S.ui.nl && h('div', { class: 'nl' },
            S.ui.nl.notes?.map((n) => h('p', { class: 'tiny' }, n)),
            S.ui.nl.proposals?.map(proposalCard),
            S.ui.nl.proposals?.length > 0 && h('p', { class: 'tiny' }, 'Nothing is applied until you confirm below.'))),
        rule && h('div', { class: 'preview ' + (errors.length || blocked ? 'bad' : '') },
          h('strong', null, 'Proposed change: '), h('span', { class: 'pv-text' }, errors.length ? errors[0] : describeRule(rule) + (blocked ? ' — ' + lockedP : ''))),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', id: 'apply-rule', disabled: !g || errors.length > 0 || blocked,
          onclick: () => A.applyIntuitionRule({ genId: g.id, interest: interest.value, ruleText: ruleText.value, rule: previewText().rule }) }, 'Confirm and apply rule'))),
    ),
    after && h('div', { class: 'msg ok', role: 'status' },
      h('strong', null, 'Rule applied and linked to idea #', genById(after.genId)?.n, '. '), 'Generate again and look for “rule:” factors in the trace.',
      h('label', { class: 'lbl' }, PROMPTS.intention), afterNote,
      h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: () => { A.saveReflection('intention', afterNote.value); A.draft('afterRule', ''); A.ui({ afterRule: null }); } }, 'Save reflection'),
        h('button', { class: 'btn ghost', onclick: () => A.ui({ afterRule: null }) }, 'Dismiss'))),
    S.session.rules.length > 0 && h('div', { class: 'rules-list' }, h('strong', null, 'Your rules'),
      S.session.rules.map((r) => {
        const live = S.config.rules.find((x) => x.id === r.id);
        return h('div', { class: 'rule-row' },
          live ? h('label', { class: 'switch small' }, h('input', { type: 'checkbox', checked: live.enabled !== false, onchange: () => A.toggleRule(r.id) }), h('span', null, r.description)) : h('span', null, r.description, h('small', { class: 'tiny' }, ' (applied once)')),
          h('small', { class: 'tiny' }, ` ← from idea #${genById(r.genId)?.n}${r.interest ? ` “${r.interest.slice(0, 50)}”` : ''}`));
      })),
  );
}
