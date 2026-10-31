package com.mypk2.drogueria_eka_app.ui.alertas

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.mypk2.drogueria_eka_app.data.model.Alerta
import com.mypk2.drogueria_eka_app.databinding.ItemAlertaSistemaBinding
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Adapter del Centro de Alertas IA — muestra las alertas de sistema
 * (stock en riesgo, anomalías, vencimientos) con opción "Marcar como leída".
 */
class AlertaSistemaAdapter(
    private val onMarcarLeida: (Alerta) -> Unit
) : RecyclerView.Adapter<AlertaSistemaAdapter.ViewHolder>() {

    private var alertas: List<Alerta> = emptyList()

    fun updateData(newList: List<Alerta>) {
        alertas = newList
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemAlertaSistemaBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(alertas[position])
    }

    override fun getItemCount() = alertas.size

    inner class ViewHolder(private val binding: ItemAlertaSistemaBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(alerta: Alerta) {
            binding.tvTitulo.text = tituloPorTipo(alerta.tipoId)
            binding.tvMensaje.text = alerta.mensaje
            binding.tvFecha.text = formatearFecha(alerta.fechaCreacion)

            if (alerta.leida) {
                binding.tvMarcarLeida.visibility = android.view.View.GONE
            } else {
                binding.tvMarcarLeida.visibility = android.view.View.VISIBLE
                binding.tvMarcarLeida.setOnClickListener { onMarcarLeida(alerta) }
            }
        }

        private fun tituloPorTipo(tipoId: Int): String = when (tipoId) {
            1 -> "Alerta de Inventario"      // STOCK_MINIMO
            2 -> "Stock Crítico"             // STOCK_CRITICO
            3 -> "Alerta de Vencimiento"     // VENCIMIENTO_PROXIMO
            4 -> "Anomalía Detectada"        // ANOMALIA_DETECTADA
            else -> "Alerta de Inventario"
        }

        private fun formatearFecha(fechaStr: String?): String {
            if (fechaStr.isNullOrBlank()) return ""
            return try {
                val formatos = listOf(
                    "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                    "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
                    "yyyy-MM-dd'T'HH:mm:ss",
                    "yyyy-MM-dd"
                )
                var fecha: Date? = null
                for (fmt in formatos) {
                    try {
                        val sdf = SimpleDateFormat(fmt, Locale.getDefault())
                        sdf.timeZone = TimeZone.getTimeZone("UTC")
                        fecha = sdf.parse(fechaStr)
                        if (fecha != null) break
                    } catch (_: Exception) {}
                }
                if (fecha == null) return fechaStr.take(16).replace("T", " ")
                SimpleDateFormat("dd/MM/yyyy hh:mm a", Locale.getDefault()).format(fecha)
            } catch (_: Exception) {
                fechaStr.take(16).replace("T", " ")
            }
        }
    }
}
