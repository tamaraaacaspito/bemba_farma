package com.mypk2.drogueria_eka_app.ui.kardex

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.mypk2.drogueria_eka_app.R
import com.mypk2.drogueria_eka_app.databinding.FragmentKardexHistorialBinding
import com.mypk2.drogueria_eka_app.ui.dashboard.MovimientoAdapter

import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class KardexHistorialFragment : Fragment() {

    private var _binding: FragmentKardexHistorialBinding? = null
    private val binding get() = _binding!!

    private val viewModel: KardexHistorialViewModel by viewModels()
    private lateinit var movimientoAdapter: MovimientoAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentKardexHistorialBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupRecyclerView()
        setupFilters()
        setupObservers()

        binding.swipeRefresh.setOnRefreshListener {
            val filtro = getSelectedFilter()
            viewModel.loadHistorial(filtro)
        }

        viewModel.loadHistorial()
    }

    private fun setupRecyclerView() {
        movimientoAdapter = MovimientoAdapter(emptyList())
        binding.rvHistorial.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = movimientoAdapter
        }
    }

    private fun setupFilters() {
        binding.chipGroupFiltro.setOnCheckedStateChangeListener { _, checkedIds ->
            val filtro = when {
                checkedIds.contains(R.id.chipEntradas) -> 1
                checkedIds.contains(R.id.chipSalidas) -> 2
                else -> null
            }
            viewModel.loadHistorial(filtro)
        }
    }

    private fun getSelectedFilter(): Int? {
        return when {
            binding.chipEntradas.isChecked -> 1
            binding.chipSalidas.isChecked -> 2
            else -> null
        }
    }

    private fun setupObservers() {
        viewModel.movimientos.observe(viewLifecycleOwner) { movimientos ->
            movimientoAdapter.updateData(movimientos)
            if (movimientos.isEmpty()) {
                binding.rvHistorial.visibility = View.GONE
                binding.layoutEmpty.visibility = View.VISIBLE
            } else {
                binding.rvHistorial.visibility = View.VISIBLE
                binding.layoutEmpty.visibility = View.GONE
            }
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.swipeRefresh.isRefreshing = isLoading
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
