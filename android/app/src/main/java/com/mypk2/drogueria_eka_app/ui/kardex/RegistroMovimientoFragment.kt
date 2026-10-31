package com.mypk2.drogueria_eka_app.ui.kardex

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.mypk2.drogueria_eka_app.databinding.FragmentRegistroMovimientoBinding
import kotlinx.coroutines.launch

import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class RegistroMovimientoFragment : Fragment() {

    private var _binding: FragmentRegistroMovimientoBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentRegistroMovimientoBinding.inflate(inflater, container, false)
        val view = binding.root

        binding.btnConfirmarEntrada.setOnClickListener { validarYRegistrar("ENTRADA") }
        binding.btnConfirmarSalida.setOnClickListener  { validarYRegistrar("SALIDA") }

        return view
    }

    private fun validarYRegistrar(tipo: String) {
        val qStr = binding.etCantidad.text.toString()
        val mStr = binding.etMotivo.text.toString()

        if (qStr.isEmpty() || mStr.isEmpty()) {
            Toast.makeText(context, "La cantidad y el motivo son obligatorios", Toast.LENGTH_LONG).show()
            return
        }

        val cantidadDouble = qStr.toDoubleOrNull() ?: 0.0

        if (cantidadDouble <= 0.0) {
            Toast.makeText(context, "Cantidades deben ser > 0", Toast.LENGTH_LONG).show()
            return
        }

        binding.cardLoadingOverlay.visibility = View.VISIBLE
        
        lifecycleScope.launch {
            kotlinx.coroutines.delay(1000)
            binding.cardLoadingOverlay.visibility = View.GONE
            Toast.makeText(context, "MocK: Transacción Kardex Registrada ($tipo)", Toast.LENGTH_LONG).show()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
