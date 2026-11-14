// PSI-anchored flame-spread estimate for thin/thick solids.
// Anchor: Saffire-II (PSI-99) measured 2.1 and 2.6 mm/s (mean 2.35) for SIBAL fabric,
// concurrent flow 20 cm/s, ~22.1% O2, 1 atm, microgravity.
// Trends: BASS/BASS-II (PSI-26/25) — in µg, flames survive only above a minimum "quench" flow
// that rises as O2 falls; more O2 and more flow → faster spread. Saffire-II: silicone barely burned,
// Nomex did not ignite at ~22% O2; thick PMMA regressed at 0.01–0.04 mm/s.
// Limiting O2 values marked "assumed" are team estimates for demonstration, not PSI measurements.
FG.MATERIALS = {
  sibal: { name: { en: 'SIBAL cotton-fiberglass fabric', ru: 'Ткань SIBAL (хлопок-стекловолокно)' }, k: 1.0, loc: 15.5, src: 'PSI-99, PSI-98, PSI-26', locSrc: 'assumed' },
  cotton: { name: { en: 'Paper / cotton cloth', ru: 'Бумага / хлопок' }, k: 1.25, loc: 15.0, src: 'trend from SIBAL (75% cotton)', locSrc: 'assumed' },
  pmma_thin: { name: { en: 'PMMA film / plastic housing', ru: 'Плёнка PMMA / пластиковый корпус' }, k: .55, loc: 17.0, src: 'PSI-25 BASS-II', locSrc: 'assumed' },
  pmma_thick: { name: { en: 'Thick PMMA (1 cm)', ru: 'Толстый PMMA (1 см)' }, k: .012, loc: 18.0, src: 'PSI-99 (0.01–0.04 mm/s)', locSrc: 'assumed' },
  silicone: { name: { en: 'Silicone rubber', ru: 'Силиконовая резина' }, k: .35, loc: 21.8, src: 'PSI-99 (insignificant burning at ~22%)', locSrc: 'bounded by PSI-99' },
  nomex: { name: { en: 'Nomex fabric', ru: 'Ткань Nomex' }, k: .6, loc: 25.0, src: 'PSI-99 (no ignition at ~22%)', locSrc: 'bounded by PSI-99' },
  kapton: { name: { en: 'Wire insulation (Kapton/PTFE)', ru: 'Изоляция проводов (Kapton/PTFE)' }, k: .3, loc: 23.0, src: 'SAME materials (PSI-102)', locSrc: 'assumed' },
};

FG.spread = function (matKey, o2, p_kPa, u, g) {
  const m = FG.MATERIALS[matKey] || FG.MATERIALS.sibal;
  const pr = Math.max(.2, p_kPa / 101.3);
  const loc = m.loc + 2.5 * (1 - pr);                 // lower pressure → slightly higher limit (heat-loss trend)
  const ub = 30 * Math.sqrt(Math.max(0, g || 0));      // buoyancy-induced flow in partial gravity
  const ueff = Math.sqrt(u * u + ub * ub);
  const uq = o2 > loc ? 0.9 * Math.pow((loc + 4) / o2, 3) : Infinity; // µg quench flow
  if (o2 <= loc) return { v: 0, flammable: false, reason: 'o2', loc, uq: null, ueff };
  if (ueff < uq) return { v: 0, flammable: false, reason: 'flow', loc, uq, ueff };
  const ox = Math.pow((o2 - loc) / (22.1 - FG.MATERIALS.sibal.loc), 1.15);
  const fl = (1 - Math.exp(-ueff / 7)) / (1 - Math.exp(-20 / 7));
  const v = 2.35 * m.k * ox * fl * Math.pow(pr, .35);
  return { v, flammable: true, loc, uq, ueff };
};
