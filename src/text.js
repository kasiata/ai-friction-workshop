// Small English helpers used when composing propositions from user-editable labels.
// Actions work best entered as base verbs ("remember", "exchange"); irregulars can simply be typed as tags.

const vowels = /[aeiou]/i;

function mapFirstWord(phrase, fn) {
  const [first, ...rest] = String(phrase).trim().split(/\s+/);
  return [fn(first), ...rest].join(' ');
}

const IRREGULAR_S = { have: 'has', be: 'is', do: 'does', go: 'goes' };

export function verbS(phrase) {
  return mapFirstWord(phrase, (w) => {
    const lw = w.toLowerCase();
    if (IRREGULAR_S[lw]) return IRREGULAR_S[lw];
    if (/(s|x|z|ch|sh|o)$/i.test(w)) return w + 'es';
    if (/[^aeiou]y$/i.test(w)) return w.slice(0, -1) + 'ies';
    return w + 's';
  });
}

export function verbIng(phrase) {
  return mapFirstWord(phrase, (w) => {
    if (/ie$/i.test(w)) return w.slice(0, -2) + 'ying';
    if (/[^aeiouye]e$/i.test(w)) return w.slice(0, -1) + 'ing';
    if (/^[^aeiou]+[aeiou][^aeiouwxy]$/i.test(w)) return w + w.slice(-1) + 'ing';
    return w + 'ing';
  });
}

export function withArticle(noun) {
  const n = String(noun).trim();
  return (vowels.test(n[0] || '') ? 'an ' : 'a ') + n;
}

export function capitalize(s) {
  s = String(s);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
