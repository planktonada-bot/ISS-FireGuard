// Flammability Lab — interactive spread estimate + nearest PSI test points.
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  let D, chart;
  const G = { iss: 0, orion: 0, gateway: 0, moonbase: .166, rover: .166, mars: .38 };

  function init(data) {
    D = data;
    fillMaterials();
    $('labPresets').innerHTML = D.habitats.map(h => `<button class="chip" data-id="${h.id}">${esc(h.name)}</button>`).join('');
    $('labPresets').querySelectorAll('.chip').forEach(c => c.onclick = () => preset(D.habitats.find(h => h.id === c.dataset.id)));
    ['labMat', 'labO2', 'labP', 'labU', 'labG'].forEach(id => $(id).addEventListener('input', update));
    document.addEventListener('langchange', () => { fillMaterials(); update(); });
    chart = new Chart($('labChart'), { type: 'line', data: { datasets: [] }, options: { animation: false, maintainAspectRatio: false, parsing: false,
      plugins: { legend: { labels: { color: '#cfe3ff', boxWidth: 10, font: { size: 11 } } } },
      scales: { x: { type: 'linear', min: 0, max: 50, title: { display: true, text: 'air flow, cm/s', color: '#8ea3c4' }, ticks: { color: '#8ea3c4' }, grid: { color: 'rgba(110,200,255,.08)' } },
        y: { min: 0, title: { display: true, text: 'spread rate, mm/s', color: '#8ea3c4' }, ticks: { color: '#8ea3c4' }, grid: { color: 'rgba(110,200,255,.08)' } } } } });
    preset(FG.habitat);
  }
  function fillMaterials() {
    const cur = $('labMat').value || 'sibal';
    $('labMat').innerHTML = Object.entries(FG.MATERIALS).map(([k, m]) => `<option value="${k}">${esc(L(m.name))}</option>`).join('');
    $('labMat').value = cur;
  }
  function preset(h) { $('labO2').value = h.o2; $('labP').value = h.p_kPa; $('labG').value = G[h.id] ?? 0; $('labU').value = 15; update(); }

  function update() {
    const mat = $('labMat').value, o2 = +$('labO2').value, p = +$('labP').value, u = +$('labU').value, g = +$('labG').value;
    $('labO2v').textContent = o2.toFixed(1); $('labPv').textContent = p; $('labUv').textContent = u;
    const r = FG.spread(mat, o2, p, u, g), m = FG.MATERIALS[mat], ru = I18N.lang === 'ru';
    const t1m = r.v > 0 ? 1000 / r.v / 60 : null;
    $('labResult').innerHTML = `
      <div class="cell"><b style="color:${r.flammable ? 'var(--fire)' : 'var(--ok)'}">${r.flammable ? '🔥' : '✓'}</b><span>${r.flammable ? t('flammable') : t('not_flammable')}</span></div>
      <div class="cell"><b>${r.v.toFixed(2)}</b><span>${t('spread_rate')}, mm/s</span></div>
      <div class="cell"><b>${t1m ? (t1m < 60 ? t1m.toFixed(1) + ' min' : (t1m / 60).toFixed(1) + ' h') : '—'}</b><span>${t('time_1m')}</span></div>
      <div class="cell"><b>${r.uq && isFinite(r.uq) ? r.uq.toFixed(1) : '—'}</b><span>${t('lim_flow')}, cm/s</span></div>
      <div class="why muted">${ru ? 'Основа' : 'Basis'}: ${esc(m.src)} · ${ru ? 'предел O₂' : 'O₂ limit'} ≈ ${r.loc.toFixed(1)}% (${esc(m.locSrc)})${r.reason === 'flow' ? (ru ? ' · Поток ниже порога гашения — как в BASS, пламя в невесомости гаснет без притока воздуха.' : ' · Flow is below the quench limit — as in BASS, µg flames die without fresh air.') : ''}${g > 0 ? (ru ? ` · Частичная гравитация добавляет конвекцию ≈ ${(30 * Math.sqrt(g)).toFixed(0)} см/с; данных PSI для неё пока нет (LUCI, FM2 в будущем).` : ` · Partial gravity adds ≈ ${(30 * Math.sqrt(g)).toFixed(0)} cm/s buoyant flow; PSI has no partial-g data yet (future LUCI, FM2).`) : ''}</div>`;
    // curves per habitat atmosphere
    const cols = ['#3fe0ff', '#9b7bff', '#2ee59d', '#ffb03a', '#ff6b5a', '#f472b6'];
    const ds = D.habitats.map((h, k) => ({ label: `${h.name} (${h.o2}%, ${h.p_kPa} kPa)`, data: Array.from({ length: 51 }, (_, x) => ({ x, y: FG.spread(mat, h.o2, h.p_kPa, x, G[h.id] ?? 0).v })), borderColor: cols[k % 6], borderWidth: 1.5, pointRadius: 0 }));
    ds.push({ label: ru ? 'Ваши условия' : 'Your conditions', data: [{ x: u, y: r.v }], borderColor: '#fff', backgroundColor: '#fff', pointRadius: 6, showLine: false });
    ds.push({ label: 'Saffire-II measured (PSI-99)', data: [{ x: 20, y: 2.1 }, { x: 20, y: 2.6 }], borderColor: '#ff3d52', backgroundColor: '#ff3d52', pointStyle: 'rectRot', pointRadius: 7, showLine: false });
    chart.data.datasets = ds; chart.update();
    // nearest PSI points
    const pts = D.points.filter(x => x.o2 != null && x.p != null).map(x => ({ x, d: Math.hypot((x.o2 - o2) / 3, (x.p * 101.325 - p) / 15, ((x.flow ?? u) - u) / 10) + (/solid/.test(D.investigations.find(i => i.id === x.inv).phase) ? 0 : .8) })).sort((a, b) => a.d - b.d).slice(0, 8);
    $('labNearest').innerHTML = `<div class="tbl-wrap"><table><thead><tr><th>PSI</th><th>Fuel</th><th>O₂ %</th><th>kPa</th><th>flow cm/s</th><th>Result</th><th>Measured</th></tr></thead><tbody>${pts.map(({ x }) => `<tr><td><a href="https://psi.nasa.gov/physci/repo/data/investigations/${x.inv}" target="_blank" rel="noopener">${x.inv}</a></td><td>${esc(x.fuel)}</td><td>${x.o2.toFixed(1)}</td><td>${(x.p * 101.325).toFixed(0)}</td><td>${x.flow ?? '—'}</td><td>${esc(x.result || '')}</td><td>${x.value != null ? x.value + ' ' + (x.unit || '') : ''}</td></tr>`).join('')}</tbody></table></div>`;
  }
  FG.Lab = { init, update };
})();
