# Love & Laughs – multilingual integration gate

The complete German master deck is in `love-laughs-cards.js` (110 unique cards, six categories).

**Required languages:** `de`, `en`, `es`, `fr`, `zh`, `ur`, `hi`, `ar`.

All 110 cards now contain non-empty text in all eight languages. Automated structural checks passed; native-speaker linguistic review and in-app display testing remain before the deck is enabled in the shared game selector. Switching the language must switch the **question text**, not only the menu. The existing Deep Questions game and production deployment must remain untouched.

## Acceptance checks
- 110 distinct IDs; category sizes 20/20/20/20/20/10.
- 880 non-empty card texts across eight languages, with appropriate punctuation and right-to-left rendering for Arabic and Urdu.
- Deck switch preserves language selection and separates favorites and card progress.
- Couple mode synchronizes deck identity as well as card ID (IDs overlap between decks).
- All 18 free cards are available; 92 premium cards remain locked until verified entitlements exist.
- Android build bundles both decks locally and works without relying on the GitHub Pages test URL.
- No real subscription checkout until Google Play Billing and server-side verification are implemented.

**Current status:** 880/880 card-language fields populated and structural validation passed (110 unique IDs; 20/20/20/20/20/10). Integration, native-speaker review, RTL device testing, and pair-mode deck synchronization remain pending. The multilingual deck is not yet exposed in the installed Android app.
