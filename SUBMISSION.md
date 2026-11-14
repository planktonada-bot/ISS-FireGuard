# NASA Space Apps 2026 — Project submission texts

Challenge: **Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data**
Project: **FireGuard SI**

---

## 1. High-level summary

FireGuard SI is an insights dashboard that turns NASA's Physical Sciences Informatics (PSI) microgravity combustion data into practical fire-safety guidance for spacecraft crews and mission designers. In microgravity there is no buoyancy: flames are spherical, smoke does not rise, and fire spreads only where ventilation pushes it — so lessons from Earth do not transfer. We pulled 26 PSI combustion investigations (Saffire I–III, BASS/BASS-II, FLEX/FLEX-2, SAME, ACME, CFI and more; 1,883 test points) into one searchable explorer, built a flame-spread estimator anchored on measured Saffire and BASS results, and connected both to a live ISS Mission Monitor: sensor fusion detects fire precursors, predicts fire probability and spread to neighbouring modules, and an SI crew advisor tells the crew what to do — citing the NASA experiment behind every step. It addresses the challenge directly: SI-powered, data-driven fire-safety insights from microgravity combustion data, for the ISS today and for Artemis/Gateway and Mars habitats tomorrow.

## 2. Project demo

30-second video with English subtitles: `<insert video link>`
(script: VIDEO_SCRIPT.md, subtitles: VIDEO_SUBTITLES.srt in the repository)

## 3. Final project link

https://github.com/planktonada-bot/ISS-FireGuard

## 4. Project details

**What it does**
- **PSI Research Explorer** — ranks 26 NASA PSI combustion investigations by relevance to fire safety; full-text search ("flame spread at high oxygen"), side-by-side comparison, and a chart of every PSI test point (O₂ vs. pressure) against exploration habitat atmospheres (ISS, Gateway, Artemis lander, Mars) that highlights data gaps — conditions future missions will fly but no experiment has tested yet.
- **Flammability Lab** — estimates flame spread rate for a material, O₂, pressure, air flow and gravity (µg, Moon, Mars, Earth). Anchored on Saffire-II measurements (2.1–2.6 mm/s for SIBAL at 20 cm/s, ~22 % O₂) and BASS findings (flames self-extinguish below a minimum flow). Shows the nearest real PSI test points for every prediction.
- **Mission Monitor** — a live demo of 8 ISS modules with 10 sensors each (smoke, CO, PM2.5, temperature, O₂, CO₂, HCN, rack power, pressure, ventilation). A random incident develops precursors; sensor fusion separates real fire from single-sensor faults; danger %, fire probability and fire involvement % are shown live. Fire spreads to neighbouring modules through open hatches within 1–3 minutes unless the crew acts. Normal and special (ICCD 350–470 nm) camera views show hot flames and invisible "cool flames" as seen in NASA FLEX.
- **SI Crew Advisor** — prevention steps during precursors, firefighting steps during fire, post-fire atmosphere checks; every step cites its source (PSI investigation or NASA lesson learned). Crew actions (ventilation off, power off, PFE, hatch close) change the simulation using PSI physics (e.g., ventilation shutdown starves the flame, as BASS showed).
- **Lessons & Spinoffs** — Apollo 1, Apollo 13, Mir 1997 and NASA fire-safety spinoffs, linked to the data.

**How it works / tools**: HTML + JavaScript front end, Chart.js; Node.js/Express server; data pipeline scripts that download PSI investigation metadata and data tables from psi.nasa.gov and build a JSON data set and a text knowledge base; BM25 retrieval over the knowledge base; optional Claude API for natural-language answers (offline rule engine works without any key). EN/RU interface.

**Goals**: give crews and mission designers a fast, explainable way to use decades of NASA microgravity combustion research — and show where new experiments are needed for future habitats.

**Limitations (honest)**: the monitor uses simulated sensor data; the spread estimator is an engineering estimate, not a certified model; decision support only — crew and Mission Control procedures take precedence.

## 5. Use of AI and NASA data

**NASA data**
- NASA Physical Sciences Informatics (psi.nasa.gov, CC0): metadata and data tables of 26 combustion investigations, downloaded through the PSI repository API — the core of the explorer, the spread model and the advisor's evidence.
- NASA Technical Reports Server documents and the Spacecraft Fire Safety researcher guides provided in the challenge resources (knowledge base for retrieval).
- NASA Glenn Research Center combustion pages, NASA Safety & Mission Assurance lessons learned (Apollo 1, Apollo 13, Mir 1997), NASA Spinoff articles.
- NASA Image and Video Library images (public domain) for backgrounds.

**AI**
- In the product: the "SI Crew Advisor" uses retrieval over the NASA knowledge base (BM25) plus a rule engine built from PSI findings; when an Anthropic API key is configured, Claude writes answers grounded only in the retrieved NASA passages and cites them. Without a key the app works fully offline.
- In development: we used Claude (Anthropic) as a coding assistant to write and debug code, parse PSI data files and draft documentation. All data, physics anchors and citations were checked against the NASA sources.
- Camera footage of the cabin is a computer-generated simulation, labelled as such in the app.

## 6. References

- NASA PSI repository — https://psi.nasa.gov (investigations PSI-98, 99, 100, 26, 25, 69, 68, 39, 142, 101, 102, 115, 47, 20, 21, 22, 23, 10, 159, 62, 60, 106, 107, 108, 117, 181)
- NASA Space Apps 2026 challenge "Flame in Freefall" — https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/
- NASA Technical Reports Server: 20070018916, 20030002834, 20030005480 — https://ntrs.nasa.gov
- NASA Glenn Research Center — Combustion science
- NASA lessons learned: Apollo 1 fire, Apollo 13, Mir 1997 fire
- NASA Image and Video Library — https://images.nasa.gov
- Chart.js 4.4.1 (MIT), Express (MIT), dotenv (BSD-2), @anthropic-ai/sdk (MIT), Node.js
- Fonts: Orbitron, Inter, JetBrains Mono (Google Fonts, OFL)
- Claude (Anthropic) — AI coding assistant and optional runtime model
