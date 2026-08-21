package com.stayhardy.app

import android.content.Context
import io.flutter.plugin.common.MethodChannel

/**
 * Reads the state left behind by the Capacitor build.
 *
 * The final Capacitor release (1.1.14 / versionCode 25) copied a handful of
 * WebView-only values — habit ordering, theme, language, and the Supabase
 * session — into Capacitor Preferences. That store is a plain SharedPreferences
 * file named `CapacitorStorage` where every key is written with a `_cap_`
 * prefix, so this reads it directly rather than depending on Capacitor.
 *
 * Without this, an in-place upgrade signs every existing user out: Capacitor's
 * secure-storage plugin encrypts with its own Android Keystore alias, which
 * flutter_secure_storage cannot read.
 *
 * The session values are deleted as soon as Dart has recovered the session, so
 * refresh tokens sit in unencrypted app-private storage for one launch and no
 * longer. `android:allowBackup` is false in both builds, so they can never leave
 * the device via Auto Backup.
 */
object LegacyPrefsBridge {
    const val CHANNEL = "com.stayhardy.app/legacy_prefs"

    private const val PREFS_NAME = "CapacitorStorage"
    private const val CAP_PREFIX = "_cap_"

    fun handle(context: Context, method: String, args: Any?, result: MethodChannel.Result) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        when (method) {
            // Every bridged key, with the `_cap_` prefix stripped.
            "readAll" -> {
                val out = HashMap<String, String>()
                for ((key, value) in prefs.all) {
                    if (key.startsWith(CAP_PREFIX) && value is String) {
                        out[key.removePrefix(CAP_PREFIX)] = value
                    }
                }
                result.success(out)
            }

            "read" -> {
                val key = (args as? Map<*, *>)?.get("key") as? String
                if (key == null) {
                    result.error("bad_args", "key is required", null)
                    return
                }
                result.success(prefs.getString(CAP_PREFIX + key, null))
            }

            // Called once the session has been handed to flutter_secure_storage.
            "remove" -> {
                @Suppress("UNCHECKED_CAST")
                val keys = (args as? Map<*, *>)?.get("keys") as? List<String>
                if (keys == null) {
                    result.error("bad_args", "keys is required", null)
                    return
                }
                val editor = prefs.edit()
                for (key in keys) editor.remove(CAP_PREFIX + key)
                // commit rather than apply: the caller is about to treat these
                // secrets as gone, so the write must actually be durable before
                // we report success.
                result.success(editor.commit())
            }

            else -> result.notImplemented()
        }
    }
}
