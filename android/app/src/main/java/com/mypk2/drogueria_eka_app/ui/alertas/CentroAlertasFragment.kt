package com.mypk2.drogueria_eka_app.ui.alertas

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
import com.mypk2.drogueria_eka_app.databinding.FragmentCentroAlertasBinding
import dagger.hilt.android.AndroidEntryPoint

/**
 * Centro de Alertas IA — réplica en la app del centro de alertas de la web.
 * Lista las alertas de sistema (stock en riesgo, anomalías, vencimientos)
 * y permite marcarlas como leídas.
 */
@AndroidEntryPoint
class CentroAlertasFragment : Fragment() {

    private var _binding: FragmentCentroAlertasBinding? = null
    private val binding get() = _binding!!

    private val viewModel: CentroAlertasViewModel by viewModels()
    private lateinit var adapter: AlertaSistemaAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentCentroAlertasBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = AlertaSistemaAdapter { alerta -> viewModel.marcarLeida(alerta.id) }
        binding.rvAlertas.layoutManager = LinearLayoutManager(requireContext())
        binding.rvAlertas.adapter = adapter

        binding.swipeRefresh.setOnRefreshListener { viewModel.cargar() }

        // Acceso al reporte de vencimientos de lotes (pantalla de caducidad)
        binding.btnVerVencimientos.setOnClickListener {
            findNavController().navigate(R.id.alertasCaducidadFragment)
        }

        observar()
        viewModel.cargar()
    }

    private fun observar() {
        viewModel.state.observe(viewLifecycleOwner) { state ->
            when (state) {
                is CentroAlertasState.Loading -> {
                    binding.swipeRefresh.isRefreshing = true
                }
                is CentroAlertasState.Success -> {
                    binding.swipeRefresh.isRefreshing = false
                    adapter.updateData(state.alertas)

                    if (state.nuevas > 0) {
                        binding.tvBadgeNuevas.text = "${state.nuevas} NUEVAS"
                        binding.tvBadgeNuevas.visibility = View.VISIBLE
                    } else {
                        binding.tvBadgeNuevas.visibility = View.GONE
                    }

                    val vacio = state.alertas.isEmpty()
                    binding.rvAlertas.visibility = if (vacio) View.GONE else View.VISIBLE
                    binding.layoutEmpty.visibility = if (vacio) View.VISIBLE else View.GONE
                }
                is CentroAlertasState.Error -> {
                    binding.swipeRefresh.isRefreshing = false
                    Toast.makeText(requireContext(), state.message, Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
