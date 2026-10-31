package com.mypk2.drogueria_eka_app.ui.scanner

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mypk2.drogueria_eka_app.data.model.LoteProduccion
import com.mypk2.drogueria_eka_app.data.remote.RetrofitClient
import kotlinx.coroutines.launch

import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class ScannerViewModel @Inject constructor() : ViewModel() {

    private val _scanState = MutableLiveData<ScanState>(ScanState.Idle)
    val scanState: LiveData<ScanState> get() = _scanState

    private var lastScannedCode: String? = null

    fun onBarcodeDetected(rawValue: String) {
        // Evitar búsqueda duplicada del mismo código
        if (rawValue == lastScannedCode && _scanState.value is ScanState.Found) return

        lastScannedCode = rawValue
        _scanState.value = ScanState.Searching(rawValue)

        viewModelScope.launch {
            try {
                val response = RetrofitClient.apiService.getLotes(busqueda = rawValue, limit = 5)
                if (response.isSuccessful && response.body() != null) {
                    val lotes = response.body()!!.data
                    // Buscar coincidencia exacta primero, luego parcial
                    val loteExacto = lotes.find {
                        it.numeroLote.equals(rawValue, ignoreCase = true)
                    } ?: lotes.firstOrNull()

                    if (loteExacto != null) {
                        _scanState.value = ScanState.Found(loteExacto)
                    } else {
                        _scanState.value = ScanState.NotFound(rawValue)
                    }
                } else {
                    _scanState.value = ScanState.NotFound(rawValue)
                }
            } catch (e: Exception) {
                _scanState.value = ScanState.Error("Error de red: ${e.message}")
            }
        }
    }

    fun resetScan() {
        lastScannedCode = null
        _scanState.value = ScanState.Idle
    }
}

sealed class ScanState {
    object Idle : ScanState()
    data class Searching(val code: String) : ScanState()
    data class Found(val lote: LoteProduccion) : ScanState()
    data class NotFound(val code: String) : ScanState()
    data class Error(val message: String) : ScanState()
}
