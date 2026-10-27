# Heart Collection – Google Play Premium integration plan

Status: PREPARATION ONLY. No real billing, verified entitlements, or payment processing is active.

## Subscription offer (agreed)
- Monthly: EUR 3.95, auto-renewing monthly
- Quarterly: EUR 8.50, auto-renewing every three months
- Same benefits for both plans: 92 locked cards (18 free), eight languages, future editions, monthly additions.
- A subscriber may share access with one partner **only while both are in the same authenticated couple room**. Do not grant a permanent entitlement to the invited user.

## Google Play Console setup (pending)
Create an auto-renewing subscription product, e.g. `heart_collection_premium`, with two base plans:
- `monthly` (P1M), target EUR 3.95
- `quarterly` (P3M), target EUR 8.50

These IDs are proposals and must be aligned with actual Play Console configuration. Google Play may apply regional pricing/taxes. Configure Play Billing in the actual Android app; a GitHub Pages web page cannot directly invoke native Play Billing without a supported Android integration.

## Required secure flow
1. Authenticate user with a durable identity (anonymous Firebase auth alone is not sufficient for cross-device restoration).
2. Launch Google Play Billing from the Android host and receive a purchase token.
3. Send purchase token + product/base-plan metadata to a secured Firebase Cloud Function.
4. Server verifies purchase status and ownership via Google Play Developer API using server-side credentials. Never put service-account credentials in the website.
5. Server writes authoritative entitlement for the authenticated account. Handle renewals, cancellations, expiry, refunds and revocations using Real-time Developer Notifications and reconciliation.
6. Client listens to authoritative entitlement. Never trust a local `premium=true` flag or browser storage.
7. For shared rooms, enforce a maximum of two authenticated participants and a server-verified active subscriber. Restrict room membership and card reads with security rules/backend checks.
8. Move locked questions out of public `cards.js` into access-controlled storage or a backend; currently all premium questions are downloadable in public source, so frontend locks are only a preview.
9. Test with Play license testers, including restore purchases, renewal, cancellation, refund, offline, language change, and two-partner room join/leave.

## Safety and release
- No purchase buttons should claim to charge or unlock until native billing + backend verification work.
- Keep production root untouched until end-to-end testing succeeds.
- `premium-test/` shares the GitHub Pages origin and Firebase project with production. Isolate test storage and room collections before testing entitlements or real purchases.
