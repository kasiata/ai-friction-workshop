import { h, pct } from './dom.js';
import { S, A, currentGen, genById, previousGen } from './state.js';
import { diffConfigs, sharedConcepts } from '../history.js';
import { PROMPTS } from '../reflection.js';

function entriesTable(t) {
  const rows = [...t.entries].sort((a, b) => b.p - a.p);
  const max = Math.max(...rows.map((e) => e.p));
  return h('table', { class: 'ptable' },
    h('tbody', null, rows.map((e) => h('tr', { class: e.id === t.chosen.id ? 'chosen' : '', title: e.factors.map((f) => `${f.name}: ×${f.value.toFixed(2)}`).join('\n') },
      h('td', { class: 'pl' }, e.id === t.chosen.id ? '▶ ' : '', e.label),
      h('td', { class: 'pb' }, h('span', { class: 'bar-track thin' }, h('i', { class: 'bar', style: `width:${(e.p / max) * 100}%` }))),
      h('td', { class: 'pv' }, pct(e.p)),
      h('td', { class: 'pf' }, e.factors.filter((f) => Math.abs(f.value - 1) > 1e-9 && !f.name.startsWith('equal') && !f.name.startsWith('memory')).map((f) => h('span', { class: 'fx' }, `${f.name} ×${+f.value.toFixed(2)}`)))))));
}

function traceView(g) {
  if (!g.trace) return h('p', { class: 'hint' }, 'The detailed trace of this older generation was trimmed to save browser storage.');
  let n = 0;
  const noun = { needs: 'need', objects: 'object', actions: 'action' };
  return h('ol', { class: 'trace' }, g.trace.map((t) => {
    const structural = t.op === 'loop' || t.op === 'loop-check' || t.op === 'if';
    const head = t.op === 'select' ? `Selected ${noun[t.bank]}: ${t.chosen.label}`
      : t.op === 'derive_property' && t.chosen ? `${t.title}: ${t.chosen.label}`
      : t.op === 'compose' ? 'Applied composition rule → proposition' : t.text;
    return h('li', { class: `tr tr-${t.op}${t.note === 'fallback' ? ' fallback' : ''}` },
      h('div', { class: 'tr-head' }, h('span', { class: 'tr-n' }, structural ? '·' : ++n), h('strong', null, head), t.iteration && h('span', { class: 'iter' }, `round ${t.iteration}`)),
      t.entries && h('div', { class: 'tr-body' },
        h('div', { class: 'tr-meta' },
          t.op === 'select' && [`Filter: ${t.filter}. `, t.relaxed && h('b', null, 'No concept was eligible, so the filter was relaxed. '), `${t.eligible} of ${t.total} eligible · `],
          `random draw u = ${t.u.toFixed(4)} landed on “${t.chosen.label}” (p = ${pct(t.chosen.p)})`,
          t.chosen.fallback && ' · every likelihood was zero, so equal chances were used'),
        entriesTable(t)),
      t.op === 'compose' && h('div', { class: 'tr-body tr-meta' }, 'Template: ', h('code', null, t.template)));
  }));
}

function compareView() {
  const [ia, ib] = S.ui.compare;
  const a = genById(ia), b = genById(ib);
  if (!a || !b) return null;
  const diffs = diffConfigs(a.config, b.config);
  const sc = sharedConcepts(a, b);
  const card = (g, label) => h('div', { class: 'cmp-card' }, h('small', null, `${label} · idea #${g.n} · seed ${g.seed}`), h('p', { class: 'cmp-text' }, g.proposition),
    h('small', null, g.config.process.name, ' · ', g.config.params.mode));
  return h('section', { class: 'card compare' },
    h('div', { class: 'card-head' }, h('h3', null, 'Compare two generations'), h('button', { class: 'btn ghost', onclick: () => A.closeCompare() }, 'Close')),
    h('div', { class: 'cmp-grid' }, card(a, 'Earlier'), card(b, 'Later')),
    h('div', { class: 'cmp-meta' },
      h('div', null, h('strong', null, 'What changed in the system between them'),
        diffs.length ? h('ul', null, diffs.slice(0, 12).map((d) => h('li', null, h('b', null, `${d.area}: `), `${d.what}: `, h('code', null, String(d.a)), ' → ', h('code', null, String(d.b))))) : h('p', { class: 'tiny' }, 'Nothing — the same configuration, a different dice roll.')),
      h('div', null, h('strong', null, 'Concepts'), h('p', { class: 'tiny' }, 'in both: ', sc.shared.join(', ') || '—'), h('p', { class: 'tiny' }, `only #${a.n}: `, sc.onlyA.join(', ') || '—'), h('p', { class: 'tiny' }, `only #${b.n}: `, sc.onlyB.join(', ') || '—'))));
}

