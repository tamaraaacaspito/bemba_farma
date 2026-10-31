package com.mypk2.drogueria_eka_app.ui.alertas

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mypk2.drogueria_eka_app.data.model.Alerta
import com.mypk2.drogueria_eka_app.data.remote.ApiService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel del "Centro de Alertas IA".
 * Consume GET /alertas (alertas de sistema no leídas) y PATCH /alertas/{id}/leer.
 * Replica el Centro de Alertas IA de la web institucional.
 */
@HiltViewModel
class CentroAlertasViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _state = MutableLiveData<CentroAlertasState>(CentroAlertasState.Loading)
    val state: LiveData<CentroAlertasState> get() = _state

    fun cargar() {
        _state.value = CentroAlertasState.Loading
        viewModelScope.launch {
            try {
                val response = apiService.getAlertas()
                if (response.isSuccessful && response.body() != null) {
                    val alertas = response.body()!!.data
                    _state.value = CentroAlertasState.Success(alertas, alertas.count { !it.leida })
                } else {
                    _state.value = CentroAlertasState.Error("No se pudieron cargar las alertas")
                }
            } catch (e: Exception) {
                _state.value = CentroAlertasState.Error("Error de conexión: ${e.message}")
            }
        }
    }

    fun marcarLeida(id: Int) {
        viewModelScope.launch {
            try {
                val res = apiService.marcarAlertaLeida(id)
                if (res.isSuccessful) {
                    cargar() // refrescar la lista tras marcar como leída
                }
            } catch (_: Exception) {
                // Silencioso: si falla, el usuario puede reintentar con pull-to-refresh
            }
        }
    }
}

sealed class CentroAlertasState {
    object Loading : CentroAlertasState()
    data class Success(val alertas: List<Alerta>, val nuevas: Int) : CentroAlertasState()
    data class Error(val message: String) : CentroAlertasState()
}
