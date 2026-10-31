package com.mypk2.drogueria_eka_app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.navigation.NavController
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.mypk2.drogueria_eka_app.data.remote.RetrofitClient
import com.mypk2.drogueria_eka_app.databinding.ActivityMainBinding
import com.mypk2.drogueria_eka_app.service.PushRegistrar

import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var navController: NavController

    // Solicitud de permiso de notificaciones (Android 13+). Tras la respuesta,
    // registramos el token push independientemente del resultado (el registro
    // sirve igual; solo no se mostrarán notificaciones si se deniega).
    private val requestNotifPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            PushRegistrar.registrar(applicationContext)
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Asegurar que RetrofitClient está inicializado (por si se accede directo)
        RetrofitClient.init(this)

        // Permiso de notificaciones + registro del dispositivo para push
        solicitarPermisoYRegistrarPush()

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        navController = navHostFragment.navController

        binding.bottomNavigation.setupWithNavController(navController)

        navController.addOnDestinationChangedListener { _, destination, _ ->
            if (destination.id == R.id.navigation_dashboard || destination.id == R.id.navigation_ia) {
                binding.appBarLayout.visibility = android.view.View.GONE
            } else {
                binding.appBarLayout.visibility = android.view.View.VISIBLE
            }
        }

        handleIntentExtras()
    }

    private fun solicitarPermisoYRegistrarPush() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val concedido = ContextCompat.checkSelfPermission(
                this, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!concedido) {
                requestNotifPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
                return // el registro se hará en el callback del permiso
            }
        }
        // Sin necesidad de permiso (API < 33) o ya concedido → registrar directamente
        PushRegistrar.registrar(applicationContext)
    }

    private fun handleIntentExtras() {
        val target = intent.getStringExtra("OPEN_TARGET")
        if (target == "INVENTARIO") {
            navController.navigate(R.id.navigation_inventario)
        }
        // Abrir el Centro de Alertas IA desde una notificación de stock
        if (target == "ALERTAS") {
            navController.navigate(R.id.navigation_alertas)
        }
    }
}