export function resultPanel() {
  const g = currentGen();
  const prev = g ? previousGen(g.id) : null;
  const pred = h('textarea', { rows: 2, placeholder: 'Optional — before generating, what do you expect will happen?', 'aria-label': PROMPTS.before,
    oninput: (e) => A.draft('prediction', e.target.value) }, S.ui.drafts.prediction ?? '');
  const rep = S.ui.reproduce && g && S.ui.reproduce.id === g.id ? S.ui.reproduce : null;
  const obs = h('textarea', { rows: 2, placeholder: 'Optional', 'aria-label': PROMPTS.after, oninput: (e) => A.draft('obs-' + (g?.id ?? ''), e.target.value) }, g?.observation || S.ui.drafts['obs-' + g?.id] || '');

  return h('div', { class: 'result-col' },
    h('section', { class: 'card result', 'aria-labelledby': 'h-prop' },
      h('div', { class: 'card-head' }, h('h2', { id: 'h-prop' }, h('span', { class: 'sec-letter' }, 'C'), 'Generated proposition'),
        g && h('small', { class: 'meta' }, `#${g.n} · seed `, h('code', null, g.seed), g.saved ? ' · ★ saved' : '')),
      h('div', { class: 'proposition', 'aria-live': 'polite' }, g ? g.proposition : 'Press Generate to produce a baseline proposition.'),
      g && h('div', { class: 'pills' }, Object.entries(g.slots).filter(([, s]) => s.kind === 'item').map(([k, s]) => h('span', { class: 'pill' }, h('em', null, k), ' ', s.label))),
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', onclick: () => A.generate() }, 'Generate'),
        h('button', { class: 'btn', disabled: !g, onclick: () => A.toggleSave(g.id) }, g?.saved ? '★ Saved' : '☆ Save idea'),
        h('button', { class: 'btn', disabled: !g, title: 'Re-run this exact generation (same configuration, learned state and seed)', onclick: () => A.reproduce(g.id) }, 'Reproduce'),
        h('button', { class: 'btn', disabled: !prev, onclick: () => A.compare(prev.id, g.id) }, 'Compare with previous'),
        h('button', { class: 'btn', disabled: !g, onclick: () => { A.ui({ interventionId: g.id }); document.getElementById('intervention')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 'Turn intuition into a rule ↓')),
      rep && h('div', { class: 'msg ' + (rep.identical ? 'ok' : 'error'), role: 'status' }, rep.identical ? '✓ Reproduced exactly: same configuration, state and seed give the identical idea and trace.' : '✗ Result differs from the original.'),
      h('details', { class: 'fold', open: !!S.ui.drafts.prediction }, h('summary', null, 'Before generating: ' + PROMPTS.before), pred),
      g?.prediction && h('div', { class: 'reflect-inline' },
        h('p', { class: 'tiny' }, h('strong', null, 'You expected: '), g.prediction),
        h('label', { class: 'lbl' }, PROMPTS.after), obs,
        h('button', { class: 'btn ghost', onclick: () => A.saveObservation(g.id, obs.value) }, g.observation ? 'Update note' : 'Save note')),
    ),
    S.ui.compare && compareView(),
    h('section', { class: 'card trace-card', 'aria-labelledby': 'h-trace' },
      h('div', { class: 'card-head' }, h('h2', { id: 'h-trace' }, h('span', { class: 'sec-letter' }, 'D'), 'Generation trace'),
        g && h('small', { class: 'meta' }, g.config.process.name, ' · ', g.config.params.mode)),
      g ? [h('p', { class: 'hint' }, 'Every line is what the machine actually did: the candidates, their probabilities at that moment, the random draw, and the outcome. Hover a row for the arithmetic.'), traceView(g)]
        : h('p', { class: 'hint' }, 'The trace will appear here after the first generation.')),
  );
}
