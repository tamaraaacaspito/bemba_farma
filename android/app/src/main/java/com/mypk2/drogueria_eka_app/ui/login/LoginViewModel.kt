package com.mypk2.drogueria_eka_app.ui.login

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mypk2.drogueria_eka_app.data.model.LoginRequest
import com.mypk2.drogueria_eka_app.data.model.Usuario
import com.mypk2.drogueria_eka_app.data.remote.RetrofitClient
import kotlinx.coroutines.launch
import org.json.JSONObject

import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class LoginViewModel @Inject constructor() : ViewModel() {
    private val _loginState = MutableLiveData<LoginState>()
    val loginState: LiveData<LoginState> get() = _loginState

    fun login(email: String, password: String) {
        _loginState.value = LoginState.Loading

        viewModelScope.launch {
            try {
                val request = LoginRequest(email, password)
                val response = RetrofitClient.apiService.login(request)

                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    _loginState.value = LoginState.Success(body.token, body.usuario)
                } else {
                    // Extraer mensaje de error del backend si existe
                    val errorBody = response.errorBody()?.string()
                    var errorMessage = "Error en la autenticación"
                    if (!errorBody.isNullOrEmpty()) {
                        try {
                            val jsonError = JSONObject(errorBody)
                            errorMessage = jsonError.optString("error", errorMessage)
                        } catch (e: Exception) {
                            errorMessage = response.message()
                        }
                    }
                    _loginState.value = LoginState.Error(response.code(), errorMessage)
                }
            } catch (e: Exception) {
                // Errores de red u otros
                _loginState.value = LoginState.Error(-1, e.message ?: "Error de conexión")
            }
        }
    }
}

sealed class LoginState {
    object Loading : LoginState()
    data class Success(val token: String, val usuario: Usuario) : LoginState()
    data class Error(val code: Int, val message: String) : LoginState()
}
