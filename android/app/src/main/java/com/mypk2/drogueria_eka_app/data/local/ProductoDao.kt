package com.mypk2.drogueria_eka_app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.mypk2.drogueria_eka_app.data.model.Producto

@Dao
interface ProductoDao {
    @Query("SELECT * FROM productos ORDER BY nombre ASC")
    suspend fun getAllProductos(): List<Producto>

    @Query("SELECT * FROM productos WHERE nombre LIKE '%' || :query || '%' OR codigo LIKE '%' || :query || '%'")
    suspend fun searchProductos(query: String): List<Producto>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(productos: List<Producto>)

    @Query("DELETE FROM productos")
    suspend fun deleteAll()
}
