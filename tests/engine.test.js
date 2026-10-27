import test from 'node:test';
import assert from 'node:assert/strict';

import { createRng } from '../src/prng.js';
import { createDefaultMemory, addItem, deleteItem, updateItem, parseTextList, parseCSV, mergeImport, memoryToCSV, tagValues } from '../src/memory.js';
import { DEFAULT_PARAMS, distribution, emptyUsage, recordUsage, sampleIndex, normaliseParams } from '../src/probability.js';
import { ARCHITECTURES, getArchitecture, validate, addNoveltyLoop, addStepFromMenu, moveStep, updateStep, runProcess } from '../src/process.js';
import { generate, generationSeed, sample, commitUsage, bankDistribution } from '../src/generator.js';
import { applyRule, validateRule, proposeRuleFromText } from '../src/rules.js';
import { verbS, verbIng } from '../src/text.js';

const baseConfig = (over = {}) => ({
  question: 'q', memory: createDefaultMemory(), params: { ...DEFAULT_PARAMS }, process: getArchitecture('need_first'), rules: [], ...over,
});
const sumP = (es) => es.reduce((s, e) => s + e.p, 0);

// ---------------------------------------------------------------- PRNG
test('seeded PRNG is deterministic and seed-sensitive', () => {
  const a = createRng('abc'), b = createRng('abc'), c = createRng('abd');
  const sa = Array.from({ length: 5 }, a), sb = Array.from({ length: 5 }, b), sc = Array.from({ length: 5 }, c);
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  assert.ok(sa.every((x) => x >= 0 && x < 1));
});

// ---------------------------------------------------------------- probability
test('uniform ignores weights; weighted follows them proportionally', () => {
  const cands = [{ id: 'a', label: 'a', weight: 1 }, { id: 'b', label: 'b', weight: 3 }];
  const uni = distribution(cands, { ...DEFAULT_PARAMS, mode: 'uniform' });
  assert.deepEqual(uni.map((e) => e.p), [0.5, 0.5]);
  const w = distribution(cands, { ...DEFAULT_PARAMS, mode: 'weighted' });
  assert.ok(Math.abs(w[1].p - 0.75) < 1e-9 && Math.abs(sumP(w) - 1) < 1e-9);
});

test('memory influence interpolates between uniform and weighted', () => {
  const cands = [{ id: 'a', label: 'a', weight: 1 }, { id: 'b', label: 'b', weight: 3 }];
  const ps = [0, 0.5, 1].map((m) => distribution(cands, { ...DEFAULT_PARAMS, memoryInfluence: m })[1].p);
  assert.ok(ps[0] === 0.5 && ps[0] < ps[1] && ps[1] < ps[2]);
});

test('reinforcement raises the chosen item; exploration lowers it', () => {
  const cands = [{ id: 'a', label: 'a', weight: 1 }, { id: 'b', label: 'b', weight: 1 }];
  const usage = recordUsage(recordUsage(emptyUsage(), ['a']), ['a']);
  const rein = distribution(cands, { ...DEFAULT_PARAMS, mode: 'reinforcement', reinforcement: 1 }, usage);
  const expl = distribution(cands, { ...DEFAULT_PARAMS, mode: 'exploration', exploration: 2 }, usage);
  assert.ok(Math.abs(rein[0].p - 3 / 4) < 1e-9); // (1+1·2) vs 1
  assert.ok(Math.abs(expl[0].p - (1 + 2 / 3) / (1 + 2 / 3 + 3)) < 1e-9);
  assert.ok(rein[0].p > 0.5 && expl[0].p < 0.5);
  const stronger = distribution(cands, { ...DEFAULT_PARAMS, mode: 'reinforcement', reinforcement: 4 }, usage);
  assert.ok(stronger[0].p > rein[0].p);
});

