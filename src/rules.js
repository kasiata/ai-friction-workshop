// RULES: explicit, structured rules that a participant writes down after noticing something interesting.
// Every rule is plain data validated against RULE_SCHEMA (docs/rule-schema.md). Rules never contain code.
//
//   boost_item   {bank, label, factor}                        multiply one concept's likelihood
//   boost_tag    {bank, tag, factor}                          multiply every concept carrying a tag
//   affinity     {ifBank, ifLabel, thenBank, thenLabel, factor}  relationship rule: when X was already chosen, favour Y
//   set_params   {changes: {novelty: 0.6, ...}}               change probability settings (applied once)
//   novelty_loop {max}                                        wrap the last selection in a bounded retry-until-new loop (applied once)

import { BANK_KEYS, BANKS, norm } from './memory.js';
import { normaliseParams, PARAM_DEFS } from './probability.js';
import { addNoveltyLoop, validate, MAX_LOOP } from './process.js';

export const PERSISTENT_TYPES = ['boost_item', 'boost_tag', 'affinity'];
export const RULE_TYPES = ['boost_item', 'boost_tag', 'affinity', 'set_params', 'novelty_loop'];
const MAX_FACTOR = 20;

export const RULE_SCHEMA = {
  boost_item: { required: ['bank', 'label', 'factor'] },
  boost_tag: { required: ['bank', 'tag', 'factor'] },
  affinity: { required: ['ifBank', 'ifLabel', 'thenBank', 'thenLabel', 'factor'] },
  set_params: { required: ['changes'] },
  novelty_loop: { required: ['max'] },
};

let ruleCounter = 0;
export const newRuleId = () => `rule-${Date.now().toString(36)}-${(ruleCounter++).toString(36)}`;

export function validateRule(rule, memory) {
  const errors = [];
  if (!rule || typeof rule !== 'object') return ['The rule is empty.'];
  if (!RULE_TYPES.includes(rule.type)) return [`Unknown rule type “${rule.type}”. Available: ${RULE_TYPES.join(', ')}.`];
  for (const k of RULE_SCHEMA[rule.type].required) if (rule[k] == null || rule[k] === '') errors.push(`The rule is missing “${k}”.`);
  if (errors.length) return errors;
  const hasLabel = (bank, label) => memory?.[bank]?.some((i) => norm(i.label) === norm(label));
  const checkBank = (b) => { if (!BANK_KEYS.includes(b)) errors.push(`“${b}” is not a database (needs, objects, actions).`); return BANK_KEYS.includes(b); };
  const checkFactor = () => { const f = Number(rule.factor); if (!Number.isFinite(f) || f < 0 || f > MAX_FACTOR) errors.push(`The factor must be a number between 0 and ${MAX_FACTOR}.`); };
  switch (rule.type) {
    case 'boost_item':
      if (checkBank(rule.bank) && memory && !hasLabel(rule.bank, rule.label)) errors.push(`“${rule.label}” is not in the ${BANKS[rule.bank].title} database.`);
      checkFactor(); break;
    case 'boost_tag': checkBank(rule.bank); checkFactor(); break;
    case 'affinity':
      if (checkBank(rule.ifBank) && memory && !hasLabel(rule.ifBank, rule.ifLabel)) errors.push(`“${rule.ifLabel}” is not in the ${BANKS[rule.ifBank].title} database.`);
      if (checkBank(rule.thenBank) && memory && !hasLabel(rule.thenBank, rule.thenLabel)) errors.push(`“${rule.thenLabel}” is not in the ${BANKS[rule.thenBank].title} database.`);
      checkFactor(); break;
    case 'set_params': {
      const keys = Object.keys(rule.changes ?? {});
      if (!keys.length) errors.push('No settings to change.');
      for (const k of keys) {
        const d = PARAM_DEFS.find((x) => x.key === k) ?? (k === 'mode' ? { min: 0, max: 0 } : null);
        if (!d) errors.push(`“${k}” is not a probability setting.`);
        else if (k === 'mode' ? !['uniform', 'weighted', 'reinforcement', 'exploration'].includes(rule.changes[k]) : !(Number(rule.changes[k]) >= d.min && Number(rule.changes[k]) <= d.max)) errors.push(`“${k}” is out of range.`);
      }
      break;
    }
    case 'novelty_loop':
      if (!Number.isInteger(Number(rule.max)) || rule.max < 1 || rule.max > MAX_LOOP) errors.push(`The loop must repeat 1–${MAX_LOOP} times.`);
      break;
  }
  return errors;
}

