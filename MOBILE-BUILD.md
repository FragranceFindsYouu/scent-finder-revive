# Building the Native iOS & Android Apps

This project ships as a web app on Lovable AND as native iOS / Android apps
via [Capacitor](https://capacitorjs.com). The native shell loads your
**published Lovable site** inside a WebView, so all server functions
(Stripe checkout, admin tools, AI chat) keep working with no changes.

## 0. Before you start

- [ ] Site is **published** in Lovable (so `server.url` in
      `capacitor.config.ts` resolves). Custom domain optional but nicer.
- [ ] **Apple Developer Program** account ($99/yr) for App Store
- [ ] **Google Play Console** account ($25 one-time) for Play Store
- [ ] A **Mac with Xcode 15+** for iOS builds (Android can be built on any OS)
- [ ] **Android Studio** (latest) and **Node 20+** installed

If you want to connect a custom domain, open `capacitor.config.ts` and
replace the `server.url` value, then re-run `npx cap sync`.

## 1. Export the project from Lovable

In Lovable: **Share → Export to GitHub**, then on your computer:

```bash
git clone <your-repo-url> fragrance-finds-you
cd fragrance-finds-you
npm install        # or: bun install
```

## 2. Build the web bundle and add the native platforms

```bash
npm run build              # produces /dist
npx cap add ios            # creates /ios — Mac only
npx cap add android        # creates /android
npx cap sync               # copies web build + native plugins
```

Re-run `npx cap sync` any time you pull new code.

## 3. App icons & splash

We ship a 1024×1024 icon (`public/icon-1024.png`) and a splash
(`public/splash-2732.png`). To generate all the per-platform sizes:

```bash
npm install --save-dev @capacitor/assets
npx capacitor-assets generate \
  --icon-source public/icon-1024.png \
  --splash-source public/splash-2732.png
```

## 4. Build & test on a device

### Android (Android Studio)

```bash
npx cap open android
```

1. Wait for Gradle sync.
2. Plug in a phone with USB debugging on, hit ▶ Run.
3. To ship: **Build → Generate Signed App Bundle (AAB)**. Upload the
   `.aab` in Play Console → Internal Testing.

### iOS (Xcode, Mac only)

```bash
npx cap open ios
```

1. In Xcode → **Signing & Capabilities** → pick your Apple Developer team.
2. Plug in an iPhone, pick it as the run target, hit ▶ Run.
3. To ship: **Product → Archive → Distribute App → App Store Connect**.

## 5. Store submission checklist

Both stores need:

- Privacy policy URL (`/` page or dedicated route)
- Support email
- App description, keywords, category (Shopping)
- At least 3 screenshots per device size
- Age rating questionnaire
- **Data-collection disclosure** — list: email (account creation), shipping
  address (orders), payment info (handled by Stripe, not stored)
- **Physical goods declaration** — this is critical. Fragrance decants are
  physical goods, so Stripe / web checkout is explicitly allowed by Apple
  and Google. You do NOT need Apple/Google in-app purchase (no 30% cut).
  When asked "does your app sell digital goods or services?" → **No**.

Apple review: 1–3 days typical. Google: a few hours to a few days.

## 6. Updating the app after launch

Most updates need NO app rebuild: change the web app on Lovable, click
**Update** in the publish dialog, and the native app picks it up the next
time a user opens it (it loads `server.url`).

You ONLY need to rebuild + resubmit when:

- you change `capacitor.config.ts` (e.g. switch to a custom domain)
- you add native plugins (push notifications, camera, biometrics, etc.)
- you change the app icon / splash / display name
- a store policy requires it (rare)

## 7. Common gotchas

- **Blank screen on launch** — `server.url` points at an unpublished or
  wrong URL. Re-publish in Lovable and re-run `npx cap sync`.
- **"App-bound domain" error on iOS** — `limitsNavigationsToAppBoundDomains`
  is already `false` in `capacitor.config.ts`, but if you re-enable it,
  add your domain to `Info.plist` under `WKAppBoundDomains`.
- **Stripe checkout looks weird on iPhone** — fixed by the
  `viewport-fit=cover` and `safe-area-inset` CSS already in this repo.
- **Push notifications** — not included in this build. Ping me to add
  `@capacitor/push-notifications` + Firebase Cloud Messaging when ready.
