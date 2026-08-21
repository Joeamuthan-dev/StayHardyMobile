import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Release signing reuses the EXISTING StayHardy keystore. Signing with any other
// key breaks the in-place upgrade for every current Play Store user.
// Point `storeFile` at ../../frontend/android/stayhardy-release.keystore (alias
// "stayhardy"); credentials stay in this untracked file, never in the repo.
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("keystore.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.stayhardy.app"
    compileSdk = 36
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        // flutter_local_notifications uses java.time, which does not exist on
        // API 24. Desugaring backports it — required, not optional, at minSdk 24.
        isCoreLibraryDesugaringEnabled = true
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        // Must match the live Play listing exactly — this ships as an in-place
        // upgrade over the Capacitor build, not as a new app.
        applicationId = "com.stayhardy.app"
        // minSdk must never rise above 24: raising it silently drops existing
        // devices from receiving the update.
        minSdk = 24
        targetSdk = 36
        // Capacitor build shipped versionCode 25 (1.1.14, the storage bridge),
        // so the Flutter build starts at 26. Sourced from pubspec.yaml.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            if (keystorePropertiesFile.exists()) {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = keystoreProperties["storeFile"]?.let { rootProject.file(it) }
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (keystorePropertiesFile.exists()) {
                signingConfigs.getByName("release")
            } else {
                // Local convenience only. A release build signed with the debug
                // key must never reach Play — it cannot upgrade existing installs.
                signingConfigs.getByName("debug")
            }
        }
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}

flutter {
    source = "../.."
}
