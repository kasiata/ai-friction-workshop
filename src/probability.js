// PROBABILITY: how one selection step turns candidates into selection probabilities.
//
// For every candidate i, with memory weight w_i, previous selection count c_i and m = memory influence:
//
//   base_i   = 1                                  (uniform mode)
//            = (1 − m) + m · w_i / mean(w)        (all other modes; m=0 ignores weights, m=1 follows them fully)
//   × reinforcement mode : (1 + R · c_i)          R = reinforcement strength  → past choices get more likely
//   × exploration mode   : (1 + E / (1 + c_i))    E = exploration strength    → rarely chosen items get more likely
//   × familiarity        : if choosing i would repeat a combination already generated together with the
//                          items chosen so far in this generation:
//                          (1 + 3·Rep) · (1 − 0.95·Nov)       Nov = novelty preference, Rep = repetition preference
//   × rule factors       : multipliers from participant-created rules (see rules.js)
//
//   p_i = value_i / Σ value        (items that are not eligible are never candidates)

export const MODES = [
  { id: 'uniform', label: 'Uniform', blurb: 'Every eligible concept is equally likely. Weights are ignored.' },
  { id: 'weighted', label: 'Weighted', blurb: 'Likelihood follows the weights you set in memory.' },
  { id: 'reinforcement', label: 'Reinforcement', blurb: 'Concepts chosen before become more likely to be chosen again.' },
  { id: 'exploration', label: 'Exploration', blurb: 'Concepts chosen less often become more likely.' },
];

export const PARAM_DEFS = [
  { key: 'memoryInfluence', label: 'Memory influence', min: 0, max: 1, step: 0.05, formula: 'base = (1 − m) + m · weight / mean weight',
    help: '0 = ignore memory weights, 1 = follow them fully.' },
  { key: 'reinforcement', label: 'Reinforcement strength', min: 0, max: 5, step: 0.25, formula: '× (1 + R · times chosen)', modes: ['reinforcement'],
    help: 'Only used in Reinforcement mode.' },
  { key: 'exploration', label: 'Exploration strength', min: 0, max: 8, step: 0.25, formula: '× (1 + E / (1 + times chosen))', modes: ['exploration'],
    help: 'Only used in Exploration mode.' },
  { key: 'novelty', label: 'Novelty preference', min: 0, max: 1, step: 0.05, formula: 'repeated combination × (1 − 0.95 · N)',
    help: 'Pushes away from combinations already generated. Acts from the second selection onward.' },
  { key: 'repetition', label: 'Repetition preference', min: 0, max: 1, step: 0.05, formula: 'repeated combination × (1 + 3 · Rep)',
    help: 'Pulls toward combinations already generated. Acts from the second selection onward.' },
];

export const DEFAULT_PARAMS = {
  mode: 'weighted',
  memoryInfluence: 1,
  reinforcement: 1,
  exploration: 2,
  novelty: 0,
  repetition: 0,
  seed: 'workshop',
  fixSeed: false, // true: every generation uses exactly the seed text; false: seed text + generation counter
  freeze: false,  // true: selection counts / history of combinations stop changing
};

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(+x) ? +x : lo));

export function normaliseParams(p = {}) {
  const q = { ...DEFAULT_PARAMS, ...p };
  if (!MODES.some((m) => m.id === q.mode)) q.mode = DEFAULT_PARAMS.mode;
  for (const d of PARAM_DEFS) q[d.key] = clamp(q[d.key], d.min, d.max);
  q.seed = String(q.seed ?? '');
  return q;
}

export const emptyUsage = () => ({ counts: {}, combos: [] });

const MAX_COMBOS = 300;

/** Returns a new usage object after a committed generation. ids = every concept id used in it. */
export function recordUsage(usage, ids) {
  const counts = { ...usage.counts };
  for (const id of ids) counts[id] = (counts[id] || 0) + 1;
  const combos = [...usage.combos, [...new Set(ids)].sort()].slice(-MAX_COMBOS);
  return { counts, combos };
}

/**
 * @param candidates [{id,label,weight}]
 * @param ctx {chosenIds: string[], extraFactors: (candidate) => [{name,value}]}
 * @returns [{id,label,weight,count,p,factors:[{name,value}]}] — p sums to 1 (or `fallback` is flagged)
 */
export function distribution(candidates, params, usage = emptyUsage(), ctx = {}) {
  const p = normaliseParams(params);
  const chosen = ctx.chosenIds ?? [];
  const meanW = candidates.length ? candidates.reduce((s, c) => s + (+c.weight || 0), 0) / candidates.length : 0;
  const m = p.mode === 'uniform' ? 0 : p.memoryInfluence;

  const entries = candidates.map((c) => {
    const count = usage.counts[c.id] || 0;
    const factors = [];
    const base = m === 0 || meanW <= 0 ? 1 : (1 - m) + m * ((+c.weight || 0) / meanW);
    factors.push({ name: p.mode === 'uniform' ? 'equal base' : `memory weight (influence ${+m.toFixed(2)})`, value: base });
    if (p.mode === 'reinforcement') factors.push({ name: `reinforcement (chosen ${count}×)`, value: 1 + p.reinforcement * count });
    if (p.mode === 'exploration') factors.push({ name: `exploration (chosen ${count}×)`, value: 1 + p.exploration / (1 + count) });
    if (chosen.length && (p.novelty > 0 || p.repetition > 0)) {
      const familiar = usage.combos.some((cb) => cb.includes(c.id) && chosen.every((id) => cb.includes(id)));
      if (familiar) factors.push({ name: 'repeats an earlier combination', value: (1 + 3 * p.repetition) * (1 - 0.95 * p.novelty) });
    }
    for (const f of ctx.extraFactors?.(c) ?? []) factors.push(f);
    return { id: c.id, label: c.label, weight: c.weight, count, factors, raw: factors.reduce((v, f) => v * f.value, 1) };
  });

  let sum = entries.reduce((s, e) => s + e.raw, 0);
  let fallback = false;
  if (!(sum > 0)) { // every candidate had zero likelihood → fall back to equal chances and say so
    fallback = true;
    entries.forEach((e) => { e.raw = 1; });
    sum = entries.length;
  }
  entries.forEach((e) => { e.p = e.raw / sum; e.fallback = fallback; });
  return entries;
}

/** Pick an index given probabilities and a uniform random number u ∈ [0,1). */
export function sampleIndex(probs, u) {
  let acc = 0, last = 0;
  for (let i = 0; i < probs.length; i++) {
    if (probs[i] > 0) last = i;
    acc += probs[i];
    if (u < acc) return i;
  }
  return last;
}

/** Total variation distance between two {id: p} maps — 0 identical, 1 completely different. */
export function distance(a, b) {
  const ids = new Set([...Object.keys(a), ...Object.keys(b)]);
  let d = 0;
  for (const id of ids) d += Math.abs((a[id] || 0) - (b[id] || 0));
  return d / 2;
}
