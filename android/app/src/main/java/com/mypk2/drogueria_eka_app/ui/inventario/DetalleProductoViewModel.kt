package com.mypk2.drogueria_eka_app.ui.inventario

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
class DetalleProductoViewModel @Inject constructor() : ViewModel() {

    private val _lotes = MutableLiveData<List<LoteProduccion>>()
    val lotes: LiveData<List<LoteProduccion>> get() = _lotes

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> get() = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> get() = _error

    fun loadLotes(productoId: Int) {
        _isLoading.value = true
        _error.value = null
        viewModelScope.launch {
            try {
                val response = RetrofitClient.apiService.getProductoLotes(productoId)
                if (response.isSuccessful && response.body() != null) {
                    _lotes.value = response.body()!!
                } else {
                    _lotes.value = emptyList()
                }
            } catch (e: Exception) {
                _error.value = "Error al cargar lotes: ${e.message}"
                _lotes.value = emptyList()
            } finally {
                _isLoading.value = false
            }
        }
    }
}
