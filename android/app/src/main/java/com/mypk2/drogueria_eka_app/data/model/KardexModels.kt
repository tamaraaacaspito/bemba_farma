package com.mypk2.drogueria_eka_app.data.model

import com.google.gson.annotations.SerializedName

/**
 * Entidad MovimientoKardex
 * Refleja el historial de entradas y salidas
 * Incluye datos JOIN del backend (Producto, Usuario, TipoMovimiento, LoteProduccion)
 */
data class MovimientoKardex(
    val id: Int,
    @SerializedName("producto_id")
    val productoId: Int,
    @SerializedName("usuario_id")
    val usuarioId: Int,
    @SerializedName("tipo_movimiento_id")
    val tipoMovimientoId: Int,
    val cantidad: Double,
    @SerializedName("stock_anterior")
    val stockAnterior: Double,
    @SerializedName("stock_nuevo")
    val stockNuevo: Double,
    @SerializedName("referencia_tipo")
    val referenciaTipo: String?,
    @SerializedName("referencia_id")
    val referenciaId: Int?,
    @SerializedName("lote_id")
    val loteId: Int?,
    val motivo: String?,
    @SerializedName("fecha_movimiento")
    val fechaMovimiento: String?,

    // ── Datos JOINed del backend (presentes en GET, no en POST) ──
    @SerializedName("Producto")
    val producto: MovimientoProducto?,
    @SerializedName("Usuario")
    val usuario: MovimientoUsuario?,
    @SerializedName("TipoMovimiento")
    val tipoMovimiento: MovimientoTipo?,
    @SerializedName("LoteProduccion")
    val loteProduccion: MovimientoLote?
) {
    /** Helper: nombre del producto (fallback seguro) */
    val productoNombre: String get() = producto?.nombre ?: "Producto #$productoId"
    val productoCodigo: String get() = producto?.codigo ?: ""
    val usuarioNombre: String get() = usuario?.nombre ?: ""
    val tipoNombre: String get() = tipoMovimiento?.nombre ?: if (tipoMovimientoId == 1) "ENTRADA" else "SALIDA"
    val loteNumero: String get() = loteProduccion?.numeroLote ?: ""
    val esEntrada: Boolean get() = tipoMovimientoId == 1
}

/** Sub-modelo JOIN: Producto */
data class MovimientoProducto(
    val nombre: String?,
    val codigo: String?
)

/** Sub-modelo JOIN: Usuario */
data class MovimientoUsuario(
    val nombre: String?
)

/** Sub-modelo JOIN: TipoMovimiento */
data class MovimientoTipo(
    val id: Int?,
    val nombre: String?
)

/** Sub-modelo JOIN: LoteProduccion */
data class MovimientoLote(
    @SerializedName("numero_lote")
    val numeroLote: String?,
    @SerializedName("fecha_produccion")
    val fechaProduccion: String?,
    @SerializedName("fecha_vencimiento", alternate = ["fecha_vencimiento_lote"])
    val fechaVencimiento: String?
)

/**
 * Wrapper para la respuesta paginada del Kardex (GET)
 * GET /api/kardex devuelve: { data: [...], total, page, totalPages }
 */
data class KardexListResponse(
    val data: List<MovimientoKardex>,
    val total: Int,
    val page: Int,
    val totalPages: Int
)

/**
 * Wrapper para la respuesta de POST entrada/salida
 * POST /api/kardex/entrada devuelve: { movimiento: {...}, stock_nuevo: X }
 * POST /api/kardex/salida devuelve: { movimiento: {...}, stock_nuevo: X, alerta_generada: ... }
 */
data class KardexPostResponse(
    val movimiento: MovimientoKardex,
    @SerializedName("stock_nuevo")
    val stockNuevo: Double,
    @SerializedName("alerta_generada")
    val alertaGenerada: Any?
)

/**
 * Petición para registrar entrada en el Kardex
 */
data class KardexEntradaRequest(
    @SerializedName("producto_id")
    val productoId: Int,
    val cantidad: Double,
    @SerializedName("referencia_tipo")
    val referenciaTipo: String,
    @SerializedName("referencia_id")
    val referenciaId: Int?,
    @SerializedName("lote_id")
    val loteId: Int?,
    @SerializedName("codigo_lote")
    val codigoLote: String?,
    val motivo: String?
)

/**
 * Petición para registrar salida en el Kardex
 */
data class KardexSalidaRequest(
    @SerializedName("producto_id")
    val productoId: Int,
    val cantidad: Double,
    @SerializedName("referencia_tipo")
    val referenciaTipo: String,
    @SerializedName("referencia_id")
    val referenciaId: Int?,
    @SerializedName("lote_id")
    val loteId: Int?,
    @SerializedName("codigo_lote")
    val codigoLote: String?,
    val motivo: String?
)

/**
 * Petición para registrar un CANJE en el Kardex
 * Genera CANJE_ENTRADA (lote defectuoso que regresa) y
 * CANJE_SALIDA (lote de reemplazo que sale)
 */
data class KardexCanjeRequest(
    @SerializedName("producto_id")
    val productoId: Int,
    val cantidad: Double,
    @SerializedName("codigo_lote_defectuoso")
    val codigoLoteDefectuoso: String,
    @SerializedName("codigo_lote_reemplazo")
    val codigoLoteReemplazo: String,
    val motivo: String?
)
