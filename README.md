# Beautifully Broken — Designing for Cognitive Friction

A transparent, editable **idea machine** for a 45-minute workshop (Inholland Design Doing Symposium, November 2026), based on Kasia Głowicka's *The Space In-Between: Creative Skill and Cognitive Transitions in the Age of Prompt-Based AI* (CHIWORK 2026).

It is an experiment in human creative thinking, not a brainstorming tool. Participants change the three things that make the machine say what it says — **memory**, **probability**, **process** — and notice what happens when they move between intuition, formalisation and redesign.

Plain HTML/CSS/JavaScript (ES modules). **No build step, no dependencies, no accounts, no external AI, no network calls.** Everything is stored in the participant's browser.

## Local development

Requires Node 18+ (only for the tiny dev server and tests).

```bash
npm start        # http://localhost:5173  (ES modules need http://, not file://)
```

## Running tests

```bash
npm test         # node's built-in test runner, no packages to install
```

`tests/engine.test.js` covers the PRNG, probability maths (uniform / weighted / reinforcement / exploration / novelty / repetition, plus empirical-vs-theoretical sampling), memory editing and text/CSV import validation, the three architectures (their different dependencies), procedure validation (bad dataflow, nesting, unbounded loops), reproducibility, and that participant rules change later generations.

## Building

```bash
npm run build    # copies index.html, css/, src/, docs/ into dist/ (+ .nojekyll)
```

The site is static, so `dist/` can be hosted anywhere.

## Publishing to GitHub Pages (not done yet — needs your go-ahead)

Nothing has been published. When you decide to:

1. Push the repository to GitHub.
2. Settings → Pages → Source: **GitHub Actions**.
3. Actions tab → **Deploy to GitHub Pages** → *Run workflow*. (`.github/workflows/pages.yml` is manual-only: it runs the tests, builds, and deploys. It never runs on push.)

Alternatively upload `dist/` to any static host.

## Using it

- **Free exploration** — everything open.
- **Workshop (45 min)** — five stages with the facilitator advancing manually (the clock only hints). Stage 2 locks memory, stage 3 locks probabilities, so one variable moves at a time ("Lock the variable…" can be switched off).
- The **design question** is editable by the facilitator; the machine itself doesn't read it.
- Every idea has a **trace**: candidates, their probabilities at that moment, the random draw, the outcome. Hover a row for the arithmetic.
- **Reproduce** re-runs a generation from its stored configuration, learned state and seed, and checks the result is identical.

### The three dimensions

| | What it is | Where |
|---|---|---|
| Memory | Three databases (needs, objects, actions): label, weight, tags | `src/memory.js` |
| Probability | How candidates become selection probabilities | `src/probability.js` |
| Process | Architectures as data: ordered operations with dependencies | `src/process.js` |

**Probability maths** (for each candidate *i*, weight *wᵢ*, times chosen *cᵢ*, memory influence *m*):

```
base      = 1                                  uniform
          = (1 − m) + m · wᵢ / mean(w)         weighted, reinforcement, exploration
reinforce × (1 + R · cᵢ)                       reinforcement mode
explore   × (1 + E / (1 + cᵢ))                 exploration mode
familiar  × (1 + 3·Rep)(1 − 0.95·Nov)          if choosing i repeats a combination already generated
rules     × participant-written multipliers
pᵢ = value / Σ value
```

**Tags** (plain text, written by participants — nothing is inferred): needs `opposes:privacy`; objects `fn:rest` (conventional function) plus free property words; actions `serves:belonging` (no `serves` tag = any need).

**Architectures**: A *need first* (need → object → action that serves the need); B *object first* (object → property → usual function → transformed by an action → the need that action serves); C *contradiction first* (need → opposing need → named tension → object → action serving either). Editable in the Process tab: reorder, change filters, add a conditional, add a bounded loop (1–5 rounds), save your own. The vocabulary is fixed; no code can be entered, and every change is validated (slots must exist before use, one compose step last, no nesting, loops bounded).

### Turn an intuition into a rule

Pick an idea → write what interests you → write the rule in your own words → make it explicit with a template (favour a concept, favour a tag, add a "when X appears, favour Y" relationship, change probability settings, or add a retry-until-new loop) → confirm. The rule changes every later generation (visible as `rule:` factors in the trace) and stays linked to the original idea in the history.

### Reflection

Optional prediction/observation fields, stage prompts, a four-option self-report, and a **Mark friction** button. These are the participant's own words; the app never infers cognitive states.

### Exporting local records

History panel → **Download JSON log** (full detail: configuration of every generation, learned state, events, rules) or **CSV log** (one row per event). Records live in `localStorage`; **New session** deletes them.

## Modifying default datasets

Edit `DEFAULT_ITEMS` in `src/memory.js` (`label, weight, tags`) or add a built-in preset to `BUILT_IN_PRESETS` in the same file. Participants can also import lists/CSV in the Memory tab. Architectures live in `ARCHITECTURES` in `src/process.js`; workshop stages in `src/workshop.js`.

## Future phases (prepared, inactive)

- **Natural-language rules**: `proposeRuleFromText` in `src/rules.js` is a small keyword parser. A future LLM would only need to produce the same rule objects (schema in [`docs/rule-schema.md`](docs/rule-schema.md)); proposals are shown, editable, validated, and require confirmation. Generated code is never executed.
- **Research data collection**: `src/research.js` defines the opt-in seam, consent text and adapter interface. It is switched off and makes no requests; sessions already carry a random pseudonymous id.

## Layout

```
index.html  css/style.css
src/  prng  storage  text  memory  probability  process  rules  generator  history  reflection  workshop  research
src/ui/  state (all actions + history logging)  app  memoryPanel  probabilityPanel  processPanel  resultPanel  interventionPanel  sidePanels
tests/  scripts/  docs/
```