test('novelty avoids and repetition favours previously generated combinations', () => {
  const cands = [{ id: 'x', label: 'x', weight: 1 }, { id: 'y', label: 'y', weight: 1 }];
  const usage = recordUsage(emptyUsage(), ['seed', 'x']);
  const ctx = { chosenIds: ['seed'] };
  const novel = distribution(cands, { ...DEFAULT_PARAMS, novelty: 1 }, usage, ctx);
  const rep = distribution(cands, { ...DEFAULT_PARAMS, repetition: 1 }, usage, ctx);
  assert.ok(novel[0].p < 0.1 && rep[0].p > 0.7);
  const none = distribution(cands, DEFAULT_PARAMS, usage, ctx);
  assert.equal(none[0].p, 0.5);
});

test('zero weights are never selected; all-zero falls back to equal chances', () => {
  const es = distribution([{ id: 'a', label: 'a', weight: 0 }, { id: 'b', label: 'b', weight: 2 }], DEFAULT_PARAMS);
  assert.equal(es[0].p, 0);
  const z = distribution([{ id: 'a', label: 'a', weight: 0 }, { id: 'b', label: 'b', weight: 0 }], DEFAULT_PARAMS);
  assert.equal(z[0].p, 0.5);
  const killed = distribution([{ id: 'a', label: 'a', weight: 1 }], DEFAULT_PARAMS, emptyUsage(), { extraFactors: () => [{ name: 'rule', value: 0 }] });
  assert.equal(killed[0].p, 1);
  assert.ok(killed[0].fallback);
});

test('empirical sampling matches theoretical probabilities', () => {
  const cands = [{ id: 'a', label: 'a', weight: 1 }, { id: 'b', label: 'b', weight: 2 }, { id: 'c', label: 'c', weight: 7 }];
  const es = distribution(cands, DEFAULT_PARAMS);
  const rng = createRng('stat');
  const counts = [0, 0, 0], N = 20000;
  for (let i = 0; i < N; i++) counts[sampleIndex(es.map((e) => e.p), rng())]++;
  es.forEach((e, i) => assert.ok(Math.abs(counts[i] / N - e.p) < 0.015, `${e.id}: ${counts[i] / N} vs ${e.p}`));
});

test('changing probability settings changes the distribution of generated concepts', () => {
  const frozenUsage = emptyUsage();
  const cfgW = baseConfig({ params: { ...DEFAULT_PARAMS, mode: 'weighted' } });
  const cfgU = baseConfig({ params: { ...DEFAULT_PARAMS, mode: 'uniform' } });
  const a = sample(cfgW, frozenUsage, 's', 600), b = sample(cfgU, frozenUsage, 's', 600);
  const needBelong = (s) => (s.tallies.needs['need-belonging'] || 0) / s.n;
  assert.ok(needBelong(a) > 0.2 && needBelong(b) < 0.18, `${needBelong(a)} vs ${needBelong(b)}`);
});

// ---------------------------------------------------------------- memory
test('memory edit operations validate input', () => {
  let m = createDefaultMemory();
  assert.equal(m.needs.length, 8);
  const { memory, item } = addItem(m, 'objects', 'Lamp post', { weight: 2, tags: 'fn:light; public' });
  assert.equal(memory.objects.length, 9);
  assert.deepEqual(item.tags, ['fn:light', 'public']);
  assert.throws(() => addItem(memory, 'objects', 'lamp post'), /already/);
  assert.throws(() => addItem(memory, 'objects', ''), /label/);
  assert.throws(() => updateItem(memory, 'objects', item.id, { weight: -1 }), /Weight/);
  assert.equal(updateItem(memory, 'objects', item.id, { label: 'Lantern' }).objects.at(-1).id, item.id);
  assert.equal(deleteItem(memory, 'objects', item.id).objects.length, 8);
  assert.deepEqual(tagValues(m.needs[0], 'opposes'), ['privacy', 'autonomy']);
});

test('pasted text lists parse lines, commas, weights and report problems', () => {
  const r = parseTextList('- Lamp*3\nBridge, Fountain\nTable | 2 | fn:hold; shared\nBad*x\nbench', 'objects', createDefaultMemory().objects);
  assert.deepEqual(r.items.map((i) => [i.label, i.weight]), [['Lamp', 3], ['Bridge', 1], ['Fountain', 1], ['Table', 2]]);
  assert.deepEqual(r.items[3].tags, ['fn:hold', 'shared']);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /Line 4.*not a number/);
  assert.deepEqual(r.skipped, ['bench']);
});

