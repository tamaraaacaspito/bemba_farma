package com.mypk2.drogueria_eka_app.data.model

data class PedidoWebRequest(
    val cliente_web_id: Int?,
    val nombre_cliente: String?,
    val email: String?,
    val telefono: String?,
    val entidad: String?,
    val ruc_dni: String?,
    val mensaje_requerimiento: String?,
    val detalles: List<DetallePedidoWebRequest>
)

data class DetallePedidoWebRequest(
    val producto_id: Int,
    val cantidad: Double,
    val precio_unitario: Double
)

data class PedidoWebResponse(
    val data: PedidoWebData?,
    val message: String
)

data class PedidoWebData(
    val id: Int,
    val codigo_pedido: String,
    val estado: String
)
