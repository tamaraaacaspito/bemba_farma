package com.mypk2.drogueria_eka_app.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.mypk2.drogueria_eka_app.data.local.VentasDao
import com.mypk2.drogueria_eka_app.data.model.DetallePedidoWebRequest
import com.mypk2.drogueria_eka_app.data.model.PedidoWebRequest
import com.mypk2.drogueria_eka_app.data.remote.ApiService
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@HiltWorker
class SyncPedidosWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val ventasDao: VentasDao,
    private val apiService: ApiService
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val pendingPedidos = ventasDao.getPendingPedidos()
            if (pendingPedidos.isEmpty()) {
                return@withContext Result.success()
            }

            val gson = Gson()
            val type = object : TypeToken<List<DetallePedidoWebRequest>>() {}.type

            var allSuccess = true

            for (pedido in pendingPedidos) {
                try {
                    val detalles: List<DetallePedidoWebRequest> = gson.fromJson(pedido.productosJson, type)
                    
                    val request = PedidoWebRequest(
                        cliente_web_id = pedido.clienteId,
                        nombre_cliente = pedido.nombreCliente,
                        email = pedido.email,
                        telefono = pedido.telefono,
                        entidad = pedido.entidad,
                        ruc_dni = pedido.rucDni,
                        mensaje_requerimiento = pedido.mensajeRequerimiento,
                        detalles = detalles
                    )

                    val response = apiService.enviarPedidoWeb(request)
                    if (response.isSuccessful) {
                        ventasDao.updatePedidoStatus(pedido.id, "DONE")
                    } else {
                        allSuccess = false
                    }
                } catch (e: Exception) {
                    allSuccess = false
                }
            }

            if (allSuccess) Result.success() else Result.retry()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