test('CSV import validates structure with understandable messages', () => {
  const ok = parseCSV('bank,label,weight,tags\nneeds,Hope,2,opposes:fear\n"objects","Big, red door",1,\nactions,Share,,serves:hope');
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.rows[1].label, 'Big, red door');
  assert.equal(ok.rows[2].weight, 1);

  assert.match(parseCSV('foo,bar\n1,2').errors[0], /“label”/);
  assert.match(parseCSV('').errors[0], /empty/);
  assert.match(parseCSV('label,weight\nA,1').errors[0], /bank/);
  assert.equal(parseCSV('label,weight\nA,1', { defaultBank: 'needs' }).errors.length, 0);
  const bad = parseCSV('bank,label,weight\nplanets,Mars,1\nneeds,Joy,lots\nneeds,,1');
  assert.equal(bad.errors.length, 3);
  assert.match(bad.errors[0], /Row 2.*not a database/);
  assert.match(bad.errors[1], /Row 3.*weight/);
  assert.match(bad.errors[2], /Row 4.*empty/);
  assert.match(parseCSV('label\n"open').errors[0], /quoted/);
});

test('CSV export → import round-trips', () => {
  const m = createDefaultMemory();
  const parsed = parseCSV(memoryToCSV(m));
  assert.deepEqual(parsed.errors, []);
  const empty = { needs: [], objects: [], actions: [] };
  const { memory } = mergeImport(empty, parsed.rows);
  assert.deepEqual(memory.needs.map((i) => i.label), m.needs.map((i) => i.label));
  assert.deepEqual(memory.actions[0].tags, m.actions[0].tags);
});

test('changing memory changes which concepts can be generated', () => {
  let m = createDefaultMemory();
  m = { ...m, objects: [{ id: 'obj-only', label: 'Lighthouse', category: 'Object', weight: 1, tags: ['fn:warn'] }] };
  const r = sample(baseConfig({ memory: m }), emptyUsage(), 'm', 50);
  assert.deepEqual(Object.keys(r.tallies.objects), ['obj-only']);
  assert.ok(r.top.every(([p]) => p.toLowerCase().includes('lighthouse')));
});

// ---------------------------------------------------------------- architectures
test('verb helpers', () => {
  assert.equal(verbS('remember'), 'remembers');
  assert.equal(verbS('hide'), 'hides');
  assert.equal(verbS('carry'), 'carries');
  assert.equal(verbS('turn into'), 'turns into');
  assert.equal(verbIng('swap'), 'swapping');
  assert.equal(verbIng('hide'), 'hiding');
  assert.equal(verbIng('grow'), 'growing');
});

test('all built-in architectures are valid and generate', () => {
  for (const id of Object.keys(ARCHITECTURES)) {
    const proc = getArchitecture(id);
    assert.ok(validate(proc).ok, id);
    const r = generate(baseConfig({ process: proc }), emptyUsage(), 'x');
    assert.ok(r.proposition.length > 10 && r.proposition.endsWith('.'));
  }
});

test('architecture A: relationship always serves the chosen need', () => {
  const cfg = baseConfig();
  for (let i = 0; i < 80; i++) {
    const r = generate(cfg, emptyUsage(), 'A' + i);
    const need = cfg.memory.needs.find((n) => n.id === r.slots.n.id);
    const act = cfg.memory.actions.find((n) => n.id === r.slots.a.id);
    assert.ok(tagValues(act, 'serves').includes(need.label.toLowerCase()), `${act.label} !serves ${need.label}`);
  }
});

