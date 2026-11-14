// Builds public/data/psi.json (investigations + normalized test points)
// and public/data/kb.json (text chunks for the SI search / AI retrieval)
// from raw NASA PSI API downloads (data/psi_raw) and NASA documents (knowledge/text).
//   node scripts/build-data.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const RAW = path.join(ROOT, 'data', 'psi_raw');
const OUT = path.join(ROOT, 'public', 'data');
const curated = require('./curated');
fs.mkdirSync(OUT, { recursive: true });

// ---------- CSV ----------
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = (rows.shift() || []).map(h => h.replace(/\s+/g, ' ').trim());
  return { header, rows: rows.filter(r => r.some(x => x.trim())) };
}
const num = s => { if (s == null) return null; const m = String(s).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };
const col = (header, re) => header.findIndex(h => re.test(h));
const list = s => String(s || '').split(/[;]/).map(num).filter(v => v != null);

// ---------- test-point mappers (one per experimental table) ----------
// Each point: {inv, fuel, o2 (% vol), p (atm), flow (cm/s), diluent, result, metric, unit, value}
const points = [];
function add(p) { points.push(Object.assign({ fuel: null, o2: null, p: null, flow: null, diluent: 'N2', result: null, metric: null, value: null, unit: null }, p)); }

const mappers = {
  'PSI-98': ({ header, rows }) => rows.filter(r => /^S\d/.test(r[0])).forEach(r => add({ inv: 'PSI-98', fuel: r[1].trim(), o2: num(r[col(header, /O2/)]), p: 1, flow: num(r[col(header, /Air Flow/)]), result: `${r[col(header, /Flow Direction/)].trim()} burn ${num(r[col(header, /Burn Time/)])} s`, metric: 'burn time', value: num(r[col(header, /Burn Time/)]), unit: 's' })),
  'PSI-99': ({ header, rows }) => { let last = ''; rows.filter(r => /^2-\d/.test(r[0])).forEach(r => { const fuel = r[1].trim() || last; last = fuel; const sr = r[col(header, /g Spread Length/)]; add({ inv: 'PSI-99', fuel, o2: num(r[col(header, /O2/)]), p: 1, flow: num(r[col(header, /Air Flow/)]), result: `${r[col(header, /Flow Direction/)].trim()}; µg burn length ${r[col(header, /g Burn Length/)].trim()}`, metric: /mm\/s/.test(sr) ? 'flame spread rate (µg)' : null, value: /mm\/s/.test(sr) ? num(sr) : null, unit: /mm\/s/.test(sr) ? 'mm/s' : null }); }); },
  'PSI-100': ({ header, rows }) => rows.filter(r => /^S\d/.test(r[0])).forEach(r => add({ inv: 'PSI-100', fuel: r[1].trim(), o2: 21, p: 1, flow: num(r[col(header, /Air Flow/)]), result: r[col(header, /Direction/)].trim() })),
  'PSI-26': ({ header, rows }) => rows.forEach(r => add({ inv: 'PSI-26', fuel: (r[col(header, /Material/)] || '').trim(), o2: 21, p: 1, result: 'flame spread / N₂ suppression test' })),
  'PSI-25': ({ header, rows }) => rows.forEach(r => { const o2 = num(r[col(header, /initial O2/i)]); if (o2 == null || o2 < 5) return; add({ inv: 'PSI-25', fuel: (r[col(header, /Material/)] || '').replace(/\s+/g, ' ').trim(), o2, p: 1, result: `CO ${r[col(header, /Initial CO \(ppm/)] || '?'}→${r[col(header, /Final CO \(ppm/)] || '?'} ppm`, ...(() => { const a = num(r[col(header, /Initial CO \(ppm/)]), b = num(r[col(header, /Final CO \(ppm/)]); return a != null && b != null ? { metric: 'CO rise', value: b - a, unit: 'ppm' } : {}; })() }); }),
  'PSI-102': ({ header, rows }) => rows.forEach(r => add({ inv: 'PSI-102', fuel: r[1].split(':')[0].trim(), o2: 21, p: 1, flow: num(r[2]) ?? 5, result: 'smoke particle sizing' })),
  'PSI-101': ({ header, rows }) => rows.forEach(r => add({ inv: 'PSI-101', fuel: r[0].trim(), o2: 21, p: 1, flow: num(r[col(header, /Inlet velocity/)]), result: 'smoke aging', metric: 'net aging time', value: num(r[col(header, /Net aging/)]), unit: 's' })),
  'PSI-47': ({ rows }) => rows.forEach(r => add({ inv: 'PSI-47', fuel: 'Arizona road dust', o2: 21, p: 1, result: r[4] })),
  'PSI-69': ({ header, rows }) => rows.forEach(r => { const o2 = num(r[col(header, /^O initial/)]); if (o2 == null) return; const he = num(r[col(header, /^He/)]) || 0, co2 = num(r[col(header, /^CO initial/)]) || 0; add({ inv: 'PSI-69', fuel: r[col(header, /^Fuel/)], o2: o2 * 100, p: (num(r[col(header, /pressure/)]) || 760) / 760, diluent: he > 0.05 ? 'He' : co2 > 0.05 ? 'CO2' : 'N2', result: r[col(header, /Test end/)], metric: 'burn time', value: num(r[col(header, /Burn time/)]), unit: 's' }); }),
  'PSI-68': ({ header, rows }) => rows.forEach(r => list(r[3]).forEach(x => list(r[4]).forEach(pp => add({ inv: 'PSI-68', fuel: r[0].trim(), o2: x * 100, p: pp, flow: 0.1, diluent: 'N2/He', result: 'test-matrix condition' })))),
  'PSI-39': ({ header, rows }) => rows.forEach(r => add({ inv: 'PSI-39', fuel: r[col(header, /Fuel/)], o2: (num(r[col(header, /Oxygen/)]) || 0.21) * 100, p: num(r[col(header, /Pressure/)]), diluent: num(r[col(header, /Helium/)]) > 0 ? 'He' : 'N2', result: 'cool-flame droplet test' })),
  'PSI-159': ({ header, rows }) => rows.forEach(r => { const o2 = num(r[col(header, /XO2 before/)]); if (o2 == null) return; add({ inv: 'PSI-159', fuel: `${r[col(header, /^Fuel/)]} (${r[0]})`, o2: o2 * 100, p: (num(r[col(header, /approx p/)]) || 1) / 1.01325, result: /yes/i.test(r[col(header, /Cool flame/)] || '') ? 'cool flame' : 'hot flame', metric: 'burn time', value: num(r[col(header, /burn time/)]), unit: 's' }); }),
  'PSI-10': ({ header, rows }) => rows.forEach(r => { const o2 = num(r[col(header, /XO2 \(init/)]); if (o2 == null) return; add({ inv: 'PSI-10', fuel: `${r[col(header, /^Fuel/)]} (${r[0]})`, o2: o2 * 100, p: num(r[col(header, /pmean|pinit/)]), result: 'soot/extinction limit test' }); }),
  'PSI-20': ({ header, rows }) => rows.forEach(r => list(r[col(header, /Oxygen/)]).filter(x => x <= 100).forEach(x => add({ inv: 'PSI-20', fuel: r[col(header, /Fuel Bottle/)].trim(), o2: x, p: 1, flow: 0, result: `${r[col(header, /Flames Ignited/)]} flames that day` }))),
  'PSI-23': ({ header, rows }) => rows.forEach(r => add({ inv: 'PSI-23', fuel: r[col(header, /Fuel Bottle/)], o2: num(r[col(header, /Atmosphere/)]), p: 1, result: `${r[col(header, /Flames Ignited/)]} flames` })),
  'PSI-21': ({ header, rows }) => rows.forEach(r => add({ inv: 'PSI-21', fuel: r[col(header, /Fuel Bottle/)], o2: 21, p: 1, result: `${r[col(header, /Flames ignited/i)]} flames` })),
  'PSI-22': ({ header, rows }) => rows.filter(r => r[1]).forEach(r => add({ inv: 'PSI-22', fuel: r[col(header, /Fuel Bottle/)], o2: 21, p: 1, result: `E-field ${r[col(header, /Polarity/)]}` })),
  'PSI-107': ({ header, rows }) => rows.forEach(r => add({ inv: 'PSI-107', fuel: r[col(header, /^Fuel$/)], o2: 21, p: 1, flow: num(r[col(header, /Air Rate/)]), result: 'smoke-point jet flame', metric: 'fuel rate', value: num(r[col(header, /Fuel Rate \(mg/)]), unit: 'mg/s' })),
  'PSI-106': ({ rows }) => rows.forEach(r => add({ inv: 'PSI-106', fuel: r[1], o2: 21, p: 1, result: 'lifted flame' })),
};

// ---------- investigations ----------
const files = fs.readdirSync(RAW).filter(f => /^PSI-\d+\.json$/.test(f));
const tableDir = path.join(RAW, 'tables');
const tableFiles = fs.existsSync(tableDir) ? fs.readdirSync(tableDir).filter(f => f.endsWith('.csv')) : [];
const investigations = [];
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8'));
  const id = d.accession, c = curated[id] || {};
  const tables = tableFiles.filter(t => t.startsWith(id + '--'));
  const tablesOut = [];
  for (const t of tables) {
    const parsed = parseCSV(fs.readFileSync(path.join(tableDir, t), 'utf8'));
    tablesOut.push({ name: t.replace(id + '--', '').replace(/_/g, ' '), header: parsed.header, rows: parsed.rows.slice(0, 400) });
    if (mappers[id]) { try { mappers[id](parsed); } catch (e) { console.warn('mapper failed', id, t, e.message); } }
  }
  const fileCats = {};
  for (const a of d.added || []) { const cat = (a.remote_path || '').split('/')[4] || 'Other'; fileCats[cat] = (fileCats[cat] || 0) + 1; }
  investigations.push({
    id, acronym: d.investigationAcronym || '', title: d.title, type: d.projectType, subArea: d.subResearchArea || '',
    objective: d.objective || '', approach: d.approach || '', hypothesis: d.hypothesis || '', impacts: d.researchImpacts || '',
    hardwarePSI: d.experimentHardware || '', center: d.managingNasaCenter || '', platform: d.flightProgram || '',
    start: d.investigationStartDate, end: d.investigationEndDate, released: d.releaseDate, doi: d.doi,
    related: (d.related_glds || '').split(/[,\s]+/).filter(Boolean),
    publications: (d.publications || []).map(p => ({ title: p.title, doi: p.doi, authors: p.authorList })).slice(0, 40),
    nPublications: (d.publications || []).length, nFiles: (d.added || []).length, sizeGB: +(d.totalFileSize / 1e9).toFixed(1), fileCats,
    url: `https://psi.nasa.gov/physci/repo/data/investigations/${id}`,
    tables: tablesOut,
    ...c,
  });
}
// test counts per investigation
for (const inv of investigations) inv.nTests = points.filter(p => p.inv === inv.id).length;
investigations.sort((a, b) => (b.rel ?? 0) - (a.rel ?? 0));

// ---------- habitats (challenge text + NASA Exploration Atmospheres) ----------
const habitats = [
  { id: 'iss', name: 'ISS', o2: 21, p_kPa: 101.3, g: 'µg', note: 'Sea-level air, 14.7 psi' },
  { id: 'orion', name: 'Orion / Artemis', o2: 21, p_kPa: 101.3, g: 'µg', note: 'Cabin at 14.7 psi; Artemis II smoke-alarm event' },
  { id: 'gateway', name: 'Gateway / transit', o2: 26.5, p_kPa: 70.3, g: 'µg', note: 'Candidate reduced-pressure atmosphere (10.2 psi)' },
  { id: 'moonbase', name: 'Moon Base', o2: 30, p_kPa: 70.3, g: '1/6 g', note: 'Challenge: ≥30% O₂ at ≤10.2 psi' },
  { id: 'rover', name: 'Pressurized rover', o2: 34, p_kPa: 56.5, g: '1/6 g', note: 'Exploration atmosphere 8.2 psi / 34% O₂' },
  { id: 'mars', name: 'Mars habitat', o2: 30, p_kPa: 70.3, g: '3/8 g', note: 'Reduced-pressure, enriched O₂ (assumed)' },
];

fs.writeFileSync(path.join(OUT, 'psi.json'), JSON.stringify({ generated: new Date().toISOString(), source: 'NASA Physical Sciences Informatics (psi.nasa.gov) — Combustion Science', investigations, points, habitats }));
console.log('psi.json:', investigations.length, 'investigations,', points.length, 'test points');

// ---------- knowledge-base chunks ----------
const KTXT = path.join(ROOT, 'knowledge', 'text');
const sources = {
  'E1.txt': ['ACME — Advanced Combustion via Microgravity Experiments (NASA GRC)', 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/'],
  'E2.txt': ['BASS / BASS-II — Burning and Suppression of Solids (NASA GRC)', 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-26'],
  'E3.txt': ['DAFT — Dust and Aerosol Measurement Feasibility Test (NASA GRC)', 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-47'],
  'E4.txt': ['FLEX / FLEX-2 — Flame Extinguishment Experiment (NASA GRC)', 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-69'],
  'E5.txt': ['SLICE — Structure & Liftoff in Combustion Experiment (NASA GRC)', 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-106'],
  'E6.txt': ['SPICE — Smoke Point in Co-flow Experiment (NASA GRC)', 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-107'],
  'researchers_guide_2015.txt': ["A Researcher's Guide to ISS Combustion Science (NP-2015-10-034-JSC)", 'https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/'],
  'lesson_apollo1.txt': ['Apollo 1 — NASA Safety & Mission Assurance lessons learned', 'https://sma.nasa.gov/sma-disciplines/accllp/apollo-1'],
  'lesson_apollo13.txt': ['Apollo 13 — NASA Safety & Mission Assurance lessons learned', 'https://sma.nasa.gov/sma-disciplines/accllp/apollo-13'],
  'lesson_mir1997.txt': ['25 Years Ago: Fire Aboard Space Station Mir (NASA History)', 'https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/'],
  'glenn_combustion.txt': ['NASA Glenn — Combustion Science', 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/'],
  'spinoff_fire_detector.txt': ['NASA Spinoff — Fire Detector', 'https://spinoff.nasa.gov/node/9407'],
  'spinoff_air_tanks.txt': ["NASA Spinoff — Fireman's Air Tanks", 'https://spinoff.nasa.gov/node/9582'],
  'spinoff_fire_attire.txt': ['NASA Spinoff — New Technology for the Fire Attire', 'https://spinoff.nasa.gov/node/9918'],
};
const chunks = [];
function chunkText(text, title, url, size = 900) {
  const paras = text.replace(/\f/g, '\n').split(/\n\s*\n|\n(?=[A-Z•�])/).map(s => s.replace(/\s+/g, ' ').trim()).filter(s => s.length > 40);
  let buf = '';
  for (const p of paras) { if ((buf + ' ' + p).length > size && buf) { chunks.push({ title, url, text: buf.trim() }); buf = ''; } buf += ' ' + p; }
  if (buf.trim().length > 60) chunks.push({ title, url, text: buf.trim() });
}
for (const [file, [title, url]] of Object.entries(sources)) {
  const p = path.join(KTXT, file); if (!fs.existsSync(p)) continue;
  let t = fs.readFileSync(p, 'utf8').replace(/^SOURCE:.*\n/, '');
  if (file === 'lesson_mir1997.txt') t = t.slice(t.indexOf('On Feb. 24, 1997'));
  chunkText(t, title, url);
}
// user-supplied extra docs: any .txt/.md dropped into knowledge/ (not the text/ subfolder)
for (const f of fs.readdirSync(path.join(ROOT, 'knowledge')).filter(f => /\.(txt|md)$/i.test(f))) {
  chunkText(fs.readFileSync(path.join(ROOT, 'knowledge', f), 'utf8'), 'Team document: ' + f, '');
}
for (const inv of investigations) {
  const name = `${inv.id}${inv.acronym ? ' ' + inv.acronym : ''} — ${inv.title}`;
  chunks.push({ title: name + ' (PSI record)', url: inv.url, inv: inv.id, text: [inv.finding, inv.objective, inv.approach, inv.impacts].filter(Boolean).join(' ').replace(/\s+/g, ' ').slice(0, 2500) });
}
fs.writeFileSync(path.join(OUT, 'kb.json'), JSON.stringify(chunks));
console.log('kb.json:', chunks.length, 'chunks');
