// Reklam (Google AdMob) – bara i den inbyggda Android-appen. På webben och iOS händer ingenting.
//
// Utan VITE_ADMOB_BANNER_ID visas Googles testannons. Byt till ditt riktiga annonsenhets-ID
// (och app-ID:t i AndroidManifest.xml) innan appen publiceras, se docs/GOOGLE_PLAY.md.
import { nativePlatform } from "./native";

const TEST_BANNER_ID = "ca-app-pub-3940256099942544/6300978111";

export async function initAds(): Promise<void> {
  if (nativePlatform() !== "android") return;
  try {
    const { AdMob, AdmobConsentStatus, BannerAdPosition, BannerAdSize } = await import("@capacitor-community/admob");

    // GDPR/UMP: i EU måste användaren få välja innan annonser begärs.
    const consent = await AdMob.requestConsentInfo();
    if (consent.status === AdmobConsentStatus.REQUIRED && consent.isConsentFormAvailable) {
      await AdMob.showConsentForm();
    }

    await AdMob.initialize();
    await AdMob.showBanner({
      adId: import.meta.env.VITE_ADMOB_BANNER_ID || TEST_BANNER_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
    });
  } catch {
    // Reklam är ett tillägg – appen fungerar likadant utan den.
  }
}
