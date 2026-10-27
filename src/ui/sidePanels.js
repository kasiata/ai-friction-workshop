import { h, download } from './dom.js';
import { S, A, stage, genById, currentGen } from './state.js';
import { STAGES, suggestedStage } from '../workshop.js';
import { formatElapsed, describeEvent } from '../history.js';
import { SELF_REPORT, STAGE_PROMPTS, REFLECTION_NOTE, PROMPTS } from '../reflection.js';
import { RESEARCH_STATUS, CONSENT_ITEMS } from '../research.js';

export const elapsedMs = () => Date.now() - S.session.startedAt;

// ------------------------------------------------------------------ workshop bar
export function workshopBar() {
  if (S.mode !== 'workshop') return null;
  const st = stage();
  const hint = suggestedStage(elapsedMs());
  const note = h('textarea', { rows: 2, placeholder: 'Optional', 'aria-label': 'Stage reflection', oninput: (e) => A.draft('stage-' + st.n, e.target.value) }, S.ui.drafts['stage-' + st.n] ?? '');
  return h('section', { class: 'card workshop', 'aria-label': 'Workshop stage' },
    h('ol', { class: 'stages' }, STAGES.map((s) => h('li', { class: s.n === st.n ? 'on' : s.n < st.n ? 'done' : '' },
      h('button', { onclick: () => A.goStage(s.n), 'aria-current': s.n === st.n ? 'step' : null }, h('b', null, s.n), h('span', null, s.title), h('small', null, `${s.minutes[0]}–${s.minutes[1]} min`))))),
    h('div', { class: 'stage-body' },
      h('div', null,
        h('div', { class: 'stage-kicker' }, `Stage ${st.n} of 5 · ${st.minutes[0]}–${st.minutes[1]} min · cognitive operation: `, h('em', null, st.operation)),
        h('h2', null, st.activity), h('p', null, st.instructions)),
      h('div', { class: 'stage-side' },
        h('div', { class: 'clocks' }, h('div', null, h('small', null, 'workshop'), h('b', { class: 'js-clock-total' }, formatElapsed(elapsedMs()))), h('div', null, h('small', null, 'this stage'), h('b', { class: 'js-clock-stage' }, formatElapsed(Date.now() - S.stageStartedAt)))),
        h('div', { class: 'row' }, h('button', { class: 'btn', disabled: st.n === 1, onclick: () => A.goStage(st.n - 1) }, '← Back'), h('button', { class: 'btn primary', disabled: st.n === 5, onclick: () => A.goStage(st.n + 1) }, 'Next stage →')),
        hint !== st.n && h('small', { class: 'tiny' }, `By the clock, stage ${hint} would be due.`),
        h('label', { class: 'switch small' }, h('input', { type: 'checkbox', checked: S.enforceLocks, onchange: () => A.toggleLocks() }), h('span', null, 'Lock the variable this stage holds constant')))),
    h('details', { class: 'fold' }, h('summary', null, 'Optional reflection for this stage'), h('p', { class: 'tiny' }, STAGE_PROMPTS[st.n]), note,
      h('button', { class: 'btn ghost', onclick: () => A.saveReflection(`stage ${st.n}`, note.value) }, 'Save reflection')));
}

// ------------------------------------------------------------------ history
export function historyPanel() {
  const gens = S.session.generations;
  const only = S.ui.onlySaved;
  const shown = gens.filter((g) => !only || g.saved).slice().reverse();
  const cur = currentGen();
  const events = S.session.events.slice(-60).reverse();
  return h('section', { class: 'card', id: 'history', 'aria-labelledby': 'h-hist' },
    h('div', { class: 'card-head' }, h('h2', { id: 'h-hist' }, 'Experiment history'), h('small', { class: 'meta' }, `${gens.length} generations · ${S.session.events.length} events · stored only in this browser`)),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn', onclick: () => download('beautifully-broken-log.json', A.exportJSON()) }, 'Download JSON log'),
      h('button', { class: 'btn', onclick: () => download('beautifully-broken-log.csv', A.exportCSV(), 'text/csv') }, 'Download CSV log'),
      h('label', { class: 'switch small' }, h('input', { type: 'checkbox', checked: !!only, onchange: (e) => A.ui({ onlySaved: e.target.checked }) }), h('span', null, 'Saved ideas only')),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn ghost', onclick: () => { if (confirm('Start a new session? The current log will be removed from this browser — download it first if you want to keep it.')) A.reset(); } }, 'New session')),
    h('div', { class: 'hist-grid' },
      h('div', { class: 'gen-list' }, shown.length ? shown.map((g) => h('div', { class: 'gen-row' + (g.id === S.currentId ? ' cur' : '') },
        h('div', { class: 'gen-main' }, h('small', null, `#${g.n} · ${formatElapsed(g.t)} · stage ${g.stage} · ${g.config.process.name.split(' ·')[0]} · ${g.config.params.mode} · seed ${g.seed}`),
          h('div', { class: 'gen-text' }, g.saved && '★ ', g.proposition, g.config.rules.filter((r) => r.enabled !== false).length > 0 && h('span', { class: 'badge' }, `${g.config.rules.filter((r) => r.enabled !== false).length} rule(s)`))),
        h('div', { class: 'gen-btns' },
          h('button', { class: 'btn ghost sm', onclick: () => A.ui({ currentId: g.id, reproduce: null }) }, 'View'),
          h('button', { class: 'btn ghost sm', title: 'Restore configuration and learned state from before this idea', onclick: () => A.restore(g.id) }, 'Restore'),
          h('button', { class: 'btn ghost sm', disabled: !cur || cur.id === g.id, onclick: () => { const [a, b] = g.n < cur.n ? [g, cur] : [cur, g]; A.compare(a.id, b.id); } }, 'Compare'),
          h('button', { class: 'btn ghost sm', onclick: () => A.toggleSave(g.id) }, g.saved ? '★' : '☆')))) : h('p', { class: 'hint' }, 'Nothing here yet.')),
      h('ol', { class: 'timeline', 'aria-label': 'Event log' }, events.map((e) => h('li', null, h('time', null, formatElapsed(e.t)), h('span', { class: 'stg' }, e.stage), h('span', null, describeEvent(e, S.session)))))),
  );
}

