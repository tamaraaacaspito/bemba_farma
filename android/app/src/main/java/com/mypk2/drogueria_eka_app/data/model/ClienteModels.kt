package com.mypk2.drogueria_eka_app.data.model

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.gson.annotations.SerializedName

@Entity(tableName = "clientes_web")
data class ClienteWeb(
    @PrimaryKey val id: Int,
    @ColumnInfo(name = "nombre_completo")
    @SerializedName("nombre_completo") val nombreCompleto: String,
    val email: String,
    val entidad: String?,
    @ColumnInfo(name = "ruc_dni")
    @SerializedName("ruc_dni") val rucDni: String?,
    val telefono: String?
)

data class ClienteWebListResponse(
    val data: List<ClienteWeb>,
    val total: Int
)
