import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor config — native iOS / Android shell for Fragrance Finds You.
 *
 * Strategy: load the LIVE published site inside the native WebView so all
 * server functions (Stripe checkout, admin tools, AI chat) keep working
 * unchanged. Update `server.url` to your custom domain after you connect one.
 *
 * After editing this file run:  npx cap sync
 */
const config: CapacitorConfig = {
  appId: "com.fragrancefindsyou.app",
  appName: "Fragrance Finds You",
  webDir: "dist",
  server: {
    // Stable Lovable URL for this project — does not change on rename.
    // Replace with your custom domain (e.g. https://fragrancefindsyou.com)
    // after you connect one in Project Settings → Domains.
    url: "https://project--8aa4e164-e50e-4bbd-89e8-bcd3fc010160.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
