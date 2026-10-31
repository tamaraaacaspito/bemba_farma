package com.mypk2.drogueria_eka_app.di

import android.content.Context
import com.mypk2.drogueria_eka_app.data.remote.ApiService
import com.mypk2.drogueria_eka_app.data.remote.RetrofitClient
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideApiService(@ApplicationContext context: Context): ApiService {
        RetrofitClient.init(context)
        return RetrofitClient.apiService
    }

    @Provides
    @Singleton
    fun provideConnectivityObserver(@ApplicationContext context: Context): com.mypk2.drogueria_eka_app.utils.ConnectivityObserver {
        return com.mypk2.drogueria_eka_app.utils.NetworkConnectivityObserver(context)
    }

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): com.mypk2.drogueria_eka_app.data.local.AppDatabase {
        return com.mypk2.drogueria_eka_app.data.local.AppDatabase.getDatabase(context)
    }

    @Provides
    @Singleton
    fun provideVentasDao(database: com.mypk2.drogueria_eka_app.data.local.AppDatabase): com.mypk2.drogueria_eka_app.data.local.VentasDao {
        return database.ventasDao()
    }

    @Provides
    @Singleton
    fun provideInventarioRepository(apiService: ApiService): com.mypk2.drogueria_eka_app.data.repository.InventarioRepository {
        return com.mypk2.drogueria_eka_app.data.repository.InventarioRepository(apiService)
    }
}
