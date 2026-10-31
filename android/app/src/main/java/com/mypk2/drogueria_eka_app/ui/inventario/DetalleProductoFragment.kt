package com.mypk2.drogueria_eka_app.ui.inventario

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.mypk2.drogueria_eka_app.databinding.FragmentDetalleProductoBinding

import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class DetalleProductoFragment : Fragment() {

    private var _binding: FragmentDetalleProductoBinding? = null
    private val binding get() = _binding!!

    private val viewModel: DetalleProductoViewModel by viewModels()
    private lateinit var loteAdapter: LoteAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentDetalleProductoBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val productoId = arguments?.getInt("productoId") ?: return
        val productoNombre = arguments?.getString("productoNombre") ?: ""
        val productoCodigo = arguments?.getString("productoCodigo") ?: ""
        val productoStock = arguments?.getFloat("productoStock") ?: 0f
        val productoMinimo = arguments?.getFloat("productoMinimo") ?: 0f
        val productoUnidad = arguments?.getString("productoUnidad") ?: "UND"

        // Llenar header
        binding.tvProductoNombre.text = productoNombre
        binding.tvProductoCodigo.text = productoCodigo
        binding.tvStockActual.text = productoStock.toInt().toString()
        binding.tvStockMinimo.text = productoMinimo.toInt().toString()
        binding.tvUnidad.text = productoUnidad

        setupRecyclerView()
        setupObservers()

        viewModel.loadLotes(productoId)
    }

    private fun setupRecyclerView() {
        loteAdapter = LoteAdapter(emptyList())
        binding.rvLotes.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = loteAdapter
        }
    }

    private fun setupObservers() {
        viewModel.lotes.observe(viewLifecycleOwner) { lotes ->
            loteAdapter.updateData(lotes)
            if (lotes.isEmpty()) {
                binding.rvLotes.visibility = View.GONE
                binding.layoutEmptyLotes.visibility = View.VISIBLE
            } else {
                binding.rvLotes.visibility = View.VISIBLE
                binding.layoutEmptyLotes.visibility = View.GONE
            }
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        }

        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let { Toast.makeText(requireContext(), it, Toast.LENGTH_LONG).show() }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
