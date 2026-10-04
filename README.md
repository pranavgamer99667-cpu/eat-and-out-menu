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

## Run locally

The site uses ES modules and an import map, so it must be served over HTTP
(opening `index.html` directly from disk will not work).

```bash
cd site
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Static files — no build step. On GitHub Pages, publish from the branch root.
The entry point is `index.html` at the repository root.

## Editing

- Menu items, prices and copy: `index.html`
- Colours, buttons, layout: `css/styles.css`
- 3D viewers and the sparkle engine: `js/main.js`
- To swap a dish's model, change the `data-model` attribute on its `.stage` element.

## Tech

- [three.js](https://threejs.org/) r160 (bundled in `vendor/`) — GLTF loading,
  PBR environment lighting, orbit controls
- Vanilla CSS/JS, no framework, no build step

## Credits & licence

3D dish models from the **Kenney Food Kit** — released under **CC0 1.0**
(public domain, commercial use permitted, no attribution required).
three.js is MIT licensed.
