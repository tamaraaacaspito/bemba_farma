package com.mypk2.drogueria_eka_app.data.repository

import com.mypk2.drogueria_eka_app.data.local.VentasDao
import com.mypk2.drogueria_eka_app.data.model.ClienteWeb
import com.mypk2.drogueria_eka_app.data.model.PedidoOffline
import com.mypk2.drogueria_eka_app.data.model.PedidoWebRequest
import com.mypk2.drogueria_eka_app.data.remote.ApiService
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class VentasRepository @Inject constructor(
    private val apiService: ApiService,
    private val ventasDao: VentasDao
) {

    // Obtener clientes oxigenados desde la API y guardarlos localmente
    suspend fun syncClientesWeb() {
        val response = apiService.getClientesWeb()
        if (response.isSuccessful && response.body() != null) {
            val clientes = response.body()!!.data
            ventasDao.clearClientes()
            ventasDao.insertClientes(clientes)
        }
    }

    // Obtener flujo reactivo de clientes locales
    fun getClientesLocales(): Flow<List<ClienteWeb>> {
        return ventasDao.getAllClientes()
    }

    // Enviar pedido web directamente a la API
    suspend fun enviarPedidoWebOnline(request: PedidoWebRequest): Result<String> {
        return try {
            val response = apiService.enviarPedidoWeb(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.message)
            } else {
                Result.failure(Exception("Error del servidor: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Guardar pedido offline en Room para sincronizar más tarde
    suspend fun guardarPedidoOffline(pedido: PedidoOffline) {
        ventasDao.insertPedidoOffline(pedido)
    }
}
