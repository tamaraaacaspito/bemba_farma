package com.mypk2.drogueria_eka_app.data.repository

import com.mypk2.drogueria_eka_app.data.model.Producto
import com.mypk2.drogueria_eka_app.data.model.KardexEntradaRequest
import com.mypk2.drogueria_eka_app.data.remote.ApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Repositorio centralizado (Single Source of Truth).
 * Consume la API y mantiene una caché en memoria como fallback.
 */
class InventarioRepository(private val apiService: ApiService) {

    // Cache simple en memoria
    private var productosCache: List<Producto>? = null

    /**
     * Obtiene el inventario sincronizando con la API si es necesario
     */
    suspend fun getInventario(forzarRefresco: Boolean = false): Result<List<Producto>> {
        return withContext(Dispatchers.IO) {
            try {
                if (!forzarRefresco && productosCache != null) {
                    return@withContext Result.success(productosCache!!)
                }

                val response = apiService.getProductos(limit = 200)
                if (response.isSuccessful && response.body() != null) {
                    val datos = response.body()!!.data
                    productosCache = datos
                    Result.success(datos)
                } else {
                    Result.failure(Exception("Error desconocido en el servidor API"))
                }
            } catch (e: Exception) {
                if (productosCache != null) {
                    Result.success(productosCache!!)
                } else {
                    Result.failure(e)
                }
            }
        }
    }

    /**
     * Registra un movimiento directo hacia el backend transaccional
     */
    suspend fun registrarMovimientoKardex(req: KardexEntradaRequest): Result<String> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.registrarEntrada(req)
                if (response.isSuccessful && response.body() != null) {
                    productosCache = null
                    val stockNuevo = response.body()!!.stockNuevo
                    Result.success("Registrado con éxito. Nuevo stock: ${stockNuevo.toInt()}")
                } else {
                    Result.failure(Exception("Error validando datos o Stock"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
}
