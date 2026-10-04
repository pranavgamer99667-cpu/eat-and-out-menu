# EAT AND OUT — Interactive 3D Menu

A premium, single-page restaurant menu where each signature dish is a live 3D
model you can drag to rotate. Dark obsidian theme, gold and silver accents,
rounded buttons, and a sparkle effect that releases as you scroll.

## Dishes

| Dish | Model |
|------|-------|
| Signature Rice Bowl | `models/bowl-cereal.glb` |
| Wood-Fired Pizza | `models/pizza.glb` |
| Wok Chowmein | `models/chinese.glb` |

## Structure

```
index.html      the page (loads css + js/app.js)
css/styles.css  all styling
js/app.js       built bundle (three.js + app code) — the only script the page loads
models/         3 dish models + their shared texture
src/            editable source: src/main.js and src/vendor/ (three.js modules)
```

The page loads a **single classic script** (`js/app.js`), not ES modules — so it
works on any static host, including hosts that serve `.js` with a generic
content type (a common cause of "blank 3D" on S3 and similar).

## Deploy

Static files, no server-side code, no build step to deploy.

- **Any static host** (S3, Netlify, GitHub Pages, nginx): upload the files
  keeping the folder structure. The entry point is `index.html`.
- **S3 note:** if the page loads but the dishes do not appear, the `.js` / `.glb`
  files were likely uploaded with the wrong content type, or the `models/` and
  `js/` folders were not uploaded. `js/app.js` should be `text/javascript`.
- **Zero-dependency option:** `eat-and-out-standalone.html` is a single file with
  the script and all 3D models embedded — it works even opened directly from
  disk, with no other files and no server.

## Editing

- Menu items, prices and copy: `index.html`
- Colours, buttons, layout: `css/styles.css`
- Behaviour (3D viewers, sparkle engine): `src/main.js`
- To swap a dish's model, change the `data-model` attribute on its `.stage`
  element, then rebuild the bundle (below).

### Rebuild the bundle after editing `src/main.js`

```bash
npx esbuild src/main.js --bundle --format=iife --minify --target=es2019 \
  --outfile=js/app.js \
  --alias:three=./src/vendor/three.module.js \
  --alias:three/addons/loaders/GLTFLoader.js=./src/vendor/jsm/loaders/GLTFLoader.js \
  --alias:three/addons/controls/OrbitControls.js=./src/vendor/jsm/controls/OrbitControls.js \
  --alias:three/addons/environments/RoomEnvironment.js=./src/vendor/jsm/environments/RoomEnvironment.js
```

## Tech

- [three.js](https://threejs.org/) r160 — GLTF loading, PBR environment
  lighting, orbit controls
- Vanilla CSS/JS, no framework

## Credits & licence

3D dish models from the **Kenney Food Kit** — released under **CC0 1.0**
(public domain, commercial use permitted, no attribution required).
three.js is MIT licensed.
