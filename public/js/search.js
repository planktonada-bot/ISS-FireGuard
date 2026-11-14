// Tiny BM25 retriever shared by the browser (offline SI) and the Node server (Claude grounding).
(function (root) {
  const STOP = new Set('a an the of and or to in on for with by at from is are was were be been as that this these those it its into than then which can may not no but also more most such their there have has had will would could should about over under between during per via using used use'.split(' '));
  const stem = w => w.length > 5 ? w.replace(/(ments?|ings?|ations?|ions?|ers?|ed|es|ly|s)$/, '') : w;
  const tok = s => String(s || '').toLowerCase().replace(/[^a-z0-9а-яё₂%.\- ]+/gi, ' ').split(/\s+/).map(w => w.replace(/^[.\-]+|[.\-]+$/g, '')).filter(w => w.length > 1 && !STOP.has(w)).map(stem);
  function build(docs) {
    const N = docs.length, df = new Map(), lens = [], tfs = [];
    docs.forEach(d => { const t = tok(d.title + ' ' + d.text); lens.push(t.length); const tf = new Map(); t.forEach(w => tf.set(w, (tf.get(w) || 0) + 1)); tfs.push(tf); tf.forEach((_, w) => df.set(w, (df.get(w) || 0) + 1)); });
    const avg = lens.reduce((a, b) => a + b, 0) / Math.max(1, N);
    return {
      search(q, k = 6, filter) {
        const qt = [...new Set(tok(q))]; const res = [];
        for (let i = 0; i < N; i++) {
          if (filter && !filter(docs[i])) continue;
          let s = 0; const tf = tfs[i];
          for (const w of qt) { const f = tf.get(w); if (!f) continue; const idf = Math.log(1 + (N - df.get(w) + 0.5) / (df.get(w) + 0.5)); s += idf * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * lens[i] / avg)); }
          if (s > 0) res.push({ score: s, doc: docs[i] });
        }
        return res.sort((a, b) => b.score - a.score).slice(0, k);
      },
    };
  }
  const api = { build, tokenize: tok };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FGSearch = api;
})(typeof window !== 'undefined' ? window : globalThis);
