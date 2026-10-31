package com.mypk2.drogueria_eka_app.ui.inventario

import android.content.res.ColorStateList
import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.mypk2.drogueria_eka_app.R
import com.mypk2.drogueria_eka_app.data.model.Producto

class ProductoAdapter(
    private var productos: List<Producto>,
    private val onProductoClick: (Producto) -> Unit = {}
) : RecyclerView.Adapter<ProductoAdapter.ProductoViewHolder>() {

    class ProductoViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvCodigo: TextView = view.findViewById(R.id.tvCodigo)
        val tvNombre: TextView = view.findViewById(R.id.tvNombre)
        val tvStock: TextView = view.findViewById(R.id.tvStock)
        val tvUnidad: TextView = view.findViewById(R.id.tvUnidad)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ProductoViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_producto, parent, false)
        return ProductoViewHolder(view)
    }

    override fun onBindViewHolder(holder: ProductoViewHolder, position: Int) {
        val producto = productos[position]
        holder.tvCodigo.text = producto.codigo
        holder.tvNombre.text = producto.nombre
        holder.tvStock.text = producto.stockActual.toInt().toString()

        // Unidad de medida
        holder.tvUnidad.text = producto.unidadMedida ?: "UND"

        // Color de badge según stock
        val stock = producto.stockActual
        val min = producto.stockMinimo
        val colorRes = when {
            stock <= 0.0 -> Color.parseColor("#F44336")
            stock <= min -> Color.parseColor("#FF9800")
            else -> Color.parseColor("#4CAF50")
        }
        holder.tvStock.backgroundTintList = ColorStateList.valueOf(colorRes)

        // Click listener
        holder.itemView.setOnClickListener {
            onProductoClick(producto)
        }
    }

    override fun getItemCount() = productos.size

    fun updateData(newProductos: List<Producto>) {
        productos = newProductos
        notifyDataSetChanged()
    }
}
