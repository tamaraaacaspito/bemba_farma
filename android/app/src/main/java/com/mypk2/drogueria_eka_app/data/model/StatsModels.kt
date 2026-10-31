package com.mypk2.drogueria_eka_app.data.model

import com.google.gson.annotations.SerializedName

/**
 * Estadísticas del inventario
 * Backend GET /api/productos/stats devuelve:
 * { total_activos, total_criticos, total_agotados }
 */
data class ProductStats(
    @SerializedName("total_activos")
    val totalProductos: Int,
    @SerializedName("total_criticos")
    val productosCriticos: Int,
    @SerializedName("total_agotados")
    val productosAgotados: Int
)
