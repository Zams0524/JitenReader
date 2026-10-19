import { isYoruReaderUrl } from '../yoru/is-yoru-reader-page';
import { filterHostMeta, resolveMatchingHosts } from './get-host-meta';

export const isDisabled = async (host: string): Promise<boolean> => {
  const enabledHosts = await resolveMatchingHosts(host);
  const meta = filterHostMeta(enabledHosts, ({ host }) => host !== '<all_urls>');

  if (!meta) {
    return false;
  }

  if (meta.disabled) {
    return true;
  }

  // Allow manual parsing in Yoru Reader (file:// / local server) as a fallback
  if (isYoruReaderUrl(host)) {
    return false;
  }

  return meta.auto;
};
