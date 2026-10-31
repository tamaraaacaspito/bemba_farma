package com.mypk2.drogueria_eka_app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.mypk2.drogueria_eka_app.data.model.Producto
import com.mypk2.drogueria_eka_app.data.model.LoteProduccion
import com.mypk2.drogueria_eka_app.data.model.ClienteWeb
import com.mypk2.drogueria_eka_app.data.model.PedidoOffline

@Database(entities = [Producto::class, LoteProduccion::class, ClienteWeb::class, PedidoOffline::class], version = 5, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {

    abstract fun productoDao(): ProductoDao
    abstract fun loteDao(): LoteDao
    abstract fun ventasDao(): VentasDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "drogueria_eka_db"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
