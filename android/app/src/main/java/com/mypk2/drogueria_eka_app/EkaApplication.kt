package com.mypk2.drogueria_eka_app

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class EkaApplication : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    override fun onCreate() {
        super.onCreate()
        setupWorkManager()
    }

    private fun setupWorkManager() {
        val constraints = androidx.work.Constraints.Builder()
            .setRequiredNetworkType(androidx.work.NetworkType.CONNECTED)
            .build()

        val workRequest = androidx.work.PeriodicWorkRequestBuilder<com.mypk2.drogueria_eka_app.worker.CaducidadWorker>(
            24, java.util.concurrent.TimeUnit.HOURS
        ).setConstraints(constraints).build()

        androidx.work.WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "SyncCaducidadWorker",
            androidx.work.ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )

        // Sincronización de pedidos en background (cada 15 min cuando hay internet)
        val syncPedidosRequest = androidx.work.PeriodicWorkRequestBuilder<com.mypk2.drogueria_eka_app.worker.SyncPedidosWorker>(
            15, java.util.concurrent.TimeUnit.MINUTES
        ).setConstraints(constraints).build()

        androidx.work.WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "SyncPedidosWorker",
            androidx.work.ExistingPeriodicWorkPolicy.KEEP,
            syncPedidosRequest
        )
    }
}
