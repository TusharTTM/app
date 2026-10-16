# Android APK build (Capacitor)

This project is a **web app** (React + Vite). To get an `.apk`, the built web
assets are wrapped in an Android WebView using [Capacitor](https://capacitorjs.com/)
and compiled with Gradle. The result is a real, installable Android app that
shows the same UI as the browser version.

## The APK

| | |
|---|---|
| File | `NutriCommunity-debug.apk` (in the project root, one level above `client/`) |
| Also at | `client/android/app/build/outputs/apk/debug/app-debug.apk` |
| Package | `com.nutricommunity.app` |
| App name | NutriCommunity |
| Version | 1.0 (versionCode 1) |
| minSdk / targetSdk | 22 / 34 |
| Size | ~3.7 MB |
| Signing | Debug key (auto-generated). Fine for testing/sideloading, **not** for the Play Store. |

### Install on a phone

1. Copy `NutriCommunity-debug.apk` to the phone (USB, email, Drive, ...).
2. Open it. Android will ask to allow installing from this source ("Install
   unknown apps") — allow it for that app (e.g. Files/Chrome).
3. Tap **Install**, then open **NutriCommunity**.

Or, with the phone connected over USB and USB debugging on:

```powershell
C:\Users\Tushar\android-tools\sdk\platform-tools\adb.exe install -r NutriCommunity-debug.apk
```

## ⚠️ The app needs the API server (read this)

The APK only contains the **frontend**. Login, food logs, feed, etc. all talk to
the separate Express + MongoDB server in `server/`. That server is **not**
included in the APK and is **not deployed anywhere yet**, so right now the app
opens and shows the UI but requests will fail until you point it at a running
server.

The API URL is currently a **placeholder** in `client/.env.production`:

```
VITE_API_URL=http://10.0.2.2:5000/api
```

`10.0.2.2` is the special address the **Android emulator** uses to reach the PC
running the server. For a **real phone** you need your PC's LAN IP, and for a
**deployed** server you need its public URL. Pick one and rebuild (see below).

### Uses of each value

| Where the server runs | `VITE_API_URL` |
|---|---|
| Android emulator, server on the same PC | `http://10.0.2.2:5000/api` |
| Real phone, server on the same Wi-Fi | `http://<PC-LAN-IP>:5000/api` (find it with `ipconfig`) |
| Deployed (Render/Railway) | `https://your-api-domain.com/api` |

To run the server for local testing:

```powershell
cd server
npm install
copy .env.example .env      # then edit .env (MongoDB URI, JWT_SECRET, AUTO_VERIFY_EMAIL=true)
npm run seed
npm run dev                 # API on http://localhost:5000
```

### Server-side bits you must also do

Because the app is served from `https://localhost` inside the WebView (a
different origin than your API), the server must:

- **Allow the app's origin in CORS with credentials.** Add `https://localhost`
  (and `capacitor://localhost`) to the allowed origins / `CLIENT_URL`, and make
  sure `credentials: true` is set. Cookies must be `SameSite=None; Secure` when
  the API is HTTPS.
- Keep `AUTO_VERIFY_EMAIL=true` for testing, or set up SMTP.

`capacitor.config.json` already enables `cleartext`/mixed content so `http://`
APIs work during local testing.

## Rebuild the APK

Change `VITE_API_URL` in `client/.env.production`, then run the helper script:

```powershell
powershell -ExecutionPolicy Bypass -File client\build-apk.ps1
```

It runs `vite build` → `cap sync android` → `gradlew assembleDebug` and copies
the fresh APK next to the project. A rebuild takes about 1 minute now that the
toolchain is installed. The script tells the build where the JDK and Android SDK
live; if you move those, update the two paths at the top of `build-apk.ps1`.

## What was added

| Path | Purpose |
|---|---|
| `client/capacitor.config.json` | Capacitor app id/name and `webDir: dist` |
| `client/.env.production` | The `VITE_API_URL` baked into the APK (edit this) |
| `client/android/` | Generated native Android project (Gradle) |
| `client/build-apk.ps1` | One-command rebuild script |
| `client/android/local.properties` | Points Gradle at the local SDK (machine-specific) |

No application source code was changed.

## The toolchain (installed at `C:\Users\Tushar\android-tools`)

| Component | Version |
|---|---|
| Temurin JDK | 17.0.20.1 |
| Android cmdline-tools | 12.0 |
| Android platforms | 34, 35 |
| Android build-tools | 34.0.0, 35.0.0 |
| Gradle | 8.2.1 (via the project's wrapper) |
| Android Gradle Plugin | 8.2.1 |
| Capacitor | 6.2.2 |

Everything used is free and open source. The debug APK is signed with Android's
built-in debug key, so **no keystore, password, account, or payment is needed**.

## Not done (on purpose)

- **Release/Play-Store build.** Would need a signing keystore you own.
- **App icon / splash screen.** Currently Capacitor's default; can be branded
  later with `@capacitor/assets`.
- **Testing on a device/emulator.** The build is verified (valid APK, correct
  manifest, web assets bundled) but not run on a device here.
