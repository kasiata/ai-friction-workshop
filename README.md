# Breaking the Prompt — AI-friction workshop

Live workshop (language choice): https://kasiata.github.io/ai-friction-workshop/

Choose **English** or **Nederlands** on the entry page. Both language versions include both exercises, editable examples, instructions, errors, the manual ChatGPT interpretation prompt and a printable A4. Language links inside each exercise preserve the exercise number. Participant-entered text is not automatically translated.

Two Dutch exercises based on Kasia Głowicka's presentation:

1. **Systeem → intuïtie** — explore a transparent generator, interpret a proposal and develop it on paper.
2. **Intuïtie → systeem** — contribute text, inspect word frequencies and co-occurrence, ask ChatGPT for categories and relationships, then edit the resulting collections and rules.

Each collection has six independent selection models: uniform, normal, exponential, Zipf, triangular, and custom weights. A fixed seed supports before/after comparisons. Reflections are recorded on the printable A4, with the four original presentation QR codes.

## Analysis and documents

Type text or load TXT, Markdown or DOCX (main document text; up to 5 MB / 50,000 characters). For PDF, paste extracted text. Documents are processed locally in the browser. The complete source is not automatically stored or uploaded. Approved generator collections persist in local browser storage. Each language uses its own saved generator state. Dutch retains its previous key; English uses an `-en` suffix. The analysis draft stays on its page. An explicit “Use in Exercise 1” click puts the reviewed system and its original baseline in per-language session storage, then opens the generator, which consumes that handoff. Participant text is not automatically translated.

Transparent extraction counts word occurrences and word pairs within five content words in a sentence, once per pair per sentence, among the 32 most frequent content words. These observations are included in the prepared ChatGPT prompt; frequency does not automatically become importance or selection weight.

LLM interpretation currently uses **manual copy-and-return**: copy the prompt to ChatGPT, send it there, and paste the returned JSON back. Review literal source quotes, names, ingredients, weights and any proposed B→C relationship before applying it. Quote presence alone does not validate an interpretation. There is no automatic LLM API and no API key in this repository.

## Files

- `index.html`: ENG / NL language choice.
- `nl/` and `en/`: complete Dutch and English workshop pages and runtime modules.
- `workshop.html`: canonical Dutch exercise 1 source.
- `scripts/localize.py` and `scripts/translations.json`: deterministic language generation using Python 3 (standard library only).
- `oefening-2.html`: exercise 2.
- `werkblad.html`: editable A4, including the current GitHub Pages address.
- `werkblad-a4.pdf` and `worksheet-a4-en.pdf`: Dutch and English one-page printable PDFs.
- `assets/qr-*.svg`: four original vector QR codes.
- `engine.mjs`, `analysis.mjs`, `document.mjs`: generator, text analysis and document extraction.

The workshop has no npm package dependencies. Regenerating the language versions requires Python 3; the optional English PDF generator also requires ReportLab and DejaVu fonts. Both PDFs and the generated language pages are checked in. All runtime URLs are relative, so it works under a GitHub Pages project path.

## Local development and checks

```sh
npm start
npm test
npm run build
```

`npm start` serves the root at http://localhost:5173. Tests include the current workshop modules and the earlier prototype's retained engine checks. `npm run build` regenerates EN/NL pages from the canonical Dutch HTML/JS and translation dictionary, then packages both languages and the entry page in `dist/`. After editing canonical source, run it and commit the generated `en/` and `nl/` changes because branch-based Pages serves checked-in files.

## GitHub Pages

The repository uses **Settings → Pages → Deploy from a branch → main → / (root)**. A push to main updates the public workshop. `.nojekyll` ensures static files are served directly. The optional manual Pages workflow builds the same current workshop.

No workshop source documents or participant records are committed or collected. The earlier prototype remains in Git history and its existing `src/`, `css/` and documentation; see `docs/previous-prototype.md` for that version.

## Concise analysis and generator handoff
Exercise 1 uses a warm tint; Exercise 2 uses a cool green tint. Exercise 2 no longer duplicates the generator. Its primary flow is source → visible keyword/co-occurrence bars → editable collections → **Use in Exercise 1**. Quotes, templates, optional connection rules and the manual ChatGPT workflow are in expandable sections. The handoff carries the reviewed challenge, collections, custom weights, template and approved rule, along with a baseline for same-seed comparison. Validation runs before storage or navigation. The source document and raw analysis response are not included in the handoff. The generator saves the resulting ingredients in local browser storage as before.

