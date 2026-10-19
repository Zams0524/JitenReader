/** Whether a URL belongs to the Yoru Reader desktop app (file:// pages or its local server). */
export const isYoruReaderUrl = (url: string): boolean =>
  url.startsWith('file://') || url.includes('localhost') || url.includes('127.0.0.1');

export const isYoruReaderPage = (): boolean => isYoruReaderUrl(window.location.href);
