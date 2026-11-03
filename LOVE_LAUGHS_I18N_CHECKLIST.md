# Love & Laughs – multilingual integration gate

The complete German master deck is in `love-laughs-cards.js` (110 unique cards, six categories).

**Required languages:** `de`, `en`, `es`, `fr`, `zh`, `ur`, `hi`, `ar`.

Do not add the deck to the shared game selector until every card has a reviewed, non-empty translation in all eight languages. Switching the language must switch the **question text**, not only the menu. The existing Deep Questions game and production deployment must remain untouched.

## Acceptance checks
- 110 distinct IDs; category sizes 20/20/20/20/20/10.
- 880 non-empty card texts across eight languages, with appropriate punctuation and right-to-left rendering for Arabic and Urdu.
- Deck switch preserves language selection and separates favorites and card progress.
- Couple mode synchronizes deck identity as well as card ID (IDs overlap between decks).
- All 18 free cards are available; 92 premium cards remain locked until verified entitlements exist.
- Android build bundles both decks locally and works without relying on the GitHub Pages test URL.
- No real subscription checkout until Google Play Billing and server-side verification are implemented.

**Current status:** German master imported; seven translations per card still pending. This is intentionally **not** exposed as a completed multilingual deck.
