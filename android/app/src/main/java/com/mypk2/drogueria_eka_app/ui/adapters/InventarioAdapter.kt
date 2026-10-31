package com.mypk2.drogueria_eka_app.ui.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.mypk2.drogueria_eka_app.data.model.Producto
import com.mypk2.drogueria_eka_app.databinding.ItemInventarioBinding

class InventarioAdapter : ListAdapter<Producto, InventarioAdapter.ViewHolder>(ProductoDiffCallback()) {

    var productosCompletos: List<Producto> = emptyList()

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemInventarioBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val producto = getItem(position)
        holder.bind(producto)
    }

    override fun submitList(list: List<Producto>?) {
        super.submitList(list)
        if (list != null && productosCompletos.isEmpty()) {
            productosCompletos = list
        }
    }

    fun filterList(query: String) {
        if (query.isEmpty()) {
            super.submitList(productosCompletos)
        } else {
            val filtered = productosCompletos.filter { 
                it.nombre.contains(query, ignoreCase = true) || it.codigo.contains(query, ignoreCase = true)
            }
            super.submitList(filtered)
        }
    }

    inner class ViewHolder(private val binding: ItemInventarioBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(producto: Producto) {
            binding.tvNombre.text = producto.nombre
            binding.tvCodigo.text = producto.codigo
            binding.tvStock.text = producto.stockActual.toString()
            
            // Color rojo si esta critico
            if(producto.stockActual <= producto.stockMinimo) {
                 binding.tvStock.setTextColor(android.graphics.Color.parseColor("#D32F2F"))
            } else {
                 binding.tvStock.setTextColor(android.graphics.Color.parseColor("#333333"))
            }
        }
    }

    class ProductoDiffCallback : DiffUtil.ItemCallback<Producto>() {
        override fun areItemsTheSame(oldItem: Producto, newItem: Producto): Boolean = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: Producto, newItem: Producto): Boolean = oldItem == newItem
    }
}
