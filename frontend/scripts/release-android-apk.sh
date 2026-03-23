#!/usr/bin/env bash
# Build web assets, sync Capacitor, then produce a signed release APK.
# Requires: JDK 17+ (keytool + ./gradlew on PATH or JAVA_HOME set).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID="$ROOT/android"
cd "$ROOT"

if ! command -v java >/dev/null 2>&1; then
  echo "Error: java not found. Install JDK 17+ (e.g. brew install openjdk@17) and ensure JAVA_HOME is set."
  exit 1
fi

echo "==> Web build + Capacitor sync (android)"
npm run build
npx cap sync android

cd "$ANDROID"

if [[ ! -f keystore.properties ]]; then
  if [[ -f stayhardy-release.keystore ]]; then
    echo "Error: stayhardy-release.keystore exists but keystore.properties is missing."
    echo "Copy keystore.properties.example to keystore.properties and fill passwords."
    exit 1
  fi
  echo "==> Creating release keystore (first run only; files are gitignored)"
  PASS="$(openssl rand -hex 16)"
  keytool -genkeypair -v \
    -keystore stayhardy-release.keystore \
    -alias stayhardy \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$PASS" \
    -keypass "$PASS" \
    -dname "CN=StayHardy, OU=Mobile, O=StayHardy, L=, ST=, C=US"
  {
    echo "storeFile=stayhardy-release.keystore"
    echo "storePassword=$PASS"
    echo "keyPassword=$PASS"
    echo "keyAlias=stayhardy"
  } > keystore.properties
  echo ""
  echo "IMPORTANT: Back up android/stayhardy-release.keystore and android/keystore.properties."
  echo "You need them for all future Play Store updates."
  echo ""
fi

echo "==> Gradle assembleRelease"
./gradlew assembleRelease

APK="$ANDROID/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "Signed release APK:"
echo "  $APK"
ls -la "$APK"