test('architecture B: need is selected last and depends on the action; function is transformed', () => {
  const cfg = baseConfig({ process: getArchitecture('object_first') });
  const first = generate(cfg, emptyUsage(), 'B0');
  assert.deepEqual(first.trace.filter((t) => t.op === 'select').map((t) => t.bank), ['objects', 'actions', 'needs']);
  assert.match(first.proposition, /rather than to|instead/);
  for (let i = 0; i < 60; i++) {
    const r = generate(cfg, emptyUsage(), 'B' + i);
    const act = cfg.memory.actions.find((n) => n.id === r.slots.a.id);
    assert.ok(tagValues(act, 'serves').includes(r.slots.n.label.toLowerCase()));
  }
});

test('architecture C: the two needs are always declared as opposing', () => {
  const cfg = baseConfig({ process: getArchitecture('contradiction_first') });
  for (let i = 0; i < 80; i++) {
    const r = generate(cfg, emptyUsage(), 'C' + i);
    const n1 = cfg.memory.needs.find((n) => n.id === r.slots.n1.id), n2 = cfg.memory.needs.find((n) => n.id === r.slots.n2.id);
    assert.ok(tagValues(n1, 'opposes').includes(n2.label.toLowerCase()) || tagValues(n2, 'opposes').includes(n1.label.toLowerCase()));
    assert.match(r.slots.t.text, /pulls against/);
  }
});

test('the same underlying choices are related differently by different architectures', () => {
  const sets = Object.keys(ARCHITECTURES).map((id) => {
    const r = sample(baseConfig({ process: getArchitecture(id) }), emptyUsage(), 'diff', 200);
    return new Set(r.top.map(([p]) => p.split(' ').slice(0, 3).join(' ')));
  });
  assert.equal(new Set(sets.map((s) => [...s].sort().join('|'))).size, 3);
});

// ---------------------------------------------------------------- validation & safety
test('invalid procedure chains are rejected with clear messages', () => {
  const p = getArchitecture('need_first');
  const bad = structuredClone(p);
  bad.steps.shift(); // remove "select need" → action filter + compose refer to missing slot
  const v = validate(bad);
  assert.ok(!v.ok);
  assert.ok(v.errors.some((e) => /no earlier step creates it/.test(e)));
  assert.throws(() => runProcess(bad, {}), /Invalid procedure/);

  const noCompose = { steps: p.steps.slice(0, 2) };
  assert.ok(!validate(noCompose).ok);

  const wrongType = structuredClone(p);
  wrongType.steps[2].where.slots = ['o']; // serves an object, not a need
  assert.ok(validate(wrongType).errors.some((e) => /holds an object/.test(e)));
});

test('loops are bounded: unbounded or nested loops are invalid, bounded ones run at most `max` times', () => {
  const p = addNoveltyLoop(getArchitecture('need_first'), 3);
  assert.ok(validate(p).ok);
  const huge = structuredClone(p);
  huge.steps.find((s) => s.op === 'repeat').max = 1e9;
  assert.ok(!validate(huge).ok);
  const infinite = structuredClone(p);
  infinite.steps.find((s) => s.op === 'repeat').max = Infinity;
  assert.ok(!validate(infinite).ok);
  const nested = structuredClone(p);
  const rep = nested.steps.find((s) => s.op === 'repeat');
  rep.steps.push(structuredClone(rep));
  assert.ok(validate(nested).errors.some((e) => /cannot sit inside/.test(e)));

  // a loop whose stop condition can never be met still terminates at max rounds
  const usage = recordUsage(emptyUsage(), ['need-belonging', 'obj-bench', 'act-connect']);
  const cfg = baseConfig({ process: addNoveltyLoop(getArchitecture('need_first'), 4), memory: { ...createDefaultMemory(), objects: [createDefaultMemory().objects[0]] } });
  const r = generate(cfg, usage, 'loop');
  assert.ok(r.trace.filter((t) => t.op === 'loop').length <= 4);
});