/** Builds the function the selection step uses to ask "what do the active rules say about this candidate?" */
export function makeExtraFactorsFor(rules = []) {
  const active = rules.filter((r) => r.enabled !== false && PERSISTENT_TYPES.includes(r.type));
  return (bank, slots) => (cand) => {
    const out = [];
    for (const r of active) {
      const f = Number(r.factor);
      if (r.type === 'boost_item' && r.bank === bank && norm(cand.label) === norm(r.label)) out.push({ name: `rule: ${describeRule(r)}`, value: f });
      else if (r.type === 'boost_tag' && r.bank === bank && (cand.tags ?? []).map(norm).some((t) => t === norm(r.tag) || t.endsWith(':' + norm(r.tag)))) out.push({ name: `rule: ${describeRule(r)}`, value: f });
      else if (r.type === 'affinity' && r.thenBank === bank && norm(cand.label) === norm(r.thenLabel)
        && Object.values(slots ?? {}).some((s) => s.kind === 'item' && s.bank === r.ifBank && norm(s.item.label) === norm(r.ifLabel))) out.push({ name: `rule: ${describeRule(r)}`, value: f });
    }
    return out;
  };
}

export function describeRule(r) {
  const x = (f) => (Number(f) === 0 ? 'never' : `×${+Number(f).toFixed(2)}`);
  switch (r.type) {
    case 'boost_item': return `${r.label} ${x(r.factor)}`;
    case 'boost_tag': return `anything tagged “${r.tag}” ${x(r.factor)}`;
    case 'affinity': return `when ${r.ifLabel} is chosen, ${r.thenLabel} ${x(r.factor)}`;
    case 'set_params': return 'set ' + Object.entries(r.changes).map(([k, v]) => `${k} = ${v}`).join(', ');
    case 'novelty_loop': return `retry the last selection up to ${r.max}× until the combination is new`;
    default: return r.type;
  }
}

/** Applies a validated rule to a config copy. Persistent rules are appended; one-shot rules change settings/process. */
export function applyRule(config, rule) {
  const errors = validateRule(rule, config.memory);
  if (errors.length) throw new Error(errors[0]);
  const next = structuredClone(config);
  if (PERSISTENT_TYPES.includes(rule.type)) next.rules = [...(next.rules ?? []), { enabled: true, ...rule }];
  else if (rule.type === 'set_params') next.params = normaliseParams({ ...next.params, ...rule.changes });
  else if (rule.type === 'novelty_loop') {
    next.process = addNoveltyLoop(next.process, Number(rule.max));
    const v = validate(next.process);
    if (!v.ok) throw new Error(v.errors[0]);
  }
  return next;
}

/** Templates shown in the "turn an intuition into a rule" panel. */
export const RULE_TEMPLATES = [
  { id: 'boost_item', label: 'Favour a specific concept', type: 'boost_item', fields: ['bank', 'label', 'factor'], defaults: { factor: 3 } },
  { id: 'boost_tag', label: 'Favour concepts with a quality (tag)', type: 'boost_tag', fields: ['bank', 'tag', 'factor'], defaults: { factor: 3 } },
  { id: 'affinity', label: 'Add a relationship: when X appears, favour Y', type: 'affinity', fields: ['ifBank', 'ifLabel', 'thenBank', 'thenLabel', 'factor'], defaults: { factor: 5 } },
  { id: 'novelty', label: 'Seek unusual combinations (change probability settings)', type: 'set_params', fields: [], defaults: { changes: { mode: 'exploration', novelty: 0.7, exploration: 4 } } },
  { id: 'familiar', label: 'Stay with familiar combinations (change probability settings)', type: 'set_params', fields: [], defaults: { changes: { mode: 'reinforcement', repetition: 0.7, reinforcement: 2 } } },
  { id: 'novelty_loop', label: 'Change the process: retry until the combination is new', type: 'novelty_loop', fields: ['max'], defaults: { max: 3 } },
];

