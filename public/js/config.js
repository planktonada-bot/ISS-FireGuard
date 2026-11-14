// Station layout, sensor definitions (ISS reference values) and incident archetypes.
window.FG = window.FG || {};

FG.MODULES = [
  { id: 'zvezda', name: 'Zvezda', seg: 'RS', desc: { en: 'Service Module · crew quarters, Elektron O₂ generator', ru: 'Служебный модуль · каюты, генератор O₂ «Электрон»' }, tOff: 1.6, co2Off: .25, smokeType: 'DTI', map: [8, 64, 48, 22], nb: ['zarya'] },
  { id: 'zarya', name: 'Zarya · FGB', seg: 'RS', desc: { en: 'Functional Cargo Block · first ISS module, stowage, propellant tanks, batteries', ru: 'Функционально-грузовой блок · первый модуль МКС, склад, баки топлива, аккумуляторы' }, tOff: .3, co2Off: .15, smokeType: 'DTI', map: [58, 65, 44, 20], nb: ['zvezda', 'unity'] },
  { id: 'unity', name: 'Unity · Node 1', seg: 'USOS', desc: { en: 'Node 1 · galley, stowage', ru: 'Узел 1 · камбуз, склад' }, tOff: 0, co2Off: .1, map: [104, 62, 30, 26], nb: ['zarya', 'destiny', 'tranquility'] },
  { id: 'destiny', name: 'Destiny · US Lab', seg: 'USOS', desc: { en: 'US Lab · science racks, CIR/MSG', ru: 'Лаборатория США · научные стойки, CIR/MSG' }, tOff: .6, co2Off: .35, map: [137, 64, 56, 22], nb: ['unity', 'harmony'] },
  { id: 'harmony', name: 'Harmony · Node 2', seg: 'USOS', desc: { en: 'Node 2 · crew quarters, docking ports', ru: 'Узел 2 · каюты, стыковочные порты' }, tOff: -.3, co2Off: .2, map: [196, 62, 30, 26], nb: ['destiny', 'columbus', 'kibo'] },
  { id: 'columbus', name: 'Columbus', seg: 'ESA', desc: { en: 'ESA laboratory · Fluid Science Lab, EDR', ru: 'Лаборатория ЕКА · FSL, EDR' }, tOff: -.5, co2Off: 0, map: [229, 66, 44, 18], nb: ['harmony'] },
  { id: 'kibo', name: 'Kibo · JEM', seg: 'JAXA', desc: { en: 'Japanese Experiment Module · largest pressurized lab', ru: 'Японский модуль · крупнейшая лаборатория' }, tOff: -.2, co2Off: .05, map: [199, 16, 24, 42], nb: ['harmony'] },
  { id: 'tranquility', name: 'Tranquility · Node 3', seg: 'USOS', desc: { en: 'Node 3 · ECLSS racks, OGS O₂ generator, exercise', ru: 'Узел 3 · стойки СОЖ, генератор O₂ OGS, тренажёры' }, tOff: .8, co2Off: .3, map: [107, 92, 24, 40], nb: ['unity'] },
];

// thresholds are functions of the habitat (o2, pressure) so the same code works for ISS and a Moon base
FG.SENSORS = [
  { key: 'smoke', name: { en: 'Smoke obscuration', ru: 'Задымление' }, inst: { en: 'Smoke detector', ru: 'Дымовой датчик' }, unit: '%/ft', base: () => .12, noise: .025, warn: () => 1.0, danger: () => 2.0, dec: 2, w: 1.0, fire: true },
  { key: 'co', name: { en: 'Carbon monoxide', ru: 'Угарный газ CO' }, inst: { en: 'CSA-CP', ru: 'CSA-CP' }, unit: 'ppm', base: () => 1.4, noise: .25, warn: () => 15, danger: () => 25, dec: 1, w: .95, fire: true },
  { key: 'pm', name: { en: 'Particulates PM2.5', ru: 'Частицы PM2.5' }, inst: { en: 'Airborne Particle Monitor', ru: 'Монитор частиц' }, unit: 'µg/m³', base: () => 9, noise: 1.3, warn: () => 50, danger: () => 150, dec: 0, w: .85, fire: true },
  { key: 'temp', name: { en: 'Air temperature', ru: 'Температура воздуха' }, inst: { en: 'Cabin T sensor', ru: 'Датчик T кабины' }, unit: '°C', base: m => 22.4 + (m.tOff || 0), noise: .08, warn: () => 30, danger: () => 35, dec: 1, w: .7, fire: true },
  { key: 'o2', name: { en: 'Oxygen', ru: 'Кислород O₂' }, inst: { en: 'MCA', ru: 'MCA' }, unit: '%', base: (m, h) => h.o2, noise: .04, warn: (h) => h.o2 + 1.9, danger: (h) => h.o2 + 3.1, dec: 2, w: .8 },
  { key: 'co2', name: { en: 'Carbon dioxide', ru: 'Углекислый газ CO₂' }, inst: { en: 'MCA / CDM', ru: 'MCA / CDM' }, unit: 'mmHg', base: m => 2.5 + (m.co2Off || 0), noise: .05, warn: () => 4.0, danger: () => 5.3, dec: 2, w: .35 },
  { key: 'hcn', name: { en: 'Hydrogen cyanide', ru: 'Цианистый водород HCN' }, inst: { en: 'CSA-CP', ru: 'CSA-CP' }, unit: 'ppm', base: () => .1, noise: .04, warn: () => 2, danger: () => 5, dec: 1, w: .7, fire: true },
  { key: 'current', name: { en: 'Rack power draw', ru: 'Ток стойки' }, inst: { en: 'RPCM', ru: 'RPCM' }, unit: '% nom', base: () => 100, noise: 1.1, warn: () => 115, danger: () => 130, dec: 0, w: .55 },
  { key: 'press', name: { en: 'Cabin pressure', ru: 'Давление' }, inst: { en: 'Pressure sensor', ru: 'Датчик давления' }, unit: 'kPa', base: (m, h) => h.p_kPa, noise: .04, warn: (h) => h.p_kPa - 1.5, danger: (h) => h.p_kPa - 3.5, dec: 1, w: .5, down: true },
  { key: 'flow', name: { en: 'Ventilation flow', ru: 'Поток вентиляции' }, inst: { en: 'IMV fan', ru: 'Вентилятор IMV' }, unit: 'cm/s', base: () => 15, noise: .5, dec: 1, w: 0, info: true },
];

