import { Registry } from '../../integration/registry';
import { TtsuParser } from './ttsu.parser';

/**
 * Parser for the Yoru Reader desktop app, whose reader uses ttsu's markup
 * (`.book-content-container`, re-keyed by React on every chapter/page change).
 *
 * Differences from TtsuParser: falls back to the observed element itself when the container is
 * not nested inside it, replaces the previous page observer instead of stacking observers, and
 * parses the container immediately instead of waiting for the first id change.
 */
export class YoruParser extends TtsuParser {
  protected override visibleObserverOnEnter(elements: HTMLElement[]): void {
    const [element] = elements;
    const container = element.querySelector('.book-content-container') ?? element;

    this._pageObserver?.disconnect();
    this._pageObserver = new MutationObserver(() => {
      Registry.sentenceManager.reset();

      this.parseNode(container);
    });

    this._pageObserver.observe(container, {
      attributes: true,
      attributeFilter: ['id'],
    });

    Registry.sentenceManager.reset();
    this.parseNode(container);
  }
}
