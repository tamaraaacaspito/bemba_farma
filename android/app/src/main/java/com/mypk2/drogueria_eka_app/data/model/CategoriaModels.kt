package com.mypk2.drogueria_eka_app.data.model

import com.google.gson.annotations.SerializedName

/**
 * Modelo para las categorías de productos
 */
data class Categoria(
    val id: Int,
    val nombre: String,
    val descripcion: String? = null,
    val estado: Boolean = true
)
