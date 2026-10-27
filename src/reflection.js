// REFLECTION: prompts and self-report options. Everything here is self-reported by participants.
// The application never infers cognitive states from interaction logs.

export const SELF_REPORT = [
  { id: 'intuitive', label: 'I was imagining or working intuitively.' },
  { id: 'analytic', label: 'I was analysing or formalising.' },
  { id: 'switching', label: 'I was deliberately changing my approach.' },
  { id: 'uncertain', label: 'I was uncertain about what to do next.' },
];

export const PROMPTS = {
  before: 'What do you expect will happen?',
  after: 'What happened differently from your expectation?',
  interest: 'What do you find interesting about this idea?',
  rule: 'Can you describe a rule that might produce more ideas with this quality?',
  intention: 'Did the unexpected result change your original intention?',
};

export const REFLECTION_NOTE =
  'These are your own descriptions of your experience, kept in this browser. They are not measurements of how your mind works.';

/** Stage-specific invitation (one per stage, optional, never blocks anything). */
export const STAGE_PROMPTS = {
  1: 'Before you generate: what kind of idea do you expect this machine to produce, and why?',
  2: 'Which setting surprised you most? What did the change reveal about how the machine “thinks”?',
  3: 'What did you expect to happen when you changed the memory? What actually happened?',
  4: PROMPTS.intention,
  5: 'Where did you notice friction — moving from intuition to a rule, from a rule to a surprise, or from a surprise back to redesign?',
};

export const selfReportLabel = (id) => SELF_REPORT.find((s) => s.id === id)?.label ?? id;
