import { h, $ } from './dom.js';
import { S, A, subscribe, stage } from './state.js';
import { memoryPanel } from './memoryPanel.js';
import { probabilityPanel } from './probabilityPanel.js';
import { processPanel } from './processPanel.js';
import { resultPanel } from './resultPanel.js';
import { interventionPanel } from './interventionPanel.js';
import { workshopBar, historyPanel, reflectBar, researchPanel, aboutPanel, elapsedMs } from './sidePanels.js';
import { formatElapsed } from '../history.js';
import { stageLabel } from '../workshop.js';

const TABS = [['memory', 'Memory', memoryPanel], ['probability', 'Probability', probabilityPanel], ['process', 'Process', processPanel]];

function header() {
  return h('header', { class: 'top' },
    h('div', { class: 'brand' }, h('h1', null, 'Beautifully Broken'), h('p', null, 'Designing for Cognitive Friction')),
    h('div', { class: 'top-ctl' },
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Mode' },
        h('button', { 'aria-pressed': String(S.mode === 'free'), onclick: () => A.setMode('free') }, 'Free exploration'),
        h('button', { 'aria-pressed': String(S.mode === 'workshop'), onclick: () => A.setMode('workshop') }, 'Workshop (45 min)')),
      h('span', { class: 'clock', title: 'Elapsed in this session' }, '⏱ ', h('b', { class: 'js-clock-total' }, formatElapsed(elapsedMs())), ' · ', S.mode === 'workshop' ? `stage ${S.stage}` : 'free'),
      h('button', { class: 'btn ghost', onclick: () => A.ui({ showHelp: true }) }, 'About'),
      h('button', { class: 'btn ghost', onclick: () => A.ui({ showResearch: true }) }, 'Research (off)')));
}

function questionBar() {
  const input = h('textarea', { rows: 2, class: 'question', 'aria-label': 'Design question (editable)', onchange: (e) => A.setQuestion(e.target.value) }, S.config.question);
  return h('section', { class: 'card question-card', 'aria-labelledby': 'h-q' },
    h('div', { class: 'card-head' }, h('h2', { id: 'h-q' }, h('span', { class: 'sec-letter' }, 'A'), 'Design question'), h('small', { class: 'meta' }, 'Facilitator can edit — the machine itself does not read it.')),
    input);
}

function controls() {
  const tab = S.ui.tab;
  const body = TABS.find((t) => t[0] === tab)[2]();
  return h('section', { class: 'card controls', 'aria-labelledby': 'h-b' },
    h('div', { class: 'card-head' }, h('h2', { id: 'h-b' }, h('span', { class: 'sec-letter' }, 'B'), 'Generative system')),
    h('div', { class: 'tabs', role: 'tablist' }, TABS.map(([id, label]) => h('button', { class: 'tab', role: 'tab', id: 'tab-' + id, 'aria-selected': String(id === tab), onclick: () => A.ui({ tab: id }) }, label.toUpperCase()))),
    h('div', { role: 'tabpanel', 'aria-labelledby': 'tab-' + tab }, body));
}

function render() {
  const app = $('#app');
  const scroll = window.scrollY;
  const keepFocus = document.activeElement?.getAttribute?.('aria-label');
  const toastEl = S.ui.toast && h('div', { class: 'toast ' + S.ui.toast.kind, role: 'status', onclick: () => A.ui({ toast: null }) }, S.ui.toast.msg);
  app.replaceChildren(...[
    header(), aboutPanel(), researchPanel(), questionBar(), workshopBar(),
    h('main', { class: 'grid' }, controls(), resultPanel()),
    h('div', { class: 'lower' }, interventionPanel(), historyPanel()),
    reflectBar(),
    h('footer', { class: 'foot' }, 'Beautifully Broken · prototype v0.1 · Inholland Design Doing Symposium · all data stays in this browser'),
    toastEl].filter(Boolean));
  window.scrollTo(0, scroll);
  void keepFocus;
}

export function start() {
  A.init();
  subscribe(render);
  render();
  setInterval(() => {
    const total = formatElapsed(elapsedMs());
    document.querySelectorAll('.js-clock-total').forEach((el) => { el.textContent = total; });
    if (S.mode === 'workshop' && S.stageStartedAt) {
      const s = formatElapsed(Date.now() - S.stageStartedAt);
      document.querySelectorAll('.js-clock-stage').forEach((el) => { el.textContent = s; });
    }
  }, 1000);
  void stage; void stageLabel;
}