// ---------------------------------------------------------------- limited natural-language parser (Version 1)
// A future LLM may translate free text into the same rule objects. Whatever produces a proposal, the app
// must (1) show it, (2) let the participant edit it, (3) validate it with validateRule, (4) require confirmation.

export function proposeRuleFromText(text, memory) {
  const t = norm(text);
  const proposals = [], notes = [];
  if (!t) return { ok: false, proposals, notes: ['Write a sentence describing the behaviour you want.'] };

  if (/(unusual|novel|unfamiliar|rare|surpris|strange|never seen|new) .*(combination|pairing|mix)|(combination|pairing).*(unusual|novel|new|rare)/.test(t) || /favou?r (the )?(unusual|novel|unfamiliar)/.test(t)) {
    proposals.push({ type: 'set_params', changes: { mode: 'exploration', novelty: 0.7, exploration: 4 } });
    if (/remember|gradually|learn/.test(t)) notes.push('“Remember … and gradually favour” cannot be expressed exactly: reinforcement favours single concepts, not combinations. I approximated with exploration + novelty.');
  }
  if (/(familiar|repeat|same|again|stick)/.test(t) && !proposals.length) proposals.push({ type: 'set_params', changes: { mode: 'reinforcement', repetition: 0.7, reinforcement: 2 } });
  if (/(retry|try again|until (it is |it's )?new|until different)/.test(t)) proposals.push({ type: 'novelty_loop', max: 3 });

  const find = (phrase) => {
    for (const bank of BANK_KEYS) {
      const hit = memory[bank].find((i) => norm(i.label) === norm(phrase) || norm(phrase).includes(norm(i.label)));
      if (hit) return { bank, item: hit };
    }
    return null;
  };
  const when = t.match(/(?:when|if|whenever) (?:there is |there's |a |an |the )?(.+?)(?:,| then| appears| shows up| is chosen)+ ?(?:then )?(?:favou?r|prefer|use|choose|pick) (?:more )?(.+)/);
  if (when) {
    const a = find(when[1]), b = find(when[2]);
    if (a && b) proposals.push({ type: 'affinity', ifBank: a.bank, ifLabel: a.item.label, thenBank: b.bank, thenLabel: b.item.label, factor: 5 });
    else notes.push(`I could not match ${!a ? `“${when[1]}”` : `“${when[2]}”`} to a concept in memory. Add it to memory first, or use the rule form.`);
  } else {
    const fav = t.match(/(?:favou?r|prefer|more|boost|use more|choose more) (?:of )?(?:the )?(.+)/);
    const avoid = t.match(/(?:avoid|less|never|fewer|discourage) (?:of )?(?:the )?(.+)/);
    for (const [m, factor] of [[fav, 3], [avoid, 0.2]]) {
      if (!m) continue;
      const hit = find(m[1]);
      if (hit) proposals.push({ type: 'boost_item', bank: hit.bank, label: hit.item.label, factor });
      else {
        const word = norm(m[1]).split(' ').pop();
        const bank = BANK_KEYS.find((b) => memory[b].some((i) => (i.tags ?? []).map(norm).some((tag) => tag === word || tag.endsWith(':' + word))));
        if (bank) proposals.push({ type: 'boost_tag', bank, tag: word, factor });
        else if (!proposals.length) notes.push(`I could not find “${m[1]}” as a concept or tag in memory.`);
      }
    }
  }
  if (!proposals.length) {
    notes.push('I can only represent: favouring or avoiding a concept or tag, “when X appears, favour Y”, seeking unusual or familiar combinations, and retrying until a combination is new. Try rephrasing, or build the rule with the form.');
    return { ok: false, proposals, notes };
  }
  return { ok: true, proposals, notes };
}
