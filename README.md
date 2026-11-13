# PoE Leveling Plan

Desktop app that turns a Path of Exile 1 **Path of Building** import code into an act-by-act leveling checklist: which skill gems to take as quest rewards or buy from vendors, and what socket colors/links your build is aiming for.

## Download

Prebuilt **Linux** and **Windows** installers are on the [Releases](https://github.com/djchsu11/poe-leveling-plan/releases) page.

## Usage

1. In Path of Building, copy the **import/export** code for your PoE 1 build.
2. Paste it into the app and click **Generate plan**.
3. Use the act checklist while leveling; socket targets show the PoB link setups and the earliest act when that full link’s gems are obtainable.

The last import code is stored locally so it reloads on next launch.

## Develop

Requirements:

- Node.js 18+
- Rust (for Tauri)
- Linux: `webkit2gtk4.1-devel` and `librsvg2-devel` (see [Tauri prerequisites](https://tauri.app/start/prerequisites/))

```bash
npm install
npm run tauri:dev   # desktop
npm run dev         # browser UI only
npm test
npm run tauri:build # local release build
```

## Data

Gem quest/vendor sources ship as `src/data/gems.json`, pulled from [poewiki](https://www.poewiki.net) cargo tables.

```bash
node scripts/fetch-gems.mjs
```

## Release

Pushing a `v*` tag runs GitHub Actions and publishes Linux + Windows artifacts to the release.
