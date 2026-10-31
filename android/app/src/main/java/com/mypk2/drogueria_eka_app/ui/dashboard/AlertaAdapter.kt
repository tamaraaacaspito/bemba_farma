package com.mypk2.drogueria_eka_app.ui.dashboard

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.mypk2.drogueria_eka_app.R
import com.mypk2.drogueria_eka_app.data.model.Producto

/**
 * StockCriticoAdapter — Muestra productos con stock por debajo del mínimo
 * Reemplaza al AlertaAdapter original que apuntaba a un endpoint inexistente
 */
class StockCriticoAdapter(
    private var productos: List<Producto>
) : RecyclerView.Adapter<StockCriticoAdapter.StockCriticoViewHolder>() {

    class StockCriticoViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val viewSeverity: View = view.findViewById(R.id.viewSeverity)
        val tvNombreProducto: TextView = view.findViewById(R.id.tvNombreProducto)
        val tvCodigoProducto: TextView = view.findViewById(R.id.tvCodigoProducto)
        val tvStockActual: TextView = view.findViewById(R.id.tvStockActual)
        val tvStockMinimo: TextView = view.findViewById(R.id.tvStockMinimo)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): StockCriticoViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_alerta, parent, false)
        return StockCriticoViewHolder(view)
    }

    override fun onBindViewHolder(holder: StockCriticoViewHolder, position: Int) {
        val producto = productos[position]
        holder.tvNombreProducto.text = producto.nombre
        holder.tvCodigoProducto.text = producto.codigo
        holder.tvStockActual.text = producto.stockActual.toInt().toString()
        holder.tvStockMinimo.text = "Mín: ${producto.stockMinimo.toInt()}"

        // Color según severidad: ROJO si agotado, NARANJA si stock bajo
        if (producto.stockActual <= 0) {
            holder.viewSeverity.setBackgroundColor(Color.parseColor("#C0392B")) // Rojo
            holder.tvStockActual.setTextColor(Color.parseColor("#C0392B"))
        } else {
            holder.viewSeverity.setBackgroundColor(Color.parseColor("#E07B00")) // Naranja
            holder.tvStockActual.setTextColor(Color.parseColor("#E07B00"))
        }
    }

    override fun getItemCount() = productos.size

    fun updateData(newProductos: List<Producto>) {
        productos = newProductos
        notifyDataSetChanged()
    }
}
