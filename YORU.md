# Yoru Reader build of Jiten Reader

This branch (`yoru`) is the source of the reader extension bundled with the
[Yoru Reader](https://github.com/Zams0524/Yoru-Reader) desktop app (`backend/reader-ext`).
It is based on Jiten Reader 1.3.2 (commit `8f4862c`) and keeps the upstream MIT license.

Changes for Yoru Reader:

- Parses through the desktop app's local server (`http://127.0.0.1:23280`) instead of the Jiten
  API, falling back to the background worker when it is not reachable (`src/apps/yoru/local-parse.ts`).
- `YoruParser` for the app's ttsu-style reader, started directly on `file://` and local pages.
- Settings bridge so the app can read/write the extension settings (`src/apps/yoru/settings-bridge.ts`).
- `file://` support in URL matching, manifest permissions and manual parsing.
- Foreground commands without a sender tab are delivered to every tab; parser tolerates tokens
  without vocabulary.
- Branding: extension name, settings page title/theme, links to the Yoru Reader issue tracker.

Build: `npm ci && node scripts/build.mjs chrome` → `jiten.reader/`.
Yoru Reader's release workflow builds the `yoru-*` tag pinned there and copies the output to
`backend/reader-ext/`.
