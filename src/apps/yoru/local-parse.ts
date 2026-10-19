import {
  JitenCard,
  JitenCardState,
  JitenParseResult,
  JitenRawVocabulary,
  JitenToken,
} from '@shared/jiten/types';
import { Registry } from '../integration/registry';

/** Local parsing server started by the Yoru Reader desktop app (Electron main process). */
export const YORU_LOCAL_API = 'http://127.0.0.1:23280';

const CARD_STATE_MAP: Record<number, JitenCardState> = {
  0: JitenCardState.NEW,
  1: JitenCardState.YOUNG,
  2: JitenCardState.MATURE,
  3: JitenCardState.BLACKLISTED,
  4: JitenCardState.DUE,
  5: JitenCardState.MASTERED,
  6: JitenCardState.REDUNDANT,
  7: JitenCardState.SUSPENDED,
};

const cardKey = (wordId: number, readingIndex?: number): string => `${wordId}:${readingIndex ?? 0}`;

const toCard = (vocab: JitenRawVocabulary): JitenCard => {
  const cardState = (vocab.knownState ?? [])
    .map((state) => CARD_STATE_MAP[state])
    .filter((state): state is JitenCardState => state !== undefined);

  return {
    wordId: vocab.wordId,
    readingIndex: vocab.readingIndex ?? 0,
    spelling: vocab.spelling,
    reading: vocab.reading,
    frequencyRank: vocab.frequencyRank ?? 999999,
    partsOfSpeech: Array.isArray(vocab.partsOfSpeech) ? vocab.partsOfSpeech : [vocab.partsOfSpeech],
    meanings: (vocab.meaningsChunks ?? [[]]).map((glosses, i) => ({
      glosses,
      partsOfSpeech: vocab.meaningsPartOfSpeech?.[i] ?? [],
    })),
    cardState: cardState.length ? cardState : [JitenCardState.MATURE],
    pitchAccents: vocab.pitchAccents ?? [],
    wordWithReading: null,
    deckIds: vocab.studyDeckIds ?? [],
  };
};

/**
 * Parses the given sequences with the Yoru Reader desktop app's local server instead of the
 * Jiten API, and resolves them directly in the content script. Rejects when the server is not
 * reachable (e.g. in a normal browser), so the caller can fall back to the background worker.
 */
export const parseWithYoru = async (
  sequenceData: [sequenceId: number, text: string][],
  afterSend?: () => void,
): Promise<void> => {
  const response = await fetch(`${YORU_LOCAL_API}/api/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: sequenceData.map(([, text]) => text) }),
  });
  const data = (await response.json()) as Partial<JitenParseResult>;

  const cards = new Map<string, JitenCard>();

  for (const vocab of data.vocabulary ?? []) {
    cards.set(cardKey(vocab.wordId, vocab.readingIndex), toCard(vocab));
  }

  const parsedTokens = (data.tokens ?? []).map((group) =>
    group.map(
      (token): JitenToken => ({
        ...token,
        card:
          cards.get(cardKey(token.wordId, token.readingIndex)) ?? (null as unknown as JitenCard),
        pitchClass: '',
        rubies: [],
      }),
    ),
  );

  sequenceData.forEach(([sequenceId], i) => {
    Registry.sequenceManager.resolveSequence(sequenceId, parsedTokens[i] ?? []);
  });

  afterSend?.();
};
