// PSI Research Explorer — summarize, rank, compare and interpret PSI combustion investigations.
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PILLARS = { prevention: { en: 'Prevention', ru: 'Профилактика' }, detection: { en: 'Detection', ru: 'Обнаружение' }, suppression: { en: 'Suppression', ru: 'Тушение' }, modeling: { en: 'Predictive modeling', ru: 'Моделирование' } };
  const PHASES = { solid: { en: 'Solid fuels', ru: 'Твёрдое топливо' }, liquid: { en: 'Liquid droplets', ru: 'Капли жидкости' }, gas: { en: 'Gas flames', ru: 'Газовые пламёна' }, aerosol: { en: 'Smoke & aerosol', ru: 'Дым и аэрозоли' }, other: { en: 'Not combustion', ru: 'Не горение' } };
  const FAM_COL = { Saffire: '#ff6b5a', BASS: '#ffb03a', SAME: '#3fe0ff', FLEX: '#9b7bff', ACME: '#2ee59d', SPICE: '#f472b6', 'Cool flames': '#a3e635', 'Fluid physics': '#64748b', Materials: '#64748b' };
  let D, idx, sel = null, pillars = new Set(), phases = new Set(), query = '', cmp = new Set(), chart, ranked = [];

  function init(data) {
    D = data;
    idx = FGSearch.build(D.investigations.map(i => ({ id: i.id, title: `${i.acronym} ${i.title} ${i.family || ''} ${i.fuel || ''}`, text: `${i.finding || ''} ${i.takeaway || ''} ${i.objective} ${i.approach} ${i.impacts} ${i.subArea} ${(i.pillars || []).join(' ')}` })));
    $('exSearch').addEventListener('input', debounce(e => { query = e.target.value; render(); }, 250));
    document.addEventListener('langchange', () => { renderChips(); render(); });
    renderChips(); render(); buildChart();
  }
  const debounce = (f, ms) => { let h; return e => { clearTimeout(h); h = setTimeout(() => f(e), ms); }; };

  function renderChips() {
    $('pillarChips').innerHTML = Object.entries(PILLARS).map(([k, v]) => `<button class="chip ${pillars.has(k) ? 'on' : ''}" data-k="${k}">${L(v)}</button>`).join('');
    $('phaseChips').innerHTML = Object.entries(PHASES).filter(([k]) => k !== 'other').map(([k, v]) => `<button class="chip ${phases.has(k) ? 'on' : ''}" data-k="${k}">${L(v)}</button>`).join('');
    $('pillarChips').querySelectorAll('.chip').forEach(c => c.onclick = () => { toggle(pillars, c.dataset.k); renderChips(); render(); });
    $('phaseChips').querySelectorAll('.chip').forEach(c => c.onclick = () => { toggle(phases, c.dataset.k); renderChips(); render(); });
    renderKpis();
  }
  const toggle = (set, k) => set.has(k) ? set.delete(k) : set.add(k);

  function renderKpis() {
    const inv = D.investigations, o2 = D.points.map(p => p.o2).filter(x => x != null);
    const k = [[inv.length, 'kpi_inv'], [D.points.length, 'kpi_tests'], [inv.filter(i => i.rel >= 4).length, 'kpi_rel'], [inv.reduce((a, i) => a + i.nPublications, 0), 'kpi_pubs'], [(inv.reduce((a, i) => a + i.sizeGB, 0) / 1000).toFixed(1), 'kpi_data'], [Math.max(...o2).toFixed(0) + '%', 'kpi_o2']];
    $('kpis').innerHTML = k.map(([v, l]) => `<div class="panel kpi"><b>${v}</b><span>${t(l)}</span></div>`).join('');
  }

  function stats(id) {
    const pts = D.points.filter(p => p.inv === id);
    const r = key => { const v = pts.map(p => p[key]).filter(x => x != null && isFinite(x)); return v.length ? [Math.min(...v), Math.max(...v)] : null; };
    const fuels = [...new Set(pts.map(p => (p.fuel || '').trim()).filter(Boolean))];
    return { n: pts.length, o2: r('o2'), p: r('p'), flow: r('flow'), fuels, spread: pts.filter(p => p.metric && /spread/.test(p.metric)) };
  }
  const rng = (a, u, k = 1) => a ? (a[0] === a[1] ? (a[0] * k).toFixed(1) : `${(a[0] * k).toFixed(1)}–${(a[1] * k).toFixed(1)}`) + ' ' + u : '—';

  function score(inv) {
    const h = FG.habitat;
    const a = (inv.rel || 0) * 12;
    let b = 0;
    if (query.trim()) { const hits = idx.search(query, 26); const max = hits[0] ? hits[0].score : 1; const me = hits.find(x => x.doc.id === inv.id); b = me ? 20 * me.score / max : 0; }
    const pts = D.points.filter(p => p.inv === inv.id && p.o2 != null);
    let c = 0;
    if (pts.length) { const near = pts.filter(p => Math.abs(p.o2 - h.o2) <= 3 || (h.o2 > 23 && p.o2 >= h.o2 - 3)).length; c = 10 * Math.min(1, near / Math.max(4, pts.length * .3)); }
    const d = Math.min(10, Math.log10(inv.nTests + 1) * 3 + Math.log10(inv.nPublications + 1) * 2.5);
    let s = a + b + c + d;
    if (pillars.size && !(inv.pillars || []).some(p => pillars.has(p))) s *= .3;
    return { s, a, b, c, d };
  }

  function render() {
    ranked = D.investigations.filter(i => !phases.size || phases.has(i.phase)).map(i => ({ i, sc: score(i) })).sort((x, y) => y.sc.s - x.sc.s);
    $('rankNote').textContent = t('rank_note', { hab: FG.habitat.name });
    const max = ranked[0] ? ranked[0].sc.s : 1;
    $('rankList').innerHTML = ranked.map(({ i, sc }, n) => `
      <li class="rank ${sel === i.id ? 'sel' : ''}" data-id="${i.id}" title="${esc(t('why_rank', { a: sc.a.toFixed(0), b: sc.b.toFixed(0), c: sc.c.toFixed(0), d: sc.d.toFixed(0) }))}">
        <div class="no">${n + 1}</div>
        <div><div class="tt"><span class="ac">${i.acronym || i.id}</span> ${esc(i.title)}</div>
          <div class="meta">${i.id} · ${i.type.replace(' Investigation', '')} · ${i.nTests} tests · ${(i.pillars || []).map(p => `<span class="tag ${p}">${L(PILLARS[p])}</span>`).join('')}</div></div>
        <div class="score">${sc.s.toFixed(0)}<div><input type="checkbox" class="cmp" ${cmp.has(i.id) ? 'checked' : ''} title="compare"></div></div>
        <div class="bar"><i style="width:${(100 * sc.s / max).toFixed(0)}%"></i></div>
      </li>`).join('');
    $('rankList').querySelectorAll('.rank').forEach(li => {
      li.onclick = e => { if (e.target.classList.contains('cmp')) return; sel = li.dataset.id; render(); };
      li.querySelector('.cmp').onchange = e => { const id = li.dataset.id; if (e.target.checked) { if (cmp.size >= 3) { e.target.checked = false; return; } cmp.add(id); } else cmp.delete(id); renderCompare(); };
    });
    if (!sel && ranked[0]) sel = ranked[0].i.id;
    renderDetail(); renderCompare(); if (chart) highlight();
  }

  function renderDetail() {
    const i = D.investigations.find(x => x.id === sel); if (!i) return;
    const st = stats(i.id), tb = i.tables[0];
    $('detail').innerHTML = `<div class="detail">
      <div class="panel-head"><div><span class="ac" style="color:var(--cyan);font:700 13px var(--mono)">${i.id} · ${i.acronym || ''}</span><h3>${esc(i.title)}</h3>
        ${(i.pillars || []).map(p => `<span class="tag ${p}">${L(PILLARS[p])}</span>`).join('')}<span class="tag">${L(PHASES[i.phase] || PHASES.other)}</span><span class="tag">${esc(i.subArea)}</span></div>
        <div style="display:flex;gap:6px"><a class="btn ghost" href="${i.url}" target="_blank" rel="noopener">${t('open_psi')} ↗</a><button class="btn" id="sumBtn">✦ ${t('ai_summary')}</button></div></div>
      <div class="finding">${esc(i.finding || i.objective)}</div>
      ${i.takeaway ? `<div class="take"><b>${t('takeaway')}:</b> ${esc(i.takeaway)}</div>` : ''}
      <div id="aiSum" class="ai-sum"></div>
      <dl class="kv">
        <dt>${t('conditions')}</dt><dd>O₂ ${rng(st.o2, '%')} · p ${rng(st.p, 'kPa', 101.325)} · flow ${rng(st.flow, 'cm/s')} · <b>${st.n}</b> test points</dd>
        <dt>${t('fuel')}</dt><dd>${esc(i.fuel || st.fuels.slice(0, 6).join(', '))}</dd>
        <dt>${t('hardware')}</dt><dd>${esc(i.hardware || i.hardwarePSI)}</dd>
        <dt>Platform</dt><dd>${esc(i.platform || '—')} · ${esc(i.center)} · ${esc(i.start || '')}–${esc(i.end || '')}</dd>
        <dt>${t('doi')}</dt><dd><a href="https://doi.org/${i.doi}" target="_blank" rel="noopener">${i.doi}</a> · ${i.sizeGB} GB · ${i.nPublications} pubs</dd>
        ${i.related.length ? `<dt>Related</dt><dd>${i.related.map(r => `<a href="#" data-go="${r}">${r}</a>`).join(', ')}</dd>` : ''}
      </dl>
      <details><summary>${t('objective')} / ${t('approach')}</summary><p class="small">${esc(i.objective)}</p><p class="small muted">${esc(i.approach)}</p></details>
      ${tb ? `<details open><summary>${t('exp_table')}: ${esc(tb.name)} (${tb.rows.length} rows, from PSI)</summary><div class="tbl-wrap"><table><thead><tr>${tb.header.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${tb.rows.slice(0, 60).map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>` : ''}
      ${i.publications.length ? `<details><summary>${t('publications')} (${i.nPublications})</summary><ul class="small">${i.publications.slice(0, 10).map(p => `<li>${esc(p.title)}${p.doi ? ` — <a href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">doi</a>` : ''}</li>`).join('')}</ul></details>` : ''}
    </div>`;
    $('detail').querySelectorAll('[data-go]').forEach(a => a.onclick = e => { e.preventDefault(); sel = a.dataset.go; render(); });
    $('sumBtn').onclick = () => summarize(i, st);
  }

  async function summarize(i, st) {
    const box = $('aiSum'); box.innerHTML = `<div class="ai-msg">${t('thinking')}</div>`;
    const q = `${i.id} ${i.acronym} ${i.title}`;
    const r = window.FG_AI_ON ? await FG.Advisor.ask({ mode: 'summarize', question: q, lang: I18N.lang }) : { offline: true };
    if (!r.offline) { box.innerHTML = `<div class="ai-msg"><b>Claude</b>\n${esc(r.text)}</div>`; return; }
    // offline structured summary built from the PSI record
    const ru = I18N.lang === 'ru';
    box.innerHTML = `<div class="ai-msg"><b>${ru ? 'SI-резюме (офлайн, из записи PSI)' : 'SI summary (offline, from the PSI record)'}</b>
• ${ru ? 'Цель' : 'Objective'}: ${esc((i.objective || '').split(/\n|(?<=\.)\s/)[0])}
• ${ru ? 'Условия' : 'Conditions'}: O₂ ${rng(st.o2, '%')}, p ${rng(st.p, 'kPa', 101.325)}, ${ru ? 'поток' : 'flow'} ${rng(st.flow, 'cm/s')}; ${st.n} ${ru ? 'тестов' : 'tests'}; ${esc(st.fuels.slice(0, 4).join(', '))}
• ${ru ? 'Результат' : 'Result'}: ${esc(i.finding || '')}
• ${ru ? 'Для пожаробезопасности' : 'Fire-safety implication'}: ${esc(i.takeaway || '')}${FG.habitat.o2 > 23 ? `\n• ${ru ? 'Для' : 'For'} ${esc(FG.habitat.name)} (${FG.habitat.o2}% O₂): ${st.o2 && st.o2[1] >= FG.habitat.o2 - 2 ? (ru ? 'есть тесты рядом с этой атмосферой.' : 'tests exist near this atmosphere.') : (ru ? 'тестов при таком O₂ нет — пробел в данных.' : 'no tests at this O₂ — a data gap.')}` : ''}</div>`;
  }

  function renderCompare() {
    const ids = [...cmp]; const box = $('compareBody');
    if (!ids.length) { box.className = 'muted'; box.textContent = t('compare_empty'); return; }
    box.className = '';
    const invs = ids.map(id => D.investigations.find(x => x.id === id)), sts = ids.map(stats);
    const row = (label, f) => `<tr><th>${label}</th>${invs.map((i, k) => `<td>${f(i, sts[k])}</td>`).join('')}</tr>`;
    box.innerHTML = `<div class="tbl-wrap" style="max-height:none"><table class="cmp-tbl"><thead><tr><th></th>${invs.map(i => `<th>${i.id} ${i.acronym}</th>`).join('')}</tr></thead><tbody>
      ${row(t('fuel'), i => esc(i.fuel))}${row('Phase', i => L(PHASES[i.phase]))}${row('Pillars', i => (i.pillars || []).map(p => L(PILLARS[p])).join(', '))}
      ${row('O₂', (i, s) => rng(s.o2, '%'))}${row('Pressure', (i, s) => rng(s.p, 'kPa', 101.325))}${row('Flow', (i, s) => rng(s.flow, 'cm/s'))}
      ${row('Tests', (i, s) => s.n)}${row(t('hardware'), i => esc(i.hardware))}${row('Finding', i => esc(i.finding))}</tbody></table></div>`;
  }

  // parameter-space chart: O2 vs pressure for every PSI test point + habitat atmospheres
  function buildChart() {
    const fams = {};
    D.points.forEach(p => { if (p.o2 == null || p.p == null || p.o2 > 100) return; const inv = D.investigations.find(i => i.id === p.inv); const f = inv.family || 'Other'; (fams[f] = fams[f] || []).push({ x: p.o2 + (Math.random() - .5) * .4, y: p.p * 101.325 + (Math.random() - .5) * 1.5, inv: p.inv }); });
    const ds = Object.entries(fams).map(([f, pts]) => ({ label: f, data: pts, backgroundColor: (FAM_COL[f] || '#94a3b8') + 'aa', pointRadius: 2.5, pointHoverRadius: 5 }));
    ds.push({ label: 'Habitats', data: D.habitats.map(h => ({ x: h.o2, y: h.p_kPa, name: h.name })), pointStyle: 'circle', pointRadius: 11, pointHoverRadius: 13, backgroundColor: 'rgba(255,255,255,0)', borderColor: '#ffffff', borderWidth: 2 });
    chart = new Chart($('spaceChart'), { type: 'scatter', data: { datasets: ds },
      options: { animation: false, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#cfe3ff', boxWidth: 10, font: { size: 11 } } },
        tooltip: { callbacks: { label: c => c.raw.name ? `${c.raw.name}: ${c.raw.x}% O₂, ${c.raw.y} kPa` : `${c.raw.inv}: ${c.raw.x.toFixed(1)}% O₂, ${c.raw.y.toFixed(0)} kPa` } } },
        scales: { x: { title: { display: true, text: 'O₂, % by volume', color: '#8ea3c4' }, ticks: { color: '#8ea3c4' }, grid: { color: 'rgba(110,200,255,.08)' }, min: 10, max: 45 },
          y: { title: { display: true, text: 'Pressure, kPa', color: '#8ea3c4' }, ticks: { color: '#8ea3c4' }, grid: { color: 'rgba(110,200,255,.08)' }, min: 0, max: 330 } } },
      plugins: [{ id: 'habLabels', afterDatasetsDraw(c) {
        const meta = c.getDatasetMeta(c.data.datasets.length - 1), ctx = c.ctx, groups = {};
        meta.data.forEach((pt, k) => { const h = D.habitats[k], key = h.o2 + '|' + h.p_kPa; (groups[key] = groups[key] || { pt, names: [] }).names.push(h.name); });
        ctx.save(); ctx.fillStyle = '#fff'; ctx.font = '600 10.5px Inter'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
        Object.values(groups).forEach(g => ctx.fillText(g.names.join(' / '), g.pt.x + 14, g.pt.y - 8));
        ctx.restore(); } }] });
    $('spaceChart').onclick = e => { const el = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false)[0]; if (el) { const r = chart.data.datasets[el.datasetIndex].data[el.index]; if (r.inv) { sel = r.inv; render(); } } };
    highlight(); renderGaps();
    document.addEventListener('langchange', renderGaps);
  }
  // data-coverage interpretation: how many PSI tests sit near each habitat atmosphere, and of which fuel type
  function renderGaps() {
    const ru = I18N.lang === 'ru';
    $('gapNote').innerHTML = D.habitats.map(h => {
      const near = D.points.filter(p => p.o2 != null && p.p != null && Math.abs(p.o2 - h.o2) <= 3 && Math.abs(p.p * 101.325 - h.p_kPa) <= 20);
      const by = {}; near.forEach(p => { const ph = D.investigations.find(i => i.id === p.inv).phase; by[ph] = (by[ph] || 0) + 1; });
      const solids = by.solid || 0, bad = solids < 5;
      const parts = Object.entries(by).map(([k, v]) => `${v} ${L(PHASES[k] || PHASES.other).toLowerCase()}`).join(', ');
      return `<div class="gap ${bad ? 'bad' : 'good'}"><b>${esc(h.name)} · ${h.o2}% O₂ · ${h.p_kPa} kPa</b>${near.length} ${ru ? 'тестов рядом' : 'tests nearby'}${parts ? ': ' + parts : ''}.<br>${bad ? (ru ? '⚠ Мало данных по твёрдым материалам (ткани, пластики) — пробел для будущих экспериментов.' : '⚠ Few solid-material tests (fabrics, plastics) — a gap for future experiments.') : (ru ? '✓ Хорошее покрытие твёрдыми материалами.' : '✓ Good solid-material coverage.')}</div>`;
    }).join('');
  }
  function highlight() {
    chart.data.datasets.forEach(ds => { if (ds.label === 'Habitats') return; ds.pointRadius = ds.data.map(p => p.inv === sel ? 5 : 2.5); ds.borderColor = ds.data.map(p => p.inv === sel ? '#fff' : 'transparent'); ds.borderWidth = 1; });
    chart.update('none');
  }

  FG.Explorer = { init, render };
})();
