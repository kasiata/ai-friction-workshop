// WORKSHOP: the 45-minute sequence. The facilitator advances stages manually;
// the clock only offers a suggestion. "Locks" are optional constraints that make each stage's variable explicit.

export const STAGES = [
  {
    n: 1, minutes: [0, 5], title: 'Observe a baseline', operation: 'Observation', tab: 'process',
    activity: 'Introduce the brief and generate a baseline.',
    instructions: 'Read the design question. Press Generate a few times without changing anything. Open the trace beneath each idea: what exactly produced it?',
    locks: { memory: false, probability: false },
  },
  {
    n: 2, minutes: [5, 15], title: 'Manipulate probabilities', operation: 'Understanding the generative system', tab: 'probability',
    activity: 'Manipulate probabilities while keeping memory constant.',
    instructions: 'Memory is locked. Change the distribution mode and sliders, watch the bars move, then generate. Use “Sample ×100” to see what a setting does over many ideas.',
    locks: { memory: true, probability: false },
  },
  {
    n: 3, minutes: [15, 25], title: 'Manipulate memory', operation: 'Understanding source material', tab: 'memory',
    activity: 'Manipulate memory while keeping probabilities constant.',
    instructions: 'Probability settings are locked. Add, delete and re-weight concepts, or import your own list. Which concepts can the machine no longer say?',
    locks: { memory: false, probability: true },
  },
  {
    n: 4, minutes: [25, 35], title: 'Intuition → rule → recode', operation: 'Movement between cognitive modes', tab: 'process', focusIntervention: true,
    activity: 'Select, intuitively transform, and recode an unexpected result.',
    instructions: 'Pick the most unexpected idea so far. Say what interests you about it, then write the rule you think would produce more like it and apply it. Everything is unlocked.',
    locks: { memory: false, probability: false },
  },
  {
    n: 5, minutes: [35, 45], title: 'Compare and reflect', operation: 'Metacognition', tab: 'process',
    activity: 'Compare outcomes and reflect on cognitive friction.',
    instructions: 'Compare earlier and later generations. Mark the moments where changing approach felt difficult, and describe them in your own words.',
    locks: { memory: false, probability: false },
  },
];

export const stageByNumber = (n) => STAGES.find((s) => s.n === n) ?? null;

/** Which stage the clock alone would suggest (used only as a hint to the facilitator). */
export function suggestedStage(elapsedMs) {
  const min = elapsedMs / 60000;
  return (STAGES.find((s) => min >= s.minutes[0] && min < s.minutes[1]) ?? STAGES[STAGES.length - 1]).n;
}

export const stageLabel = (n) => (n ? `${n} · ${stageByNumber(n).title}` : 'free exploration');