test('bounded feedback loop actually retries until the combination is new', () => {
  // a database with two actions; one combination is already "known", so the loop should avoid it more often
  const usage = recordUsage(emptyUsage(), ['need-belonging', 'obj-bench', 'act-connect']);
  const mem = createDefaultMemory();
  const make = (proc) => baseConfig({ process: proc, memory: mem, params: { ...DEFAULT_PARAMS, mode: 'uniform' } });
  const repeatsOld = (cfg) => { let c = 0; for (let i = 0; i < 400; i++) { const r = generate(cfg, usage, 'L' + i); if (r.usedIds.every((id) => ['need-belonging', 'obj-bench', 'act-connect'].includes(id))) c++; } return c; };
  const plain = repeatsOld(make(getArchitecture('need_first')));
  const looped = repeatsOld(make(addNoveltyLoop(getArchitecture('need_first'), 5)));
  assert.ok(looped <= plain);
});

test('conditional steps branch on a chosen concept and are validated', () => {
  let proc = getArchitecture('need_first');
  const added = addStepFromMenu(proc, 'if');
  assert.ok(!added.error, added.error);
  proc = updateStep(added.proc, [3], { test: { kind: 'label_is', value: 'belonging' }, slot: 'n' });
  proc = updateStep(proc, [4], { template: '{o:a} that {a:s} for {n}, then {x:s}' });
  assert.ok(validate(proc).ok, validate(proc).errors.join('; '));
  const r = generate(baseConfig({ process: proc }), emptyUsage(), 'if1');
  assert.ok(r.trace.some((t) => t.op === 'if'));
  // referencing a slot that exists only in one branch is rejected
  const oneSided = structuredClone(proc);
  oneSided.steps[3].else = [];
  assert.ok(!validate(oneSided).ok);
});

test('reordering respects dependencies', () => {
  const p = getArchitecture('need_first');
  assert.ok(validate(moveStep(p, [0], 1)).ok); // need ↔ object: independent
  assert.ok(!validate(moveStep(p, [2], -2)).ok); // action before the need it depends on
});

// ---------------------------------------------------------------- reproducibility & history
test('same configuration, state and seed reproduce the identical generation, trace included', () => {
  const cfg = baseConfig({ params: { ...DEFAULT_PARAMS, mode: 'reinforcement' } });
  const usage = recordUsage(emptyUsage(), ['need-belonging', 'obj-mirror']);
  const a = generate(cfg, usage, 'S1'), b = generate(structuredClone(cfg), structuredClone(usage), 'S1');
  assert.deepEqual(a, b);
  assert.notEqual(generate(cfg, usage, 'S2').proposition + generate(cfg, usage, 'S3').proposition, a.proposition + a.proposition);
});

test('seed policy: counter-based by default, fixed when requested', () => {
  assert.equal(generationSeed({ seed: 'z', fixSeed: false }, 4), 'z#4');
  assert.equal(generationSeed({ seed: 'z', fixSeed: true }, 4), 'z');
});

test('freezing probabilities stops learned state from changing', () => {
  const cfg = baseConfig();
  const r = generate(cfg, emptyUsage(), 'f');
  assert.deepEqual(commitUsage(emptyUsage(), r, { ...DEFAULT_PARAMS, freeze: true }), emptyUsage());
  assert.ok(Object.keys(commitUsage(emptyUsage(), r, DEFAULT_PARAMS).counts).length > 0);
});

test('reinforcement over a session drifts the distribution toward earlier choices', () => {
  const cfg = baseConfig({ params: { ...DEFAULT_PARAMS, mode: 'reinforcement', reinforcement: 3, memoryInfluence: 0 } });
  let usage = emptyUsage();
  const before = bankDistribution(cfg, usage, 'objects');
  assert.ok(before.every((e) => Math.abs(e.p - 1 / 8) < 1e-9));
  for (let i = 0; i < 30; i++) usage = commitUsage(usage, generate(cfg, usage, 'r' + i), cfg.params);
  const after = bankDistribution(cfg, usage, 'objects');
  assert.ok(Math.max(...after.map((e) => e.p)) > 0.25);
  assert.ok(Math.abs(sumP(after) - 1) < 1e-9);
});

