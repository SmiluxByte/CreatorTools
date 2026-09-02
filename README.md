# Patchglass

Patchglass is a local Roblox update-icon maker. Drop in a game icon, choose an hourglass and countdown text, then export one 512 × 512 PNG or the complete seven-stage sequence.

Repository: [github.com/SmiluxByte/IconMaker](https://github.com/SmiluxByte/IconMaker)

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
- No account, backend or image upload required

## Run it

You need Node.js 20 or newer.

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
