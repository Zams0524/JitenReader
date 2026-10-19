import { PredefinedHostMeta } from '@shared/host-meta/types';

export const YORU_PARSER_META: PredefinedHostMeta = {
  id: 'yoru-parser',
  name: 'Yoru Parser',
  description: 'Native parser for Yoru Reader',
  host: '<all_urls>',
  auto: true,
  optOut: true,
  allFrames: false,
  custom: 'YoruParser',
};
