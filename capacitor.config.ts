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
    // Custom domain — portable across hosts. If you ever move hosting,
    // just repoint DNS at the new provider; the app keeps working.
    url: "https://fragrancefindsyou.com",
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
