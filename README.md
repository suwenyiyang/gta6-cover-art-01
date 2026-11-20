# Vice City Cover Lab

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/suwenyiyang/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/suwenyiyang/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Bounty page: https://make.fun/bounty/gta6-cover-art-01

Vice City Cover Lab is a single-page, offline cover-art maker in the spirit of a GTA 6 poster. Load one of the bundled sample photos or your own image, arrange it across a one-, two-, three-, or four-panel layout, tune a cinematic colour grade, and letter the cover with a large title and subtitle. The finished artwork exports as a PNG at a social-ready size.

Everything runs in the browser with plain HTML, CSS, ES modules, and the Canvas 2D API. There is no build step, account, watermark, analytics, or network request. Uploaded photos are read with `FileReader` and stay on the machine.

## Run it

Use Node 22 or newer from this repository:

```sh
node serve.ts
```

Then open `http://localhost:8080`. To use another port:

```sh
node serve.ts --port 8080
```

The app is fully static under `app/`; any equivalent local static server works too.

## Make a cover

1. Click **Boulevard** or **Pier**, or choose a photo from your machine. With **All panels** enabled, one click fills the layout; disable it to load different photos panel by panel.
2. Pick a panel layout, a divider style for the split layout, and a colour grade.
3. Select a panel and adjust **Zoom**, drag directly on the preview to pan, or use **Flip**. **Apply all** copies the active crop across panels.
4. Edit the title and subtitle, then tune title size and vertical position.
5. Choose **Square 1080 × 1080**, **Portrait 1080 × 1350**, or **Wide 1920 × 1080**, and click **Export PNG**. The shortcut is `Ctrl+E` / `Cmd+E`.

The four canvas grades are Vice City Sunset, Neon Nights, Palm Gold, and Noir. The sunset recipe also draws an original setting-sun disc and palm silhouettes using canvas paths. Panel dividers, the thin white frame, grain, and all other cover decoration are drawn by the app; no Rockstar logo, wordmark, artwork, or font is used.

## Screenshot scenes

`app/src/shots.js` supports fixed scenes used for the repository screenshots:

- `?shot=cover&photo=boulevard&caption=LEONIDA%20NIGHTS&layout=3&grade=sunset` renders a full-bleed poster.
- `?shot=editor&photo=pier&caption=MIDNIGHT%20RUN` renders the editor with a photo loaded.
- Optional `photo2`, `split`, `subtitle`, and `panel` parameters refine those scenes.

The scene sets `window.__shotReady = true` after two animation frames, once fonts, photos, and the canvas are painted. `shots.json` records the three screenshots and their URLs.

## Build the submission folder

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` next to itself into the output directory and writes `dossier.json` with the vendored `vendor/makefun-app.ts` builder. It uses the bounty's exact caps: 160 KiB of dossier text, up to four screenshots at 256 KiB each, 993 entries and 48 MiB under `app/`, and 1,000-byte paths.

## Fonts

Anton (main title) and Pacifico (subtitle) are bundled locally under `app/fonts/` with their SIL Open Font License files. They are loaded through `@font-face` and by the canvas renderer before the first poster is drawn; no network font is referenced. The canvas renderer also applies a horizontal condensed transform to the Anton title so the lettering keeps its poster proportions.

The two sample photos in `app/samples/` were made for make.fun with an image model and are free to use in this entry. All remaining design and code were created for this project.

## Files

```text
app/index.html       editor shell
app/style.css        responsive studio UI
app/src/state.js     layouts, grades, sizes, defaults
app/src/render.js    canvas poster renderer and decorative art
app/src/main.js      photo loading, panels, controls, PNG export
app/src/shots.js     deterministic screenshot scenes
app/samples/         bundled sample photos
app/fonts/           locally bundled Anton and Pacifico fonts with OFL licenses
main.ts              submission copy + dossier writer
serve.ts             local static server
shots.json           screenshot scene manifest
```
