package com.mypk2.drogueria_eka_app.data.model

import androidx.room.Entity
import androidx.room.Ignore
import androidx.room.PrimaryKey
import com.google.gson.annotations.SerializedName

/**
 * Entidad LoteProduccion
 * Representa un lote de producción asociado a un producto
 */
@Entity(tableName = "lotes")
data class LoteProduccion(
    @PrimaryKey val id: Int,
    @SerializedName("producto_id")
    val productoId: Int,
    @SerializedName(value = "numero_lote", alternate = ["codigo_lote"])
    val numeroLote: String,
    @SerializedName("fecha_produccion")
    val fechaProduccion: String?,
    @SerializedName("fecha_vencimiento", alternate = ["fecha_vencimiento_lote"])
    val fechaVencimiento: String?,
    val cantidad: Double?,
    @SerializedName("cantidad_producida")
    val cantidadProducida: Double?,
    @SerializedName("stock_lote")
    val stockLote: Double?,

    // JOINed data from backend
    @Ignore
    @SerializedName("Producto")
    val producto: LoteProductoInfo? = null,
    
    @Ignore
    @SerializedName("EstadoLote")
    val estadoLote: LoteEstadoInfo? = null
) {
    // Constructor vacío necesario para Room/Gson al usar @Ignore
    constructor(
        id: Int,
        productoId: Int,
        numeroLote: String,
        fechaProduccion: String?,
        fechaVencimiento: String?,
        cantidad: Double?,
        cantidadProducida: Double?,
        stockLote: Double?
    ) : this(id, productoId, numeroLote, fechaProduccion, fechaVencimiento, cantidad, cantidadProducida, stockLote, null, null)
}

/** Sub-modelo JOIN: Producto info en un lote */
data class LoteProductoInfo(
    val id: Int?,
    val codigo: String?,
    val nombre: String?
)

/** Sub-modelo JOIN: EstadoLote */
data class LoteEstadoInfo(
    val nombre: String?
)

/**
 * Wrapper para la respuesta paginada de lotes
 * GET /api/lotes devuelve: { data: [...], total, page, totalPages }
 */
data class LoteListResponse(
    val data: List<LoteProduccion>,
    val total: Int,
    val page: Int,
    val totalPages: Int
)
