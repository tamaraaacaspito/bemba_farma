package com.mypk2.drogueria_eka_app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.gson.annotations.SerializedName

/**
 * Entidad Producto
 * Corresponde a la tabla 'productos' en SQL Server y a la tabla local en Room
 */
@Entity(tableName = "productos")
data class Producto(
    @PrimaryKey val id: Int,
    val codigo: String,
    val nombre: String,
    @SerializedName("categoria_id")
    val categoriaId: Int?,
    @SerializedName("unidad_medida")
    val unidadMedida: String?,
    @SerializedName("stock_actual")
    val stockActual: Double,
    @SerializedName("stock_minimo")
    val stockMinimo: Double,
    @SerializedName("precio_unitario")
    val precioUnitario: Double,
    val estado: Boolean
)

/**
 * Wrapper para la respuesta paginada del backend
 * GET /api/productos devuelve: { data: [...], total, page, totalPages }
 */
data class ProductoListResponse(
    val data: List<Producto>,
    val total: Int,
    val page: Int,
    val totalPages: Int
)
