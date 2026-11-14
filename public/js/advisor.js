// SI Crew Advisor: offline rule engine grounded on PSI + NASA lessons learned,
// upgraded with Claude (server /api/ask) when an API key is configured.
(function () {
  const CITE = {
    'PSI-98': 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-98', 'PSI-99': 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-99',
    'PSI-100': 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-100', 'PSI-26': 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-26',
    'PSI-25': 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-25', 'PSI-69': 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-69',
    'PSI-102': 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-102', 'PSI-101': 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-101',
    'PSI-47': 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-47', 'PSI-20': 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-20',
    'PSI-159': 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-159', 'PSI-68': 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-68',
    'Mir 1997': 'https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/', 'Apollo 1': 'https://sma.nasa.gov/sma-disciplines/accllp/apollo-1',
    'Apollo 13': 'https://sma.nasa.gov/sma-disciplines/accllp/apollo-13', 'Spinoff': 'https://spinoff.nasa.gov/node/9407',
  };
  const S = (en, ru, cite, act) => ({ text: { en, ru }, cite, act });

  function guidance(ev, h, modName, sim, modId) {
    const st = ev ? ev.status : 'ok', f = ev ? ev.flagged : [];
    const elec = f.includes('current') || (f.includes('temp') && !f.includes('o2'));
    const oxy = f.includes('o2');
    const smold = f.includes('pm') || f.includes('co');
    const SM = sim && sim.mods[modId], hotNb = (ev && ev.hotNb) || [];
    const burningHere = !!(SM && SM.fire && SM.fire.f > 0);
    const isSpill = hotNb.length > 0 && !burningHere;
    const nbNames = ids => ids.map(id => sim.mods[id].m.name.split(' ')[0]).join(', ');
    const g = { actions: [], prepare: [], why: [], note: null };
    if (st === 'ok') {
      g.note = { en: `${modName}: all parameters within limits. Standing prevention guidance for ${h.name} (${h.o2}% O₂, ${h.p_kPa} kPa):`, ru: `${modName}: все параметры в норме. Профилактика для объекта «${h.name}» (${h.o2}% O₂, ${h.p_kPa} кПа):` };
      g.prepare.push(S('Keep ventilation nominal — in µg there is no buoyancy, so smoke only reaches detectors by forced airflow.', 'Держите вентиляцию в норме — в невесомости нет конвекции, дым доходит до датчиков только с потоком воздуха.', 'PSI-102'));
      g.prepare.push(S('Know the location of the nearest PFE, PBA/masks and the CSA-CP in this module.', 'Знайте, где ближайшие огнетушитель (PFE), маски/PBA и анализатор CSA-CP.', 'Mir 1997'));
      if (h.o2 > 23) g.prepare.push(S(`Enriched O₂ (${h.o2}%): materials that do not burn on ISS (Nomex, silicone) may sustain flame — re-screen soft goods.`, `Обогащённый O₂ (${h.o2}%): материалы, не горящие на МКС (Nomex, силикон), могут гореть — перепроверьте ткани и мягкие материалы.`, 'PSI-99'));
      if (h.o2 > 23) g.prepare.push(S('ACME BRE flammability data cover 21–40% O₂ — use it to set material limits for this habitat.', 'Данные ACME BRE по горючести охватывают 21–40% O₂ — используйте их для норм материалов этого объекта.', 'PSI-20'));
      g.why.push(S('Saffire-II measured 2.1–2.6 mm/s flame spread over cotton-fiberglass fabric in µg at ~22% O₂ — fast enough to matter within minutes.', 'Saffire-II измерил скорость пламени 2,1–2,6 мм/с по хлопково-стекловолоконной ткани в невесомости при ~22% O₂ — опасно уже за минуты.', 'PSI-99'));
      return g;
    }
    if (st === 'fault') {
      g.note = { en: 'Only one sensor is elevated and no other sensor confirms it.', ru: 'Повышен только один датчик, остальные это не подтверждают.' };
      g.actions.push(S('Cross-check with the portable CSA-CP (CO, HCN, HCl) at the detector location.', 'Перепроверьте переносным CSA-CP (CO, HCN, HCl) у места датчика.', 'PSI-102'));
      g.actions.push(S('Inspect for dust / lint / aerosol sources near the detector inlet (dust triggers nuisance alarms).', 'Осмотрите вход датчика на пыль, ворс, аэрозоли — пыль вызывает ложные тревоги.', 'PSI-47'));
      g.actions.push(S('If not confirmed in 60 s, log as nuisance alarm and request detector self-test from MCC.', 'Если не подтвердилось за 60 с — зафиксируйте как ложную тревогу и запросите самотест у ЦУП.', 'Spinoff'));
      g.why.push(S('DAFT showed the same particle counters see dust; NASA\'s shuttle detector was designed to tell smoke from dust to cut nuisance alarms.', 'DAFT показал, что счётчики частиц видят и пыль; детектор шаттла NASA создан различать дым и пыль, чтобы снизить ложные тревоги.', 'PSI-47'));
      return g;
    }
    if (st === 'warn' && SM && SM.hadFire && !burningHere && !isSpill) {
      g.note = { en: `${modName}: flame knocked down. Post-fire phase — the atmosphere is still hazardous.`, ru: `${modName}: пламя сбито. Фаза после пожара — атмосфера ещё опасна.` };
      g.actions.push(S('Keep masks / PBA on; elevated CO₂ comes from the CO₂ extinguisher discharge.', 'Не снимайте маски / PBA: повышенный CO₂ — от разряда углекислотного огнетушителя.', 'PSI-69'));
      g.actions.push(S('Watch for re-ignition for at least 10 min — FLEX showed flames can persist invisibly as cool flames.', 'Следите за повторным возгоранием минимум 10 мин — FLEX показал, что пламя может гореть невидимо («холодное пламя»).', 'PSI-69'));
      g.actions.push(S('Keep hatches closed; let atmosphere revitalization scrub CO₂ and smoke before reopening (Mir: several hours).', 'Держите люки закрытыми; дайте системе очистки удалить CO₂ и дым до открытия (на «Мире» — несколько часов).', 'Mir 1997'));
      g.prepare.push(S('Do not restore power to the rack until the cause is identified by MCC.', 'Не подавайте питание на стойку, пока ЦУП не установит причину.', 'Apollo 13'));
      g.why.push(S('Apollo 1: the crew died of CO and toxic gases, not burns — atmosphere checks are the last line of defence.', 'Apollo 1: экипаж погиб от CO и токсичных газов, а не от ожогов — проверка атмосферы последний рубеж.', 'Apollo 1'));
      return g;
    }
    if (st === 'warn') {
      if (isSpill) {
        const src = nbNames(hotNb);
        g.note = { en: `Fire in the neighbouring module (${src}). Heat and smoke are entering ${modName} through the open hatch — if it is not contained, this module can ignite within 1–3 minutes.`, ru: `Пожар в соседнем модуле (${src}). Тепло и дым поступают в ${modName} через открытый люк — если его не локализовать, этот модуль может загореться через 1–3 минуты.` };
        g.actions.push(S(`Close the hatches of ${modName} to isolate it from ${src}.`, `Закройте люки ${modName}, чтобы изолировать его от ${src}.`, 'Mir 1997', { mod: modId, key: 'hatch' }));
        g.actions.push(S(`Turn off ventilation in ${src} (the fire module).`, `Выключите вентиляцию в ${src} (модуль с пожаром).`, 'PSI-98', { mod: hotNb[0], key: 'vent_off' }));
        g.actions.push(S('Don masks / PBA; monitor CO and HCN with CSA-CP.', 'Наденьте маски / PBA; контролируйте CO и HCN по CSA-CP.', 'Apollo 1'));
        g.why.push(S('In the Mir fire smoke filled modules far from the source; toxic combustion products — not burns — killed the Apollo 1 crew.', 'При пожаре на «Мире» дым заполнил модули далеко от очага; экипаж Apollo 1 погиб от токсичных продуктов горения, а не от ожогов.', 'Mir 1997'));
        return g;
      }
      g.note = { en: 'Precursor signatures — act now to prevent ignition.', ru: 'Признаки-предвестники — действуйте сейчас, чтобы не допустить возгорания.' };
      if (elec) g.actions.push(S('Remove power from the suspect rack (RPCM) — overheating electronics are the most likely ignition source.', 'Обесточьте подозрительную стойку (RPCM) — перегрев электроники самый вероятный источник воспламенения.', 'Apollo 1', { mod: modId, key: 'power_off' }));
      if (oxy) g.actions.push(S('Shut off the oxygen source / generator; oxygen enrichment sharply raises flammability.', 'Перекройте источник кислорода / генератор: обогащение O₂ резко повышает горючесть.', 'Apollo 13', { mod: modId, key: 'o2_off' }));
      if (oxy) g.actions.push(S('Remove ignition sources: stop non-essential electrical switching in the module.', 'Уберите источники воспламенения: не переключайте лишнее электрооборудование в модуле.', 'PSI-20'));
      if (smold) g.actions.push(S('Locate the smoldering source with the portable CSA-CP / particle monitor.', 'Найдите источник тления переносным CSA-CP / монитором частиц.', 'PSI-101'));
      if (!elec && !oxy && !smold) {
        g.actions.push(S('Locate the heat / gas source: check rack temperatures and take a portable CSA-CP reading.', 'Найдите источник тепла / газа: проверьте температуру стоек и замерьте переносным CSA-CP.', 'PSI-102'));
        g.actions.push(S('Power down non-essential equipment in this module to remove ignition sources.', 'Обесточьте второстепенное оборудование модуля, чтобы убрать источники воспламенения.', 'Apollo 13', { mod: modId, key: 'power_off' }));
      }
      g.actions.push(S('Close the hatches of this module so a possible fire cannot spread.', 'Закройте люки этого модуля, чтобы возможный пожар не распространился.', 'Mir 1997', { mod: modId, key: 'hatch' }));
      g.actions.push(S('Report to Mission Control and keep the crew informed.', 'Доложите в ЦУП и оповестите экипаж.', null));
      g.prepare.push(S('Stage the PFE next to the hatch (CO₂ in USOS, foam/water in RS).', 'Подготовьте огнетушитель PFE у люка (CO₂ в USOS, пенный/водяной в РС).', 'PSI-26'));
      g.prepare.push(S('Prepare PBA / emergency masks for every crew member.', 'Подготовьте PBA / аварийные маски для каждого члена экипажа.', 'Mir 1997'));
      g.prepare.push(S('Keep the path to Soyuz / Dragon clear — at Mir the fire cut off one of two escape vehicles.', 'Держите путь к «Союзу» / Dragon свободным — на «Мире» пожар отрезал один из двух кораблей.', 'Mir 1997'));
      if (oxy) g.why.push(S(`O₂ is ${ev && sim ? sim.mods[modId].vals.o2.toFixed(1) : ''}%. PSI flammability tests (BASS-II, ACME BRE) show materials ignite and spread faster as O₂ rises.`, `O₂ = ${ev && sim ? sim.mods[modId].vals.o2.toFixed(1) : ''}%. Тесты PSI (BASS-II, ACME BRE): с ростом O₂ материалы легче воспламеняются и быстрее горят.`, 'PSI-25'));
      if (elec) g.why.push(S('Apollo 13: damaged wire insulation inside an O₂ tank ignited when power was applied.', 'Apollo 13: повреждённая изоляция проводов в баке O₂ загорелась при подаче питания.', 'Apollo 13'));
      if (smold) g.why.push(S('SAME / SAME-R: smoldering spacecraft materials produce particles that grow as smoke ages — early CO/PM rise precedes visible smoke.', 'SAME / SAME-R: тлеющие материалы дают частицы, растущие со временем — рост CO и PM опережает видимый дым.', 'PSI-102'));
      return g;
    }
    // FIRE
    const thr = (ev.next || []).map(n => n.to);
    g.note = { en: `FIRE in ${modName}. Follow the emergency response — Mission Control procedures take precedence.${thr.length ? ` If not contained within 1–3 min it will spread to ${nbNames(thr)} — closing the hatches stops it.` : ''}`, ru: `ПОЖАР в модуле ${modName}. Действуйте по аварийной процедуре — приоритет у процедур ЦУП.${thr.length ? ` Если не локализовать за 1–3 мин, огонь перейдёт в ${nbNames(thr)} — закрытие люков это остановит.` : ''}` };
    g.actions.push(S('Sound the fire alarm; all crew don masks / PBA immediately.', 'Объявите пожарную тревогу; весь экипаж немедленно надевает маски / PBA.', 'Apollo 1'));
    g.actions.push(S('Turn OFF ventilation in this module — airflow feeds microgravity flames.', 'ВЫКЛЮЧИТЕ вентиляцию модуля — поток воздуха подпитывает пламя в невесомости.', 'PSI-26', { mod: modId, key: 'vent_off' }));
    g.actions.push(S('Remove power from the affected rack.', 'Обесточьте аварийную стойку.', 'Apollo 1', { mod: modId, key: 'power_off' }));
    if (ev.lvl && ev.lvl.o2 >= 1) g.actions.push(S('Shut off the oxygen source.', 'Перекройте источник кислорода.', 'Mir 1997', { mod: modId, key: 'o2_off' }));
    g.actions.push(S('Discharge the PFE directly at the flame — a misaimed jet can entrain O₂ and feed it.', 'Направьте огнетушитель PFE прямо на пламя — струя мимо может подать O₂ и раздуть огонь.', 'PSI-26', { mod: modId, key: 'pfe' }));
    g.actions.push(S('Close hatches to isolate the module.', 'Закройте люки, изолируйте модуль.', 'Mir 1997', { mod: modId, key: 'hatch' }));
    g.prepare.push(S('Crew not fighting the fire gathers at the Soyuz / Dragon with a clear path.', 'Кто не тушит — собирается у «Союза» / Dragon, путь свободен.', 'Mir 1997'));
    g.prepare.push(S('After extinguishing keep monitoring CO/HCN — droplet flames continue as invisible "cool flames" after the visible flame goes out.', 'После тушения продолжайте контроль CO/HCN — в FLEX пламя продолжало гореть как невидимое «холодное пламя».', 'PSI-69'));
    g.prepare.push(S('Do not remove masks until CSA-CP shows CO below 25 ppm and HCN below 2 ppm.', 'Не снимайте маски, пока CSA-CP не покажет CO ниже 25 ppm и HCN ниже 2 ppm.', 'Apollo 1'));
    g.why.push(S('Saffire-I/III: large µg fires grow faster with higher ventilation speed (20 → 30 cm/s).', 'Saffire-I/III: крупные пожары в невесомости растут быстрее при большем потоке (20 → 30 см/с).', 'PSI-100'));
    g.why.push(S('BASS: below a minimum flow microgravity flames self-extinguish — that is why ventilation shutdown works.', 'BASS: ниже минимального потока пламя в невесомости гаснет само — поэтому отключение вентиляции работает.', 'PSI-26'));
    g.why.push(S('Mir 1997: the oxygen-candle fire burned for minutes, filled modules with smoke and blocked an escape vehicle.', '«Мир» 1997: пожар кислородной шашки длился минуты, задымил модули и отрезал корабль спасения.', 'Mir 1997'));
    return g;
  }

  async function ask(payload) {
    try {
      const r = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { offline: true, error: j.error };
      return j;
    } catch (e) { return { offline: true, error: 'network' }; }
  }

  FG.Advisor = { guidance, ask, CITE };
})();
