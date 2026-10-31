package com.mypk2.drogueria_eka_app.ui.kardex

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mypk2.drogueria_eka_app.data.model.MovimientoKardex
import com.mypk2.drogueria_eka_app.data.remote.RetrofitClient
import kotlinx.coroutines.launch

import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class KardexHistorialViewModel @Inject constructor() : ViewModel() {

    private val _movimientos = MutableLiveData<List<MovimientoKardex>>()
    val movimientos: LiveData<List<MovimientoKardex>> get() = _movimientos

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> get() = _isLoading

    private val _hasMore = MutableLiveData<Boolean>()
    val hasMore: LiveData<Boolean> get() = _hasMore

    private var currentPage = 1
    private var currentFilter: Int? = null // null=todos, 1=entrada, 2=salida
    private val allMovimientos = mutableListOf<MovimientoKardex>()

    fun loadHistorial(filtroTipo: Int? = null, reset: Boolean = true) {
        if (reset) {
            currentPage = 1
            allMovimientos.clear()
            currentFilter = filtroTipo
        }

        _isLoading.value = true
        viewModelScope.launch {
            try {
                val response = RetrofitClient.apiService.getKardex(
                    tipoMovimientoId = currentFilter,
                    page = currentPage,
                    limit = 20
                )
                if (response.isSuccessful && response.body() != null) {
                    val data = response.body()!!
                    allMovimientos.addAll(data.data)
                    _movimientos.value = allMovimientos.toList()
                    _hasMore.value = currentPage < data.totalPages
                    currentPage++
                }
            } catch (e: Exception) {
                // Error silencioso
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadMore() {
        loadHistorial(currentFilter, reset = false)
    }
}
