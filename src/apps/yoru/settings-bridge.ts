import { getProfileKey } from '@shared/configuration/profile.constants';
import { getActiveProfileId } from '@shared/configuration/profiles-state';
import { getParsingPaused } from '@shared/extension/get-parsing-paused';
import { readStorage } from '@shared/extension/read-storage';
import { setParsingPaused } from '@shared/extension/set-parsing-paused';
import { writeStorage } from '@shared/extension/write-storage';
import { ConfigurationUpdatedCommand } from '@shared/messages/broadcast/configuration-updated.command';

type ReadRequest = { id: string; keys: string[] };
type WriteRequest = { id: string; entries: Record<string, unknown> };

/**
 * The one key that is not a per-profile setting, and so must not be profile-prefixed here.
 *
 * `parsingPaused` is the extension's own pause switch: `getParsingPaused` reads it bare from
 * `chrome.storage.local` and the widget's pause button writes it there, so routing it through
 * `getProfileKey` would store a key nobody reads. It also has to stay a real boolean. The generic
 * write path below stringifies values, and the extension only tests `if (paused)`, so the string
 * "false" would read as paused and parsing would never come back on.
 *
 * Reading it back as a boolean is also how the Yoru page tells this build apart from an older one:
 * an extension without this bridge answers with a string or null, and the app then knows it cannot
 * ask the extension to stop and says so, instead of offering a switch that would do nothing.
 */
const PARSING_PAUSED_KEY = 'parsingPaused';

/**
 * Lets the Yoru Reader page (main world) read and write this extension's settings for the active
 * profile, since the content script and the page live in separate JavaScript worlds in Electron.
 *
 *   page → content script: 'yoru-settings-read'  { id, keys }     → 'yoru-settings-data'    { id, values }
 *   page → content script: 'yoru-settings-write' { id, entries }  → 'yoru-settings-written' { id, ok }
 */
export const installYoruSettingsBridge = (): void => {
  document.addEventListener('yoru-settings-read', (event) => {
    const { id, keys } = (event as CustomEvent<ReadRequest>).detail;

    void (async (): Promise<void> => {
      const profileId = await getActiveProfileId();
      const values: Record<string, string | boolean | null> = {};

      for (const key of keys) {
        try {
          values[key] =
            key === PARSING_PAUSED_KEY
              ? await getParsingPaused()
              : ((await readStorage(getProfileKey(profileId, key))) ?? null);
        } catch {
          values[key] = null;
        }
      }

      document.dispatchEvent(new CustomEvent('yoru-settings-data', { detail: { id, values } }));
    })();
  });

  document.addEventListener('yoru-settings-write', (event) => {
    const { id, entries } = (event as CustomEvent<WriteRequest>).detail;

    void (async (): Promise<void> => {
      try {
        const profileId = await getActiveProfileId();

        for (const [key, value] of Object.entries(entries)) {
          if (key === PARSING_PAUSED_KEY) {
            // A real boolean, where the extension and its widget already look for it. The page may
            // send either, since it stores its own copy of every setting as a string.
            await setParsingPaused(value === true || value === 'true');

            continue;
          }

          await writeStorage(
            getProfileKey(profileId, key),
            typeof value === 'object'
              ? JSON.stringify(value)
              : String(value as string | number | boolean),
          );
        }

        /*
          No ParsingPausedCommand here on purpose. A broadcast sent from a content script cannot
          reach the parser running beside it: `runtime.sendMessage` never delivers back to the
          sender's own context, and `BroadcastCommand.send` reaches other tabs through
          `chrome.tabs.query`, which is not part of the content-script API. So the pause takes
          effect on the next parse, and the page has to reload its reader view to see the change.
          Making it immediate needs a BackgroundCommand: the background worker does have
          `chrome.tabs`, so it can write the flag and then broadcast to every tab, this one too.
        */
        new ConfigurationUpdatedCommand().send();
        document.dispatchEvent(
          new CustomEvent('yoru-settings-written', { detail: { id, ok: true } }),
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[YoruSettingsBridge] Write failed:', error);
        document.dispatchEvent(
          new CustomEvent('yoru-settings-written', { detail: { id, ok: false } }),
        );
      }
    })();
  });
};
