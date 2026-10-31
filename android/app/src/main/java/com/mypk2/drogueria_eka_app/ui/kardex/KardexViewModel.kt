package com.mypk2.drogueria_eka_app.ui.kardex

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mypk2.drogueria_eka_app.data.model.KardexCanjeRequest
import com.mypk2.drogueria_eka_app.data.model.KardexEntradaRequest
import com.mypk2.drogueria_eka_app.data.model.KardexPostResponse
import com.mypk2.drogueria_eka_app.data.model.KardexSalidaRequest
import com.mypk2.drogueria_eka_app.data.model.Producto
import com.mypk2.drogueria_eka_app.data.model.LoteProduccion
import com.mypk2.drogueria_eka_app.data.remote.RetrofitClient
import kotlinx.coroutines.launch
import org.json.JSONObject
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

/** Tipos de movimiento disponibles en el Kardex */
enum class TipoMovimiento { ENTRADA, SALIDA, REPOSICION, CANJE }

@HiltViewModel
class KardexViewModel @Inject constructor() : ViewModel() {

    private val _productos = MutableLiveData<List<Producto>>()
    val productos: LiveData<List<Producto>> get() = _productos

    private val _lotes = MutableLiveData<List<LoteProduccion>>()
    val lotes: LiveData<List<LoteProduccion>> get() = _lotes

    private val _movimientoResult = MutableLiveData<MovimientoState>()
    val movimientoResult: LiveData<MovimientoState> get() = _movimientoResult

    fun loadProductosParaSpinner() {
        viewModelScope.launch {
            try {
                val res = RetrofitClient.apiService.getProductos(limit = 200)
                if (res.isSuccessful && res.body() != null) {
                    _productos.value = res.body()!!.data
                }
            } catch (e: Exception) {
                // Error silencioso al cargar productos para spinner
            }
        }
    }

    fun loadLotes(productoId: Int) {
        viewModelScope.launch {
            try {
                val res = RetrofitClient.apiService.getProductoLotes(productoId)
                if (res.isSuccessful && res.body() != null) {
                    _lotes.value = res.body()
                } else {
                    _lotes.value = emptyList()
                }
            } catch (e: Exception) {
                _lotes.value = emptyList()
            }
        }
    }

    /**
     * Registra ENTRADA, SALIDA o REPOSICION.
     * Para CANJE usa registrarCanje().
     */
    fun registrarMovimiento(
        productoId: Int,
        cantidad: Double,
        tipo: TipoMovimiento,
        motivo: String,
        loteId: Int?,
        codigoLote: String?
    ) {
        _movimientoResult.value = MovimientoState.Loading
        viewModelScope.launch {
            try {
                val res = when (tipo) {
                    TipoMovimiento.ENTRADA -> {
                        val req = KardexEntradaRequest(
                            productoId = productoId, cantidad = cantidad,
                            referenciaTipo = "OTRO", referenciaId = null,
                            loteId = loteId, codigoLote = codigoLote, motivo = motivo
                        )
                        RetrofitClient.apiService.registrarEntrada(req)
                    }
                    TipoMovimiento.REPOSICION -> {
                        val req = KardexEntradaRequest(
                            productoId = productoId, cantidad = cantidad,
                            referenciaTipo = "REPOSICION", referenciaId = null,
                            loteId = loteId, codigoLote = codigoLote, motivo = motivo
                        )
                        RetrofitClient.apiService.registrarReposicion(req)
                    }
                    TipoMovimiento.SALIDA -> {
                        val req = KardexSalidaRequest(
                            productoId = productoId, cantidad = cantidad,
                            referenciaTipo = "OTRO", referenciaId = null,
                            loteId = loteId, codigoLote = codigoLote, motivo = motivo
                        )
                        RetrofitClient.apiService.registrarSalida(req)
                    }
                    TipoMovimiento.CANJE -> throw IllegalStateException("Usa registrarCanje() para canjes.")
                }
                manejarRespuesta(res)
            } catch (e: Exception) {
                _movimientoResult.value = MovimientoState.Error("Error de conexión: ${e.message}")
            }
        }
    }

    /** Registra un CANJE (lote defectuoso devuelto → lote de reemplazo enviado) */
    fun registrarCanje(
        productoId: Int,
        cantidad: Double,
        codigoLoteDefectuoso: String,
        codigoLoteReemplazo: String,
        motivo: String
    ) {
        _movimientoResult.value = MovimientoState.Loading
        viewModelScope.launch {
            try {
                val req = KardexCanjeRequest(
                    productoId = productoId,
                    cantidad = cantidad,
                    codigoLoteDefectuoso = codigoLoteDefectuoso,
                    codigoLoteReemplazo = codigoLoteReemplazo,
                    motivo = motivo
                )
                val res = RetrofitClient.apiService.registrarCanje(req)
                manejarRespuesta(res)
            } catch (e: Exception) {
                _movimientoResult.value = MovimientoState.Error("Error de conexión: ${e.message}")
            }
        }
    }

    private fun manejarRespuesta(res: retrofit2.Response<KardexPostResponse>) {
        if (res.isSuccessful && res.body() != null) {
            val body = res.body()!!
            _movimientoResult.value = MovimientoState.Success(
                "Registrado con éxito. Nuevo stock: ${body.stockNuevo.toInt()}"
            )
        } else {
            val errorBody = res.errorBody()?.string()
            var errorMessage = "Error en operación HTTP ${res.code()}"
            if (!errorBody.isNullOrEmpty()) {
                try {
                    val jsonError = JSONObject(errorBody)
                    errorMessage = jsonError.optString("error", errorMessage)
                    if (jsonError.has("stock_disponible")) {
                        errorMessage += " (Disponible: ${jsonError.optDouble("stock_disponible").toInt()})"
                    }
                } catch (e: Exception) { /* ignored */ }
            }
            _movimientoResult.value = MovimientoState.Error(errorMessage)
        }
    }
}

sealed class MovimientoState {
    object Loading : MovimientoState()
    data class Success(val message: String) : MovimientoState()
    data class Error(val error: String) : MovimientoState()
}
