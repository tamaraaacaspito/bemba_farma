package com.mypk2.drogueria_eka_app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.mypk2.drogueria_eka_app.data.model.ClienteWeb
import com.mypk2.drogueria_eka_app.data.model.PedidoOffline
import kotlinx.coroutines.flow.Flow

@Dao
interface VentasDao {
    
    // Clientes
    @Query("SELECT * FROM clientes_web ORDER BY nombre_completo ASC")
    fun getAllClientes(): Flow<List<ClienteWeb>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertClientes(clientes: List<ClienteWeb>)

    @Query("DELETE FROM clientes_web")
    suspend fun clearClientes()

    // Pedidos Offline
    @Insert
    suspend fun insertPedidoOffline(pedido: PedidoOffline): Long

    @Query("SELECT * FROM pedidos_offline WHERE syncStatus = 'PENDING'")
    suspend fun getPendingPedidos(): List<PedidoOffline>

    @Query("UPDATE pedidos_offline SET syncStatus = :status WHERE id = :id")
    suspend fun updatePedidoStatus(id: Int, status: String)
}
