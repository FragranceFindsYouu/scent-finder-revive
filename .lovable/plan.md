## What you're asking for

A real **iOS app on the App Store** and **Android app on the Play Store** — not just a website you open on your phone. Lovable can prepare the project for this, but the final build, signing, and store submission must happen on your own computer (or a cloud build service). Lovable's sandbox cannot produce signed `.ipa` / `.aab` files for the stores.

## What this will cost you (outside Lovable)

- **Apple Developer Program**: $99 USD / year (required for App Store).
- **Google Play Developer**: $25 USD one-time (required for Play Store).
- **A Mac** (or a Mac-in-the-cloud service like MacStadium / Codemagic / EAS Build) — Apple requires Xcode to build iOS apps. Android can be built on any OS.
- **Review time**: Apple typically 1–3 days, Google a few hours to a few days. They can reject; expect 1–2 revision cycles.

## How we'll do it — Capacitor

Capacitor wraps your existing TanStack Start site as a native shell. The same React code runs inside a native WebView, plus we get access to native APIs (push notifications, camera, etc. if you want them later). This is the standard, supported native path for Lovable projects.

### Stage 1 — Prep the project in Lovable (I do this)

1. Install Capacitor: `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`.
2. Add `capacitor.config.ts` with your app id (e.g. `com.fragrancefindsyou.app`), app name, and `webDir: "dist"`.
3. Make sure the build output is a fully static client bundle the WebView can load. Your app currently uses TanStack Start with server functions (Stripe checkout, admin tools, AI chat). Those **must keep running on your published Lovable URL** — the native app will call them over HTTPS. We'll point Capacitor's `server.url` at your published `*.lovable.app` (or custom domain) so the app loads the live site inside the shell, which keeps server functions and Stripe working unchanged.
4. Add app icons and splash screens (I'll generate these — you'll get a 1024×1024 icon and matching splash).
5. Add native-safe tweaks: safe-area padding for the iPhone notch, disable the cart drawer's body-scroll lock quirks on iOS, hide the admin chat widget on the published native build (admin login still works in a browser).
6. **Payments note (important):** Apple/Google require their in-app purchase system (30% fee) for **digital goods**. Selling **physical fragrance decants** is explicitly allowed to use Stripe / external payments — no 30% cut. We'll declare the app as a physical-goods commerce app on submission. Stripe Embedded Checkout works inside the WebView.

### Stage 2 — You take it to your computer

1. Export the project to GitHub from Lovable (Share → Export to GitHub).
2. `git clone` it on your computer. Run `npm install`, `npm run build`, `npx cap add ios`, `npx cap add android`, `npx cap sync`.
3. **Android**: open `android/` in Android Studio → Build → Generate Signed App Bundle. Upload the `.aab` to Play Console.
4. **iOS**: open `ios/App/App.xcworkspace` in Xcode on a Mac → set signing team → Product → Archive → upload to App Store Connect.
5. Fill out store listings (screenshots, description, privacy policy URL, age rating, data-collection disclosures).

I'll give you a `MOBILE-BUILD.md` in the repo with the exact commands and a checklist.

### Stage 3 — Submit and iterate

- Submit to TestFlight (iOS) and Play Internal Testing first. Install on your phone via the testing track to verify checkout, login, and the cart all work in the native shell.
- Promote to production after smoke testing.

## What I will NOT do in this plan

- I won't change your existing web checkout, payments, admin, or AI chat. The native app reuses all of it.
- I won't add Firebase push notifications, native camera, or biometric login in this round — say the word if you want any of that.
- I won't try to build the `.ipa`/`.aab` inside Lovable — the sandbox has no Xcode/Android SDK and no code-signing keys, and even if it did, the signing certs must come from your Apple/Google accounts.

## Technical details

```text
package.json           ← + @capacitor/{core,cli,ios,android}
capacitor.config.ts    ← new: appId, appName, webDir: "dist", server.url
public/icon-1024.png   ← new (generated)
public/splash-2732.png ← new (generated)
src/styles.css         ← + safe-area padding utilities
src/components/        ← small native-safe guards (hide admin AI bubble on native)
MOBILE-BUILD.md        ← new: step-by-step build/submit instructions
```

Capacitor mode: **remote `server.url`** pointing at your published Lovable site. Trade-off: the app needs internet to load (no offline). Going offline-capable would require a bigger rewrite to bundle the whole site statically and rework server-fn calls — happy to plan that separately if you want it.

## Before I implement, two things to confirm

1. **App identifier and display name** — I'll default to `com.fragrancefindsyou.app` and display name "Fragrance Finds You". Tell me if you want different ones (the id is permanent once submitted).
2. **Publish first** — you need to click Publish in Lovable and (optionally) connect a custom domain before we wire up Capacitor's `server.url`. The native app points at that URL. If you haven't published yet, do that first and tell me the URL.