// ------------------------------------------------------------------ reflection bar
export function reflectBar() {
  const note = h('input', { placeholder: 'What made it hard? (optional)', 'aria-label': 'Friction note', value: S.ui.drafts.friction ?? '', oninput: (e) => A.draft('friction', e.target.value),
    onkeydown: (e) => { if (e.key === 'Enter') A.markFriction(note.value); } });
  return h('aside', { class: 'reflect-bar', 'aria-label': 'Optional self-report' },
    h('span', { class: 'rb-title' }, 'Right now I was… ', h('small', null, '(optional, self-reported)')),
    h('div', { class: 'rb-chips' }, SELF_REPORT.map((s) => h('button', { class: 'chip' + (S.ui.selfReport === s.id ? ' on' : ''), 'aria-pressed': String(S.ui.selfReport === s.id), onclick: () => A.selfReport(s.id) }, s.label))),
    h('div', { class: 'rb-friction' }, note, h('button', { class: 'btn warn', onclick: () => A.markFriction(note.value) }, '⚡ Mark friction')),
    h('small', { class: 'rb-note' }, REFLECTION_NOTE));
}

// ------------------------------------------------------------------ research (future) + about
export function researchPanel() {
  if (!S.ui.showResearch) return null;
  return h('section', { class: 'card modal', role: 'dialog', 'aria-label': 'Research data collection' },
    h('div', { class: 'card-head' }, h('h2', null, 'Research data collection'), h('button', { class: 'btn ghost', onclick: () => A.ui({ showResearch: false }) }, 'Close')),
    h('p', { class: 'msg' }, h('strong', null, 'Not active. '), RESEARCH_STATUS.reason),
    h('p', { class: 'hint' }, 'A later version could let you opt in to share an anonymous copy of your session with the research team. It would never be required to use this tool.'),
    h('fieldset', { disabled: true, class: 'consent' }, h('legend', null, 'Consent (preview only — disabled)'),
      CONSENT_ITEMS.map((c) => h('label', { class: 'switch small' }, h('input', { type: 'checkbox' }), h('span', null, c))),
      h('p', { class: 'tiny' }, 'Pseudonymous session code (random, not linked to you): ', h('code', null, S.session.id)),
      h('div', { class: 'row' }, h('button', { class: 'btn' }, 'Join the study'), h('button', { class: 'btn ghost' }, 'Withdraw & delete my data'))),
    h('p', { class: 'tiny' }, 'Planned: participant information + consent · pseudonymous ids · optional event logging · researcher-only access · withdrawal and deletion · structured export. No personal details are collected and no third-party tracking is used. Today you can already download your own log from the History panel.'));
}

export function aboutPanel() {
  if (!S.ui.showHelp) return null;
  return h('section', { class: 'card modal', role: 'dialog', 'aria-label': 'About this experiment' },
    h('div', { class: 'card-head' }, h('h2', null, 'How to read this screen'), h('button', { class: 'btn ghost', onclick: () => A.ui({ showHelp: false }) }, 'Close')),
    h('p', null, 'This is not a tool for getting better ideas. It is a small, fully visible idea machine, so you can see — and change — why it produces the ideas it does.'),
    h('ol', { class: 'about' },
      h('li', null, h('b', null, 'Memory'), ' is what the machine can say: needs, objects, actions, each with a weight and tags.'),
      h('li', null, h('b', null, 'Probability'), ' is how it chooses between those concepts — with real, inspectable arithmetic.'),
      h('li', null, h('b', null, 'Process'), ' is the order and dependencies of its decisions — the architecture of the thinking.'),
      h('li', null, 'Press ', h('b', null, 'Generate'), ', then read the ', h('b', null, 'trace'), ': it shows every candidate, its probability and the random draw. Nothing is explained after the fact.'),
      h('li', null, 'When an idea surprises you, say why, and write a ', h('b', null, 'rule'), ' that would produce more like it. The rule changes the machine.')),
    h('p', { class: 'tiny' }, 'Framework: Głowicka, “The Space In-Between: Creative Skill and Cognitive Transitions in the Age of Prompt-Based AI” (CHIWORK 2026). Your notes and self-reports are your own descriptions; the app never infers cognitive states. Everything stays in this browser.'));
}
