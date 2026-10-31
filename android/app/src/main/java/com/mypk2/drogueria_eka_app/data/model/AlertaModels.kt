package com.mypk2.drogueria_eka_app.data.model

import com.google.gson.annotations.SerializedName

/**
 * Entidad Alerta (Sistema)
 */
data class Alerta(
    val id: Int,
    @SerializedName("tipo_id")
    val tipoId: Int,
    val mensaje: String,
    @SerializedName("producto_id")
    val productoId: Int?,
    @SerializedName("usuario_id")
    val usuarioId: Int?,
    val leida: Boolean,
    @SerializedName("fecha_creacion")
    val fechaCreacion: String
)

/**
 * Entidad para Reporte de Caducidad (GET /api/reportes/caducidad)
 */
data class AlertaCaducidad(
    @SerializedName("lote_id")
    val loteId: Int,
    @SerializedName("numero_lote")
    val numeroLote: String,
    @SerializedName("fecha_vencimiento")
    val fechaVencimiento: String,
    @SerializedName("dias_restantes")
    val diasRestantes: Int,
    val nivel: String, // 'CRITICO', 'ADVERTENCIA', 'NORMAL'
    val producto: ProductoResumenCaducidad?
)

data class ProductoResumenCaducidad(
    val nombre: String?,
    val categoria: Int?
)

data class ReporteCaducidadResponse(
    val data: List<AlertaCaducidad>
)

/**
 * Wrapper para la respuesta de alertas del sistema
 * GET /api/alertas devuelve: { data: [...] }
 */
data class AlertasListResponse(
    val data: List<Alerta>
)

/**
 * Cuerpo para registrar el dispositivo en Azure Notification Hubs.
 * POST /api/dispositivos/registrar
 */
data class DispositivoRequest(
    val token: String,
    val installationId: String? = null,
    val tags: List<String>? = null
)