## Editorial design and vocabulary
The approved visual design uses charcoal, magenta, serif headings and neutral gradients (parchment for the generator, warm grey for text analysis). Each collection now groups its editable ingredients, selection model, probability profile and optional model parameters. Connection settings are collapsed. The header has one language switch.

`begrippen.html` and its generated EN/NL versions explain the controls, all six models, analysis terms, the manual ChatGPT flow and cognitive friction. The hidden numeric seed is presented as **Keep randomness fixed**: checked repeats the current draw sequence, unchecked draws a new seed for each generation. **New draw** refreshes the fixed sequence. Saved state retains the hidden seed for reproducibility; `fixedRandomness` is optional and defaults to true for existing or transferred systems. No new probability model or generator algorithm was introduced.

## System map and explorations
Exercise 2 now presents a source → collections and actual probabilities → dependency → possible outputs map. Ingredient clicks reveal the literal source passage (or identify an uncited addition). Group edit links open the existing editor, and the map refreshes with edits. Displayed collection probabilities are explicitly before any B→C restriction; outputs are produced by the actual generator.

The manual ChatGPT prompt requests up to three structured experiments using only `amplify`, `loosen`, and `combine`. Imported instructions cannot execute code or arbitrary operations. Participants can edit proposals, enter a prediction, apply one intervention at a time, compare same-seed outputs, and undo. A combined pair is one new composite ingredient, not a claim that the generator now draws two items simultaneously. Missing/changed targets and nonexistent connection rules are disabled with a reason. The reviewed variant and its immediate before-intervention baseline transfer to Exercise 1.

Responses without experiments remain compatible: locally assembled recipes appear under **Local explorations**, not AI suggestions. No automatic LLM call was introduced. Full source documents, quotes and prediction text are not included in the generator handoff.

## FBS-inspired solution analysis
The main analysis is now **Function–Behaviour–Structure**: intended purposes, observable/expected behaviour, and physical or organisational components. This is a workshop adaptation of Gero & Kannengiesser (2004), https://doi.org/10.1016/j.destud.2003.10.010, not a full implementation of their design process.

The worked example is an original, 400+ word workshop description of the existing **Chatter & Natter** concept, with links to The Chatty Café Scheme's own public explanations. It distinguishes intended outcomes and our design interpretation from observed evidence. Both NL and EN versions are supplied. Source quotations refer to the supplied description; source links document its factual basis.

Local classification is deliberately provisional: explicit goal clauses, action cues and component terms yield editable F/B/S candidates and relationship hypotheses. Counts remain available separately. Missing categories remain empty for participant completion instead of being padded with arbitrary text fragments. The manual ChatGPT prompt requests the same role order and typed, quote-backed relationships.

Typed workshop relationships are `realises` (B→F), `enables` (S→B), `requires` (B→S), and `inhibits` (S→B). These are teaching extensions, not canonical FBS process names or causal proof. Participants explicitly enable proposed relationships. In Exercise 1, active links filter behaviour candidates after a function is chosen, and structure candidates after behaviour is chosen. Missing links leave choices open; contradictions and zero remaining probability produce an explicit error. A proposal still selects one item per category, so multiple required components must be represented as one composite structure.

FBS exploration cards can substitute a structure, substitute a behaviour, or disable one dependency. Replacements retain a proposed dependency with relabelled endpoints, making the assumption testable. Source evidence remains marked as describing the original ingredient. Undo and transfer preserve the full relation model and before-intervention baseline. Existing custom systems remain compatible; only the unchanged earlier example is replaced by the new defaults.

## Direct weight sliders
Each ingredient in the Exercise 2 system map now has a native mouse/touch/keyboard slider. Sliders adjust relative weights; probability labels, other ingredients in that collection and generated possibilities update together. The slider element is preserved during dragging, so successive input events do not interrupt the gesture. Values that leave no selectable ingredient are rejected and the slider returns to its previous value. Quote selection remains on the ingredient name. Text/name changes remain in a separate expandable editor. Reviewed weights are preserved in the Exercise 1 transfer.
