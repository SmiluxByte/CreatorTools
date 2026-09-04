# Patchglass

Patchglass is a local browser toolkit for Roblox and game-asset images. The Hourglass tool creates countdown update graphics; Batch Resize and Batch Stroke handle multiple images at once.

Repository: [github.com/SmiluxByte/IconMaker](https://github.com/SmiluxByte/IconMaker)

## Use it online

Open [Patchglass in your browser](https://smiluxbyte.github.io/IconMaker/). No Node.js or installation is needed for the online version.

The site is deployed from `main` with GitHub Pages. Developers can still run the project locally using the instructions below.

## Features

- Local PNG, JPG and JPEG upload with drag and drop
- 512 × 512 preview and PNG export
- Hourglass picker with solid and outline variants
- Adjustable hourglass size, position and opacity
- Adjustable text size, position, opacity, outline size and outline opacity
- Optional automatic hourglass selection for countdown stages
- Optional per-stage overrides when automation is enabled
- Local browser presets
- Individual sequence downloads and a seven-image ZIP
- Batch resize with fixed and custom dimensions
- Contain, cover and stretch modes for resizing
- Alpha-based batch strokes with adjustable color, size and opacity
- Optional resize-before-stroke for icons such as 1512 × 1512 → 256 × 256
- Batch previews and ZIP export for every image tool
- RBX Source Extractor for local `.rbxlx` and `.rbxmx` place/model files
- No account, backend or image upload required

## Run it

You need Node.js 22 or newer for local development.

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite. npm works too:

```bash
npm install
npm run dev
```

For a production build:

```bash
pnpm build
pnpm preview
```

The `dist` folder is static and can be deployed to any static host.

## Hourglass artwork

The current artwork lives in `public/assets/hourglasses`:

```text
hourglass-low.png
hourglass-low-outline.png
hourglass-empty.png
hourglass-empty-outline.png
hourglass-almost-filled.png
hourglass-almost-filled-outline.png
```

To add another variant, put the transparent PNG in that folder and add one registry entry in `src/config/assets.ts`. Missing files are shown as unavailable in the picker instead of breaking the editor.

## Countdown automation

When enabled, the default mapping is:

| Stages | Icon state |
| --- | --- |
| 24H / 12H | Almost Filled |
| 6H / 3H | Low |
| 1H / 30M / NOW! | Empty |

The solid/outline style can be switched globally. Any stage can still be changed manually without changing the normal icon picker behavior.

## RBX Source Extractor

Save a Roblox place or model as XML (`.rbxlx` or `.rbxmx`), open **RBX Source Extractor**, and drop the file into the page. The tool keeps the Roblox instance folders and lists every `Script`, `LocalScript`, and `ModuleScript` with its full path.

You can copy a single script, copy an LLM-ready bundle, download a text bundle, or download a ZIP containing the source files, hierarchy, and manifest. Parsing happens in the browser only; the code is never executed or uploaded. Binary `.rbxl` and `.rbxm` files are not supported by the static browser build.

## Privacy and scope

Images are decoded, processed and exported in the browser. They are not sent to a server or stored in an account. The app does not include Roblox login, publishing, analytics or cloud storage.

Roblox game-ID thumbnail import is intentionally not part of this static release. A reliable version needs a small CORS-capable proxy or serverless adapter.

## Checks

```bash
pnpm test
pnpm build
```

## License

The source code is licensed under the MIT License. See [LICENSE](LICENSE).

The MIT license applies to the source code. Artwork added to `public/assets` can have separate copyright or licensing terms.
