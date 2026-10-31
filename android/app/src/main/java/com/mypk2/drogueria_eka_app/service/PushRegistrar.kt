package com.mypk2.drogueria_eka_app.service

import android.content.Context
import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging
import com.mypk2.drogueria_eka_app.data.local.SessionManager
import com.mypk2.drogueria_eka_app.data.model.DispositivoRequest
import com.mypk2.drogueria_eka_app.data.remote.RetrofitClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * PushRegistrar — registra el token FCM del dispositivo en el backend,
 * que a su vez lo da de alta en Azure Notification Hubs (tag 'almacen').
 *
 * Es tolerante a fallos: si Firebase aún no está configurado
 * (falta google-services.json) o no hay sesión, simplemente no registra
 * y no interrumpe el flujo de la app.
 */
object PushRegistrar {

    private const val TAG = "PushRegistrar"
    private val scope = CoroutineScope(Dispatchers.IO)

    /** Obtiene el token FCM actual y lo registra en el backend. */
    fun registrar(context: Context) {
        val session = SessionManager.getInstance(context.applicationContext)
        if (!session.isLoggedIn()) {
            Log.d(TAG, "Sin sesión activa; se pospone el registro de push.")
            return
        }
        try {
            FirebaseMessaging.getInstance().token
                .addOnSuccessListener { token -> enviarToken(context, token) }
                .addOnFailureListener { e -> Log.w(TAG, "No se pudo obtener token FCM: ${e.message}") }
        } catch (e: Exception) {
            // Firebase no inicializado (falta google-services.json). No crashea.
            Log.w(TAG, "Firebase no disponible aún: ${e.message}")
        }
    }

    /** Envía un token concreto al backend (usado también desde onNewToken). */
    fun enviarToken(context: Context, token: String?) {
        if (token.isNullOrBlank()) return
        RetrofitClient.init(context.applicationContext)
        scope.launch {
            try {
                val res = RetrofitClient.apiService.registrarDispositivo(
                    DispositivoRequest(token = token, tags = listOf("almacen"))
                )
                if (res.isSuccessful) {
                    Log.d(TAG, "Token FCM registrado en el backend.")
                } else {
                    Log.w(TAG, "Registro de token falló: HTTP ${res.code()}")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error registrando token: ${e.message}")
            }
        }
    }
}
