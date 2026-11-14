// App bootstrap: data loading, habitat, views, language, simulation loop, alarm sound.
(async function () {
  const $ = id => document.getElementById(id);
  I18N.apply();
  const [psi, kb] = await Promise.all([fetch('data/psi.json').then(r => r.json()), fetch('data/kb.json').then(r => r.json())]);
  FG.data = psi; FG.kbIndex = FGSearch.build(kb);
  try { FG.cctv = await fetch('assets/cctv/manifest.json').then(r => r.json()); } catch { FG.cctv = null; }
  const G = { iss: 0, orion: 0, gateway: 0, moonbase: .166, rover: .166, mars: .38 };
  psi.habitats.forEach(h => h.gNum = G[h.id] || 0);
  let habId = 'iss'; try { habId = localStorage.getItem('fg-hab') || 'iss'; } catch { }
  FG.habitat = psi.habitats.find(h => h.id === habId) || psi.habitats[0];
  $('habitat').innerHTML = psi.habitats.map(h => `<option value="${h.id}">${h.name} · ${h.o2}% O₂</option>`).join('');
  $('habitat').value = FG.habitat.id;

  const sim = new FG.Sim(FG.habitat);
  FG.sim = sim;
  FG.Monitor.init(sim);
  FG.Explorer.init(psi);
  FG.Lab.init(psi);
  FG.Lessons.init();

  $('habitat').onchange = e => {
    FG.habitat = psi.habitats.find(h => h.id === e.target.value);
    try { localStorage.setItem('fg-hab', FG.habitat.id); } catch { }
    sim.setHabitat(FG.habitat); sim.reset();
    FG.Explorer.render(); FG.Monitor.render();
  };

  // views
  document.querySelectorAll('.view-btn').forEach(b => b.onclick = () => {
    document.querySelectorAll('.view-btn').forEach(x => x.classList.toggle('active', x === b));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + b.dataset.view));
    if (b.dataset.view !== 'monitor') document.body.dataset.state = 'ok'; else FG.Monitor.render();
    window.dispatchEvent(new Event('resize'));
  });
  $('langBtn').onclick = () => I18N.set(I18N.lang === 'ru' ? 'en' : 'ru');

  // demo controls
  let speed = 1;
  $('speedSeg').querySelectorAll('button').forEach(b => b.onclick = () => { speed = +b.dataset.s; $('speedSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
  $('triggerBtn').onclick = () => {
    const id = sim.trigger();
    if (id) { sim.emit({ type: 'info', mod: id, level: 'warn', text: { en: 'Demo: incident triggered', ru: 'Демо: инцидент запущен' } }); FG.Monitor.select(id); }
    else sim.emit({ type: 'info', mod: null, level: 'warn', text: { en: 'Demo: every module already has an active incident', ru: 'Демо: во всех модулях уже идёт инцидент' } });
  };
  $('restartBtn').onclick = () => { sim.reset(); FG.Monitor.render(); };

  // AI status
  try { const s = await fetch('api/status').then(r => r.json()); window.FG_AI_ON = !!s.ai; } catch { window.FG_AI_ON = false; }
  const setPill = () => { const p = $('aiPill'); p.textContent = window.FG_AI_ON ? 'SI: Claude' : 'SI: offline'; p.classList.toggle('on', !!window.FG_AI_ON); p.title = window.FG_AI_ON ? 'Claude grounded on NASA PSI + NASA documents' : 'Offline rule engine + local NASA search (add ANTHROPIC_API_KEY to enable Claude)'; $('aiSrc').textContent = window.FG_AI_ON ? t('ai_online') : t('ai_offline'); };
  setPill(); document.addEventListener('langchange', setPill);

  // alarm sound (Web Audio, off by default)
  let sound = false, ac = null, lastBeep = 0;
  $('soundBtn').onclick = () => { sound = !sound; $('soundBtn').textContent = sound ? '🔔' : '🔇'; if (sound && !ac) { try { ac = new AudioContext(); } catch { } } };
  function beep(f) { if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(.05, ac.currentTime); g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + .35); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + .36); }

  // loop: 1 Hz real time; sim advances `speed` seconds per tick
  const p2 = n => String(Math.floor(n)).padStart(2, '0');
  const fmt = s => `${p2(s / 3600)}:${p2(s % 3600 / 60)}:${p2(s % 60)}`;
  const setScenTip = () => { $('scenWrap').title = t('scen_tip'); };
  setScenTip(); document.addEventListener('langchange', setScenTip);
  function tick() {
    sim.step(speed);
    $('clock').textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
    $('scenClock').textContent = fmt(sim.t);
    if (document.getElementById('view-monitor').classList.contains('active')) FG.Monitor.render();
    const worst = Object.values(sim.mods).reduce((a, m) => m.status === 'fire' ? 'fire' : (m.status === 'warn' && a !== 'fire') ? 'warn' : a, 'ok');
    if (sound && worst !== 'ok' && Date.now() - lastBeep > (worst === 'fire' ? 900 : 2500)) { lastBeep = Date.now(); beep(worst === 'fire' ? 880 : 520); }
    // auto-focus the module that just caught fire
    const fireMod = Object.values(sim.mods).find(m => m.status === 'fire');
    if (fireMod && !sim._focused) { sim._focused = true; FG.Monitor.select(fireMod.m.id); }
    if (!fireMod) sim._focused = false;
  }
  for (let i = 0; i < 60; i++) sim.step(0); // pre-fill a little history
  sim.t = 0;
  tick(); setInterval(tick, 1000);
})();