// Incident archetypes, each tied to a real event or PSI investigation.
// pre = precursor offsets (orange), ign = additional offsets after ignition (red)
FG.INCIDENTS = [
  { id: 'wiring', name: { en: 'Overheated wiring / avionics', ru: 'Перегрев проводки / авионики' }, mat: 'pmma_thin',
    history: { en: 'Apollo 1 (arc in wiring bundle) · Artemis II smoke alarm', ru: 'Apollo 1 (дуга в жгуте) · дымовая тревога Artemis II' },
    pre: { current: 34, temp: 8, co: 11 }, ign: { smoke: 3.4, pm: 260, co: 42, hcn: 6, temp: 12 }, key: ['current', 'smoke'] },
  { id: 'o2gen', name: { en: 'Oxygen generator failure (solid-fuel O₂ candle)', ru: 'Отказ генератора кислорода (твердотопливная шашка)' }, mat: 'sibal',
    history: { en: 'Mir, 24 Feb 1997 — SFOG candle fire', ru: '«Мир», 24.02.1997 — пожар кислородной шашки' },
    pre: { o2: 2.4, temp: 6 }, ign: { smoke: 4.6, pm: 420, co: 70, temp: 19, o2: 2.4, hcn: 3 }, key: ['o2', 'smoke'] },
  { id: 'smolder', name: { en: 'Smoldering fabric / insulation', ru: 'Тление ткани / изоляции' }, mat: 'sibal',
    history: { en: 'SAME / Saffire smoke & fabric data', ru: 'Данные SAME / Saffire по дыму и тканям' },
    pre: { pm: 62, co: 16, smoke: .9 }, ign: { smoke: 2.6, pm: 200, co: 34, temp: 9, hcn: 4 }, key: ['pm', 'co'] },
  { id: 'battery', name: { en: 'Li-ion battery thermal runaway', ru: 'Тепловой разгон Li-ion аккумулятора' }, mat: 'pmma_thin',
    history: { en: 'Electronics & battery hazards in crew cabins', ru: 'Опасность электроники и аккумуляторов в кабине' },
    pre: { temp: 11, current: 24 }, ign: { smoke: 3.9, pm: 340, co: 55, temp: 18, hcn: 7 }, key: ['temp', 'smoke'] },
  { id: 'o2leak', name: { en: 'High-pressure O₂ line leak', ru: 'Утечка O₂ из магистрали высокого давления' }, mat: 'sibal',
    history: { en: 'Apollo 13 — O₂ tank fire/explosion', ru: 'Apollo 13 — возгорание и взрыв бака O₂' },
    pre: { o2: 3.6, temp: 3 }, ign: { smoke: 3.0, pm: 240, co: 40, temp: 15, hcn: 4 }, key: ['o2', 'smoke'] },
];

// Crew actions that feed back into the simulation
FG.ACTIONS = {
  vent_off: { label: { en: 'Turn OFF module ventilation (IMV fans)', ru: 'ВЫКЛЮЧИТЬ вентиляцию модуля (IMV)' } },
  power_off: { label: { en: 'Remove power from the affected rack (RPCM)', ru: 'ОБЕСТОЧИТЬ аварийную стойку (RPCM)' } },
  pfe: { label: { en: 'Discharge portable fire extinguisher (PFE)', ru: 'Применить переносной огнетушитель (PFE)' } },
  hatch: { label: { en: 'Close hatches to isolate the module', ru: 'Закрыть люки, изолировать модуль' } },
  o2_off: { label: { en: 'Shut off O₂ supply / generator', ru: 'Перекрыть подачу O₂ / генератор' } },
};

// CCTV: archive section id for each ISS module (by function of the module)
FG.CCTV_MAP = {
  zvezda: 'command',      // Russian segment central post
  zarya: 'cargo',         // FGB: stowage
  unity: 'galley',        // Node 1: galley
  destiny: 'lab',         // US Lab: houses the Combustion Integrated Rack
  harmony: 'habitat',     // Node 2: crew quarters
  columbus: 'medbay',     // ESA lab: human-research / biolab racks
  kibo: 'airlock',        // JEM: has its own airlock
  tranquility: 'engine',  // Node 3: ECLSS / power-intensive racks
};
