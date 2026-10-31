package com.mypk2.drogueria_eka_app.ui.inventario

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.mypk2.drogueria_eka_app.data.local.AppDatabase
import com.mypk2.drogueria_eka_app.data.model.Categoria
import com.mypk2.drogueria_eka_app.data.model.Producto
import com.mypk2.drogueria_eka_app.data.remote.RetrofitClient
import kotlinx.coroutines.launch

import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class InventarioViewModel @Inject constructor(application: Application) : AndroidViewModel(application) {

    private val productoDao = AppDatabase.getDatabase(application).productoDao()

    private val _productos = MutableLiveData<List<Producto>>()
    val productos: LiveData<List<Producto>> get() = _productos

    private val _isOffline = MutableLiveData<Boolean>()
    val isOffline: LiveData<Boolean> get() = _isOffline

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> get() = _isLoading

    private val _categorias = MutableLiveData<List<Categoria>>()
    val categorias: LiveData<List<Categoria>> get() = _categorias

    private var currentCategoryId: Int? = null
    private var currentEstado: String? = null

    fun loadProductos(query: String = "", categoriaId: Int? = null, estado: String? = null) {
        currentCategoryId = categoriaId
        currentEstado = estado
        
        _isLoading.value = true
        viewModelScope.launch {
            try {
                // Si no hay filtro complejo, intentamos sincronizar catálogo base
                if (query.isEmpty() && categoriaId == null && estado == null) {
                    val response = RetrofitClient.apiService.getProductos(limit = 200)
                    if (response.isSuccessful && response.body() != null) {
                        val productosFromApi = response.body()!!.data
                        productoDao.insertAll(productosFromApi)
                        _isOffline.value = false
                    }
                }

                // Intentar obtener datos filtrados desde API si hay conexión
                val apiResponse = RetrofitClient.apiService.getProductos(
                    busqueda = if (query.isEmpty()) null else query,
                    categoriaId = categoriaId,
                    estado = if (estado == "TODOS") null else estado,
                    limit = 100
                )

                if (apiResponse.isSuccessful && apiResponse.body() != null) {
                    _productos.value = apiResponse.body()!!.data
                    _isOffline.value = false
                } else {
                    // Fallback a Room si API falla o no hay filtros complejos compatibles en DAO local
                    loadFromLocal(query)
                }

            } catch (e: Exception) {
                _isOffline.value = true
                loadFromLocal(query)
            } finally {
                _isLoading.value = false
            }
        }
    }

    private suspend fun loadFromLocal(query: String) {
        if (query.isEmpty()) {
            _productos.value = productoDao.getAllProductos()
        } else {
            _productos.value = productoDao.searchProductos(query)
        }
    }

    fun fetchCategorias() {
        viewModelScope.launch {
            try {
                val response = RetrofitClient.apiService.getCategorias()
                if (response.isSuccessful && response.body() != null) {
                    _categorias.value = response.body()
                }
            } catch (e: Exception) {
                // Silencioso o log
            }
        }
    }
}
