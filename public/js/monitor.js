// Mission Monitor view
(function () {
  const $ = id => document.getElementById(id);
  const css = v => getComputedStyle(document.body).getPropertyValue(v).trim();
  const COL = { ok: '#2ee59d', warn: '#ff9a2e', fire: '#ff3d52', fault: '#e6d35a', cyan: '#3fe0ff' };
  let sim, active = 'destiny', charts = {}, donutA, donutB, lastSig = {}, chat = [], textDone = {}, aiCache = {}, aiBusy = {};

  function init(s) {
    sim = s;
    buildTabs(); buildSensors(); buildDonuts(); buildMap();
    sim.on(logEvent);
    $('aiAsk').addEventListener('submit', e => { e.preventDefault(); const q = $('aiInput').value.trim(); if (q) { $('aiInput').value = ''; askQuestion(q); } });
    document.addEventListener('langchange', () => { buildTabs(); buildSensors(); lastSig = {}; renderLog(); render(); });
  }

  function buildTabs() {
    $('modTabs').innerHTML = FG.MODULES.map(m => `<button class="mod-tab" data-id="${m.id}" role="tab"><span class="dot"></span>${m.name}<span class="seg-tag">${m.seg}</span></button>`).join('');
    $('modTabs').querySelectorAll('.mod-tab').forEach(b => b.onclick = () => select(b.dataset.id));
  }
  // sensor cards are identical for every module, so switching tabs only swaps data (no chart rebuild → no flicker)
  function select(id) { if (id === active) return; active = id; lastSig = {}; render(); }

  function buildSensors() {
    Object.values(charts).forEach(c => c.destroy()); charts = {};
    $('sensorGrid').innerHTML = FG.SENSORS.map(s => `
      <div class="sensor" id="s-${s.key}">
        <div class="bang">!</div>
        <div class="s-main"><div class="s-name">${L(s.name)}</div><div class="s-inst">${L(s.inst)}</div><div class="chart"><canvas></canvas></div></div>
        <div class="val"><b>—</b><span class="u">${s.unit}</span><span class="trend"></span><span class="lim"></span></div>
        <div class="msg"></div>
      </div>`).join('');
    for (const s of FG.SENSORS) {
      const ctx = $('s-' + s.key).querySelector('canvas');
      charts[s.key] = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [
          { data: [], borderColor: COL.cyan, backgroundColor: 'rgba(63,224,255,.12)', fill: true, borderWidth: 1.6, pointRadius: 0, tension: .3 },
          { data: [], borderColor: 'rgba(255,61,82,.7)', borderDash: [4, 4], borderWidth: 1, pointRadius: 0, fill: false },
          { data: [], borderColor: 'rgba(255,154,46,.55)', borderDash: [2, 4], borderWidth: 1, pointRadius: 0, fill: false },
        ] },
        options: { animation: false, responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { ticks: { color: '#7f93b5', font: { size: 9, family: 'JetBrains Mono' }, maxTicksLimit: 4, maxRotation: 0 }, grid: { color: 'rgba(110,200,255,.06)' } },
            y: { ticks: { color: '#7f93b5', font: { size: 9 }, maxTicksLimit: 4 }, grid: { color: 'rgba(110,200,255,.06)' } } } },
      });
    }
  }

  function donut(canvas) {
    return new Chart(canvas, { type: 'doughnut', data: { datasets: [{ data: [0, 100], backgroundColor: [COL.ok, 'rgba(255,255,255,.07)'], borderWidth: 0 }] },
      options: { cutout: '78%', animation: { duration: 400 }, plugins: { legend: { display: false }, tooltip: { enabled: false } } } });
  }
  function buildDonuts() { donutA = donut($('dangerDonut')); donutB = donut($('chanceDonut')); }
  const lvlColor = p => p >= 66 ? COL.fire : p >= 33 ? COL.warn : COL.ok;

  function buildMap() {
    const svg = $('issMap');
    let html = `<line x1="20" y1="40" x2="280" y2="40" stroke="#33415c" stroke-width="3"/><rect x="40" y="28" width="30" height="24" fill="#2a3a5a" opacity=".6"/><rect x="230" y="28" width="30" height="24" fill="#2a3a5a" opacity=".6"/>`;
    for (const m of FG.MODULES) {
      const [x, y, w, h] = m.map;
      html += `<g data-id="${m.id}"><rect class="m" id="map-${m.id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${COL.ok}" fill-opacity=".35" stroke="${COL.ok}" stroke-width="1.2"/>
        <text x="${x + w / 2}" y="${y + h / 2 + 3}" text-anchor="middle">${m.name.split(' ')[0]}</text></g>`;
    }
    svg.innerHTML = html;
    svg.querySelectorAll('g[data-id]').forEach(g => g.addEventListener('click', () => select(g.dataset.id)));
  }

  function render() {
    if (!sim) return;
    const S = sim.mods[active], ev = S.eval || { status: 'ok', sev: {}, lvl: {}, flagged: [], danger: 0, chance: 0, corro: 0 };
    // tabs + map
    for (const m of FG.MODULES) {
      const st = sim.mods[m.id].status;
      const tab = $('modTabs').querySelector(`[data-id="${m.id}"]`);
      tab.className = 'mod-tab' + (m.id === active ? ' active' : '') + (st === 'warn' ? ' warn' : st === 'fire' ? ' fire' : '');
      const r = $('map-' + m.id), c = st === 'fire' ? COL.fire : st === 'warn' ? COL.warn : st === 'fault' ? COL.fault : COL.ok;
      r.setAttribute('fill', c); r.setAttribute('stroke', m.id === active ? '#fff' : c); r.setAttribute('stroke-width', m.id === active ? 2.2 : 1.2);
      r.setAttribute('fill-opacity', st === 'fire' ? (Date.now() / 500 % 2 < 1 ? .9 : .45) : .4);
    }
    document.body.dataset.state = ev.status === 'fire' ? 'fire' : ev.status === 'warn' ? 'warn' : 'ok';
    $('modName').textContent = S.m.name; $('modDesc').textContent = L(S.m.desc);
    const chip = $('statusChip');
    chip.className = 'status-chip ' + (ev.status === 'fault' ? 'warn' : ev.status);
    chip.textContent = t(ev.status === 'ok' ? 'nominal' : ev.status === 'warn' ? 'risk' : ev.status === 'fire' ? 'fire' : 'fault');

    // sensors
    const h = sim.h, msgs = [];
    for (const s of FG.SENSORS) {
      const el = $('s-' + s.key), v = S.vals[s.key], hist = S.hist[s.key], lv = ev.lvl[s.key] || 0;
      el.className = 'sensor' + (lv === 2 ? ' danger' : lv === 1 ? ' warn' : '') + (ev.status === 'fault' && ev.fault === s.key ? ' fault' : '');
      if (ev.status === 'fault' && ev.fault === s.key) el.className = 'sensor fault';
      el.querySelector('.val b').textContent = v.toFixed(s.dec);
      const d = hist.length > 6 ? hist[hist.length - 1] - hist[hist.length - 6] : 0, thr = s.info ? 0 : (s.danger(h) - s.base(S.m, h)) * .03;
      el.querySelector('.trend').textContent = Math.abs(d) > Math.abs(thr) && thr ? (d > 0 ? '▲' : '▼') : '■';
      el.querySelector('.trend').style.color = Math.abs(d) > Math.abs(thr) && thr ? ((d > 0) !== !!s.down ? COL.warn : COL.ok) : '#5f7395';
      el.querySelector('.lim').textContent = s.info ? (v < 2 ? (I18N.lang === 'ru' ? 'вент. выкл' : 'vent OFF') : 'nom 8–20') : `lim ${(+s.danger(h)).toFixed(s.dec)}`;
      const msgEl = el.querySelector('.msg');
      msgEl.classList.toggle('calm', !lv && !(ev.status === 'fault' && ev.fault === s.key));
      if (ev.status === 'fault' && ev.fault === s.key) msgEl.textContent = '⚠ ' + t('sensor_fault');
      else if (lv) { const m = L(FG.sensorMsg(s, v, h, lv)); msgEl.textContent = '⚠ ' + S.m.name + ' · ' + m; msgs.push({ lv, m }); }
      else msgEl.textContent = I18N.lang === 'ru' ? '✓ в пределах нормы' : '✓ within limits';
      const c = charts[s.key];
      c.data.labels = S.labels;
      c.data.datasets[0].data = hist;
      const col = lv === 2 ? COL.fire : lv === 1 ? COL.warn : COL.cyan;
      c.data.datasets[0].borderColor = col; c.data.datasets[0].backgroundColor = col + '22';
      c.data.datasets[1].data = s.info ? [] : hist.map(() => +s.danger(h));
      c.data.datasets[2].data = s.info ? [] : hist.map(() => +s.warn(h));
      c.update('none');
    }
    // banner
    const cs = camState(S), sec = FG.cctv && FG.cctv.sections[FG.CCTV_MAP[S.m.id]];
    if (cs === 'hot' && sec) msgs.unshift({ lv: 2, m: L({ en: `${sec.camera_id}: flame visible on video (both cameras)`, ru: `${sec.camera_id}: пламя видно на видео (обе камеры)` }) });
    if (cs === 'cool' && sec) msgs.unshift({ lv: 1, m: L({ en: `${sec.camera_id}S: cool-flame glow on the special camera — combustion not fully over`, ru: `${sec.camera_id}S: свечение холодного пламени на спецкамере — горение не закончено` }) });
    const ban = $('alertBanner');
    ban.hidden = false; ban.classList.toggle('calm', !msgs.length && ev.status !== 'fault');
    if (msgs.length) { ban.innerHTML = msgs.sort((a, b) => b.lv - a.lv).map(x => `<div class="row"><b>${x.lv === 2 ? '⛔' : '⚠'}</b><span>${x.m}</span></div>`).join(''); }
    else if (ev.status === 'fault') { ban.innerHTML = `<div class="row"><b>?</b><span>${t('sensor_fault')}</span></div>`; }
    else ban.innerHTML = `<div class="row"><b>✓</b><span>${I18N.lang === 'ru' ? 'Все датчики модуля в норме — признаков горения нет' : 'All module sensors within limits — no signs of combustion'}</span></div>`;

    // gauges
    const dp = Math.round(ev.danger);
    donutA.data.datasets[0].data = [dp, 100 - dp]; donutA.data.datasets[0].backgroundColor[0] = lvlColor(dp); donutA.update();
    $('dangerVal').textContent = dp;
    // say WHY it is dangerous: active fire, toxic post-fire atmosphere, fire next door, or precursors
    const flame = S.fire && S.fire.f > 0;
    const cause = flame ? t('dz_fire') : (S.hadFire && ev.flagged.length) ? t('dz_post') : (ev.hotNb && ev.hotNb.length) ? t('dz_nb') : ev.status === 'warn' ? t('dz_pre') : '';
    const names = ev.flagged.map(k => L(FG.SENSORS.find(s => s.key === k).name)).slice(0, 3).join(' · ');
    $('dangerSub').textContent = cause ? cause + (names ? ': ' + names : '') : (names || t('danger_sub_ok'));
    if (ev.status === 'fire' && ev.spread) {
      $('g2title').textContent = t('spread');
      const pct = Math.min(100, Math.round(ev.spread.pct)), r = ev.spread.rate;
      donutB.data.datasets[0].data = [pct, 100 - pct]; donutB.data.datasets[0].backgroundColor[0] = COL.fire; donutB.update();
      $('chanceVal').textContent = pct; $('chanceUnit').textContent = '%';
      const nb = (ev.next || []).map(n => sim.mods[n.to].m.name.split(' ')[0]);
      $('chanceSub').textContent = (ev.spread.out ? t('fire_out') : `${r >= 0 ? '+' : ''}${r.toFixed(1)}% ${t('per_min')} · ${r > .3 ? t('grow') : r < -.3 ? t('shrink') : t('steady')}`) + (nb.length ? ` · ${t('threat')}: ${nb.join(', ')}` : '');
      $('g2box').title = t('spread_tip');
    } else {
      $('g2title').textContent = t('fire_chance');
      const cp = Math.round(ev.chance);
      donutB.data.datasets[0].data = [cp, 100 - cp]; donutB.data.datasets[0].backgroundColor[0] = lvlColor(cp); donutB.update();
      $('chanceVal').textContent = cp; $('chanceUnit').textContent = '%';
      $('chanceSub').textContent = t('chance_sub', { n: ev.corro });
    }
    renderCams(S);
    renderAdvisor(S, ev);
  }

  // ---------- CCTV ----------
  // normal: no combustion · hot: a flame burns here · cool: flame out but the module is still hot / CO high
  function camState(S) {
    if (S.fire && S.fire.f >= .12) { S.fire.seenHot = true; return 'hot'; }
    // cool flame: shortly after the hot flame dies while the module is still hot (FLEX phase 2)
    if (S.fire && S.fire.seenHot && (S.fire.f > 0 || (S.fire.extT != null && sim.t - S.fire.extT < 120) || S.env.heat > 4)) return 'cool';
    return 'normal';
  }
  let camShown = '';
  function renderCams(S) {
    const M = FG.cctv; if (!M) return;
    const sec = M.sections[FG.CCTV_MAP[S.m.id]]; if (!sec) return;
    const st = camState(S), key = S.m.id + '|' + st;
    $('camId').textContent = `${sec.camera_id} · ${S.m.name}`;
    const chip = $('camState'); chip.className = 'cam-state ' + st; chip.textContent = t('cam_' + st);
    $('camNote').textContent = t('cam_note_' + st);
    if (camShown === key) return;
    camShown = key;
    for (const [id, cam] of [['camVis', 'vis'], ['camSpec', 'spec']]) {
      swapVideo($(id), 'assets/cctv/' + sec.videos[st][cam]);
    }
  }
  // double-buffered crossfade: load the next clip in the hidden <video>, fade it in only when it can play
  function swapVideo(fig, src) {
    const [a, b] = fig.querySelectorAll('video');
    const cur = a.classList.contains('on') ? a : b.classList.contains('on') ? b : null;
    const next = cur === a ? b : a;
    if (cur && cur.getAttribute('src') === src) return;
    next.oncanplay = null;
    next.setAttribute('src', src);
    next.oncanplay = () => {
      next.oncanplay = null;
      next.play().catch(() => { });
      next.classList.add('on');
      if (cur) { cur.classList.remove('on'); setTimeout(() => { if (!cur.classList.contains('on')) cur.pause(); }, 500); }
    };
    next.load();
  }

  // ---------- advisor ----------
  function renderAdvisor(S, ev) {
    const sig = active + '|' + ev.status + '|' + (ev.flagged || []).filter(k => (ev.lvl[k] || 0) > 0).sort().join(',') + '|' + I18N.lang + '|' + Object.keys(S.actions).join(',') + '|' + (aiCache[active] ? aiCache[active].key : '');
    if (lastSig.v === sig) return; lastSig.v = sig;
    const g = FG.Advisor.guidance(ev, sim.h, S.m.name, sim, active);
    const done = textDone[active] = textDone[active] || new Set();
    const cite = c => c ? `<a class="cite" href="${FG.Advisor.CITE[c] || '#'}" target="_blank" rel="noopener">${c}</a>` : '';
    const item = (st, i, sec) => {
      const id = sec + i, isDone = st.act ? sim.mods[st.act.mod].actions[st.act.key] != null : done.has(L(st.text));
      return `<li class="${isDone ? 'done' : ''}"><input type="checkbox" ${isDone ? 'checked disabled' : ''} data-sec="${sec}" data-i="${i}"><span style="flex:1">${L(st.text)}</span>${cite(st.cite)}</li>`;
    };
    let html = '';
    if (g.note) html += `<div class="ai-note">${L(g.note)}</div>`;
    if (g.actions.length) html += `<div class="ai-sec"><h3>${t('actions_now')}</h3><ol class="ai-steps">${g.actions.map((s, i) => item(s, i, 'a')).join('')}</ol></div>`;
    if (g.prepare.length) html += `<div class="ai-sec"><h3>${ev.status === 'ok' ? t('monitoring') : t('prepare')}</h3><ul class="ai-steps">${g.prepare.map((s, i) => item(s, i, 'p')).join('')}</ul></div>`;
    if (g.why.length) html += `<div class="ai-sec"><h3>${t('why')}</h3><ul class="ai-steps">${g.why.map(s => `<li><span style="flex:1">${L(s.text)}</span>${cite(s.cite)}</li>`).join('')}</ul></div>`;
    const ai = aiCache[active];
    if (ai && ai.status === ev.status && ev.status !== 'ok') html += `<div class="ai-msg"><b>Claude</b> · ${ai.loading ? t('thinking') : ''}${ai.text ? '\n' + esc(ai.text) : ''}${ai.sources ? srcList(ai.sources) : ''}</div>`;
    const body = $('aiBody'), keepScroll = body.scrollTop, sameModule = body.dataset.mod === active;
    body.innerHTML = html; body.dataset.mod = active;
    if (sameModule) body.scrollTop = keepScroll;
    body.querySelectorAll('input[type=checkbox]').forEach(cb => cb.onchange = () => {
      const st = (cb.dataset.sec === 'a' ? g.actions : g.prepare)[+cb.dataset.i];
      if (st.act) sim.act(st.act.mod, st.act.key); else { done.add(L(st.text)); sim.emit({ type: 'act', mod: active, level: 'act', text: { en: 'Crew: ' + st.text.en, ru: 'Экипаж: ' + st.text.ru } }); }
      lastSig = {}; render();
    });
    // Claude upgrade for warn / fire
    if (window.FG_AI_ON && (ev.status === 'warn' || ev.status === 'fire')) requestAI(S, ev);
  }
  function renderChat() {
    const box = $('chatBody'); if (!chat.length) return;
    box.innerHTML = chat.map(m => `<div class="ai-msg ${m.role === 'user' ? 'user' : ''}">${m.html}</div>`).join('');
    box.scrollTop = box.scrollHeight;
  }
  // offline: answer questions about current readings straight from the module sensors
  const SENS_WORDS = { smoke: /smoke|дым|задымл/, co2: /co2|co₂|углекисл|carbon dioxide/, co: /\bco\b|угарн|monoxide/, pm: /\bpm|particul|частиц/, temp: /temp|температур|жар|heat/, o2: /\bo2\b|o₂|oxygen|кислород/, hcn: /hcn|cyanide|циан/, current: /current|power draw|\bток|мощност|стойк/, press: /pressure|давлен/, flow: /flow|vent|вентил|поток/ };
  function liveAnswer(q, S, ev) {
    const s0 = q.toLowerCase(), ru = I18N.lang === 'ru';
    let keys = Object.keys(SENS_WORDS).filter(k => SENS_WORDS[k].test(s0));
    const general = /status|situation|danger|risk|state|right now|статус|ситуац|опасн|риск|обстанов|как дела|что происходит|что сейчас/.test(s0);
    if (!keys.length && !general) return '';
    if (!keys.length) keys = (ev.flagged || []).filter(k => (ev.lvl[k] || 0) > 0).slice(0, 4);
    const lines = keys.map(k => {
      const s = FG.SENSORS.find(x => x.key === k), v = S.vals[k], lv = ev.lvl[k] || 0;
      const lim = s.info ? '' : ` (${ru ? 'предел' : 'limit'} ${(+s.danger(sim.h)).toFixed(s.dec)})`;
      const tag = lv >= 2 ? (ru ? ' — ОПАСНО' : ' — DANGER') : lv === 1 ? (ru ? ' — повышено' : ' — elevated') : (ru ? ' — норма' : ' — normal');
      return `• <b>${L(s.name)}</b>: ${v.toFixed(s.dec)} ${s.unit}${lim}${tag}`;
    });
    const st = { ok: ru ? 'в норме' : 'nominal', warn: ru ? 'РИСК' : 'RISK', fire: ru ? 'ПОЖАР' : 'FIRE', fault: ru ? 'сбой датчика' : 'sensor fault' }[ev.status] || ev.status;
    const head = `<b>${S.m.name}</b> · ${ru ? 'статус' : 'status'}: ${st} · ${ru ? 'опасность' : 'danger'} ${Math.round(ev.danger)}%`;
    return head + (lines.length ? '\n' + lines.join('\n') : '') + (ev.status !== 'ok' ? '\n' + (ru ? 'Порядок действий — в панели советника выше.' : 'Step-by-step actions are in the advisor panel above.') : '');
  }
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const srcList = srcs => `<div class="srcs">${srcs.map(s => `[${s.n}] ${s.url ? `<a href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a>` : esc(s.title)}`).join('<br>')}</div>`;

  function stateSummary(S, ev) {
    const v = {}; FG.SENSORS.forEach(s => v[s.key] = +S.vals[s.key].toFixed(s.dec));
    return { module: S.m.name, habitat: sim.h.name, status: ev.status, flagged: ev.flagged, values: v, dangerPct: Math.round(ev.danger), fireProbabilityPct: Math.round(ev.chance), spread: ev.spread, crewActionsDone: Object.keys(S.actions),
      summary: `${ev.status} ${ev.flagged.join(' ')} ${S.vals.o2 > sim.h.o2 + 1 ? 'oxygen enrichment' : ''} spacecraft fire ventilation suppression extinguisher smoke`.trim() };
  }
  async function requestAI(S, ev) {
    const key = ev.status + ':' + ev.flagged.slice().sort().join(',');
    const c = aiCache[active];
    if ((c && c.key === key) || aiBusy[active]) return;
    aiBusy[active] = true; const mod = active;
    aiCache[mod] = { key, status: ev.status, loading: true };
    lastSig = {};
    const r = await FG.Advisor.ask({ mode: 'advise', state: stateSummary(S, ev), lang: I18N.lang });
    aiBusy[mod] = false;
    aiCache[mod] = r.offline ? { key, status: ev.status, text: '', sources: null, loading: false } : { key, status: ev.status, text: r.text, sources: r.sources, loading: false };
    lastSig = {}; render();
  }

  async function askQuestion(q) {
    chat.push({ role: 'user', html: esc(q) });
    const S = sim.mods[active], ev = S.eval;
    const pending = { role: 'ai', html: t('thinking') }; chat.push(pending); renderChat();
    let r = window.FG_AI_ON ? await FG.Advisor.ask({ mode: 'chat', question: q, state: stateSummary(S, ev), lang: I18N.lang }) : { offline: true };
    if (r.offline) {
      const hits = FG.kbIndex ? FG.kbIndex.search(q, 3) : [];
      const live = liveAnswer(q, S, ev);
      pending.html = live ? live : hits.length ? `<b>${t('ask_offline_hdr')}</b>\n` + hits.map((x, i) => `<div style="margin-top:6px"><b>[${i + 1}]</b> ${esc(snippet(x.doc.text, q))}</div>`).join('') + srcList(hits.map((x, i) => ({ n: i + 1, title: x.doc.title, url: x.doc.url }))) : t('no_answer');
    } else pending.html = `<b>Claude</b>\n${esc(r.text)}${srcList(r.sources || [])}`;
    renderChat();
  }
  function snippet(text, q) {
    const words = FGSearch.tokenize(q); const sents = text.split(/(?<=[.!?])\s+/);
    let best = sents[0], bs = -1;
    for (let i = 0; i < sents.length; i++) { const w = FGSearch.tokenize(sents[i]); const sc = words.filter(x => w.includes(x)).length; if (sc > bs) { bs = sc; best = sents.slice(i, i + 2).join(' '); } }
    return best.length > 420 ? best.slice(0, 420) + '…' : best;
  }

  // ---------- log ----------
  function logEvent() { renderLog(); }
  function renderLog() {
    if (!sim) return;
    $('eventLog').innerHTML = sim.events.slice(0, 80).map(e => `<li class="${e.level || ''}"><span class="t">${e.clock.toLocaleTimeString('en-GB', { hour12: false })}</span><span class="m">${e.mod ? FG.MODULES.find(m => m.id === e.mod).name.split(' ')[0] : 'SYSTEM'}</span><span class="x">${L(e.text)}</span></li>`).join('');
  }

  FG.Monitor = { init, render, select, get active() { return active; } };
})();
