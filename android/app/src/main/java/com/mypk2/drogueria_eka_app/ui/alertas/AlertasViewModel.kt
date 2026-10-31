package com.mypk2.drogueria_eka_app.ui.alertas

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mypk2.drogueria_eka_app.data.model.AlertaCaducidad
import com.mypk2.drogueria_eka_app.data.remote.ApiService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AlertasViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _alertasState = MutableLiveData<AlertasState>(AlertasState.Loading)
    val alertasState: LiveData<AlertasState> get() = _alertasState

    private var allAlertas = listOf<AlertaCaducidad>()
    private var currentFilter = "TODOS"

    fun loadAlertas() {
        _alertasState.value = AlertasState.Loading
        viewModelScope.launch {
            try {
                val response = apiService.getReporteCaducidad()
                if (response.isSuccessful && response.body() != null) {
                    allAlertas = response.body()!!.data.sortedBy { it.diasRestantes }
                    applyFilter(currentFilter)
                } else {
                    _alertasState.value = AlertasState.Error("Error al cargar alertas")
                }
            } catch (e: Exception) {
                _alertasState.value = AlertasState.Error("Error de conexión: ${e.message}")
            }
        }
    }

    fun applyFilter(filter: String) {
        currentFilter = filter
        val filteredList = if (filter == "TODOS") {
            allAlertas
        } else {
            allAlertas.filter { it.nivel.equals(filter, ignoreCase = true) }
        }
        val criticosCount = allAlertas.count { it.nivel.equals("CRITICO", ignoreCase = true) }
        _alertasState.value = AlertasState.Success(filteredList, criticosCount)
    }
}

sealed class AlertasState {
    object Loading : AlertasState()
    data class Success(val alertas: List<AlertaCaducidad>, val criticosCount: Int) : AlertasState()
    data class Error(val message: String) : AlertasState()
}
