# EAT AND OUT — Interactive 3D Menu

A premium, single-page restaurant menu where each signature dish is a live 3D
model you can drag to rotate. Dark obsidian theme, gold and silver accents,
rounded buttons, and a sparkle effect that releases as you scroll.

## Dishes

| Dish | Source |
|------|--------|
| Signature Rice Bowl | generated at runtime (`src/dishes.js`) |
| Wood-Fired Pizza | generated at runtime (`src/dishes.js`) |
| Wok Chowmein | generated at runtime (`src/dishes.js`) |

The dish models are **built procedurally in code** — no external model files.
Each dish is real geometry (bowls thrown on a lathe, a pizza base and crust,
individual rice grains, tangled noodle strands) with PBR materials whose
albedo / normal / roughness maps are generated from seamless value-noise
fields at load time. This keeps the site tiny and immune to missing-asset
breakage.

## Structure

```
index.html      the page (loads css + js/app.js)
css/styles.css  all styling
js/app.js       built bundle (three.js + app code) — the only script the page loads
src/main.js     editable app source (viewers, sparkle engine)
src/dishes.js   editable dish geometry + material source
src/vendor/     three.js modules used to build the bundle
models/         optional exported .glb versions of the three dishes
```

The page loads a **single classic script** (`js/app.js`), not ES modules — so it
works on any static host, including hosts that serve `.js` with a generic
content type (a common cause of "blank 3D" on S3 and similar).

## Deploy

Static files, no server-side code, no build step to deploy.

- **Any static host** (S3, Netlify, GitHub Pages, nginx): upload the files
  keeping the folder structure. The entry point is `index.html`.
- **Zero-dependency option:** `eat-and-out-standalone.html` is a single file with
  the script and styling inlined — it works even opened directly from disk,
  with no other files and no server.

## Editing

- Menu items, prices and copy: `index.html`
- Colours, buttons, layout: `css/styles.css`
- 3D viewers and the sparkle engine: `src/main.js`
- Dish shapes, ingredients, textures: `src/dishes.js`
- To swap a dish, change the `data-dish` attribute on its `.stage` element
  (`rice` / `pizza` / `chowmein`) and add a builder in `src/dishes.js`.

### Rebuild the bundle after editing `src/`

```bash
npx esbuild src/main.js --bundle --format=iife --minify --target=es2019 \
  --outfile=js/app.js \
  --alias:three=./src/vendor/three.module.js \
  --alias:three/addons/controls/OrbitControls.js=./src/vendor/jsm/controls/OrbitControls.js
```

## Tech

- [three.js](https://threejs.org/) r160 — geometry, PBR materials, procedural
  canvas textures, shadow mapping, orbit controls
- Vanilla CSS/JS, no framework

## Credits & licence

Dish models and textures are original procedural code in this repository.
three.js is MIT licensed.
