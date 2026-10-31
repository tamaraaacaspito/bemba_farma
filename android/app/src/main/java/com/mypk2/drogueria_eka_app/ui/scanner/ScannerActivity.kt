package com.mypk2.drogueria_eka_app.ui.scanner

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.mypk2.drogueria_eka_app.data.remote.RetrofitClient
import com.mypk2.drogueria_eka_app.databinding.ActivityScannerBinding
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class ScannerActivity : AppCompatActivity() {

    private lateinit var binding: ActivityScannerBinding
    private val viewModel: ScannerViewModel by viewModels()

    private lateinit var cameraExecutor: ExecutorService
    private lateinit var bottomSheetBehavior: BottomSheetBehavior<View>

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            startCamera()
        } else {
            Toast.makeText(this, "Se necesita permiso de cámara para escanear", Toast.LENGTH_LONG).show()
            finish()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        RetrofitClient.init(this)

        binding = ActivityScannerBinding.inflate(layoutInflater)
        setContentView(binding.root)

        cameraExecutor = Executors.newSingleThreadExecutor()

        setupBottomSheet()
        setupObservers()
        setupButtons()

        // Pedir permiso de cámara
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        } else {
            requestPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun setupBottomSheet() {
        bottomSheetBehavior = BottomSheetBehavior.from(binding.bottomSheet)
        bottomSheetBehavior.state = BottomSheetBehavior.STATE_HIDDEN
        bottomSheetBehavior.isHideable = true
    }

    private fun setupButtons() {
        binding.fabClose.setOnClickListener { finish() }

        binding.btnScanAgain.setOnClickListener {
            viewModel.resetScan()
            bottomSheetBehavior.state = BottomSheetBehavior.STATE_HIDDEN
        }

        binding.btnEntrada.setOnClickListener {
            val state = viewModel.scanState.value
            if (state is ScanState.Found) {
                Toast.makeText(this, "Registrar ENTRADA para lote ${state.lote.numeroLote}", Toast.LENGTH_SHORT).show()
                // TODO: navegar a Kardex con lote pre-cargado
                finish()
            }
        }

        binding.btnSalida.setOnClickListener {
            val state = viewModel.scanState.value
            if (state is ScanState.Found) {
                Toast.makeText(this, "Registrar SALIDA para lote ${state.lote.numeroLote}", Toast.LENGTH_SHORT).show()
                // TODO: navegar a Kardex con lote pre-cargado
                finish()
            }
        }
    }

    private fun setupObservers() {
        viewModel.scanState.observe(this) { state ->
            when (state) {
                is ScanState.Idle -> {
                    // Nada que mostrar
                }
                is ScanState.Searching -> {
                    bottomSheetBehavior.state = BottomSheetBehavior.STATE_EXPANDED
                    binding.progressSearching.visibility = View.VISIBLE
                    binding.layoutFound.visibility = View.GONE
                    binding.layoutNotFound.visibility = View.GONE
                }
                is ScanState.Found -> {
                    binding.progressSearching.visibility = View.GONE
                    binding.layoutFound.visibility = View.VISIBLE
                    binding.layoutNotFound.visibility = View.GONE

                    val lote = state.lote
                    binding.tvLoteProductoNombre.text = lote.producto?.nombre ?: "Producto"
                    binding.tvLoteNumero.text = lote.numeroLote
                    binding.tvLoteStock.text = (lote.stockLote ?: lote.cantidadProducida ?: 0.0).toInt().toString()

                    val fechaVenc = lote.fechaVencimiento
                    val fechaProd = lote.fechaProduccion
                    val fechaAUsar = fechaVenc ?: fechaProd

                    binding.tvLoteFechaVenc.text = if (!fechaAUsar.isNullOrEmpty()) {
                        val prefijo = if (fechaVenc != null) "Vence: " else "Prod: "
                        prefijo + formatearFecha(fechaAUsar)
                    } else {
                        "Sin fecha"
                    }

                    bottomSheetBehavior.state = BottomSheetBehavior.STATE_EXPANDED
                }
                is ScanState.NotFound -> {
                    binding.progressSearching.visibility = View.GONE
                    binding.layoutFound.visibility = View.GONE
                    binding.layoutNotFound.visibility = View.VISIBLE
                    binding.tvScannedCode.text = "Código: ${state.code}"
                    bottomSheetBehavior.state = BottomSheetBehavior.STATE_EXPANDED
                }
                is ScanState.Error -> {
                    Toast.makeText(this, state.message, Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)

        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder()
                .build()
                .also { it.setSurfaceProvider(binding.previewView.surfaceProvider) }

            val imageAnalysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also {
                    it.setAnalyzer(cameraExecutor, BarcodeAnalyzer { rawValue ->
                        runOnUiThread {
                            viewModel.onBarcodeDetected(rawValue)
                        }
                    })
                }

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    this, cameraSelector, preview, imageAnalysis
                )
            } catch (e: Exception) {
                Toast.makeText(this, "Error al iniciar cámara", Toast.LENGTH_LONG).show()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun formatearFecha(fechaStr: String): String {
        return try {
            val formatos = listOf("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd")
            var fecha: Date? = null
            for (fmt in formatos) {
                try {
                    val sdf = SimpleDateFormat(fmt, Locale.getDefault())
                    sdf.timeZone = TimeZone.getTimeZone("UTC")
                    fecha = sdf.parse(fechaStr)
                    if (fecha != null) break
                } catch (_: Exception) {}
            }
            if (fecha == null) return fechaStr.take(10)
            SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(fecha)
        } catch (_: Exception) { fechaStr.take(10) }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }
}
