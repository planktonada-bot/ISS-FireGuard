# FireGuard SI — 30-second demo video script

Challenge: **Flame in Freefall** · NASA Space Apps 2026

## Требования из брифинга и как сценарий их закрывает

| Требование (брифинг Space Apps) | Как выполнено |
|---|---|
| Видео ~30 секунд | 6 кадров, 0:00–0:30, ~71 слово озвучки (спокойный темп) |
| Английские субтитры | Готовый файл `VIDEO_SUBTITLES.srt` — вшить или загрузить вместе с видео |
| Всё на английском | Озвучка, титры и интерфейс (переключить сайт на **EN**) |
| Демо понятное и визуальное | 80% кадров — живой экран приложения |
| Обязательно NASA data | Кадр 3: «26 NASA PSI studies», логотип/ссылка psi.nasa.gov |
| AI — открыто объяснить использование | Кадр 5: AI-советник + цитаты источников |
| Под 18 лет: изменённый голос, без лица | В сценарии нет лица — только экран и голос за кадром (если до 18 — включите эффект изменения голоса) |

Критерии жюри: **Impact** (кадр 1–2: реальная опасность, «Мир» 1997) · **Creativity** (кадр 4: распространение огня между модулями, камеры) · **Validity** (кадр 3, 5: реальные данные PSI, ссылки на эксперименты) · **Relevance** (insights dashboard = ровно то, что просит Flame in Freefall) · **Presentation** (одна история: проблема → решение → финальная фраза).

Структура взята из второй презентации («Win the Final 3 Minutes»): **Human Hook → Space Tech Magic (демо) → чёткий финал**.

---

## Сценарий

| Время | Кадр (что на экране) | Озвучка = субтитры (EN) | Перевод |
|---|---|---|---|
| **0:00–0:04** | Чёрный экран → архивное фото NASA «Мир» / МКС. Титр: **MIR · 1997** | 1997: a fire on Mir filled the station with smoke in minutes. | 1997 год: пожар на «Мире» за минуты заполнил станцию дымом. |
| **0:04–0:07** | Вкладка CCTV: камера переключается с обычной картинки на сферическое пламя | In microgravity, fire behaves differently. | В невесомости огонь ведёт себя иначе. |
| **0:07–0:13** | Вкладка **PSI Research Explorer**: список исследований, график «тестовые точки vs атмосферы». Титр: **26 NASA PSI studies · 1,883 test points** | FireGuard SI turns 26 NASA PSI combustion studies into a live safety dashboard. | FireGuard SI превращает 26 исследований горения NASA PSI в живую панель безопасности. |
| **0:13–0:20** | **Mission Monitor**: графики растут, вкладка становится оранжевой → красной, донат «Danger 94%», на карте МКС огонь переходит в соседний модуль | It predicts fire risk in every ISS module — and how fast fire spreads next door. | Она прогнозирует риск пожара в каждом модуле МКС — и как быстро огонь перейдёт в соседний. |
| **0:20–0:26** | Крупно **SI Crew Advisor**: курсор отмечает «Close hatches», «Discharge PFE» → кольцо охвата уменьшается; видны ссылки PSI-26, Mir 1997 | Its AI advisor tells the crew what to do, citing the NASA experiment behind each step. | ИИ-советник говорит экипажу, что делать, и ссылается на эксперимент NASA для каждого шага. |
| **0:26–0:30** | Логотип FIREGUARD SI на фоне МКС и Земли. Мелко: *Data: NASA PSI (psi.nasa.gov)* | FireGuard SI: NASA fire science, one click from the crew. | FireGuard SI: наука NASA о горении — в одном клике от экипажа. |

Итог озвучки (для диктора, единым текстом):

> 1997: a fire on Mir filled the station with smoke in minutes. In microgravity, fire behaves differently. FireGuard SI turns 26 NASA PSI combustion studies into a live safety dashboard. It predicts fire risk in every ISS module — and how fast fire spreads next door. Its AI advisor tells the crew what to do, citing the NASA experiment behind each step. FireGuard SI: NASA fire science, one click from the crew.

---

## Как снять экран (чтобы всё успело произойти)

1. `npm start` → открыть `http://localhost:3000`, язык **EN**, окно браузера во весь экран (1920×1080).
2. Записывать экран (OBS / Xbox Game Bar `Win+Alt+R`). Снять 2–3 минуты, потом вырезать нужные куски — за 30 секунд вживую всё не случится.
3. Порядок съёмки:
   - вкладка **PSI Research Explorer** — медленно прокрутить список и график (кадр 3);
   - **Mission Monitor** → скорость **×15** → **Trigger incident** → снимать, пока вкладка не станет оранжевой, потом красной, и огонь не перейдёт в соседний модуль (кадры 2 и 4);
   - в советнике отметить шаги «Close hatches», «Discharge PFE» — видно, как падает охват пожаром (кадр 5).
4. Фото «Мира»/МКС — NASA Image and Video Library (images.nasa.gov, public domain); укажите в References.
5. Монтаж: CapCut / DaVinci Resolve / Clipchamp. Субтитры — импортировать `VIDEO_SUBTITLES.srt`, крупный белый шрифт с тёмной подложкой.
6. Музыка — только без авторских прав (YouTube Audio Library и т.п.), тихо под голосом.
7. Проверка перед загрузкой: длина ≤ 0:30, субтитры видны на телефоне, ссылка на видео открывается без входа в аккаунт.
