// Lessons learned (NASA SMA / History) and Earth spinoffs, mapped to dashboard features.
(function () {
  const C = [
    { t: 'Apollo 1', y: '27 Jan 1967', url: 'https://sma.nasa.gov/sma-disciplines/accllp/apollo-1',
      en: ['Pad test with cabin pressurized with 100% oxygen; a flash fire swept the Command Module.', 'The crew died of asphyxia from carbon monoxide and other toxic gases — burns were likely survivable.', 'The three-piece hatch took ~90 s to open and could not be opened under pressure.', 'Fixes: unified hatch (3 s), strict control of combustible materials, fire-resistant suits.'],
      ru: ['Наземный тест: кабина под 100% кислородом; мгновенный пожар охватил командный модуль.', 'Экипаж погиб от удушья угарным газом и токсичными газами — ожоги, вероятно, были не смертельны.', 'Трёхсекционный люк открывался ~90 с и не открывался под давлением.', 'Меры: единый люк (3 с), строгий контроль горючих материалов, огнестойкие скафандры.'],
      fg: { en: 'Tracks CO and HCN, not just smoke, and keeps masks on until CSA-CP readings are safe. Oxygen enrichment raises the danger score.', ru: 'Отслеживает CO и HCN, а не только дым, и требует не снимать маски до безопасных показаний CSA-CP. Обогащение O₂ повышает уровень опасности.' } },
    { t: 'Apollo 13', y: '13 Apr 1970', url: 'https://sma.nasa.gov/sma-disciplines/accllp/apollo-13',
      en: ['Heater voltage was raised from 28 to 65 V DC but the thermostatic switches were not changed.', 'On the pad the heaters overheated (~1000 °F) and degraded the Teflon wire insulation inside O₂ tank 2.', 'In flight the damaged wiring ignited in pure O₂ and the tank exploded.', 'Fixes: third tank, upgraded thermostats, no stirring fans, wiring sheathed in stainless steel.'],
      ru: ['Напряжение нагревателей подняли с 28 до 65 В, но термовыключатели не заменили.', 'На старте нагреватели перегрелись (~540 °C) и повредили тефлоновую изоляцию в баке O₂ №2.', 'В полёте повреждённая проводка загорелась в чистом O₂, бак взорвался.', 'Меры: третий бак, новые термостаты, без вентиляторов-мешалок, проводка в стальной оболочке.'],
      fg: { en: 'The "O₂ line leak" and "overheated wiring" scenarios reproduce these precursors: rising rack current, temperature and O₂ — caught before ignition.', ru: 'Сценарии «утечка O₂» и «перегрев проводки» воспроизводят эти предвестники: рост тока стойки, температуры и O₂ — ловятся до воспламенения.' } },
    { t: 'Mir', y: '24 Feb 1997', url: 'https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/',
      en: ['A solid-fuel oxygen generator (lithium perchlorate candle) ignited in Kvant-1 with a ~1 m flame and dense smoke.', 'The flame blocked the route to one of two Soyuz escape vehicles; six crew aboard.', 'Crew donned masks and used foam extinguishers; smoke cleared over several hours.', 'Likely cause: latex glove material contaminating the canister. Lessons fed into ISS design and training.'],
      ru: ['В «Кванте-1» загорелась твердотопливная кислородная шашка (перхлорат лития) — пламя ~1 м и густой дым.', 'Пламя перекрыло путь к одному из двух «Союзов»; на борту было шесть человек.', 'Экипаж надел маски и тушил пенными огнетушителями; дым удаляли несколько часов.', 'Вероятная причина — латекс перчатки в шашке. Уроки учтены при создании МКС.'],
      fg: { en: 'The "oxygen generator failure" scenario, escape-path checks in every risk checklist, and smoke-migration warnings for neighbouring modules.', ru: 'Сценарий «отказ генератора кислорода», проверка пути эвакуации в каждом чек-листе и предупреждения о дыме в соседних модулях.' } },
    { t: 'Artemis II', y: '2026', url: 'https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/',
      en: ['A smoke alarm sounded during the crewed lunar flyby — far from any rescue.', 'Shows why detection must separate real smoke from nuisance triggers and why crews need instant, sourced guidance.'],
      ru: ['Во время пилотируемого облёта Луны сработала дымовая тревога — вдали от любой помощи.', 'Показывает, зачем отличать настоящий дым от ложных срабатываний и почему экипажу нужны мгновенные подсказки с источниками.'],
      fg: { en: 'Sensor fusion flags unconfirmed single-sensor spikes as probable faults (SAME, DAFT data), avoiding needless emergency response.', ru: 'Слияние датчиков помечает неподтверждённые скачки одного датчика как вероятный сбой (данные SAME, DAFT) — без лишней тревоги.' } },
  ];
  const SP = [
    { t: { en: 'Smoke detector that tells smoke from dust', ru: 'Детектор, отличающий дым от пыли' }, url: 'https://spinoff.nasa.gov/node/9407', d: { en: '1970s shuttle detector with fewer nuisance alarms, adopted in mining and industry.', ru: 'Детектор шаттла 1970-х с меньшим числом ложных тревог; применён в шахтах и промышленности.' } },
    { t: { en: "Firefighters' air tanks", ru: 'Дыхательные баллоны пожарных' }, url: 'https://spinoff.nasa.gov/node/9582', d: { en: 'Spacesuit life-support tech made firefighter breathing gear lighter.', ru: 'Технологии систем жизнеобеспечения скафандров облегчили дыхательные аппараты пожарных.' } },
    { t: { en: 'Fire attire', ru: 'Защитная одежда пожарных' }, url: 'https://spinoff.nasa.gov/node/9918', d: { en: 'Spacesuit materials improved protective turnout gear.', ru: 'Материалы скафандров улучшили боевую одежду пожарных.' } },
    { t: { en: 'Fine-water-mist extinguishers', ru: 'Тонкораспылённые водяные огнетушители' }, url: 'https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/', d: { en: 'Developed for ISS, now used on Earth; FLEX and BASS suppression data inform agent efficacy.', ru: 'Созданы для МКС и применяются на Земле; данные FLEX и BASS помогают оценить эффективность.' } },
  ];
  function render() {
    const ru = I18N.lang === 'ru';
    document.getElementById('lessons').innerHTML = C.map(c => `<article class="panel lesson"><div class="yr">${c.y}</div><h3>${c.t}</h3>
      <ul>${(ru ? c.ru : c.en).map(x => `<li>${x}</li>`).join('')}</ul>
      <div class="fg"><b>FireGuard:</b> ${L(c.fg)}</div><p class="small"><a href="${c.url}" target="_blank" rel="noopener">${ru ? 'Источник NASA' : 'NASA source'} ↗</a></p></article>`).join('') +
      `<article class="panel lesson wide"><h3>${ru ? 'Польза для Земли (NASA Spinoff)' : 'Benefits on Earth (NASA Spinoff)'}</h3><div class="lessons" style="margin-top:10px">${SP.map(s => `<div><b>${L(s.t)}</b><p class="small muted">${L(s.d)}</p><a class="small" href="${s.url}" target="_blank" rel="noopener">↗</a></div>`).join('')}</div></article>`;
  }
  FG.Lessons = { init() { render(); document.addEventListener('langchange', render); } };
})();
