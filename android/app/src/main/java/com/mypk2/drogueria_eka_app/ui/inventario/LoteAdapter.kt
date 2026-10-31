package com.mypk2.drogueria_eka_app.ui.inventario

import android.content.res.ColorStateList
import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.mypk2.drogueria_eka_app.R
import com.mypk2.drogueria_eka_app.data.model.LoteProduccion
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

/**
 * LoteAdapter — Muestra lotes de un producto con semáforo de caducidad
 * Rojo ≤30 días, Naranja ≤60, Verde >60
 */
class LoteAdapter(
    private var lotes: List<LoteProduccion>
) : RecyclerView.Adapter<LoteAdapter.LoteViewHolder>() {

    class LoteViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val viewSemaforo: View = view.findViewById(R.id.viewSemaforo)
        val tvNumeroLote: TextView = view.findViewById(R.id.tvNumeroLote)
        val tvFechaVencimiento: TextView = view.findViewById(R.id.tvFechaVencimiento)
        val tvStockLote: TextView = view.findViewById(R.id.tvStockLote)
        val tvDiasRestantes: TextView = view.findViewById(R.id.tvDiasRestantes)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): LoteViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_lote, parent, false)
        return LoteViewHolder(view)
    }

    override fun onBindViewHolder(holder: LoteViewHolder, position: Int) {
        val lote = lotes[position]

        holder.tvNumeroLote.text = lote.numeroLote
        holder.tvStockLote.text = (lote.stockLote ?: lote.cantidadProducida ?: 0.0).toInt().toString()

        // Fecha de vencimiento (o producción como fallback)
        val fechaVenc = lote.fechaVencimiento
        val fechaProd = lote.fechaProduccion
        val fechaAUsar = fechaVenc ?: fechaProd

        if (!fechaAUsar.isNullOrEmpty()) {
            val diasRestantes = if (fechaVenc != null) calcularDiasRestantes(fechaVenc) else null
            val fechaFormateada = formatearFecha(fechaAUsar)
            
            holder.tvFechaVencimiento.text = if (fechaVenc != null) "Vence: $fechaFormateada" else "Prod: $fechaFormateada"

            if (diasRestantes != null) {
                holder.tvDiasRestantes.visibility = View.VISIBLE
                when {
                    diasRestantes <= 0 -> {
                        holder.tvDiasRestantes.text = "VENCIDO"
                        holder.tvDiasRestantes.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#C0392B"))
                        holder.viewSemaforo.setBackgroundColor(Color.parseColor("#C0392B"))
                    }
                    diasRestantes <= 30 -> {
                        holder.tvDiasRestantes.text = "${diasRestantes}d"
                        holder.tvDiasRestantes.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#C0392B"))
                        holder.viewSemaforo.setBackgroundColor(Color.parseColor("#C0392B"))
                    }
                    diasRestantes <= 60 -> {
                        holder.tvDiasRestantes.text = "${diasRestantes}d"
                        holder.tvDiasRestantes.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#FF9800"))
                        holder.viewSemaforo.setBackgroundColor(Color.parseColor("#FF9800"))
                    }
                    else -> {
                        holder.tvDiasRestantes.text = "${diasRestantes}d"
                        holder.tvDiasRestantes.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#4CAF50"))
                        holder.viewSemaforo.setBackgroundColor(Color.parseColor("#4CAF50"))
                    }
                }
            } else {
                holder.tvDiasRestantes.visibility = View.GONE
                holder.viewSemaforo.setBackgroundColor(Color.parseColor("#9E9E9E"))
            }
        } else {
            holder.tvFechaVencimiento.text = "Sin fecha de referencia"
            holder.tvDiasRestantes.visibility = View.GONE
            holder.viewSemaforo.setBackgroundColor(Color.parseColor("#9E9E9E"))
        }
    }

    override fun getItemCount() = lotes.size

    fun updateData(newLotes: List<LoteProduccion>) {
        lotes = newLotes
        notifyDataSetChanged()
    }

    private fun calcularDiasRestantes(fechaStr: String): Long? {
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
            if (fecha == null) return null
            val diff = fecha.time - Date().time
            TimeUnit.MILLISECONDS.toDays(diff)
        } catch (_: Exception) { null }
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
