// FireGuard server: serves the dashboard and grounds Claude on NASA PSI + NASA documents.
// The API key never reaches the browser. Without a key the dashboard runs fully offline
// (rule engine + local retrieval in the browser).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
const FGSearch = require('./public/js/search.js');

const PORT = process.env.PORT || 3000;
const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const kb = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'data', 'kb.json'), 'utf8'));
const index = FGSearch.build(kb);

let client = null;
try { client = new Anthropic(); } catch { client = null; }
const aiConfigured = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

app.get('/api/status', (req, res) => res.json({ ai: aiConfigured(), model: aiConfigured() ? MODEL : null, kbChunks: kb.length }));

const SYSTEM = `You are FireGuard SI, a fire-safety decision-support assistant for crewed spacecraft and exploration habitats.
You are grounded ONLY in the NASA sources supplied in <sources> (NASA Physical Sciences Informatics combustion investigations, NASA Glenn experiment descriptions, "A Researcher's Guide to ISS Combustion Science", NASA lessons learned from Apollo 1, Apollo 13 and the 1997 Mir fire) plus the live sensor state.
Rules:
- Cite sources inline as [n] using the numbers in <sources>. Never invent investigations, numbers or procedures.
- If the sources do not support a claim, say it is a general practice or that the data is not in PSI.
- You support, not replace, crew and Mission Control decisions. Be concise and concrete.
- Reply in the language of the user's question (Russian or English).`;

function sourcesBlock(hits) {
  return '<sources>\n' + hits.map((h, i) => `[${i + 1}] ${h.doc.title}${h.doc.url ? ' — ' + h.doc.url : ''}\n${h.doc.text}`).join('\n\n') + '\n</sources>';
}

app.post('/api/ask', async (req, res) => {
  const { mode = 'chat', question = '', state = null, lang = 'en' } = req.body || {};
  const query = [question, state && state.summary].filter(Boolean).join(' ');
  const hits = index.search(query || 'spacecraft fire safety', 8);
  const sources = hits.map((h, i) => ({ n: i + 1, title: h.doc.title, url: h.doc.url }));
  if (!aiConfigured() || !client) return res.status(503).json({ error: 'ai_not_configured', sources });

  let task;
  if (mode === 'advise') {
    task = `Live module state (JSON):\n${JSON.stringify(state).slice(0, 6000)}\n\nWrite crew guidance in ${lang === 'ru' ? 'Russian' : 'English'} with three short sections:\n1. ACTIONS NOW — numbered, imperative, max 6 steps, ordered by priority.\n2. PREPARE / SAFETY — max 4 bullets (protective equipment, isolation, escape path).\n3. WHY (PSI EVIDENCE) — 2–3 bullets linking the situation to specific investigations with citations.`;
  } else if (mode === 'summarize') {
    task = `Summarize for an aerospace engineer, in ${lang === 'ru' ? 'Russian' : 'English'}: ${question}\nGive: objective, test conditions (fuel, O₂, pressure, flow), key result, and the fire-safety implication for spacecraft and lunar/Mars habitats. Max 180 words.`;
  } else {
    task = question;
  }
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: SYSTEM,
      messages: [{ role: 'user', content: sourcesBlock(hits) + '\n\n' + task }],
    });
    if (response.stop_reason === 'refusal') return res.status(422).json({ error: 'refusal', sources });
    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    res.json({ text, sources, model: response.model });
  } catch (err) {
    let code = 'api_error';
    if (err instanceof Anthropic.AuthenticationError) code = 'auth';
    else if (err instanceof Anthropic.RateLimitError) code = 'rate_limit';
    else if (err instanceof Anthropic.APIConnectionError) code = 'offline';
    console.error('[ai]', code, err.message);
    res.status(502).json({ error: code, sources });
  }
});

app.listen(PORT, () => console.log(`FireGuard running on http://localhost:${PORT}  (AI: ${aiConfigured() ? MODEL : 'offline mode'})`));
