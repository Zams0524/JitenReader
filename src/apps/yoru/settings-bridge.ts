import { getProfileKey } from '@shared/configuration/profile.constants';
import { getActiveProfileId } from '@shared/configuration/profiles-state';
import { readStorage } from '@shared/extension/read-storage';
import { writeStorage } from '@shared/extension/write-storage';
import { ConfigurationUpdatedCommand } from '@shared/messages/broadcast/configuration-updated.command';

type ReadRequest = { id: string; keys: string[] };
type WriteRequest = { id: string; entries: Record<string, unknown> };

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
      const values: Record<string, string | null> = {};

      for (const key of keys) {
        try {
          values[key] = (await readStorage(getProfileKey(profileId, key))) ?? null;
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
          await writeStorage(
            getProfileKey(profileId, key),
            typeof value === 'object'
              ? JSON.stringify(value)
              : String(value as string | number | boolean),
          );
        }

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
