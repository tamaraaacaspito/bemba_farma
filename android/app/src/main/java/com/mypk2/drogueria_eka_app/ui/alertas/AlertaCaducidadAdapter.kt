package com.mypk2.drogueria_eka_app.ui.alertas

import android.content.res.ColorStateList
import android.graphics.Color
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.mypk2.drogueria_eka_app.R
import com.mypk2.drogueria_eka_app.data.model.AlertaCaducidad
import com.mypk2.drogueria_eka_app.databinding.ItemAlertaCaducidadBinding
import java.text.SimpleDateFormat
import java.util.*

class AlertaCaducidadAdapter : RecyclerView.Adapter<AlertaCaducidadAdapter.ViewHolder>() {

    private var alertas: List<AlertaCaducidad> = emptyList()

    fun updateData(newList: List<AlertaCaducidad>) {
        alertas = newList
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemAlertaCaducidadBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(alertas[position])
    }

    override fun getItemCount() = alertas.size

    class ViewHolder(private val binding: ItemAlertaCaducidadBinding) : RecyclerView.ViewHolder(binding.root) {

        fun bind(alerta: AlertaCaducidad) {
            val context = binding.root.context
            
            binding.tvProductoNombre.text = alerta.producto?.nombre ?: "Producto Desconocido"
            binding.tvNumeroLote.text = alerta.numeroLote
            binding.tvDiasRestantes.text = alerta.diasRestantes.toString()
            binding.tvFechaVencimiento.text = formatearFecha(alerta.fechaVencimiento)

            // Configurar colores según el nivel ('CRITICO', 'ADVERTENCIA', 'NORMAL')
            val colorRes = when {
                alerta.nivel.equals("CRITICO", ignoreCase = true) -> R.color.colorStockCritical
                alerta.nivel.equals("ADVERTENCIA", ignoreCase = true) -> R.color.colorStockWarning
                else -> R.color.colorStockOk
            }
            
            val iconRes = if (alerta.nivel.equals("CRITICO", ignoreCase = true)) {
                android.R.drawable.ic_dialog_alert
            } else {
                android.R.drawable.ic_menu_recent_history
            }

            val colorResolved = context.resources.getColor(colorRes, context.theme)
            
            binding.viewNivelColor.setBackgroundColor(colorResolved)
            binding.tvDiasRestantes.setTextColor(colorResolved)
            binding.ivIconoNivel.setImageResource(iconRes)
            binding.ivIconoNivel.imageTintList = ColorStateList.valueOf(colorResolved)
        }

        private fun formatearFecha(fechaStr: String): String {
            return try {
                val formatos = listOf("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd")
                var fecha: Date? = null
                for (fmt in formatos) {
                    try {
                        val sdf = SimpleDateFormat(fmt, Locale.getDefault())
                        sdf.timeZone = TimeZone.getTimeZone("UTC")
                        fecha = sdf.parse(fechaStr)
                        if (fecha != null) break
                    } catch (_: Exception) {}
                }
                if (fecha == null) return fechaStr.take(10)
                SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(fecha)
            } catch (_: Exception) { fechaStr.take(10) }
        }
    }
}
