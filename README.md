# FireGuard SI — Flame in Freefall (NASA Space Apps 2026)

**An SI-powered dashboard that summarizes, ranks and interprets NASA's microgravity combustion research (PSI) and turns it into live fire-safety guidance for spacecraft, Moon bases and pressurized rovers.**

**▶ Live demo: https://planktonada-bot.github.io/ISS-FireGuard/** (runs fully in the browser, offline SI mode; the optional Claude chat needs `npm start` with an API key).

## What it does

| View | Challenge objective it answers |
|---|---|
| **PSI Research Explorer** | Ranks all 26 PSI combustion investigations for the selected habitat and question. Shows each one's objective, fuels, O₂, pressure and flow ranges, hardware, DOI, its real experimental table and its publications. You can compare up to 3 side by side. A scatter plot puts 1,883 extracted test points against habitat atmospheres and flags **data gaps**: almost no solid-material tests exist near the planned ≥30 % O₂ / 70 kPa Moon-base atmosphere. |
| **Flammability Lab** | Extracts data for predictive modelling. It estimates flame spread vs O₂, pressure, airflow and gravity, anchored on the Saffire-II measurements (2.1–2.6 mm/s) and BASS/BASS-II trends, and lists the nearest real PSI test points. |
| **Mission Monitor** | Shows how PSI findings apply in a crew cabin. Each ISS module has its own tab with 10 live sensors (smoke, CO, PM2.5, T, O₂, CO₂, HCN, rack current, pressure, ventilation). A random incident develops 2.5–3.5 min into each scenario: precursors turn the module orange, ignition turns it red. Sensor fusion separates a real fire from a single-sensor nuisance spike. The SI Crew Advisor gives step-by-step actions, each citing a PSI investigation or NASA lesson. Checking an action (ventilation off, power off, PFE, hatch) changes the simulation. Fires follow cause and effect: heat, smoke, CO and HCN build up, O₂ is consumed and CO₂ rises. Smoke and heat reach neighbours through open hatches, and an uncontained fire ignites each neighbour after an independent random 1–3 min. With no crew action the whole station burns. The gauge shows fire involvement in % (0 = ignition, 100 = fully developed). |
| **Lessons & Spinoffs** | Lessons from Apollo 1, Apollo 13, Mir 1997 and Artemis II, mapped to dashboard features, plus Earth applications (smoke detectors, firefighter air tanks and gear, water mist). |

### CCTV
Each module tab has two looping camera feeds (`public/assets/cctv`, 8 sections × 3 states × 2 cameras). **All 48 clips are SI-generated (rendered with Claude, Anthropic) — not real ISS footage.** Every feed carries a visible "SI-GENERATED VIDEO" watermark in the app, as the Space Apps SI-use rules require:
- **Normal camera (VIS).**
- **Special ICCD camera, 350–470 nm.** Sees the CH₂O* glow of cool flames.

The feed follows the module's fire physics:
- `normal` when there is no flame.
- `hot` (phase 1) while a visible flame burns. A camera-visible flame also confirms FIRE in the sensor fusion.
- `cool` (phase 2) for about 2 min after the hot flame dies while the module is still hot. Only the special camera sees it, as in NASA FLEX.

Sections map to ISS modules by function in `FG.CCTV_MAP` (`public/js/config.js`).

## NASA data used
- **NASA Physical Sciences Informatics (PSI), Combustion Science.** Downloaded through PSI's own web service (`psi.nasa.gov/geode-py/ws/...`): 26 investigation records and 25 experimental-table CSVs, CC0 licensed. Built with `scripts/build-data.js` into `public/data/psi.json`.
- NASA GRC experiment descriptions for ACME, BASS, DAFT, FLEX, SLICE and SPICE; *A Researcher's Guide to ISS Combustion Science* (NP-2015-10-034-JSC); NASA SMA lessons learned (Apollo 1, Apollo 13); NASA History (Mir fire); NASA Spinoff pages. These are chunked into `public/data/kb.json` for retrieval.
- NASA Image Library: ISS photo `iss056e201248`, public domain.

## Run
```bash
npm install
npm start            # http://localhost:3000
```
Optional: copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`. The advisor and summaries then use Claude (`claude-opus-5-5`), grounded only on retrieved NASA passages and cited as [n]. Server-side refusal fallback is on. Without a key everything still works offline: rule engine plus local BM25 search over the NASA corpus.

Demo tips: use **×5 / ×15** speed or **Trigger incident**. Switch the habitat (ISS → Moon Base) to see the ranking and fire risk change.

Rebuild the data, for example after adding your own `.txt`/`.md` notes into `knowledge/`:
```bash
npm run build-data
```

## Honesty notes
- The sensor feed is simulated: there is no public ISS fire-sensor telemetry. Limits are ISS-representative (e.g. O₂ ≤ 24.1 %, CO₂ 5.3 mmHg, CO 25 ppm).
- The spread model is an engineering estimate. The anchors are measured; limiting-O₂ values marked "assumed" are team estimates.
- Fire-safety relevance scores (0–5) are the team's judgement and are shown in the ranking breakdown.
- Decision support only. Crew and Mission Control procedures take precedence.

---
**RU кратко:** FireGuard SI ранжирует и объясняет 26 исследований горения из базы NASA PSI, извлекает 1883 тестовые точки для прогноза горючести и показывает, как эти данные работают в живом мониторе МКС: датчики, авария, советник с инструкциями и ссылками на источники.
