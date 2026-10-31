package com.mypk2.drogueria_eka_app.ui.dashboard

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.mypk2.drogueria_eka_app.R
import com.mypk2.drogueria_eka_app.data.local.SessionManager
import com.mypk2.drogueria_eka_app.databinding.FragmentDashboardBinding
import com.mypk2.drogueria_eka_app.ui.login.LoginActivity

import androidx.lifecycle.lifecycleScope
import com.mypk2.drogueria_eka_app.utils.ConnectivityObserver
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class DashboardFragment : Fragment() {

    @Inject
    lateinit var connectivityObserver: ConnectivityObserver

    private var _binding: FragmentDashboardBinding? = null
    private val binding get() = _binding!!

    private val viewModel: DashboardViewModel by viewModels()
    private lateinit var stockCriticoAdapter: StockCriticoAdapter
    private lateinit var movimientoAdapter: MovimientoAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentDashboardBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupUserInfo()
        setupRecyclerViews()
        setupObservers()
        setupQuickActions()
        setupLogout()

        binding.swipeRefresh.setOnRefreshListener {
            viewModel.fetchData()
        }

        // Carga inicial
        viewModel.fetchData()
        
        observeConnectivity()
    }

    private fun observeConnectivity() {
        viewLifecycleOwner.lifecycleScope.launch {
            connectivityObserver.observe().collectLatest { status ->
                val layoutOfflineBanner = binding.root.findViewById<View>(R.id.layoutOfflineBanner)
                if (status == ConnectivityObserver.Status.Available) {
                    layoutOfflineBanner?.visibility = View.GONE
                } else {
                    layoutOfflineBanner?.visibility = View.VISIBLE
                }
            }
        }
    }

    private fun setupUserInfo() {
        val sessionManager = SessionManager.getInstance(requireContext())
        val userName = sessionManager.getUserName()
        val userRole = sessionManager.getUserRole()

        binding.tvUserName.text = if (userName.isNotEmpty()) "Hola, $userName" else "Bienvenido"
        binding.tvUserRole.text = when (userRole) {
            "ADMIN" -> "Administrador de Inventario"
            "ALMACEN" -> "Personal de Bodega"
            else -> "Panel de Inventario"
        }
    }

    private fun setupRecyclerViews() {
        // Movimientos recientes
        movimientoAdapter = MovimientoAdapter(emptyList())
        binding.rvMovimientos.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = movimientoAdapter
        }

        // Stock crítico
        stockCriticoAdapter = StockCriticoAdapter(emptyList())
        binding.rvAlertas.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = stockCriticoAdapter
        }
    }

    private fun setupQuickActions() {
        val bottomNav = requireActivity().findViewById<com.google.android.material.bottomnavigation.BottomNavigationView>(R.id.bottom_navigation)

        // FAB Scanner
        binding.fabScanner.setOnClickListener {
            val intent = Intent(requireContext(), com.mypk2.drogueria_eka_app.ui.scanner.ScannerActivity::class.java)
            startActivity(intent)
        }

        // Acceso rápido a Inventario
        binding.btnQuickInventario.setOnClickListener {
            bottomNav?.selectedItemId = R.id.navigation_inventario
        }

        // Acceso rápido a Kardex
        binding.btnQuickKardex.setOnClickListener {
            bottomNav?.selectedItemId = R.id.navigation_kardex
        }


        // KPI cards navegan a la sección correspondiente
        binding.cardTotalProductos.setOnClickListener {
            bottomNav?.selectedItemId = R.id.navigation_inventario
        }
        binding.cardStockCritico.setOnClickListener {
            bottomNav?.selectedItemId = R.id.navigation_inventario
        }
        binding.cardAgotados.setOnClickListener {
            bottomNav?.selectedItemId = R.id.navigation_inventario
        }
        binding.cardMovimientos.setOnClickListener {
            bottomNav?.selectedItemId = R.id.navigation_kardex
        }
    }

    private fun setupLogout() {
        binding.btnLogout.setOnClickListener {
            val sessionManager = SessionManager.getInstance(requireContext())
            sessionManager.clearSession()

            val intent = Intent(requireContext(), LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            requireActivity().finish()
        }
    }

    private fun setupObservers() {
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.swipeRefresh.isRefreshing = isLoading
        }

        viewModel.stats.observe(viewLifecycleOwner) { stats ->
            binding.tvTotalItems.text = stats.totalProductos.toString()
            binding.tvCriticos.text = stats.productosCriticos.toString()
        }

        viewModel.lotesVencidos.observe(viewLifecycleOwner) { cantidadVencidos ->
            binding.tvAgotados.text = cantidadVencidos.toString()
        }

        viewModel.totalMovimientos.observe(viewLifecycleOwner) { total ->
            binding.tvMovimientos.text = total.toString()
        }

        // ── Movimientos Recientes ──
        viewModel.movimientosRecientes.observe(viewLifecycleOwner) { movimientos ->
            movimientoAdapter.updateData(movimientos)

            if (movimientos.isEmpty()) {
                binding.rvMovimientos.visibility = View.GONE
                binding.layoutEmptyMovimientos.visibility = View.VISIBLE
            } else {
                binding.rvMovimientos.visibility = View.VISIBLE
                binding.layoutEmptyMovimientos.visibility = View.GONE
            }
        }

        // ── Stock Crítico ──
        viewModel.productosCriticos.observe(viewLifecycleOwner) { productos ->
            stockCriticoAdapter.updateData(productos)

            if (productos.isEmpty()) {
                binding.rvAlertas.visibility = View.GONE
                binding.layoutEmptyAlertas.visibility = View.VISIBLE
            } else {
                binding.rvAlertas.visibility = View.VISIBLE
                binding.layoutEmptyAlertas.visibility = View.GONE
            }
        }

        // ── Errores ──
        viewModel.error.observe(viewLifecycleOwner) { errorMsg ->
            if (errorMsg != null) {
                Toast.makeText(requireContext(), errorMsg, Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
