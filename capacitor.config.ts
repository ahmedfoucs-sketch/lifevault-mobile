import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lifevault.app",
  appName: "LifeVault AI",
  webDir: "dist",
  // WebView origin becomes https://localhost (the default in Capacitor 6).
  // The backend CORS must allow https://localhost (and http://localhost).
  server: { androidScheme: "https" },
};

export default config;
