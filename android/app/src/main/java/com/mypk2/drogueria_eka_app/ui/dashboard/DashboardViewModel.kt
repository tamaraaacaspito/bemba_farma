package com.mypk2.drogueria_eka_app.ui.dashboard

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mypk2.drogueria_eka_app.data.model.MovimientoKardex
import com.mypk2.drogueria_eka_app.data.model.Producto
import com.mypk2.drogueria_eka_app.data.model.ProductStats
import com.mypk2.drogueria_eka_app.data.remote.RetrofitClient
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor() : ViewModel() {

    private val _stats = MutableLiveData<ProductStats>()
    val stats: LiveData<ProductStats> get() = _stats

    private val _productosCriticos = MutableLiveData<List<Producto>>()
    val productosCriticos: LiveData<List<Producto>> get() = _productosCriticos

    private val _movimientosRecientes = MutableLiveData<List<MovimientoKardex>>()
    val movimientosRecientes: LiveData<List<MovimientoKardex>> get() = _movimientosRecientes

    private val _totalMovimientos = MutableLiveData<Int>()
    val totalMovimientos: LiveData<Int> get() = _totalMovimientos

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> get() = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> get() = _error

    private val _lotesVencidos = MutableLiveData<Int>()
    val lotesVencidos: LiveData<Int> get() = _lotesVencidos

    /**
     * Carga en paralelo: KPIs + Movimientos recientes + Productos críticos + Caducidad
     */
    fun fetchData() {
        _isLoading.value = true
        _error.value = null

        viewModelScope.launch {
            try {
                coroutineScope {
                    val statsDeferred = async { RetrofitClient.apiService.getProductosStats() }
                    val movimientosDeferred = async { RetrofitClient.apiService.getKardex(page = 1, limit = 5) }
                    val productosDeferred = async { RetrofitClient.apiService.getProductos(limit = 200) }
                    val caducidadDeferred = async { RetrofitClient.apiService.getReporteCaducidad() }

                    val statsResponse = statsDeferred.await()
                    if (statsResponse.isSuccessful && statsResponse.body() != null) {
                        _stats.value = statsResponse.body()
                    }

                    val movResponse = movimientosDeferred.await()
                    if (movResponse.isSuccessful && movResponse.body() != null) {
                        val kardexData = movResponse.body()!!
                        _movimientosRecientes.value = kardexData.data
                        _totalMovimientos.value = kardexData.total
                    }

                    val prodResponse = productosDeferred.await()
                    if (prodResponse.isSuccessful && prodResponse.body() != null) {
                        val allProductos = prodResponse.body()!!.data
                        val criticos = allProductos
                            .filter { it.stockActual <= it.stockMinimo }
                            .sortedBy { it.stockActual }
                        _productosCriticos.value = criticos
                    }

                    val cadResponse = caducidadDeferred.await()
                    if (cadResponse.isSuccessful && cadResponse.body() != null) {
                        val lotesCad = cadResponse.body()!!.data
                        _lotesVencidos.value = lotesCad.count { it.nivel == "CRITICO" }
                    }
                }
            } catch (e: Exception) {
                _error.value = "Error de red al sincronizar Dashboard: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
}
