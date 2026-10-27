// IDEA GENERATION: the pure function that turns (configuration, learned state, seed) into one proposition + trace.
// "Pure" is what makes reproduction exact: the same three inputs always give the same output.

import { createRng } from './prng.js';
import { runProcess } from './process.js';
import { makeExtraFactorsFor } from './rules.js';
import { distribution, normaliseParams, recordUsage } from './probability.js';
import { BANK_KEYS } from './memory.js';

/** Seed for the n-th generation: fixed text, or text + counter so each click differs but remains reproducible. */
export function generationSeed(params, n) {
  return params.fixSeed ? String(params.seed) : `${params.seed}#${n}`;
}

export function generate(config, usage, seed) {
  const params = normaliseParams(config.params);
  const rng = createRng(seed);
  const run = runProcess(config.process, {
    memory: config.memory, params, usage, rng,
    extraFactorsFor: makeExtraFactorsFor(config.rules),
  });
  const slots = {};
  for (const [k, v] of Object.entries(run.slots)) slots[k] = v.kind === 'item' ? { kind: 'item', bank: v.bank, id: v.item.id, label: v.item.label } : { kind: 'text', text: v.text };
  return { seed: String(seed), proposition: run.text, trace: run.trace, slots, usedIds: run.usedIds };
}

/** New learned state after a committed generation (unless probabilities are frozen). */
export function commitUsage(usage, result, params) {
  return params.freeze ? usage : recordUsage(usage, result.usedIds);
}

/** Unconditional probabilities for one database right now (what the bar chart shows). */
export function bankDistribution(config, usage, bank) {
  return distribution(config.memory[bank], normaliseParams(config.params), usage, { chosenIds: [], extraFactors: makeExtraFactorsFor(config.rules)(bank, {}) });
}

/**
 * Generate many samples from the same state without changing it — to look at the *distribution* the system produces.
 * Returns how often each concept appeared and how many different propositions came out.
 */
export function sample(config, usage, baseSeed, n) {
  const tallies = Object.fromEntries(BANK_KEYS.map((b) => [b, {}]));
  const propositions = new Map();
  const idToBank = {};
  for (const b of BANK_KEYS) for (const i of config.memory[b]) idToBank[i.id] = b;
  for (let k = 0; k < n; k++) {
    const r = generate(config, usage, `${baseSeed}~sample${k}`);
    for (const id of r.usedIds) if (idToBank[id]) tallies[idToBank[id]][id] = (tallies[idToBank[id]][id] || 0) + 1;
    propositions.set(r.proposition, (propositions.get(r.proposition) || 0) + 1);
  }
  return { n, tallies, unique: propositions.size, top: [...propositions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5) };
}
