package com.mypk2.drogueria_eka_app.data.remote

import com.mypk2.drogueria_eka_app.data.local.SessionManager
import okhttp3.Interceptor
import okhttp3.Response

/**
 * AuthInterceptor — Inyecta el JWT en cada request HTTP automáticamente
 * Lee el token de SessionManager y lo agrega como header Authorization: Bearer
 * Excluye la ruta de login para no enviar un token vacío
 */
class AuthInterceptor(private val sessionManager: SessionManager) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        // No inyectar token en la ruta de login
        if (originalRequest.url.encodedPath.contains("auth/login")) {
            return chain.proceed(originalRequest)
        }

        val token = sessionManager.getToken()

        // Si no hay token, continuar sin header de autorización
        if (token.isNullOrEmpty()) {
            return chain.proceed(originalRequest)
        }

        val authenticatedRequest = originalRequest.newBuilder()
            .header("Authorization", "Bearer $token")
            .build()

        return chain.proceed(authenticatedRequest)
    }
}
