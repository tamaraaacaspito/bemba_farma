package com.mypk2.drogueria_eka_app.ui.dashboard

import android.content.res.ColorStateList
import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.mypk2.drogueria_eka_app.R
import com.mypk2.drogueria_eka_app.data.model.MovimientoKardex
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

/**
 * MovimientoAdapter — Muestra los últimos movimientos del Kardex
 * con badge de tipo (ENTRADA verde / SALIDA rojo), producto, cantidad,
 * lote y fecha relativa ("hace 2h", "hace 1d")
 */
class MovimientoAdapter(
    private var movimientos: List<MovimientoKardex>
) : RecyclerView.Adapter<MovimientoAdapter.MovimientoViewHolder>() {

    class MovimientoViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvTipoBadge: TextView = view.findViewById(R.id.tvTipoBadge)
        val tvProductoNombre: TextView = view.findViewById(R.id.tvProductoNombre)
        val tvCantidad: TextView = view.findViewById(R.id.tvCantidad)
        val tvLote: TextView = view.findViewById(R.id.tvLote)
        val tvFecha: TextView = view.findViewById(R.id.tvFecha)
        val tvUsuario: TextView = view.findViewById(R.id.tvUsuario)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MovimientoViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_movimiento, parent, false)
        return MovimientoViewHolder(view)
    }

    override fun onBindViewHolder(holder: MovimientoViewHolder, position: Int) {
        val mov = movimientos[position]

        // Badge de tipo
        if (mov.esEntrada) {
            holder.tvTipoBadge.text = "ENTRADA"
            holder.tvTipoBadge.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#0D7E5C"))
        } else {
            holder.tvTipoBadge.text = "SALIDA"
            holder.tvTipoBadge.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#C0392B"))
        }

        // Producto
        holder.tvProductoNombre.text = mov.productoNombre

        // Cantidad con símbolo
        val signo = if (mov.esEntrada) "+" else "-"
        holder.tvCantidad.text = "$signo${mov.cantidad.toInt()}"
        holder.tvCantidad.setTextColor(
            if (mov.esEntrada) Color.parseColor("#0D7E5C") else Color.parseColor("#C0392B")
        )

        // Lote (opcional)
        if (mov.loteNumero.isNotEmpty()) {
            holder.tvLote.visibility = View.VISIBLE
            holder.tvLote.text = "Lote: ${mov.loteNumero}"
        } else {
            holder.tvLote.visibility = View.GONE
        }

        // Fecha relativa
        holder.tvFecha.text = calcularFechaRelativa(mov.fechaMovimiento)

        // Usuario
        holder.tvUsuario.text = mov.usuarioNombre
    }

    override fun getItemCount() = movimientos.size

    fun updateData(newMovimientos: List<MovimientoKardex>) {
        movimientos = newMovimientos
        notifyDataSetChanged()
    }

    /**
     * Convierte una fecha ISO 8601 a texto relativo: "hace 2h", "hace 1d", etc.
     */
    private fun calcularFechaRelativa(fechaStr: String?): String {
        if (fechaStr.isNullOrEmpty()) return ""

        return try {
            // El backend puede devolver varios formatos
            val formatos = listOf(
                "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
                "yyyy-MM-dd'T'HH:mm:ss",
                "yyyy-MM-dd HH:mm:ss"
            )

            var fecha: Date? = null
            for (formato in formatos) {
                try {
                    val sdf = SimpleDateFormat(formato, Locale.getDefault())
                    sdf.timeZone = TimeZone.getTimeZone("UTC")
                    fecha = sdf.parse(fechaStr)
                    if (fecha != null) break
                } catch (_: Exception) {}
            }

            if (fecha == null) return fechaStr.take(10)

            val ahora = Date()
            val diffMs = ahora.time - fecha.time
            val minutos = TimeUnit.MILLISECONDS.toMinutes(diffMs)
            val horas = TimeUnit.MILLISECONDS.toHours(diffMs)
            val dias = TimeUnit.MILLISECONDS.toDays(diffMs)

            when {
                minutos < 1 -> "ahora"
                minutos < 60 -> "hace ${minutos}m"
                horas < 24 -> "hace ${horas}h"
                dias < 7 -> "hace ${dias}d"
                dias < 30 -> "hace ${dias / 7}sem"
                else -> {
                    val sdfOut = SimpleDateFormat("dd/MM", Locale.getDefault())
                    sdfOut.format(fecha)
                }
            }
        } catch (e: Exception) {
            fechaStr?.take(10) ?: ""
        }
    }
}
