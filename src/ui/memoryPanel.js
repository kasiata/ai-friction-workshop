import { h, download } from './dom.js';
import { S, A, isLocked } from './state.js';
import { BANK_KEYS, BANKS, memoryToCSV, presetNames, listUserPresets } from '../memory.js';

export function memoryPanel() {
  const lock = isLocked('memory');
  const bank = S.ui.memBank;
  const items = S.config.memory[bank];
  const total = items.reduce((s, i) => s + i.weight, 0);

  const tabs = h('div', { class: 'subtabs', role: 'tablist', 'aria-label': 'Memory databases' },
    BANK_KEYS.map((k) => h('button', {
      class: 'subtab', role: 'tab', 'aria-selected': String(k === bank), onclick: () => A.ui({ memBank: k, distBank: k, importResult: null }),
    }, h('span', { class: 'letter' }, BANKS[k].letter), ' ', BANKS[k].title, h('span', { class: 'count' }, S.config.memory[k].length))));

  const rows = items.map((it) => h('div', { class: 'mem-row' },
    h('input', { class: 'in-label', value: it.label, disabled: !!lock, 'aria-label': 'Label', maxlength: 60,
      onchange: (e) => { try { A.editConcept(bank, it.id, { label: e.target.value }); } catch { /* handled */ } } }),
    h('input', { class: 'in-weight', type: 'number', min: 0, step: 0.5, value: it.weight, disabled: !!lock, 'aria-label': `Weight of ${it.label}`,
      onchange: (e) => A.editConcept(bank, it.id, { weight: e.target.value }) }),
    h('span', { class: 'wbar', title: `${((it.weight / (total || 1)) * 100).toFixed(0)}% of total weight` }, h('i', { style: `width:${Math.min(100, (it.weight / (total || 1)) * 100 * 2)}%` })),
    h('input', { class: 'in-tags', value: it.tags.join('; '), disabled: !!lock, placeholder: 'tags', 'aria-label': `Tags of ${it.label}`, title: BANKS[bank].tagHelp,
      onchange: (e) => A.editConcept(bank, it.id, { tags: e.target.value }) }),
    h('button', { class: 'icon-btn', title: 'Delete concept', 'aria-label': `Delete ${it.label}`, disabled: !!lock, onclick: () => A.removeConcept(bank, it.id) }, '×'),
  ));

  const newLabel = h('input', { placeholder: `New ${BANKS[bank].singular}…`, 'aria-label': 'New concept label', disabled: !!lock, maxlength: 60,
    onkeydown: (e) => { if (e.key === 'Enter') add(); } });
  const newWeight = h('input', { type: 'number', min: 0, step: 0.5, value: 1, class: 'in-weight', 'aria-label': 'New concept weight', disabled: !!lock });
  const add = () => { if (newLabel.value.trim()) A.addConcept(bank, newLabel.value, newWeight.value, ''); };

  const importText = h('textarea', { rows: 4, placeholder: 'One concept per line, or comma-separated.\nOptional weight: lantern*3\nFull form: table | 2 | fn:hold; shared',
    'aria-label': 'Paste a list', disabled: !!lock, oninput: (e) => A.draft('importText', e.target.value) }, S.ui.drafts.importText ?? '');
  const fileInput = h('input', { type: 'file', accept: '.csv,text/csv,text/plain', 'aria-label': 'Choose a CSV file', disabled: !!lock,
    onchange: async (e) => { const f = e.target.files[0]; if (f) A.importCSV(await f.text(), bank); } });

  const res = S.ui.importResult;
  const presetSel = h('select', { 'aria-label': 'Memory preset', disabled: !!lock }, presetNames().map((n) => h('option', { value: n }, n)));
  const presetName = h('input', { placeholder: 'Preset name…', 'aria-label': 'Preset name' });
  const user = Object.keys(listUserPresets());

  return h('div', { class: 'panel-body' },
    lock && h('p', { class: 'lock-note' }, '🔒 ', lock),
    h('p', { class: 'hint' }, 'The machine can only combine what is in memory. Edit, re-weight, add or delete concepts; tags create relationships (hover a tag field for the syntax).'),
    tabs,
    h('div', { class: 'mem-head' }, h('span', null, 'Concept'), h('span', null, 'Weight'), h('span'), h('span', null, 'Tags'), h('span')),
    h('div', { class: 'mem-list' }, rows),
    h('div', { class: 'mem-add' }, newLabel, newWeight, h('button', { class: 'btn', disabled: !!lock, onclick: add }, 'Add')),
    h('p', { class: 'tiny' }, 'Tag syntax here: ', h('code', null, BANKS[bank].tagHelp)),

    h('details', { class: 'fold' }, h('summary', null, 'Import text or CSV'),
      h('label', { class: 'lbl' }, 'Paste a list into ', h('strong', null, BANKS[bank].title)), importText,
      h('div', { class: 'row' }, h('button', { class: 'btn', disabled: !!lock, onclick: () => A.importText(bank, importText.value) }, 'Import list'),
        h('label', { class: 'file' }, 'or CSV file: ', fileInput)),
      h('p', { class: 'tiny' }, 'CSV columns: ', h('code', null, 'label'), ' (required), ', h('code', null, 'bank'), ' (needs / objects / actions), ', h('code', null, 'weight'), ', ', h('code', null, 'tags'), ' (; separated). Without a bank column, rows go into the database shown above.'),
      res?.errors && h('div', { class: 'msg error', role: 'alert' }, h('strong', null, 'Nothing was imported.'), h('ul', null, res.errors.slice(0, 8).map((e) => h('li', null, e)), res.errors.length > 8 && h('li', null, `…and ${res.errors.length - 8} more.`))),
      res?.ok && h('div', { class: 'msg ok', role: 'status' }, res.ok),
    ),
    h('details', { class: 'fold' }, h('summary', null, 'Presets & export'),
      h('div', { class: 'row' }, presetSel, h('button', { class: 'btn', disabled: !!lock, onclick: () => A.loadPreset(presetSel.value) }, 'Load'),
        user.includes(presetSel.value) && h('button', { class: 'btn ghost', onclick: () => A.deletePreset(presetSel.value) }, 'Delete')),
      h('div', { class: 'row' }, presetName, h('button', { class: 'btn', onclick: () => A.savePreset(presetName.value) }, 'Save current memory')),
      h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: () => download('memory.csv', memoryToCSV(S.config.memory), 'text/csv') }, 'Download memory as CSV')),
    ),
    h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: S.frozenMemory, onchange: () => A.toggleFreezeMemory() }),
      h('span', null, 'Freeze memory while experimenting with other parameters')),
  );
}
