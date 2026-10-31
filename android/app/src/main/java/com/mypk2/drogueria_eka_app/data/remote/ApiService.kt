package com.mypk2.drogueria_eka_app.data.remote

import com.mypk2.drogueria_eka_app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // ── Autenticación ─────────────────────────────────────────
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    // ── Productos (respuesta paginada) ────────────────────────
    @GET("productos")
    suspend fun getProductos(
        @Query("busqueda") busqueda: String? = null,
        @Query("categoria_id") categoriaId: Int? = null,
        @Query("estado") estado: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 200
    ): Response<ProductoListResponse>

    @GET("categorias")
    suspend fun getCategorias(): Response<List<Categoria>>

    // ── Estadísticas del inventario ───────────────────────────
    @GET("productos/stats")
    suspend fun getProductosStats(): Response<ProductStats>

    // ── Reporte de Caducidad ──────────────────────────────────
    @GET("reportes/caducidad")
    suspend fun getReporteCaducidad(): Response<ReporteCaducidadResponse>

    // ── Lotes de un producto ─────────────────────────────────
    @GET("productos/{id}/lotes")
    suspend fun getProductoLotes(@Path("id") productoId: Int): Response<List<LoteProduccion>>

    // ── Lotes: buscar por número (Scanner) ───────────────────
    @GET("lotes")
    suspend fun getLotes(
        @Query("busqueda") busqueda: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 15
    ): Response<LoteListResponse>

    // ── Kardex: registrar movimientos (POST → KardexPostResponse) ──
    @POST("kardex/entrada")
    suspend fun registrarEntrada(@Body request: KardexEntradaRequest): Response<KardexPostResponse>

    @POST("kardex/salida")
    suspend fun registrarSalida(@Body request: KardexSalidaRequest): Response<KardexPostResponse>

    // ── Kardex: historial (GET → KardexListResponse paginada) ──
    @GET("kardex")
    suspend fun getKardex(
        @Query("tipo_movimiento_id") tipoMovimientoId: Int? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 15
    ): Response<KardexListResponse>

    @GET("kardex/{productoId}")
    suspend fun getKardexHistorial(
        @Path("productoId") productoId: Int,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 15
    ): Response<KardexListResponse>

    // ── Asistente IA ──────────────────────────────────────────
    @POST("ia/chat")
    suspend fun chat(@Body request: ChatRequest): Response<ChatResponse>

    @POST("kardex/reposicion")
    suspend fun registrarReposicion(@Body request: KardexEntradaRequest): Response<KardexPostResponse>

    @POST("kardex/canje")
    suspend fun registrarCanje(@Body request: KardexCanjeRequest): Response<KardexPostResponse>

    // ── Alertas del sistema (Centro de Alertas IA) ────────────
    @GET("alertas")
    suspend fun getAlertas(): Response<AlertasListResponse>

    @PATCH("alertas/{id}/leer")
    suspend fun marcarAlertaLeida(@Path("id") id: Int): Response<Unit>

    // ── Registro de dispositivo para push (Azure Notification Hubs) ──
    @POST("dispositivos/registrar")
    suspend fun registrarDispositivo(@Body request: DispositivoRequest): Response<Unit>

    // ── Clientes Institucionales ──────────────────────────────
    @GET("clientes-web")
    suspend fun getClientesWeb(): Response<ClienteWebListResponse>

    // ── Pedidos Web / Ventas en Campo ─────────────────────────
    @POST("pedidos-web")
    suspend fun enviarPedidoWeb(@Body request: PedidoWebRequest): Response<PedidoWebResponse>
}
