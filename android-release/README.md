# The Heart Collection — Android internal-test preparation

## Confirmed app identity
- App name: The Heart Collection
- Android application ID: `com.miaslifestyle.heartcollection`
- Development branch: `premium-development`
- Production GitHub Pages files are not modified.

## What is prepared
- Capacitor 8 project manifest in `package.json`
- Android app configuration in `capacitor.config.json`
- Script to copy the current Deep Questions app into the native web assets directory
- Git ignore rules for generated builds, keys and local dependencies

## Build on a computer
Prerequisites: Node.js 22 or newer, Android Studio, Android SDK, Java toolchain.

1. Clone the repository and check out branch `premium-development`.
2. Run `cd android-release`.
3. Run `npm install`.
4. Run `npm run android:add` (first build only).
5. Run `npm run android:open`.
6. In Android Studio, confirm the latest Play-required target SDK, configure icons and app version, and test on an Android device.
7. Generate a signed Android App Bundle (.aab) through Android Studio and upload to the **Internal testing** track in Play Console.
8. For subsequent source changes run `npm run android:sync` before building.

## Not ready yet
- This starter packages the Deep Questions web app only. Love & Laughs is currently a separate prototype and still needs integration.
- The native Android project, signing keys, and signed .aab have not yet been generated.
- Firebase anonymous sign-in, room invitations, WebView and deep links require device testing.
- Premium buttons are previews; no Play Billing integration or verified entitlement backend is available. Do not offer paid subscriptions yet.
- Premium question text must be protected by server-side entitlement checks before paid release.
- Play Console store listing, data safety form, privacy policy, content rating and policy review remain.
- Confirm the final app ID matches the Play Console application before first upload. After uploading, it cannot be changed.

Never commit keystores, credentials, service-account keys or other secrets.
