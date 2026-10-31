package com.mypk2.drogueria_eka_app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.mypk2.drogueria_eka_app.data.model.LoteProduccion

@Dao
interface LoteDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(lotes: List<LoteProduccion>)

    @Query("SELECT * FROM lotes WHERE productoId = :productoId")
    suspend fun getLotesByProducto(productoId: Int): List<LoteProduccion>

    @Query("SELECT * FROM lotes WHERE numeroLote LIKE '%' || :query || '%'")
    suspend fun searchLotes(query: String): List<LoteProduccion>
    
    @Query("SELECT * FROM lotes")
    suspend fun getAllLotes(): List<LoteProduccion>
}
