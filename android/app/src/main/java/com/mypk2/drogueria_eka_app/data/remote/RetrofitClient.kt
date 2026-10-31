package com.mypk2.drogueria_eka_app.data.remote

import android.content.Context
import com.mypk2.drogueria_eka_app.BuildConfig
import com.mypk2.drogueria_eka_app.data.local.SessionManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * RetrofitClient — Cliente HTTP singleton con AuthInterceptor
 * Debe inicializarse con init(context) antes de usar apiService
 */
object RetrofitClient {

    private var _apiService: ApiService? = null

    val apiService: ApiService
        get() = _apiService ?: throw IllegalStateException(
            "RetrofitClient no inicializado. Llama RetrofitClient.init(context) en LoginActivity o MainActivity."
        )

    /**
     * Inicializa Retrofit con el contexto de la aplicación.
     * Esto permite que AuthInterceptor lea el JWT de EncryptedSharedPreferences.
     * Es seguro llamarlo múltiples veces — solo se inicializa una vez.
     */
    fun init(context: Context) {
        if (_apiService != null) return

        val sessionManager = SessionManager.getInstance(context.applicationContext)

        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(sessionManager))
            .addInterceptor(loggingInterceptor)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .build()

        _apiService = Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
