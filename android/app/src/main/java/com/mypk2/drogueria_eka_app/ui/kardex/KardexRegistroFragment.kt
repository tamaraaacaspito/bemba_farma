package com.mypk2.drogueria_eka_app.ui.kardex

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.google.android.material.snackbar.Snackbar
import com.mypk2.drogueria_eka_app.data.model.Producto
import com.mypk2.drogueria_eka_app.data.model.LoteProduccion
import com.mypk2.drogueria_eka_app.databinding.FragmentKardexRegistroBinding

import androidx.lifecycle.lifecycleScope
import com.mypk2.drogueria_eka_app.utils.ConnectivityObserver
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class KardexRegistroFragment : Fragment() {

    @Inject
    lateinit var connectivityObserver: ConnectivityObserver

    private var _binding: FragmentKardexRegistroBinding? = null
    private val binding get() = _binding!!

    private val viewModel: KardexViewModel by viewModels()
    private var productosList: List<Producto> = emptyList()
    private var productoSeleccionado: Producto? = null
    private var lotesList: List<LoteProduccion> = emptyList()
    private var loteSeleccionado: LoteProduccion? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentKardexRegistroBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupObservers()
        setupListeners()
        observeConnectivity()
        viewModel.loadProductosParaSpinner()
    }

    private fun observeConnectivity() {
        viewLifecycleOwner.lifecycleScope.launch {
            connectivityObserver.observe().collectLatest { status ->
                val isOnline = status == ConnectivityObserver.Status.Available
                binding.btnRegistrar.isEnabled = isOnline
                if (!isOnline) {
                    binding.btnRegistrar.text = "Sin Conexión (Modo Offline)"
                } else {
                    binding.btnRegistrar.text = "Registrar Movimiento"
                }
            }
        }
    }

    private fun setupListeners() {
        binding.spinnerProductos.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                productoSeleccionado = productosList[position]
                validarStockSalida(binding.etCantidad.text.toString())
                // Cargar lotes para el producto seleccionado
                viewModel.loadLotes(productoSeleccionado!!.id)
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        binding.radioGroupTipo.addOnButtonCheckedListener { _, _, _ ->
            validarStockSalida(binding.etCantidad.text.toString())
        }

        binding.etLote.onItemClickListener = AdapterView.OnItemClickListener { parent, _, position, _ ->
            val selection = parent.getItemAtPosition(position) as String
            // El formato es "NUMERO (Cant: X)"
            val loteNum = selection.substringBefore(" (")
            loteSeleccionado = lotesList.find { it.numeroLote == loteNum }
        }

        binding.etCantidad.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) { validarStockSalida(s.toString()) }
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
        })

        binding.btnRegistrar.setOnClickListener {
            val cantStr = binding.etCantidad.text.toString().trim()
            val motivo = binding.etMotivo.text.toString().trim()
            val loteEscritoFull = binding.etLote.text.toString().trim()
            val loteEscrito = loteEscritoFull.substringBefore(" (")
            val cant = cantStr.toDoubleOrNull()

            if (productoSeleccionado == null) {
                Toast.makeText(requireContext(), "Seleccione producto", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (cant == null || cant <= 0) {
                binding.tilCantidad.error = "Cantidad inválida"
                return@setOnClickListener
            }
            if (loteEscrito.isEmpty()) {
                binding.tilLote.error = "El lote es obligatorio"
                return@setOnClickListener
            }

            val esEntrada = binding.rbEntrada.isChecked
            val esReposicion = binding.rbReposicion.isChecked
            val esCanje = binding.rbCanje.isChecked

            // Determinar tipo
            val tipo = when {
                esCanje      -> TipoMovimiento.CANJE
                esReposicion -> TipoMovimiento.REPOSICION
                esEntrada    -> TipoMovimiento.ENTRADA
                else         -> TipoMovimiento.SALIDA
            }

            // Buscamos el lote de nuevo por el nombre limpio para estar seguros
            val loteEncontrado = lotesList.find { it.numeroLote == loteEscrito }
            val finalLoteId = loteEncontrado?.id
            val finalCodigoLote = if (finalLoteId == null) loteEscrito else null

            viewModel.registrarMovimiento(
                productoSeleccionado!!.id,
                cant,
                tipo,
                motivo,
                finalLoteId,
                finalCodigoLote
            )
        }
    }

    private fun validarStockSalida(cantidadStr: String) {
        binding.tilCantidad.error = null
        if (binding.rbSalida.isChecked && productoSeleccionado != null) {
            val cantReq = cantidadStr.toDoubleOrNull() ?: 0.0
            if (cantReq > productoSeleccionado!!.stockActual) {
                binding.tilCantidad.error = "Stock insuficiente (Disponible: ${productoSeleccionado!!.stockActual.toInt()})"
            }
        }
    }

    private fun setupObservers() {
        viewModel.productos.observe(viewLifecycleOwner) { list ->
            productosList = list
            val productNames = list.map { "${it.codigo} - ${it.nombre}" }
            val adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, productNames)
            binding.spinnerProductos.adapter = adapter
        }

        viewModel.lotes.observe(viewLifecycleOwner) { list ->
            lotesList = list
            val loteNames = list.map { "${it.numeroLote} (Cant: ${it.cantidadProducida?.toInt() ?: 0})" }
            val adapter = ArrayAdapter(requireContext(), android.R.layout.simple_dropdown_item_1line, loteNames)
            binding.etLote.setAdapter(adapter)
            
            // Limpiar selección previa al cambiar producto
            loteSeleccionado = null
            binding.etLote.text?.clear()
        }

        viewModel.movimientoResult.observe(viewLifecycleOwner) { state ->
            when (state) {
                is MovimientoState.Loading -> {
                    binding.progressBar.visibility = View.VISIBLE
                    binding.btnRegistrar.isEnabled = false
                }
                is MovimientoState.Success -> {
                    binding.progressBar.visibility = View.GONE
                    binding.btnRegistrar.isEnabled = true
                    Snackbar.make(binding.root, state.message, Snackbar.LENGTH_LONG)
                        .setBackgroundTint(resources.getColor(android.R.color.holo_green_dark, requireActivity().theme))
                        .setTextColor(resources.getColor(android.R.color.white, requireActivity().theme))
                        .show()
                    binding.etCantidad.text?.clear()
                    binding.etMotivo.text?.clear()
                    viewModel.loadProductosParaSpinner()
                }
                is MovimientoState.Error -> {
                    binding.progressBar.visibility = View.GONE
                    binding.btnRegistrar.isEnabled = true
                    Snackbar.make(binding.root, state.error, Snackbar.LENGTH_LONG)
                        .setBackgroundTint(resources.getColor(android.R.color.holo_red_dark, requireActivity().theme))
                        .setTextColor(resources.getColor(android.R.color.white, requireActivity().theme))
                        .show()
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
