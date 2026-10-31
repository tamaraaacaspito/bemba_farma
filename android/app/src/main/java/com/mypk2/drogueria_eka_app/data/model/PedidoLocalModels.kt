package com.mypk2.drogueria_eka_app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pedidos_offline")
data class PedidoOffline(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val clienteId: Int?,
    val nombreCliente: String, // En caso sea un cliente nuevo o sin registrar en la web
    val email: String,
    val telefono: String,
    val entidad: String,
    val rucDni: String,
    val mensajeRequerimiento: String,
    val productosJson: String, // Guardar la lista de productos y precios como JSON Array temporal
    val timestamp: Long,
    val syncStatus: String = "PENDING" // PENDING, DONE, ERROR
)
