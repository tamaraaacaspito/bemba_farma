package com.mypk2.drogueria_eka_app.ui.inventario

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.widget.SearchView
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.mypk2.drogueria_eka_app.R
import com.mypk2.drogueria_eka_app.data.model.Categoria
import com.mypk2.drogueria_eka_app.databinding.FragmentInventarioBinding

import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class InventarioFragment : Fragment() {

    private var _binding: FragmentInventarioBinding? = null
    private val binding get() = _binding!!

    private val viewModel: InventarioViewModel by viewModels()
    private lateinit var productoAdapter: ProductoAdapter

    // Debounce handler — espera 300ms después de que el usuario deja de escribir
    private val debounceHandler = Handler(Looper.getMainLooper())
    private var debounceRunnable: Runnable? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentInventarioBinding.inflate(inflater, container, false)
        return binding.root
    }

    private var selectedCategoriaId: Int? = null
    private var selectedEstado: String? = "TODOS"

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupRecyclerView()
        setupObservers()
        setupSearch()
        setupListeners()

        viewModel.loadProductos("")
        viewModel.fetchCategorias()
    }

    private fun setupListeners() {
        binding.swipeRefresh.setOnRefreshListener {
            val currentQuery = binding.searchView.query.toString()
            viewModel.loadProductos(currentQuery, selectedCategoriaId, selectedEstado)
        }

        binding.btnFiltros.setOnClickListener {
            showFiltersDialog()
        }
    }

    private fun showFiltersDialog() {
        val dialog = com.google.android.material.bottomsheet.BottomSheetDialog(requireContext())
        val dialogView = layoutInflater.inflate(R.layout.dialog_filtros_inventario, null)
        dialog.setContentView(dialogView)

        val spinner = dialogView.findViewById<android.widget.Spinner>(R.id.spinnerCategorias)
        val chipGroup = dialogView.findViewById<com.google.android.material.chip.ChipGroup>(R.id.chipGroupEstado)
        val btnAplicar = dialogView.findViewById<android.widget.Button>(R.id.btnAplicar)
        val btnLimpiar = dialogView.findViewById<android.widget.Button>(R.id.btnLimpiar)

        // Configurar Spinner de Categorías
        val catNames = mutableListOf("Todas las categorías")
        catNames.addAll(categoriasList.map { it.nombre })
        val adapter = android.widget.ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, catNames)
        spinner.adapter = adapter
        
        // Pre-seleccionar si ya hay filtro
        selectedCategoriaId?.let { id ->
            val index = categoriasList.indexOfFirst { it.id == id }
            if (index != -1) spinner.setSelection(index + 1)
        }

        // Pre-seleccionar Chip de Estado
        when (selectedEstado) {
            "CRITICO" -> dialogView.findViewById<com.google.android.material.chip.Chip>(R.id.chipCritico).isChecked = true
            "AGOTADO" -> dialogView.findViewById<com.google.android.material.chip.Chip>(R.id.chipAgotado).isChecked = true
            "OK" -> dialogView.findViewById<com.google.android.material.chip.Chip>(R.id.chipOk).isChecked = true
            else -> dialogView.findViewById<com.google.android.material.chip.Chip>(R.id.chipTodos).isChecked = true
        }

        btnAplicar.setOnClickListener {
            // Obtener categoría seleccionada
            val catPos = spinner.selectedItemPosition
            selectedCategoriaId = if (catPos == 0) null else categoriasList.getOrNull(catPos - 1)?.id

            // Obtener estado seleccionado
            selectedEstado = when (chipGroup.checkedChipId) {
                R.id.chipCritico -> "CRITICO"
                R.id.chipAgotado -> "AGOTADO"
                R.id.chipOk -> "OK"
                else -> "TODOS"
            }

            viewModel.loadProductos(binding.searchView.query.toString(), selectedCategoriaId, selectedEstado)
            dialog.dismiss()
        }

        btnLimpiar.setOnClickListener {
            selectedCategoriaId = null
            selectedEstado = "TODOS"
            viewModel.loadProductos(binding.searchView.query.toString())
            dialog.dismiss()
        }

        dialog.show()
    }

    private fun setupSearch() {
        binding.searchView.setOnQueryTextListener(object : SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(query: String?): Boolean {
                debounceRunnable?.let { debounceHandler.removeCallbacks(it) }
                viewModel.loadProductos(query ?: "", selectedCategoriaId, selectedEstado)
                return true
            }

            override fun onQueryTextChange(newText: String?): Boolean {
                debounceRunnable?.let { debounceHandler.removeCallbacks(it) }
                debounceRunnable = Runnable {
                    viewModel.loadProductos(newText ?: "", selectedCategoriaId, selectedEstado)
                }
                debounceHandler.postDelayed(debounceRunnable!!, 300)
                return true
            }
        })
    }

    private fun setupRecyclerView() {
        productoAdapter = ProductoAdapter(emptyList()) { producto: com.mypk2.drogueria_eka_app.data.model.Producto ->
            // Click en producto → navegar al Detalle con lotes
            val bundle = Bundle().apply {
                putInt("productoId", producto.id)
                putString("productoNombre", producto.nombre)
                putString("productoCodigo", producto.codigo)
                putFloat("productoStock", producto.stockActual.toFloat())
                putFloat("productoMinimo", producto.stockMinimo.toFloat())
                putString("productoUnidad", producto.unidadMedida ?: "UND")
            }
            findNavController().navigate(R.id.action_inventario_to_detalle, bundle)
        }
        binding.rvProductos.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = productoAdapter
        }
    }

    private var categoriasList = listOf<Categoria>()

    private fun setupObservers() {
        viewModel.categorias.observe(viewLifecycleOwner) { cats ->
            categoriasList = cats
        }

        viewModel.productos.observe(viewLifecycleOwner) { prods ->
            productoAdapter.updateData(prods)

            // Mostrar/ocultar empty state
            if (prods.isEmpty() && viewModel.isLoading.value != true) {
                binding.layoutEmptyState.visibility = View.VISIBLE
                binding.rvProductos.visibility = View.GONE
            } else {
                binding.layoutEmptyState.visibility = View.GONE
                binding.rvProductos.visibility = View.VISIBLE
            }
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { isLoad ->
            binding.swipeRefresh.isRefreshing = isLoad
        }

        viewModel.isOffline.observe(viewLifecycleOwner) { isOffline ->
            binding.tvOfflineBanner.visibility = if (isOffline) View.VISIBLE else View.GONE
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        debounceRunnable?.let { debounceHandler.removeCallbacks(it) }
        _binding = null
    }
}
