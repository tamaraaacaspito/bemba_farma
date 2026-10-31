package com.mypk2.drogueria_eka_app.ui.alertas

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.mypk2.drogueria_eka_app.R
import com.mypk2.drogueria_eka_app.databinding.FragmentAlertasBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class AlertasFragment : Fragment() {

    private var _binding: FragmentAlertasBinding? = null
    private val binding get() = _binding!!

    private val viewModel: AlertasViewModel by viewModels()
    private lateinit var adapter: AlertaCaducidadAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAlertasBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupRecyclerView()
        setupListeners()
        setupObservers()

        // Cargar datos al inicio
        viewModel.loadAlertas()
    }

    private fun setupRecyclerView() {
        adapter = AlertaCaducidadAdapter()
        binding.rvAlertas.layoutManager = LinearLayoutManager(requireContext())
        binding.rvAlertas.adapter = adapter
    }

    private fun setupListeners() {
        binding.swipeRefresh.setOnRefreshListener {
            viewModel.loadAlertas()
        }

        binding.chipGroupFiltro.setOnCheckedStateChangeListener { _, checkedIds ->
            val filter = when {
                checkedIds.contains(R.id.chipCritico) -> "CRITICO"
                checkedIds.contains(R.id.chipAdvertencia) -> "ADVERTENCIA"
                checkedIds.contains(R.id.chipNormal) -> "NORMAL"
                else -> "TODOS"
            }
            viewModel.applyFilter(filter)
        }
    }

    private fun setupObservers() {
        viewModel.alertasState.observe(viewLifecycleOwner) { state ->
            when (state) {
                is AlertasState.Loading -> {
                    binding.swipeRefresh.isRefreshing = true
                }
                is AlertasState.Success -> {
                    binding.swipeRefresh.isRefreshing = false
                    adapter.updateData(state.alertas)

                    // Actualizar badge de críticos
                    if (state.criticosCount > 0) {
                        binding.tvBadgeCount.text = state.criticosCount.toString()
                        binding.tvBadgeCount.visibility = View.VISIBLE
                    } else {
                        binding.tvBadgeCount.visibility = View.GONE
                    }

                    // Empty state
                    if (state.alertas.isEmpty()) {
                        binding.rvAlertas.visibility = View.GONE
                        binding.layoutEmpty.visibility = View.VISIBLE
                    } else {
                        binding.rvAlertas.visibility = View.VISIBLE
                        binding.layoutEmpty.visibility = View.GONE
                    }
                }
                is AlertasState.Error -> {
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
