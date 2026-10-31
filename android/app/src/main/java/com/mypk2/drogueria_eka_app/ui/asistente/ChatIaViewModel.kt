package com.mypk2.drogueria_eka_app.ui.asistente

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mypk2.drogueria_eka_app.data.model.ChatMessage
import com.mypk2.drogueria_eka_app.data.model.ChatRequest
import com.mypk2.drogueria_eka_app.data.remote.ApiService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ChatIaViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _messages = MutableLiveData<List<ChatMessage>>(
        listOf(ChatMessage("¡Hola! Soy tu asistente EKA IA. ¿En qué puedo ayudarte hoy?", false))
    )
    val messages: LiveData<List<ChatMessage>> = _messages

    private val _isLoading = MutableLiveData<Boolean>(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>(null)
    val error: LiveData<String?> = _error

    fun sendMessage(text: String) {
        if (text.isBlank()) return

        val userMsg = ChatMessage(text, true)
        _messages.value = _messages.value?.plus(userMsg)

        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                // El backend espera una lista de mensajes en el campo 'messages'
                val history = _messages.value?.map { 
                    com.mypk2.drogueria_eka_app.data.model.MessageItem(it.content) 
                } ?: emptyList()

                val response = apiService.chat(ChatRequest(history))
                if (response.isSuccessful) {
                    val aiMsg = ChatMessage(response.body()?.response ?: "No recibí respuesta.", false)
                    _messages.value = _messages.value?.plus(aiMsg)
                } else {
                    _error.value = "Error al conectar con la IA (Code: ${response.code()})"
                }
            } catch (e: Exception) {
                _error.value = "Error de red: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
}