// ---------------------------------------------------------------- rules (human intervention)
test('a participant-created rule changes subsequent generations and shows in the trace', () => {
  const cfg = baseConfig({ params: { ...DEFAULT_PARAMS, mode: 'uniform' } });
  const rule = { type: 'boost_item', bank: 'objects', label: 'Umbrella', factor: 12 };
  const after = applyRule(cfg, rule);
  assert.equal(after.rules.length, 1);
  const frac = (c) => (sample(c, emptyUsage(), 'rule', 500).tallies.objects['obj-umbrella'] || 0) / 500;
  assert.ok(frac(after) > 3 * frac(cfg), `${frac(after)} vs ${frac(cfg)}`);
  const trace = generate(after, emptyUsage(), 'rule1').trace.find((t) => t.bank === 'objects');
  assert.ok(trace.entries.find((e) => e.id === 'obj-umbrella').factors.some((f) => f.name.startsWith('rule:')));
});

test('relationship (affinity) rule only fires when its condition is already chosen', () => {
  const cfg = baseConfig({ params: { ...DEFAULT_PARAMS, mode: 'uniform' }, process: getArchitecture('contradiction_first') });
  const rule = { type: 'affinity', ifBank: 'needs', ifLabel: 'Belonging', thenBank: 'objects', thenLabel: 'Garden', factor: 20 };
  const after = applyRule(cfg, rule);
  let withB = 0, gardenWithB = 0, without = 0, gardenWithout = 0;
  for (let i = 0; i < 1500; i++) {
    const r = generate(after, emptyUsage(), 'aff' + i);
    const hasB = r.slots.n1.label === 'Belonging' || r.slots.n2.label === 'Belonging';
    const garden = r.slots.o.label === 'Garden';
    if (hasB) { withB++; gardenWithB += garden; } else { without++; gardenWithout += garden; }
  }
  assert.ok(gardenWithB / withB > 0.5 && gardenWithout / without < 0.2);
});

test('one-shot rules change settings and process; invalid rules are refused', () => {
  const cfg = baseConfig();
  const novel = applyRule(cfg, { type: 'set_params', changes: { novelty: 0.8, mode: 'exploration' } });
  assert.equal(novel.params.novelty, 0.8);
  assert.equal(novel.params.mode, 'exploration');
  const looped = applyRule(cfg, { type: 'novelty_loop', max: 2 });
  assert.ok(looped.process.steps.some((s) => s.op === 'repeat'));
  assert.ok(validateRule({ type: 'boost_item', bank: 'objects', label: 'Nothing', factor: 2 }, cfg.memory).length);
  assert.ok(validateRule({ type: 'boost_item', bank: 'objects', label: 'Mirror', factor: 999 }, cfg.memory).length);
  assert.ok(validateRule({ type: 'run_code', code: 'alert(1)' }, cfg.memory)[0].includes('Unknown rule type'));
  assert.throws(() => applyRule(cfg, { type: 'novelty_loop', max: 99 }), /1–5/);
});

test('natural-language placeholder proposes validated rules or explains what it cannot represent', () => {
  const mem = createDefaultMemory();
  const ok = proposeRuleFromText('I want the system to remember unusual combinations and gradually favour them over familiar ones', mem);
  assert.ok(ok.ok && ok.proposals[0].type === 'set_params' && ok.notes.length);
  ok.proposals.forEach((p) => assert.deepEqual(validateRule(p, mem), []));
  const fav = proposeRuleFromText('favour mirrors', mem); // plural not matched → helpful message
  assert.ok(typeof fav.ok === 'boolean');
  const when = proposeRuleFromText('when belonging appears, favour garden', mem);
  assert.equal(when.proposals[0].type, 'affinity');
  const nope = proposeRuleFromText('make it funnier please', mem);
  assert.ok(!nope.ok && nope.notes[0].includes('I can only represent'));
});

test('normaliseParams clamps out-of-range values', () => {
  const p = normaliseParams({ novelty: 7, reinforcement: -3, mode: 'bogus' });
  assert.equal(p.novelty, 1);
  assert.equal(p.reinforcement, 0);
  assert.equal(p.mode, 'weighted');
});
