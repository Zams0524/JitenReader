# Yoru Reader build of Jiten Reader

This branch (`yoru`) is the source of the reader extension bundled with the
[Yoru Reader](https://github.com/Zams0524/Yoru-Reader) desktop app (`backend/reader-ext`).
It is based on Jiten Reader 1.3.2 (commit `8f4862c`) and keeps the upstream MIT license.

Changes for Yoru Reader:

- Parses through the desktop app's local server (`http://127.0.0.1:23280`) instead of the Jiten
  API, falling back to the background worker when it is not reachable (`src/apps/yoru/local-parse.ts`).
- `YoruParser` for the app's ttsu-style reader, started directly on `file://` and local pages.
- Settings bridge so the app can read/write the extension settings (`src/apps/yoru/settings-bridge.ts`).
  `parsingPaused` is the one key it does not profile-prefix, and the one it keeps as a real
  boolean: that is where the extension and its widget already look, and reading it back as a
  boolean is how the app tells a build with this bridge from an older one. Pausing this way takes
  effect on the next parse, not at once — a broadcast from a content script cannot reach the parser
  beside it. Doing it immediately would need a `BackgroundCommand`; left undone on purpose, since
  the app may have to reload its reader view when the mode changes anyway.
- `file://` support in URL matching, manifest permissions and manual parsing.
- Foreground commands without a sender tab are delivered to every tab; parser tolerates tokens
  without vocabulary.
- Branding: extension name, settings page title/theme, links to the Yoru Reader issue tracker.

Build: `npm ci && node scripts/build.mjs chrome` → `jiten.reader/`.
Yoru Reader's release workflow builds the `yoru-*` tag pinned there and copies the output to
`backend/reader-ext/`.

`npm run typecheck` on this branch reports 22 errors, in `apps/ajb.ts`,
`apps/integration/keybind-manager.ts`, `apps/popup/actions/mining-actions.ts`,
`apps/text-highlighter/text-highlighter.ts`, `background-worker/background-worker.ts` and
`background-worker/parser/parser.ts`. They are older than any change made here: the same 22 are
there on `a3be86d`. Whether they arrived with upstream 1.3.2 or with the Yoru import has not been
checked, so do not repeat either as fact. `npm run build` and `eslint src` are clean,
which is what the release workflow uses. Measure against that 22 rather than expecting zero.
