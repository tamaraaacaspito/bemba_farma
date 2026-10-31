package com.mypk2.drogueria_eka_app.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * SessionManager — Gestión centralizada de la sesión del usuario
 * Usa EncryptedSharedPreferences para almacenar el JWT de forma segura
 */
class SessionManager(context: Context) {

    companion object {
        private const val PREFS_NAME = "drogueria_eka_auth_prefs"
        private const val KEY_TOKEN = "JWT_TOKEN"
        private const val KEY_USER_ID = "USER_ID"
        private const val KEY_USER_NAME = "USER_NAME"
        private const val KEY_USER_EMAIL = "USER_EMAIL"
        private const val KEY_USER_ROL = "USER_ROL"

        @Volatile
        private var INSTANCE: SessionManager? = null

        fun getInstance(context: Context): SessionManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: SessionManager(context.applicationContext).also { INSTANCE = it }
            }
        }
    }

    private val prefs: SharedPreferences

    init {
        val masterKey = MasterKey.Builder(context.applicationContext)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        prefs = EncryptedSharedPreferences.create(
            context.applicationContext,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    /**
     * Guarda toda la información de sesión tras un login exitoso
     */
    fun saveSession(token: String, userId: Int, userName: String, email: String, rol: String) {
        prefs.edit()
            .putString(KEY_TOKEN, token)
            .putInt(KEY_USER_ID, userId)
            .putString(KEY_USER_NAME, userName)
            .putString(KEY_USER_EMAIL, email)
            .putString(KEY_USER_ROL, rol)
            .apply()
    }

    /**
     * Obtiene el JWT para inyectarlo en los requests HTTP
     */
    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)

    fun getUserId(): Int = prefs.getInt(KEY_USER_ID, -1)
    fun getUserName(): String = prefs.getString(KEY_USER_NAME, "") ?: ""
    fun getUserEmail(): String = prefs.getString(KEY_USER_EMAIL, "") ?: ""
    fun getUserRole(): String = prefs.getString(KEY_USER_ROL, "") ?: ""

    /**
     * Verifica si hay una sesión activa (token guardado)
     */
    fun isLoggedIn(): Boolean = !getToken().isNullOrEmpty()

    /**
     * Limpia toda la sesión — usado al hacer logout
     */
    fun clearSession() {
        prefs.edit().clear().apply()
    }
}
