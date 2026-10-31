package com.mypk2.drogueria_eka_app.ui.asistente

import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.mypk2.drogueria_eka_app.R
import com.mypk2.drogueria_eka_app.data.model.ChatMessage
import com.mypk2.drogueria_eka_app.databinding.ItemChatMessageBinding

class ChatAdapter : RecyclerView.Adapter<ChatAdapter.ChatViewHolder>() {

    private val messages = mutableListOf<ChatMessage>()

    fun addMessage(message: ChatMessage) {
        messages.add(message)
        notifyItemInserted(messages.size - 1)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChatViewHolder {
        val binding = ItemChatMessageBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ChatViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ChatViewHolder, position: Int) {
        holder.bind(messages[position])
    }

    override fun getItemCount(): Int = messages.size

    class ChatViewHolder(private val binding: ItemChatMessageBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(message: ChatMessage) {
            // Soporte básico para negritas (Markdown)
            val formattedText = formatMarkdown(message.content)
            binding.tvMessage.text = android.text.Html.fromHtml(formattedText, android.text.Html.FROM_HTML_MODE_LEGACY)
            
            val params = binding.cardMessage.layoutParams as LinearLayout.LayoutParams
            if (message.isUser) {
                params.gravity = Gravity.END
                params.setMargins(60, 4, 0, 4)
                binding.cardMessage.setCardBackgroundColor(ContextCompat.getColor(binding.root.context, R.color.colorPrimary))
                binding.tvMessage.setTextColor(ContextCompat.getColor(binding.root.context, R.color.colorSurface))
                binding.cardMessage.shapeAppearanceModel = binding.cardMessage.shapeAppearanceModel.toBuilder()
                    .setTopRightCornerSize(0f)
                    .setTopLeftCornerSize(40f)
                    .setBottomLeftCornerSize(40f)
                    .setBottomRightCornerSize(40f)
                    .build()
            } else {
                params.gravity = Gravity.START
                params.setMargins(0, 4, 60, 4)
                binding.cardMessage.setCardBackgroundColor(ContextCompat.getColor(binding.root.context, R.color.colorSurface))
                binding.tvMessage.setTextColor(ContextCompat.getColor(binding.root.context, R.color.colorTextPrimary))
                binding.cardMessage.shapeAppearanceModel = binding.cardMessage.shapeAppearanceModel.toBuilder()
                    .setTopLeftCornerSize(0f)
                    .setTopRightCornerSize(40f)
                    .setBottomLeftCornerSize(40f)
                    .setBottomRightCornerSize(40f)
                    .build()
            }
            binding.cardMessage.layoutParams = params
        }

        private fun formatMarkdown(text: String): String {
            // Reemplaza **texto** por <b>texto</b>
            return text.replace(Regex("\\*\\*(.*?)\\*\\*"), "<b>$1</b>")
                .replace("\n", "<br>")
        }
    }
}
