// Real-time sensor simulator with per-module fire physics.
// - A random primary incident starts ~2.5–3.5 min into the scenario (precursors → ignition).
// - Each burning module accumulates heat, smoke, particulates, CO, HCN, consumes O2 and produces CO2.
// - Fire intensity grows at a rate set by the PSI-anchored spread model (O2, pressure, airflow, gravity):
//   more O2 → faster growth; ventilation OFF in µg → flame starves (BASS); PFE → knock-down.
// - Smoke/heat migrate to neighbours through open hatches; an uncontained fire ignites each neighbour
//   after an independent random 1–3 min. With no crew action the whole station can end up burning.
(function () {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const HIST = 120;          // points kept per sensor (2 minutes at 1 Hz)
  const FMAX = 1.3;          // fully developed fire intensity
  const ENV0 = () => ({ heat: 0, smoke: 0, pm: 0, co: 0, hcn: 0, o2: 0, co2: 0 });
  const SPREAD_FUELS = ['sibal', 'cotton', 'pmma_thin'];

  class Sim {
    constructor(habitat) { this.h = habitat; this.listeners = []; this.reset(); }
    on(fn) { this.listeners.push(fn); }
    emit(ev) { ev.t = this.t; ev.clock = new Date(); this.events.unshift(ev); this.events.length = Math.min(this.events.length, 250); this.listeners.forEach(f => f(ev)); }
    setHabitat(h) { this.h = h; }
    get g() { return this.h.gNum || 0; }

    reset(seed) {
      this.seed = seed || (Date.now() & 0xffffffff);
      const R = this.R = rng(this.seed);
      this.t = 0; this.events = []; this.mods = {}; this.plans = [];
      for (const m of FG.MODULES) {
        const vals = {}, hist = {};
        for (const s of FG.SENSORS) { vals[s.key] = s.base(m, this.h); hist[s.key] = []; }
        this.mods[m.id] = { m, vals, hist, labels: [], drift: FG.SENSORS.map(() => R() * 6.28), status: 'ok', actions: {}, env: ENV0(), inc: null, fire: null, hadFire: false, eval: null };
      }
      const mod = FG.MODULES[Math.floor(R() * FG.MODULES.length)];
      this.mods[mod.id].inc = this.makeIncident(mod.id, 150 + R() * 60, 'primary');
      const others = FG.MODULES.filter(x => x.id !== mod.id);
      this.fault = R() < .85 ? { mod: others[Math.floor(R() * others.length)].id, key: R() < .6 ? 'smoke' : 'pm', at: 55 + R() * 70, dur: 14 } : null;
      this.emit({ type: 'start', mod: null, text: { en: 'Scenario started — all modules monitored', ru: 'Сценарий запущен — все модули под наблюдением' } });
    }

    makeIncident(modId, start, kind, from) {
      const R = this.R, scale = () => .8 + R() * .5;
      if (kind === 'spread') {
        return { kind, from, start, preDur: 12 + R() * 20, pre: {}, def: { id: 'spread', mat: SPREAD_FUELS[Math.floor(R() * SPREAD_FUELS.length)], name: { en: 'Fire spread from neighbouring module', ru: 'Распространение огня из соседнего модуля' } }, sig: { smoke: .8 + R() * .4, pm: .8 + R() * .4, co: .8 + R() * .4, hcn: .6 + R() * .8 } };
      }
      const def = FG.INCIDENTS[Math.floor(R() * FG.INCIDENTS.length)];
      const pre = {}; Object.entries(def.pre).forEach(([k, v]) => { if (def.key.includes(k) || R() > .3) pre[k] = v * scale(); });
      // combustion "signature" of this fuel: how much smoke / CO / HCN per unit of fire
      const sig = { smoke: (def.ign.smoke || 3.5) / 3.5 * scale(), pm: (def.ign.pm || 300) / 300 * scale(), co: (def.ign.co || 50) / 50 * scale(), hcn: (def.ign.hcn || 3) / 5 * scale() };
      return { kind, start, preDur: kind === 'manual' ? 20 + R() * 20 : 35 + R() * 35, pre, def, sig };
    }

    // Demo button: start a new incident now (pull the scheduled one forward, or start a new one elsewhere)
    trigger() {
      const pending = Object.values(this.mods).find(S => S.inc && S.inc.kind === 'primary' && this.t < S.inc.start);
      if (pending) { pending.inc.start = this.t + 1; return pending.m.id; }
      const free = Object.values(this.mods).filter(S => !S.fire && (!S.inc || this.t > S.inc.start + S.inc.preDur + 30));
      if (!free.length) return null;
      const S = free[Math.floor(this.R() * free.length)];
      S.inc = this.makeIncident(S.m.id, this.t + 1, 'manual');
      return S.m.id;
    }

    act(modId, action) {
      const S = this.mods[modId]; if (!S || S.actions[action] != null) return;
      S.actions[action] = this.t;
      this.emit({ type: 'act', mod: modId, level: 'act', text: { en: 'Crew: ' + FG.ACTIONS[action].label.en, ru: 'Экипаж: ' + FG.ACTIONS[action].label.ru } });
      if (action === 'pfe') { S.env.co2 += 1.6; S.env.o2 += .5; } // CO2 extinguisher: CO2 up, O2 slightly diluted
      if (action === 'hatch') {
        const blocked = this.plans.filter(p => !p.done && (p.from === modId || p.to === modId));
        blocked.forEach(p => p.done = true);
        if (blocked.length) this.emit({ type: 'info', mod: modId, level: 'act', text: { en: `Hatches closed — fire spread to ${blocked.map(p => this.name(p.from === modId ? p.to : p.from)).join(', ')} blocked`, ru: `Люки закрыты — распространение в ${blocked.map(p => this.name(p.from === modId ? p.to : p.from)).join(', ')} остановлено` } });
      }
    }
    name(id) { return FG.MODULES.find(m => m.id === id).name.split(' ')[0]; }
    hatchShut(a, b) { return this.mods[a].actions.hatch != null || this.mods[b].actions.hatch != null; }
    burning(id) { const F = this.mods[id].fire; return !!(F && F.f > 0); }

    ignite(S) {
      const inc = S.inc;
      S.fire = { f: .08, ignT: this.t, mat: inc.def.mat, elec: ['wiring', 'battery'].includes(inc.def.id), sig: inc.sig, last: .08, rate: 0, v: 0 };
      S.hadFire = true;
      this.emit({ type: 'ignite', mod: S.m.id, level: 'fire', text: inc.kind === 'spread' ? { en: `Ignition — fire spread from ${this.name(inc.from)}`, ru: `Воспламенение — огонь перешёл из ${this.name(inc.from)}` } : { en: 'Ignition detected', ru: 'Зафиксировано воспламенение' } });
      // schedule spread to each neighbour, independently random 1–3 min
      for (const nb of S.m.nb) {
        if (this.burning(nb) || this.plans.some(p => !p.done && p.to === nb)) continue;
        this.plans.push({ from: S.m.id, to: nb, at: this.t + 60 + this.R() * 120, done: false, delayed: false });
      }
    }

    stepOnce() {
      const t = this.t, R = this.R;
      // 1) incidents: precursors and ignition
      for (const S of Object.values(this.mods)) {
        const I = S.inc, A = S.actions; S.pre = {};
        if (!I || t < I.start) continue;
        const p = smooth((t - I.start) / I.preDur);
        for (const [k, v] of Object.entries(I.pre)) {
          let f = p;
          if (k === 'current' && A.power_off != null) f = 0;
          if (k === 'temp' && A.power_off != null && I.def.id !== 'o2gen') f *= Math.exp(-(t - A.power_off) / 60);
          if (k === 'o2' && A.o2_off != null) f *= Math.exp(-(t - A.o2_off) / 40);
          S.pre[k] = v * f;
        }
        const tIgn = I.start + I.preDur;
        const prevented = (A.power_off != null && A.power_off < tIgn && ['wiring', 'battery'].includes(I.def.id)) || (A.o2_off != null && A.o2_off < tIgn && ['o2gen', 'o2leak'].includes(I.def.id));
        // causality: sustained danger (>=75%) during precursors (overheating, O2 enrichment) ignites the fuel early
        if (!I.ignited && !I.averted && !(S.fire && S.fire.f > 0) && S.eval && S.eval.danger >= 75 && !prevented) {
          I.ignAcc = (I.ignAcc || 0) + (S.eval.danger - 70) / 20;
          I.ignThr = I.ignThr || 8 + R() * 17;
          if (I.ignAcc >= I.ignThr) { I.ignited = true; this.ignite(S); continue; }
        }
        if (!(S.fire && S.fire.f > 0) && !I.ignited && !I.averted && t >= tIgn) {
          if (prevented) { if (!I.averted) { I.averted = true; this.emit({ type: 'info', mod: S.m.id, level: 'act', text: { en: 'Ignition averted by crew action', ru: 'Воспламенение предотвращено действиями экипажа' } }); } }
          else { I.ignited = true; this.ignite(S); }
        }
      }
      // 2) fire intensity: growth set by the PSI-anchored spread model, decay by crew actions / starvation
      for (const S of Object.values(this.mods)) {
        const F = S.fire; if (!F || F.f <= 0) continue;
        const A = S.actions, r = FG.spread(F.mat, S.vals.o2, S.vals.press, S.vals.flow, this.g);
        F.v = r.v;
        const rel = clamp(r.v / 1.9, 0, 2.5);
        let growth = .03 * rel * F.f * (1 - F.f / FMAX) + .002 * rel;
        if (A.power_off != null && F.elec) growth *= .6;
        let decay = 0;
        if (A.pfe != null && t > A.pfe + 3) decay += F.f / 7;
        if (!r.flammable) decay += F.f / (r.reason === 'flow' ? 120 : 40);   // starved: low flow (BASS) or low O2
        F.f = clamp(F.f + growth - decay, 0, FMAX);
        F.rate = (F.f - F.last) * 60 / FMAX * 100; F.last = F.f;   // % of full involvement per minute
        if (F.f < .02) { F.f = 0; F.extT = t; this.emit({ type: 'out', mod: S.m.id, level: 'act', text: { en: 'Flame extinguished — monitor for re-ignition', ru: 'Пламя потушено — следите за повторным возгоранием' } }); }
      }
      // 3) cabin environment: sources from the fire, removal by atmosphere revitalization / cooling
      for (const S of Object.values(this.mods)) {
        const E = S.env, f = S.fire ? S.fire.f : 0, sig = S.fire ? S.fire.sig : { smoke: 1, pm: 1, co: 1, hcn: 1 }, ventOn = S.actions.vent_off == null;
        const tauS = ventOn ? 60 : 500, tauP = ventOn ? 90 : 600, tauG = ventOn ? 240 : 900;
        E.heat += 30 * f / 150 - E.heat / 150;                 // heat release vs thermal control
        E.smoke += 4 * f * sig.smoke / 60 - E.smoke / tauS;
        E.pm += 330 * f * sig.pm / 90 - E.pm / tauP;
        E.co += 60 * f * sig.co / 240 - E.co / tauG;
        E.hcn += 6 * f * sig.hcn / 240 - E.hcn / tauG;
        E.o2 += -.003 * f - E.o2 / 900;                       // combustion consumes O2, ECLSS restores it
        E.co2 += .004 * f - E.co2 / 900;                      // combustion produces CO2
      }
      // 4) transport between connected modules through open hatches (airflow + bulkhead conduction)
      for (const S of Object.values(this.mods)) for (const nb of S.m.nb) {
        if (S.m.id > nb || this.hatchShut(S.m.id, nb)) continue;
        const B = this.mods[nb], k = (S.actions.vent_off == null && B.actions.vent_off == null) ? .008 : .002;
        for (const key of ['smoke', 'pm', 'co', 'hcn', 'co2', 'o2']) { const d = (S.env[key] - B.env[key]) * k; S.env[key] -= d; B.env[key] += d; }
        const dh = (S.env.heat - B.env.heat) * .003; S.env.heat -= dh; B.env.heat += dh;
      }
      // 5) fire spread to neighbours (scheduled 1–3 min after ignition)
      for (const P of this.plans) {
        if (P.done || t < P.at) continue;
        const src = this.mods[P.from], dst = this.mods[P.to];
        if (this.burning(P.to) || this.hatchShut(P.from, P.to)) { P.done = true; continue; }
        if (!src.fire || src.fire.f < .25) { P.done = true; continue; }           // source contained → no spread
        if (src.actions.vent_off != null && !P.delayed) { P.delayed = true; P.at = t + 60 + R() * 60; continue; } // starved fire spreads slower
        P.done = true;
        dst.inc = this.makeIncident(P.to, t, 'spread', P.from);
        this.emit({ type: 'spread', mod: P.to, level: 'warn', text: { en: `Fire is spreading from ${this.name(P.from)} — heat and smoke entering through the open hatch`, ru: `Огонь распространяется из ${this.name(P.from)} — тепло и дым проходят через открытый люк` } });
      }
      // 6) sensors follow the physical state
      for (const S of Object.values(this.mods)) {
        const E = S.env, pre = S.pre || {}, A = S.actions, f = S.fire ? S.fire.f : 0;
        const off = {
          smoke: E.smoke + (pre.smoke || 0), pm: E.pm + (pre.pm || 0), co: E.co + (pre.co || 0), hcn: E.hcn + (pre.hcn || 0),
          temp: E.heat + (pre.temp || 0), o2: E.o2 + (pre.o2 || 0), co2: E.co2,
          current: (pre.current || 0) + (S.fire && S.fire.elec ? f * 12 * (.6 + R() * .8) : 0) - (A.power_off != null ? 95 * smooth((t - A.power_off) / 3) : 0),
          press: .25 * this.h.p_kPa * (E.heat + (pre.temp || 0)) / 295,   // gas heating raises pressure (damped by station volume)
          flow: A.vent_off != null ? -15 * smooth((t - A.vent_off) / 4) : 0,
        };
        if (this.fault && S.m.id === this.fault.mod && t >= this.fault.at && t <= this.fault.at + this.fault.dur) {
          const x = (t - this.fault.at) / this.fault.dur; off[this.fault.key] += (this.fault.key === 'smoke' ? 1.7 : 120) * Math.sin(Math.PI * x);
        }
        FG.SENSORS.forEach((s, j) => {
          const target = s.base(S.m, this.h) + (off[s.key] || 0) + Math.sin(t / 47 + S.drift[j]) * s.noise * 1.5;
          let nv = S.vals[s.key] + (target - S.vals[s.key]) * .45 + (R() - .5) * 2 * s.noise;
          if (['smoke', 'pm', 'co', 'hcn', 'flow'].includes(s.key)) nv = Math.max(0, nv);
          S.vals[s.key] = nv;
        });
      }
    }

    step(dt) {
      const n = Math.max(1, Math.round(dt));
      for (let i = 0; i < n; i++) { if (dt > 0) this.t += 1; this.stepOnce(); }
      const label = new Date().toLocaleTimeString('en-GB', { hour12: false });
      for (const S of Object.values(this.mods)) {
        S.labels.push(label); if (S.labels.length > HIST) S.labels.shift();
        for (const s of FG.SENSORS) { const h = S.hist[s.key]; h.push(+S.vals[s.key].toFixed(s.dec + 1)); if (h.length > HIST) h.shift(); }
        this.evaluate(S);
      }
    }

    // sensor fusion → status, danger %, fire probability, fire involvement
    evaluate(S) {
      const h = this.h, sev = {}, lvl = {};
      let corro = 0, prod = 1, z = -5.2;
      for (const s of FG.SENSORS) {
        if (s.info) continue;
        const v = S.vals[s.key], b = s.base(S.m, h), w = s.warn(h), d = s.danger(h);
        const x = s.down ? clamp((b - v) / (b - d), 0, 1.5) : clamp((v - b) / (d - b), 0, 1.5);
        sev[s.key] = x;
        lvl[s.key] = s.down ? (v <= d ? 2 : v <= w ? 1 : 0) : (v >= d ? 2 : v >= w ? 1 : 0);
        if (s.fire && x >= .35) corro++;
        prod *= 1 - Math.min(1, x) * s.w * .8;
        if (s.fire) z += 3.0 * Math.min(1, x);
      }
      z += 2.2 * Math.min(1, sev.o2) + 1.6 * Math.min(1, sev.current) + (h.o2 - 21) * .12;
      // a burning neighbour with an open hatch is itself a risk factor
      const hotNb = S.m.nb.filter(nb => this.burning(nb) && !this.hatchShut(S.m.id, nb));
      z += hotNb.length * 1.5;
      const o2mult = 1 + Math.max(0, S.vals.o2 - 21) * .035;
      const flagged = Object.keys(lvl).filter(k => lvl[k] > 0);
      let status = 'ok', fault = null;
      const flame = !!(S.fire && S.fire.f > 0);
      const fireNow = (lvl.smoke === 2 || (lvl.pm === 2 && lvl.co >= 1)) && corro >= 2;
      // FIRE only while a flame actually burns here; lingering or migrated smoke without flame = risk (orange)
      const camFlame = flame && S.fire.f >= .12;   // flame big enough to be seen by the CCTV cameras
      if ((fireNow && flame) || camFlame) status = 'fire';
      else if (fireNow) status = 'warn';
      else if (flagged.length) {
        if (flagged.length === 1 && ['smoke', 'pm'].includes(flagged[0]) && corro <= 1 && !hotNb.length) { status = 'fault'; fault = flagged[0]; }
        else status = 'warn';
      } else if (hotNb.length) status = 'warn';
      if (S.status === 'fire' && status !== 'fire' && S.fire && S.fire.f > .05) status = 'fire'; // hysteresis while flame persists
      let danger = clamp(100 * (1 - prod) * o2mult, 0, 100);
      let chance = 100 / (1 + Math.exp(-z));
      if (status === 'fault') { danger *= .35; chance = Math.min(chance, 12); }
      if (status === 'fire') danger = Math.max(danger, 72);
      if (status === 'warn' && hotNb.length) danger = Math.max(danger, 45);
      if (status === 'ok' && danger >= 35) status = 'warn';   // elevated danger even below single-sensor limits → prevention mode
      // after a fire the smoke keeps the atmosphere dangerous, but the chance of a NEW flame depends on heat / O2 (re-ignition)
      if (S.hadFire && !flame) chance = clamp(4 + S.env.heat * 3 + Math.max(0, S.vals.o2 - h.o2) * 15 + hotNb.length * 20, 2, 80);
      let spread = null;
      if (S.fire && (S.fire.f > 0 || status === 'fire')) {
        spread = { pct: 100 * S.fire.f / FMAX, rate: S.fire.rate, v: S.fire.v, mat: S.fire.mat, out: S.fire.f <= 0 };
      }
      const next = this.plans.filter(p => !p.done && p.from === S.m.id).map(p => ({ to: p.to, inSec: Math.max(0, p.at - this.t) }));
      const prev = S.status;
      S.status = status;
      S.eval = { sev, lvl, corro, danger, chance, status, fault, spread, flagged, hotNb, next };
      if (prev !== status) this.statusEvent(S, prev, status);
      S.flagLog = S.flagLog || {};
      for (const k of flagged) { const key = k + lvl[k]; if (!S.flagLog[key] && status !== 'fault') { S.flagLog[key] = 1; const s = FG.SENSORS.find(x => x.key === k); this.emit({ type: 'sensor', mod: S.m.id, level: lvl[k] === 2 ? 'fire' : 'warn', sensor: k, text: FG.sensorMsg(s, S.vals[k], h, lvl[k]) }); } }
    }
    statusEvent(S, prev, status) {
      const T = {
        warn: { en: 'FIRE RISK — precursor signatures detected', ru: 'РИСК ПОЖАРА — обнаружены предвестники' },
        fire: { en: 'FIRE CONFIRMED by sensor fusion', ru: 'ПОЖАР ПОДТВЕРЖДЁН слиянием датчиков' },
        fault: { en: 'Unconfirmed single-sensor spike — probable sensor fault / dust', ru: 'Неподтверждённый скачок одного датчика — вероятен сбой / пыль' },
        ok: { en: 'Back to nominal', ru: 'Возврат к норме' },
      };
      this.emit({ type: 'status', mod: S.m.id, level: status, prev, text: T[status] });
    }
  }

  FG.sensorMsg = function (s, v, h, lv) {
    const lim = lv === 2 ? s.danger(h) : s.warn(h);
    const key = s.down ? 'below' : lv === 2 ? 'exceeded' : 'approaching';
    const vars = l => ({ inst: s.inst[l], name: s.name[l], val: v.toFixed(s.dec), unit: s.unit, lim: (+lim).toFixed(s.dec) });
    return { en: I18N.tl('en', key, vars('en')), ru: I18N.tl('ru', key, vars('ru')) };
  };

  FG.Sim = Sim;
  FG.FMAX = FMAX;
})();
