import { h, pct } from './dom.js';
import { S, A, isLocked } from './state.js';
import { MODES, PARAM_DEFS } from '../probability.js';
import { bankDistribution } from '../generator.js';
import { BANK_KEYS, BANKS } from '../memory.js';

/** Bar chart of selection probabilities, with an optional pinned baseline tick and sampled frequencies. */
export function distChart(bank) {
  const entries = bankDistribution(S.config, S.usage, bank).sort((a, b) => b.p - a.p);
  const base = S.ui.baseline?.dists[bank];
  const sampled = S.ui.sampled && S.ui.sampled.bank === bank ? S.ui.sampled : null;
  const max = Math.max(0.01, ...entries.map((e) => e.p), ...Object.values(base ?? {}), ...entries.map((e) => (sampled ? (sampled.tallies[bank][e.id] || 0) / sampled.n : 0)));
  return h('div', { class: 'chart', role: 'table', 'aria-label': `Selection probabilities for ${BANKS[bank].title}` },
    entries.map((e) => {
      const b = base?.[e.id];
      const delta = b == null ? null : e.p - b;
      const freq = sampled ? (sampled.tallies[bank][e.id] || 0) / sampled.n : null;
      return h('div', { class: 'bar-row', role: 'row', title: e.factors.map((f) => `${f.name}: ×${f.value.toFixed(2)}`).join('\n') },
        h('span', { class: 'bar-label', role: 'cell' }, e.label),
        h('span', { class: 'bar-track', role: 'cell' },
          h('i', { class: 'bar', style: `width:${(e.p / max) * 100}%` }),
          b != null && h('i', { class: 'tick', style: `left:${(b / max) * 100}%`, title: `baseline ${pct(b)}` }),
          freq != null && h('i', { class: 'tick sampled', style: `left:${(freq / max) * 100}%`, title: `observed in ${sampled.n} samples: ${pct(freq)}` })),
        h('span', { class: 'bar-val', role: 'cell' }, pct(e.p),
          delta != null && Math.abs(delta) >= 0.005 && h('small', { class: delta > 0 ? 'up' : 'down' }, ` ${delta > 0 ? '▲' : '▼'}${(Math.abs(delta) * 100).toFixed(1)}`)),
        h('span', { class: 'bar-count', role: 'cell', title: 'times chosen so far' }, e.count ? `×${e.count}` : ''));
    }));
}

export function probabilityPanel() {
  const p = S.config.params;
  const lock = isLocked('probability');
  const bank = S.ui.distBank;
  const sampled = S.ui.sampled;

  const modeCards = h('div', { class: 'modes', role: 'radiogroup', 'aria-label': 'Distribution' }, MODES.map((m) =>
    h('button', { class: 'mode' + (p.mode === m.id ? ' on' : ''), role: 'radio', 'aria-checked': String(p.mode === m.id), disabled: !!lock, onclick: () => A.setParam('mode', m.id) },
      h('strong', null, m.label), h('span', null, m.blurb))));

  const sliders = PARAM_DEFS.map((d) => {
    const inactive = d.modes && !d.modes.includes(p.mode);
    const val = h('output', null, String(+p[d.key].toFixed(2)));
    const input = h('input', { type: 'range', min: d.min, max: d.max, step: d.step, value: p[d.key], disabled: !!lock, 'aria-label': d.label,
      oninput: (e) => { val.textContent = String(+(+e.target.value).toFixed(2)); },
      onchange: (e) => A.setParam(d.key, +e.target.value) });
    return h('div', { class: 'slider' + (inactive ? ' inactive' : '') },
      h('div', { class: 'slider-top' }, h('label', null, d.label), val),
      input, h('div', { class: 'formula' }, h('code', null, d.formula), ' ', inactive ? `· inactive in ${p.mode} mode` : `· ${d.help}`));
  });

  const seedIn = h('input', { value: p.seed, disabled: !!lock, 'aria-label': 'Random seed', onchange: (e) => A.setParam('seed', e.target.value, { silent: true }) });
  const nSel = h('select', { 'aria-label': 'Number of samples' }, [20, 100, 500].map((n) => h('option', { value: n, selected: n === 100 }, `×${n}`)));

  return h('div', { class: 'panel-body' },
    lock && h('p', { class: 'lock-note' }, '🔒 ', lock),
    h('p', { class: 'hint' }, 'Probabilities decide how likely each concept is at every selection step. Every control has a defined effect — hover a bar to see exactly how its probability was computed.'),
    modeCards,
    h('div', { class: 'sliders' }, sliders),
    h('div', { class: 'seedrow' },
      h('label', null, 'Random seed', seedIn),
      h('label', { class: 'switch small' }, h('input', { type: 'checkbox', checked: p.fixSeed, disabled: !!lock, onchange: (e) => A.setParam('fixSeed', e.target.checked) }),
        h('span', null, 'Fix seed (identical dice every click)')),
      h('label', { class: 'switch small' }, h('input', { type: 'checkbox', checked: p.freeze, disabled: !!lock, onchange: (e) => A.setParam('freeze', e.target.checked) }),
        h('span', null, 'Freeze probabilities (learning paused)'))),
    h('div', { class: 'subtabs', role: 'tablist', 'aria-label': 'Distribution to inspect' },
      BANK_KEYS.map((k) => h('button', { class: 'subtab', role: 'tab', 'aria-selected': String(k === bank), onclick: () => A.ui({ distBank: k, memBank: k }) }, BANKS[k].title))),
    h('div', { class: 'chart-head' }, h('strong', null, 'Selection probabilities now'),
      S.ui.baseline && h('small', null, ' · ticks = pinned baseline', sampled && sampled.bank === bank ? ' · amber ticks = observed in samples' : '')),
    distChart(bank),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn ghost', onclick: () => A.pinBaseline() }, S.ui.baseline ? 'Re-pin baseline' : 'Pin as baseline'),
      S.ui.baseline && h('button', { class: 'btn ghost', onclick: () => A.ui({ baseline: null }) }, 'Clear baseline'),
      h('span', { class: 'spacer' }),
      nSel, h('button', { class: 'btn', onclick: () => A.sample(+nSel.value) }, 'Sample'),
      h('button', { class: 'btn ghost', title: 'Forget which concepts were chosen before (affects reinforcement / exploration)', onclick: () => A.resetLearned() }, 'Reset learned state')),
    S.ui.baseline && h('p', { class: 'tiny' }, `Baseline was pinned in ${S.ui.baseline.mode} mode. Change a setting and the bars show ▲▼ against it.`),
    sampled && h('div', { class: 'msg' }, h('strong', null, `${sampled.n} samples`), ` in ${sampled.mode} mode produced ${sampled.unique} different propositions. Most frequent: `,
      sampled.top.map(([t, c], i) => h('span', { class: 'chip' }, `${c}× ${t.replace(/\.$/, '')}`))),
  );
}
