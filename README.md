# Breaking the Prompt — AI-friction workshop

Live workshop: https://kasiata.github.io/ai-friction-workshop/

Two Dutch exercises based on Kasia Głowicka's presentation:

1. **Systeem → intuïtie** — explore a transparent generator, interpret a proposal and develop it on paper.
2. **Intuïtie → systeem** — contribute text, inspect word frequencies and co-occurrence, ask ChatGPT for categories and relationships, then edit the resulting collections and rules.

Each collection has six independent selection models: uniform, normal, exponential, Zipf, triangular, and custom weights. A fixed seed supports before/after comparisons. Reflections are recorded on the printable A4, with the four original presentation QR codes.

## Analysis and documents

Type text or load TXT, Markdown or DOCX (main document text; up to 5 MB / 50,000 characters). For PDF, paste extracted text. Documents are processed locally in the browser. The complete source is not automatically stored or uploaded. Approved generator collections persist in local browser storage. Exercise 1 and 2 use separate storage keys.

Transparent extraction counts word occurrences and word pairs within five content words in a sentence, once per pair per sentence, among the 32 most frequent content words. These observations are included in the prepared ChatGPT prompt; frequency does not automatically become importance or selection weight.

LLM interpretation currently uses **manual copy-and-return**: copy the prompt to ChatGPT, send it there, and paste the returned JSON back. Review literal source quotes, names, ingredients, weights and any proposed B→C relationship before applying it. Quote presence alone does not validate an interpretation. There is no automatic LLM API and no API key in this repository.

## Files

- `index.html`: exercise 1.
- `oefening-2.html`: exercise 2.
- `werkblad.html`: editable A4, including the current GitHub Pages address.
- `werkblad-a4.pdf`: one-page printable PDF.
- `assets/qr-*.svg`: four original vector QR codes.
- `engine.mjs`, `analysis.mjs`, `document.mjs`: generator, text analysis and document extraction.

The workshop has no build-time dependencies. All runtime URLs are relative, so it works under a GitHub Pages project path.

## Local development and checks

```sh
npm start
npm test
npm run build
```

`npm start` serves the root at http://localhost:5173. Tests include the current workshop modules and the earlier prototype's retained engine checks. `npm run build` packages the current workshop in `dist/`.

## GitHub Pages

The repository uses **Settings → Pages → Deploy from a branch → main → / (root)**. A push to main updates the public workshop. `.nojekyll` ensures static files are served directly. The optional manual Pages workflow builds the same current workshop.

No workshop source documents or participant records are committed or collected. The earlier prototype remains in Git history and its existing `src/`, `css/` and documentation; see `docs/previous-prototype.md` for that version.
