package com.mypk2.drogueria_eka_app.data.model

import com.google.gson.annotations.SerializedName

data class ChatRequest(
    @SerializedName("messages")
    val messages: List<MessageItem>
)

data class MessageItem(
    @SerializedName("content")
    val content: String
)

data class ChatResponse(
    @SerializedName("response")
    val response: String
)

data class ChatMessage(
    val content: String,
    val isUser: Boolean,
    val timestamp: Long = System.currentTimeMillis()
)
